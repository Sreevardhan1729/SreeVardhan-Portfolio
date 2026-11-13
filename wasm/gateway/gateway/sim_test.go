package gateway

import (
	"fmt"
	"testing"
	"time"
)

func fastConfig() SimConfig {
	return SimConfig{QueueCapacity: 1000, Workers: 1, LatencyMs: 0, CooldownMs: 300, HealthCheckMs: 50}
}

func backend(t *testing.T, snap SimSnapshot, name string) BackendSnapshot {
	t.Helper()
	for _, b := range snap.Backends {
		if b.Name == name {
			return b
		}
	}
	t.Fatalf("no backend %q in snapshot", name)
	return BackendSnapshot{}
}

// waitFor polls the simulation until cond holds, failing the test after two seconds.
func waitFor(t *testing.T, s *Sim, what string, cond func(SimSnapshot) bool) SimSnapshot {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for {
		snap := s.Snapshot()
		if cond(snap) {
			return snap
		}
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for %s; last snapshot: %+v", what, snap.Backends)
		}
		time.Sleep(5 * time.Millisecond)
	}
}

func totalServed(snap SimSnapshot) int {
	total := 0
	for _, b := range snap.Backends {
		total += b.Served + b.Failed
	}
	return total
}

// submitUntil sends cost-1 default requests one at a time until cond holds.
func submitUntil(t *testing.T, s *Sim, what string, cond func(SimSnapshot) bool) SimSnapshot {
	t.Helper()
	for i := 0; i < 500; i++ {
		before := totalServed(s.Snapshot())
		if got := s.Submit(fmt.Sprintf("key-%d", i%40), PriorityDefault, 1); got != "accepted" {
			t.Fatalf("submit %d: want accepted, got %s", i, got)
		}
		snap := waitFor(t, s, "request to finish", func(snap SimSnapshot) bool { return totalServed(snap) > before })
		if cond(snap) {
			return snap
		}
	}
	t.Fatalf("never reached: %s", what)
	return SimSnapshot{}
}

func TestSimSplitsOneToThree(t *testing.T) {
	cfg := fastConfig()
	cfg.Workers = 4
	s := NewSim(cfg)
	defer s.Close()
	for i := 0; i < 400; i++ {
		if got := s.Submit(fmt.Sprintf("key-%d", i%40), PriorityDefault, 1); got != "accepted" {
			t.Fatalf("submit %d: want accepted, got %s", i, got)
		}
	}
	snap := waitFor(t, s, "400 served", func(snap SimSnapshot) bool { return totalServed(snap) == 400 })
	if a, b := backend(t, snap, "A").Served, backend(t, snap, "B").Served; a != 100 || b != 300 {
		t.Fatalf("want A=100 B=300, got A=%d B=%d", a, b)
	}
}

func TestSimOpensBreakerAfterFiveFailures(t *testing.T) {
	s := NewSim(fastConfig())
	defer s.Close()
	s.SetHealthy("B", false)
	snap := submitUntil(t, s, "B open", func(snap SimSnapshot) bool { return backend(t, snap, "B").State == "open" })
	if failed := backend(t, snap, "B").Failed; failed != 5 {
		t.Fatalf("want the breaker to open on the 5th failure, opened after %d", failed)
	}
}

func TestSimHalfOpenProbeCloses(t *testing.T) {
	s := NewSim(fastConfig())
	defer s.Close()
	s.SetHealthy("B", false)
	submitUntil(t, s, "B open", func(snap SimSnapshot) bool { return backend(t, snap, "B").State == "open" })
	s.SetHealthy("B", true)
	waitFor(t, s, "B half-open", func(snap SimSnapshot) bool { return backend(t, snap, "B").State == "half-open" })
	submitUntil(t, s, "B closed", func(snap SimSnapshot) bool { return backend(t, snap, "B").State == "closed" })
}

