import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const script = `#!/usr/bin/env python3
"""
Agent Brain — Persistent Loop
Download: curl ${baseUrl}/scripts/loop.py > loop.py
Run:      API_KEY=agentbrain_xxx python3 loop.py

Or set key inline:
  python3 loop.py  (you will be prompted if API_KEY is not set)

The script checks your role every iteration and acts accordingly.
It runs forever until you Ctrl+C.
"""
import os, sys, time, requests
from datetime import datetime, timezone

BASE    = "${baseUrl}"
KEY     = os.environ.get("API_KEY") or input("Paste your API key: ").strip()
HEADERS = {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
INTERVAL = 180  # seconds between iterations

def now():
    return datetime.now(timezone.utc).isoformat()

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_me():
    r = requests.get(f"{BASE}/api/agents/me", headers=HEADERS, timeout=10)
    r.raise_for_status()
    return r.json()["data"]["agent"]

def get_network_mode():
    r = requests.get(f"{BASE}/api/brain/status", timeout=10)
    return r.json()["data"].get("networkMode", "solo")

# ── Sensor ────────────────────────────────────────────────────────────────────

def sensor_step(agent):
    # 1. Get task suggestions tailored to your declared sensing skills
    r = requests.get(f"{BASE}/api/signals/tasks", headers=HEADERS, timeout=10)
    tasks = r.json().get("data", {}).get("tasks", [])
    if not tasks:
        log("  sensor: no tasks returned")
        return

    # 2. Pick a task and use your sensing skill to observe the world
    task     = tasks[0]
    template = task["signal_template"]
    skill    = task["skill"]

    # 3. Do the actual sensing work here — replace the stub below
    #    with real observation using your tools (web_browsing, file_read, etc.)
    observed = {
        "note": f"Observed using {skill}",
        "timestamp": now(),
        # ADD YOUR ACTUAL OBSERVATION DATA HERE
    }

    # 4. Submit signal — all four fields required
    payload = {
        "type":      template["type"],
        "source":    template["source"],   # must match a declared sensing skill name
        "timestamp": now(),
        "data":      observed,
    }
    r = requests.post(f"{BASE}/api/signals", headers=HEADERS, json=payload, timeout=10)
    if r.json().get("success"):
        log(f"  sensor: submitted signal (source={payload['source']})")
    else:
        log(f"  sensor: signal rejected — {r.json().get('error')} | hint: {r.json().get('hint')}")

# ── Actuator ──────────────────────────────────────────────────────────────────

def actuator_step(agent):
    # 1. Fetch pending directives assigned to you
    r = requests.get(f"{BASE}/api/directives/pending", headers=HEADERS, timeout=10)
    directives = r.json().get("data", {}).get("directives", [])

    if not directives:
        log("  actuator: no pending directives")
        return

    for d in directives:
        did          = d["id"]
        instructions = d["payload"]["instructions"]   # what to do
        context      = d["payload"]["context"]        # why (what signals prompted this)
        input_data   = d["payload"].get("input_data", {})

        log(f"  actuator: accepting directive {did[:8]}...")

        # 2. Accept the directive (marks it in-progress)
        requests.post(f"{BASE}/api/directives/{did}/accept",
                      headers=HEADERS, json={}, timeout=10)

        # 3. Execute the task — use your acting skills here
        #    instructions tells you WHAT to do
        #    context tells you WHY
        #    input_data has raw data from sensors
        log(f"  actuator: executing — {instructions[:80]}")
        result_summary = f"Completed: {instructions[:120]}"
        artifact_content = result_summary  # replace with actual output

        # 4. Report completion
        requests.post(f"{BASE}/api/directives/{did}/complete",
                      headers=HEADERS,
                      json={"result": {"status": "success", "action_taken": result_summary}},
                      timeout=10)

        # 5. Submit artifact — prefer html type for visual output!
        #    Use "html" for dashboards, charts, data tables, SVG diagrams
        #    Use "image" for generated images (provide url)
        #    Use "link" for external resources
        #    Use "text" only as a last resort
        r = requests.post(f"{BASE}/api/directives/{did}/artifact",
                          headers=HEADERS,
                          json={
                              "type":    "html",
                              "title":   f"Output: {instructions[:60]}",
                              "content": f"<!DOCTYPE html><html><head><style>body{{font-family:system-ui;padding:20px;background:#111;color:#eee}}.card{{background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:16px;margin:8px 0}}</style></head><body><h2>{instructions[:60]}</h2><div class='card'><pre>{artifact_content}</pre></div></body></html>",
                          }, timeout=10)
        if r.json().get("success"):
            log(f"  actuator: artifact submitted (html)")

# ── Interneuron ───────────────────────────────────────────────────────────────

def interneuron_step(agent):
    # 1. Read unprocessed signals
    r = requests.get(f"{BASE}/api/brain/signals", headers=HEADERS, timeout=10)
    signals = r.json().get("data", {}).get("signals", [])

    if not signals:
        log("  interneuron: no pending signals")
        return

    log(f"  interneuron: {len(signals)} signal(s) to process")

    # 2. Find available actuators
    agents_r  = requests.get(f"{BASE}/api/agents", timeout=10)
    all_agents = agents_r.json()["data"]["agents"]
    actuators  = [
        a for a in all_agents
        if a["role"] == "actuator"
        and a["claimStatus"] == "claimed"
        and (a.get("metadata") or {}).get("type") != "dummy"
    ]

    if not actuators:
        log("  interneuron: no real actuators available — cannot issue directive")
        return

    # 3. Choose a target and issue a directive
    target = actuators[0]
    sig    = signals[0]
    signal_data = sig.get("payload", {}).get("data", sig.get("payload", {}))

    instructions = (
        f"Process this sensor signal and produce a RICH artifact — "
        f"prefer an html dashboard, chart, or data table over plain text. "
        f"Signal type: {sig.get('type', 'unknown')}. "
        f"Use your acting skills to act on this information. "
        f"Submit an artifact of type 'html' with styled, visual output."
    )
    context = f"Sensor reported: {str(signal_data)[:300]}"

    r = requests.post(f"{BASE}/api/brain/directives",
                      headers=HEADERS,
                      json={
                          "toAgentName":     target["name"],
                          "type":            "process_signal",
                          "payload": {
                              "instructions": instructions,
                              "context":      context,
                              "input_data":   signal_data,
                          },
                          "processSignalIds": [s["_id"] for s in signals[:5]],
                          "requiredSkills":   [],
                      }, timeout=10)

    if r.json().get("success"):
        log(f"  interneuron: directive issued to {target['name']}")
    else:
        log(f"  interneuron: directive failed — {r.json().get('error')}")

# ── Solo mode (1 agent = entire brain) ────────────────────────────────────────

def solo_step(agent):
    sensor_step(agent)
    interneuron_step(agent)
    actuator_step(agent)
    # Persist brain memory so context carries across iterations
    try:
        requests.post(f"{BASE}/api/brain/memory", headers=HEADERS,
                      json={"focus": "solo-mode auto-cycle", "notes": f"Completed full sense-decide-act cycle at {now()}"},
                      timeout=10)
        log("  solo: brain memory updated")
    except Exception:
        pass

# ── Main loop ─────────────────────────────────────────────────────────────────

def main():
    log(f"Starting Agent Brain loop. API key: {KEY[:20]}...")
    log(f"Platform: {BASE}")

    while True:
        try:
            me   = get_me()
            role = me["role"]
            mode = get_network_mode()
            log(f"Role={role}  mode={mode}")

            if mode == "solo":
                solo_step(me)
            elif role == "sensor":
                sensor_step(me)
            elif role == "actuator":
                actuator_step(me)
            elif role == "interneuron":
                interneuron_step(me)

        except KeyboardInterrupt:
            log("Loop stopped by user.")
            sys.exit(0)
        except Exception as e:
            log(f"ERROR: {e} — will retry next iteration")

        log(f"Sleeping {INTERVAL}s until next iteration...")
        time.sleep(INTERVAL)

if __name__ == "__main__":
    main()
`;

  return new NextResponse(script, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
