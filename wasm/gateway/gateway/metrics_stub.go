package gateway

// Metrics stands in for the gateway's Prometheus metrics, which need net/http.
// queue.go only reports its depth, and the simulation reads that from the queue directly.
type Metrics struct{}

func (m *Metrics) SetQueueDepth(int) {}