func TestSimRecoversWithoutStarvation(t *testing.T) {
	cfg := fastConfig()
	cfg.CooldownMs = 60_000
	s := NewSim(cfg)
	defer s.Close()
	s.SetHealthy("B", false)
	submitUntil(t, s, "B open", func(snap SimSnapshot) bool { return backend(t, snap, "B").State == "open" })
	start := totalServed(s.Snapshot())
	submitUntil(t, s, "300 requests during the outage", func(snap SimSnapshot) bool { return totalServed(snap)-start >= 300 })
	s.SetHealthy("B", true)
	s.SkipCooldown()
	before := s.Snapshot()
	submitUntil(t, s, "40 requests after recovery", func(snap SimSnapshot) bool { return totalServed(snap)-totalServed(before) >= 40 })
	after := s.Snapshot()
	if gained := backend(t, after, "A").Served - backend(t, before, "A").Served; gained < 9 || gained > 11 {
		t.Fatalf("after recovery A should get 9-11 of 40 requests, got %d", gained)
	}
}

func TestSkipCooldownWhileFailingReopens(t *testing.T) {
	cfg := fastConfig()
	cfg.CooldownMs = 60_000
	s := NewSim(cfg)
	defer s.Close()
	s.SetHealthy("B", false)
	opened := submitUntil(t, s, "B open", func(snap SimSnapshot) bool { return backend(t, snap, "B").State == "open" })
	s.SkipCooldown()
	if state := backend(t, s.Snapshot(), "B").State; state != "half-open" {
		t.Fatalf("want half-open right after SkipCooldown, got %s", state)
	}
	failedBefore := backend(t, opened, "B").Failed
	snap := submitUntil(t, s, "B probed", func(snap SimSnapshot) bool { return backend(t, snap, "B").Failed > failedBefore })
	b := backend(t, snap, "B")
	if b.State != "open" {
		t.Fatalf("a failed probe should reopen B, got %s", b.State)
	}
	// SkipCooldown backdated openedAt, so only a fresh openedAt puts promotion a full cooldown away again.
	if minimum := time.Now().Add(55 * time.Second).UnixMilli(); b.PromoteAtMs < minimum {
		t.Fatalf("a failed probe should restart the 60s cooldown: promote at %d, want >= %d", b.PromoteAtMs, minimum)
	}
}

func TestBurstIsRateLimited(t *testing.T) {
	s := NewSim(fastConfig())
	defer s.Close()
	if got := s.Submit("burst-key", PriorityDefault, 600); got != "accepted" {
		t.Fatalf("first burst request: want accepted, got %s", got)
	}
	if got := s.Submit("burst-key", PriorityDefault, 600); got != "rate_limited" {
		t.Fatalf("second burst request: want rate_limited, got %s", got)
	}
	if limited := s.Snapshot().RateLimited; limited != 1 {
		t.Fatalf("want RateLimited=1, got %d", limited)
	}
}

func TestBatchShedFirst(t *testing.T) {
	cfg := fastConfig()
	cfg.Workers = 0
	cfg.QueueCapacity = 10
	s := NewSim(cfg)
	defer s.Close()
	for i := 0; i < 8; i++ {
		if got := s.Submit(fmt.Sprintf("k%d", i), PriorityDefault, 1); got != "accepted" {
			t.Fatalf("default %d: want accepted, got %s", i, got)
		}
	}
	if got := s.Submit("batch", PriorityBatch, 1); got != "shed" {
		t.Fatalf("batch at 80%% full: want shed, got %s", got)
	}
	for i := 8; i < 10; i++ {
		if got := s.Submit(fmt.Sprintf("k%d", i), PriorityDefault, 1); got != "accepted" {
			t.Fatalf("default %d: want accepted, got %s", i, got)
		}
	}
	if got := s.Submit("k10", PriorityDefault, 1); got != "shed" {
		t.Fatalf("default when full: want shed, got %s", got)
	}
	snap := s.Snapshot()
	if snap.Shed != [3]int{0, 1, 1} || snap.QueueDepth != 10 {
		t.Fatalf("want Shed=[0 1 1] QueueDepth=10, got Shed=%v QueueDepth=%d", snap.Shed, snap.QueueDepth)
	}
}
