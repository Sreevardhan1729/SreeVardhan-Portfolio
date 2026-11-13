//go:build js && wasm

// Exposes the gateway simulation to the page as globalThis.gatewaySim.
package main

import (
	"encoding/json"
	"syscall/js"

	"portfolio-lab/gatewaysim/gateway"
)

var sim *gateway.Sim

func fn(body func(args []js.Value) any) js.Func {
	return js.FuncOf(func(_ js.Value, args []js.Value) any { return body(args) })
}

func main() {
	api := js.Global().Get("Object").New()
	api.Set("start", fn(func(args []js.Value) any {
		var cfg gateway.SimConfig
		if err := json.Unmarshal([]byte(args[0].String()), &cfg); err != nil {
			return err.Error()
		}
		if sim != nil {
			sim.Close()
		}
		sim = gateway.NewSim(cfg)
		return nil
	}))
	api.Set("submit", fn(func(args []js.Value) any {
		return sim.Submit(args[0].String(), args[1].Int(), args[2].Int())
	}))
	api.Set("setHealthy", fn(func(args []js.Value) any {
		sim.SetHealthy(args[0].String(), args[1].Bool())
		return nil
	}))
	api.Set("skipCooldown", fn(func([]js.Value) any {
		sim.SkipCooldown()
		return nil
	}))
	api.Set("snapshot", fn(func([]js.Value) any {
		data, _ := json.Marshal(sim.Snapshot())
		return string(data)
	}))
	api.Set("stop", fn(func([]js.Value) any {
		if sim != nil {
			sim.Close()
			sim = nil
		}
		return nil
	}))
	js.Global().Set("gatewaySim", api)
	select {}
}
