# Project Status — Agent Brain
> Last reviewed: 2026-03-05
> Reviewed by: Claude (deep scan, session 10)

## Project Overview
MIT MAS.664 HW2 + HW3. A live platform where AI agents self-organize into a networked brain (sensor / interneuron / actuator roles) modeled on biological neural circuits. Agents join by reading `/skill.md`, register with their capabilities + optional OpenClaw webhook, get claimed by their human, and then act based on their role. The platform pushes directives to actuators and sensor pings to sensors via OpenClaw gateways or generic webhooks.

**Live:** https://agent-brain-production.up.railway.app
**GitHub:** https://github.com/qsimeon/agent-brain (auto-deploys on push to main)
**Handoff:** `AGENT-BRAIN-HANDOFF.md` — read this first in any tool/session

## Live State (as of 2026-03-05, session 10)
- **DB reset** — 3 dummy placeholders only; Q_Agent registered as interneuron but no other real agents yet
- **Q_Agent test** — successfully read protocol, registered, was claimed, ran solo mode. Hit the expected wall (no real actuators), identified it correctly, needs solo mode curl commands (now in skill.md STEP 3)
- **skill.md v2.1** — compact algorithmic protocol with solo/paired/network mode branching, exact curl commands per mode
- **Webhook push model** — live; platform pushes to OpenClaw gateway on directive creation
- **Load-balanced role assignment** — agents assigned sensor/actuator to maintain balance; 3 agents always yields 1+1+1

## Progress Summary

| Area | Status | Notes |
|------|--------|-------|
| Core API (22 endpoints) | ✅ | All routes functional, auth enforced, JSON parse safety, regex escaping |
| Signal schema v2 | ✅ | source + timestamp + data required; source validated vs declared skills |
| Directive schema | ✅ | instructions + context required |
| Skill-based task suggestions | ✅ | Dynamic per-agent sensing skills |
| /api docs page | ✅ | Dark-theme HTML reference at /api |
| skill.md v2.1 | ✅ | Compact protocol, solo mode curl, webhook setup, mode branching |
| heartbeat.md | 🔧 | Still references old loop model; no solo mode section; not pointed to by skill.md |
| skill.json | 🔧 | Version still says 1.0.0 (should match skill.md v2.1) |
| Dual-interneuron prevention | ✅ | Two-layer: register + claim |
| Load-balanced role assignment | ✅ | Count-based: always fills the emptier bucket; 3 agents = 1+1+1 |
| Auto-rotation scheduler | ✅ | Fires every 60s check, 10min rotate, requires 3+ real agents |
| Per-agent removal (admin) | ✅ | DELETE /api/agents/:name + dashboard button |
| Role reassignment (admin) | ✅ | PATCH /api/agents/:name + dashboard dropdown (dummies disabled) |
| Claim page → start message | ✅ | Points agent at skill.md STEP 3 |
| Webhook push model | ✅ | OpenClaw /hooks/wake + generic POST; fire-and-forget on directive create |
| POST /api/signals/ping | ✅ | Interneuron wakes all sensors with webhookConfig |
| Security hardening | ✅ | escapeRegex, parseJsonBody, rel=noopener, SVG aria |
| Frontend: biological terminal aesthetic | ✅ | DM Serif Display, IBM Plex Mono, dot-grid, no emoji |
| D3 network graph | ✅ | Force-directed, role colors, placeholder dashed styling |
| Dashboard admin controls | ✅ | Role dropdown, remove, trigger rotation, persistent key |
| Outputs/gallery page | ✅ | Mono type labels, empty state handled |
| /scripts index + loop.py | ✅ | Served at /scripts and /scripts/loop.py |
| Recruitment posts | ✅ | LinkedIn, Ed, WhatsApp, Q_Agent, classmate DM templates in recruitment-posts.md |
| HW2 + HW3 submission | ✅ | Docs + video in ~/Documents/Spring 26 Classes/MAS664 Agents/ |
| Agents actually producing artifacts | 👤 | Q_Agent is interneuron; needs classmates' actuators to complete the loop |
| MongoDB password rotation | 👤 | Was briefly in git history |

## What's Complete

