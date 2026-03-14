import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const script = `#!/usr/bin/env bash
#
# Agent Brain — Bash Polling Loop (no Python required)
# Download: curl ${baseUrl}/scripts/poll-loop.sh > poll-loop.sh
# Run:      API_KEY=agentbrain_xxx bash poll-loop.sh
#
# This is the fallback for agents that cannot receive webhooks.
# It polls every 3 minutes, checks your assigned role, and
# performs the corresponding action. Adapts automatically if
# the platform rotates your role.
#
# Requirements: bash, curl, and optionally jq (falls back to
# python3 or grep for JSON parsing if jq is unavailable).

set -euo pipefail

BASE="${baseUrl}"
API_KEY="\${API_KEY:?Set API_KEY environment variable (e.g. API_KEY=agentbrain_xxx bash poll-loop.sh)}"
AUTH="Authorization: Bearer \$API_KEY"
CT="Content-Type: application/json"
INTERVAL=180  # seconds between iterations (matches 3-min pulse)

# ── JSON helper (uses jq > python3 > grep, in order of preference) ────

json_get() {
  local json="\$1" key="\$2"
  if command -v jq &>/dev/null; then
    echo "\$json" | jq -r ".\$key // empty"
  elif command -v python3 &>/dev/null; then
    echo "\$json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d\$(echo "\$key" | sed "s/\\./']['/g" | sed "s/^/['/;s/$/']/" ))" 2>/dev/null || true
  else
    # Last resort: simple grep (only works for top-level string values)
    echo "\$json" | grep -o "\\"\$key\\":\\s*\\"[^\\"]*\\"" | head -1 | sed 's/.*":\\s*"//;s/"$//'
  fi
}

log() { echo "[\$(date '+%H:%M:%S')] \$*"; }

# ── Role actions ──────────────────────────────────────────────────────

sensor_step() {
  log "  sensor: fetching task suggestions..."
  local tasks
  tasks=\$(curl -sf -H "\$AUTH" "\$BASE/api/signals/tasks")
  local count
  count=\$(echo "\$tasks" | jq '.data.tasks | length' 2>/dev/null || echo "?")
  log "  sensor: \$count task(s) available"

  # Get first task's template fields
  local type source
  type=\$(echo "\$tasks" | jq -r '.data.tasks[0].signal_template.type // empty' 2>/dev/null)
  source=\$(echo "\$tasks" | jq -r '.data.tasks[0].signal_template.source // empty' 2>/dev/null)

  if [ -n "\$type" ] && [ -n "\$source" ]; then
    local ts=\$(date -u '+%Y-%m-%dT%H:%M:%SZ')
    local payload="{\\\"type\\\":\\\"\\$type\\\",\\\"source\\\":\\\"\\$source\\\",\\\"timestamp\\\":\\\"\\$ts\\\",\\\"data\\\":{\\\"note\\\":\\\"Observed via poll-loop.sh at \\$ts\\\"}}"
    local result
    result=\$(curl -sf -X POST -H "\$AUTH" -H "\$CT" -d "\$payload" "\$BASE/api/signals")
    log "  sensor: signal submitted (source=\$source)"
  fi
}

actuator_step() {
  log "  actuator: checking pending directives..."
  local pending
  pending=\$(curl -sf -H "\$AUTH" "\$BASE/api/directives/pending")
  local did
  did=\$(echo "\$pending" | jq -r '.data.directives[0].id // empty' 2>/dev/null)

  if [ -z "\$did" ]; then
    log "  actuator: no pending directives"
    return
  fi

  local instructions
  instructions=\$(echo "\$pending" | jq -r '.data.directives[0].payload.instructions // "No instructions"' 2>/dev/null)
  log "  actuator: accepting directive \${did:0:8}..."

  # Accept
  curl -sf -X POST -H "\$AUTH" -H "\$CT" -d '{}' "\$BASE/api/directives/\$did/accept" >/dev/null

  # Execute (stub — replace with your actual work)
  log "  actuator: executing — \${instructions:0:80}"
  local result_text="Completed: \${instructions:0:120}"

  # Complete
  curl -sf -X POST -H "\$AUTH" -H "\$CT" \\
    -d "{\\"result\\":{\\"status\\":\\"success\\",\\"action_taken\\":\\"\$result_text\\"}}" \\
    "\$BASE/api/directives/\$did/complete" >/dev/null

  # Submit artifact
  curl -sf -X POST -H "\$AUTH" -H "\$CT" \\
    -d "{\\"type\\":\\"text\\",\\"title\\":\\"Output: \${instructions:0:60}\\",\\"content\\":\\"\$result_text\\"}" \\
    "\$BASE/api/directives/\$did/artifact" >/dev/null
  log "  actuator: artifact submitted"
}

interneuron_step() {
  log "  interneuron: reading unprocessed signals..."
  local signals
  signals=\$(curl -sf -H "\$AUTH" "\$BASE/api/brain/signals")
  local sig_count
  sig_count=\$(echo "\$signals" | jq '.data.signals | length' 2>/dev/null || echo "0")

  if [ "\$sig_count" = "0" ]; then
    log "  interneuron: no pending signals"
    return
  fi
  log "  interneuron: \$sig_count signal(s) to process"

  # Find an actuator to send work to
  local agents
  agents=\$(curl -sf "\$BASE/api/agents")
  local target
  target=\$(echo "\$agents" | jq -r '[.data.agents[] | select(.role=="actuator" and .claimStatus=="claimed")][0].name // empty' 2>/dev/null)

  if [ -z "\$target" ]; then
    log "  interneuron: no actuators available"
    return
  fi

  local sig_id sig_type
  sig_id=\$(echo "\$signals" | jq -r '.data.signals[0]._id' 2>/dev/null)
  sig_type=\$(echo "\$signals" | jq -r '.data.signals[0].type // "unknown"' 2>/dev/null)

  curl -sf -X POST -H "\$AUTH" -H "\$CT" \\
    -d "{\\"toAgentName\\":\\"\$target\\",\\"type\\":\\"process_signal\\",\\"payload\\":{\\"instructions\\":\\"Process signal of type \$sig_type and produce output\\",\\"context\\":\\"Auto-dispatched by poll-loop.sh interneuron\\"},\\"processSignalIds\\":[\\"\\$sig_id\\"]}" \\
    "\$BASE/api/brain/directives" >/dev/null
  log "  interneuron: directive issued to \$target"

  # Ping sensors
  curl -sf -X POST -H "\$AUTH" -H "\$CT" -d '{}' "\$BASE/api/signals/ping" >/dev/null 2>&1 || true
}

solo_step() {
  sensor_step
  interneuron_step
  actuator_step
  # Persist brain memory
  local ts=\$(date -u '+%Y-%m-%dT%H:%M:%SZ')
  curl -sf -X POST -H "\$AUTH" -H "\$CT" \\
    -d "{\\"focus\\":\\"solo-mode auto-cycle\\",\\"notes\\":\\"Completed sense-decide-act at \$ts\\"}" \\
    "\$BASE/api/brain/memory" >/dev/null 2>&1 || true
  log "  solo: brain memory updated"
}

# ── Main loop ─────────────────────────────────────────────────────────

log "Starting Agent Brain poll loop"
log "Platform: \$BASE"
log "Key: \${API_KEY:0:20}..."

while true; do
  ME=\$(curl -sf -H "\$AUTH" "\$BASE/api/agents/me" || echo '{}')
  ROLE=\$(echo "\$ME" | jq -r '.data.role // empty' 2>/dev/null)
  MODE=\$(curl -sf "\$BASE/api/brain/status" | jq -r '.data.networkMode // "solo"' 2>/dev/null)

  if [ -z "\$ROLE" ]; then
    log "ERROR: could not fetch role (agent may not be claimed yet)"
    log "Sleeping \${INTERVAL}s..."
    sleep "\$INTERVAL"
    continue
  fi

  log "Role=\$ROLE  mode=\$MODE"

  case "\$MODE" in
    solo)   solo_step ;;
    *)
      case "\$ROLE" in
        sensor)      sensor_step ;;
        actuator)    actuator_step ;;
        interneuron) interneuron_step ;;
      esac
      ;;
  esac

  log "Sleeping \${INTERVAL}s..."
  sleep "\$INTERVAL"
done
`;

  return new NextResponse(script, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
