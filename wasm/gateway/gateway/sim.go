package gateway

import (
	"sync"
	"time"
)

// SimConfig sets the demo's scale. The balancer, breaker, limiter and queue are the gateway's own code.
type SimConfig struct {
	QueueCapacity int
	Workers       int
	LatencyMs     int
	CooldownMs    int // the gateway waits 30s before half-opening a breaker
	HealthCheckMs int // the gateway checks every 10s
}

type BackendSnapshot struct {
	Name           string
	Weight         int
	CurrentWeight  int
	FailureCounter int
	Served         int
	Failed         int
	State          string // "closed", "open" or "half-open"
	PromoteAtMs    int64  // when the health check will half-open it; 0 unless open
}

type SimEvent struct {
	ID       uint64
	Backend  string
	Outcome  string // "ok", "failed", "rate_limited", "shed" or "no_backend"
	Priority int
	AtMs     int64
}

type SimSnapshot struct {
	Backends    []BackendSnapshot
	QueueDepth  int
	RateLimited int
	Shed        [3]int
	Events      []SimEvent
	NowMs       int64
}

const maxBufferedEvents = 2000

type Sim struct {
	cfg     SimConfig
	lb      *LoadBalancer
	limiter *RateLimiter
	queue   *PriorityQueue
	started time.Time
	done    chan struct{}

	mu          sync.Mutex
	healthy     map[string]bool
	probing     map[string]bool // a half-open probe is in flight; Next() has already flipped the backend to Open
	served      map[string]int
	failed      map[string]int
	rateLimited int
	shed        [3]int
	events      []SimEvent
	nextID      uint64
}

// NewSim wires the gateway's backend A (weight 1) and B (weight 3) behind its limiter and queue,
// and runs the same health check as StartHealthChecker on cfg.HealthCheckMs.
func NewSim(cfg SimConfig) *Sim {
	s := &Sim{
		cfg:     cfg,
		lb:      NewLoadBalancer([]BackendConfig{{URL: "A", Weight: 1}, {URL: "B", Weight: 3}}),
		limiter: NewRateLimiter(),
		queue:   NewPriorityQueue(cfg.QueueCapacity, nil),
		started: time.Now(),
		done:    make(chan struct{}),
		healthy: map[string]bool{"A": true, "B": true},
		probing: map[string]bool{},
		served:  map[string]int{},
		failed:  map[string]int{},
	}
	s.queue.StartWorkers(cfg.Workers)
	go s.runHealthChecks()
	return s
}

func (s *Sim) Submit(key string, priority int, cost int) string {
	if !s.limiter.Accept(key, cost) {
		s.record("", "rate_limited", priority, func() { s.rateLimited++ })
		return "rate_limited"
	}
	if _, ok := s.queue.Enqueue(priority, func() { s.handle(priority) }); !ok {
		s.record("", "shed", priority, func() { s.shed[priority]++ })
		return "shed"
	}
	return "accepted"
}

func (s *Sim) SetHealthy(backend string, healthy bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.healthy[backend] = healthy
}

// SkipCooldown backdates every open breaker past the cooldown and runs the health check now.
func (s *Sim) SkipCooldown() {
	past := time.Now().Add(-s.cooldown() - time.Millisecond)
	s.lb.mx.Lock()
	for _, b := range s.lb.backends {
		if b.state == Open {
			b.openedAt = past
		}
	}
	s.lb.mx.Unlock()
	s.checkHealth()
}

func (s *Sim) Snapshot() SimSnapshot {
	s.lb.mx.Lock()
	backends := make([]BackendSnapshot, len(s.lb.backends))
	for i, b := range s.lb.backends {
		backends[i] = BackendSnapshot{
			Name:           b.URL,
			Weight:         b.weight,
			CurrentWeight:  b.currentWeight,
			FailureCounter: b.failureCounter,
			State:          stateName(b.state),
		}
		if b.state == Open {
			backends[i].PromoteAtMs = s.promoteAt(b.openedAt).UnixMilli()
		}
	}
	s.lb.mx.Unlock()

	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range backends {
		backends[i].Served = s.served[backends[i].Name]
		backends[i].Failed = s.failed[backends[i].Name]
		if backends[i].State == "open" && s.probing[backends[i].Name] {
			backends[i].State = "half-open"
			backends[i].PromoteAtMs = 0
		}
	}
	events := s.events
	s.events = nil
	return SimSnapshot{
		Backends:    backends,
		QueueDepth:  s.queue.Len(),
		RateLimited: s.rateLimited,
		Shed:        s.shed,
		Events:      events,
		NowMs:       time.Now().UnixMilli(),
	}
}

func (s *Sim) Close() {
	close(s.done)
	s.queue.Close()
}

// handle is one proxied request, as gateway.go does it: pick, call, then report the outcome.
func (s *Sim) handle(priority int) {
	b := s.lb.Next()
	if b == nil {
		s.record("", "no_backend", priority, nil)
		return
	}
	// Next() skips open backends, so a picked backend that reads Open was half-open: this request is its probe.
	s.lb.mx.Lock()
	probe := b.state == Open
	s.lb.mx.Unlock()
	s.mu.Lock()
	if probe {
		s.probing[b.URL] = true
	}
	s.mu.Unlock()

	time.Sleep(time.Duration(s.cfg.LatencyMs) * time.Millisecond)
	s.mu.Lock()
	healthy := s.healthy[b.URL]
	s.mu.Unlock()
	if healthy {
		s.lb.RecordSuccess(b)
		s.record(b.URL, "ok", priority, func() { s.served[b.URL]++; s.probing[b.URL] = false })
		return
	}
	s.lb.IncrementFailureAndUpdateHealthStatus(b)
	s.record(b.URL, "failed", priority, func() { s.failed[b.URL]++; s.probing[b.URL] = false })
}

func (s *Sim) record(backend, outcome string, priority int, update func()) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if update != nil {
		update()
	}
	s.nextID++
	if len(s.events) < maxBufferedEvents {
		s.events = append(s.events, SimEvent{ID: s.nextID, Backend: backend, Outcome: outcome, Priority: priority, AtMs: time.Now().UnixMilli()})
	}
}

func (s *Sim) runHealthChecks() {
	ticker := time.NewTicker(s.interval())
	defer ticker.Stop()
	for {
		select {
		case <-s.done:
			return
		case <-ticker.C:
			s.checkHealth()
		}
	}
}

// checkHealth is the body of StartHealthChecker in healthcheck.go, with the cooldown from SimConfig.
func (s *Sim) checkHealth() {
	for _, backend := range s.lb.backends {
		s.lb.mx.Lock()
		if backend.state == Open && time.Since(backend.openedAt) > s.cooldown() {
			backend.state = HalfOpen
		}
		s.lb.mx.Unlock()
	}
}

// promoteAt is the first health-check tick after the cooldown ends.
func (s *Sim) promoteAt(openedAt time.Time) time.Time {
	ready := openedAt.Add(s.cooldown())
	ticks := ready.Sub(s.started)/s.interval() + 1
	return s.started.Add(ticks * s.interval())
}

func (s *Sim) cooldown() time.Duration { return time.Duration(s.cfg.CooldownMs) * time.Millisecond }
func (s *Sim) interval() time.Duration { return time.Duration(s.cfg.HealthCheckMs) * time.Millisecond }

func stateName(state CircuitState) string {
	switch state {
	case Open:
		return "open"
	case HalfOpen:
		return "half-open"
	default:
		return "closed"
	}
}