Everything is built, deployed, and hardened. The protocol is now fully self-contained with explicit solo/network mode branching and exact curl commands at each step. The push model is live. Role assignment is load-balanced. HW submitted.

## What's Left

### Claude Can Handle
- **heartbeat.md** — add solo mode section + update to match skill.md v2.1 framing (currently still says "loop every 2.5 min" old style, no solo mode, no webhook awareness)
- **skill.json** — bump version from 1.0.0 to 2.1.0 to match skill.md
- **/api docs page** — add the 2 new endpoints: POST /api/signals/ping and webhookConfig field in register

### Human Action Needed
- **Get classmates to rejoin** — use messages from `recruitment-posts.md`. Need 3 real agents for network mode, rotation, and meaningful collective output
- **Set up Q_Agent webhook** (optional) — re-register with OpenClaw gatewayUrl + hookToken so platform can push to it; currently Q_Agent has no webhookConfig
- **Rotate MongoDB password** — was briefly in git history via old HANDOFF.md

## Cleanup Recommendations

### Should Update
- `app/heartbeat.md/route.ts` — add solo mode section; remove "loop every 2.5 min" as primary framing since webhook agents don't loop; align with skill.md
- `app/skill.json/route.ts:L9` — `version: '1.0.0'` should be `'2.1.0'`

### Nothing to Delete
No dead files, dead scripts, or orphaned code found. All routes are reachable. No commented-out blocks.

## File Map (current, accurate)

```
app/
  api/page.tsx            — /api HTML docs (dark theme, grouped by role) [missing ping + webhookConfig]
  api/agents/             — register (+webhookConfig), list, detail (+DELETE +PATCH), me, claim/[token]
  api/brain/              — status, signals, directives, rotate
  api/signals/            — submit, list, tasks, ping
  api/directives/         — list, pending, accept, complete, artifact
  api/artifacts/          — gallery listing
  api/network/            — D3 graph data
  skill.md/route.ts       — protocol v2.1 (solo mode curl, webhook setup, mode branching)
  heartbeat.md/route.ts   — per-role loop [STALE: no solo mode, no webhook awareness]
  skill.json/route.ts     — OpenClaw metadata [STALE: version 1.0.0]
  scripts/route.ts        — /scripts index
  scripts/loop.py/route.ts — downloadable Python loop
  page.tsx                — landing page
  network/page.tsx        — D3 force graph
  outputs/page.tsx        — artifact gallery
  dashboard/page.tsx      — admin view
  agents/[name]/page.tsx  — agent detail
  claim/[token]/page.tsx  — claim + start message (points at skill.md STEP 3)
  layout.tsx              — nav + accessibility
  globals.css             — design tokens

lib/
  db/mongodb.ts           — connectDB() + auto-rotate init
  models/                 — Agent (+webhookConfig), Signal, Directive, Artifact, BrainState
  utils/
    agent-helpers.ts      — getRealAgentCount()
    api-helpers.ts        — successResponse, errorResponse, escapeRegex, parseJsonBody
    auto-rotate.ts        — setInterval scheduler
    notify-agent.ts       — push via OpenClaw /hooks/wake or generic POST
    skill-helpers.ts      — validateSkills(), assignRoleBySkills() (load-balanced)

scripts/
  seed.ts                 — wipes DB, creates 3 dummy agents
  check-state.ts          — DB inspector (shows skills + webhooks)

recruitment-posts.md      — LinkedIn/Ed/WhatsApp/Q_Agent onboarding messages
AGENT-BRAIN-HANDOFF.md   — universal tool-agnostic handoff doc
STATUS.md                 — this file
```

## Recommendations for Next Session

1. **Fix heartbeat.md + skill.json** — Minor but visible: heartbeat.md needs solo mode section and webhook awareness; skill.json version is stale. Both are 5-minute fixes.
2. **Get classmates back in** — Post the WhatsApp + Ed messages from `recruitment-posts.md`. Q_Agent alone as interneuron can't produce artifacts without a real actuator. One more agent (preferably an actuator) unlocks paired mode and the full sense→direct→execute→artifact loop.
3. **Watch the first artifact** — Once a real actuator is in, the pipeline should produce an artifact automatically when Q_Agent issues its next directive. Verify it shows up in /outputs.
