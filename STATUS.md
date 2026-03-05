# Project Status — Agent Brain
> Last reviewed: 2026-03-05
> Reviewed by: Cursor (codebase audit + cleanup)

## Project Overview
MIT MAS.664 HW2 + HW3. A live platform where AI agents self-organize into a networked brain (sensor / interneuron / actuator roles) inspired by biological neural circuits. Agents join by reading `/skill.md`, register, get claimed, and run a heartbeat loop. Supports push-based communication via webhooks (OpenClaw or generic).

**Live:** https://agent-brain-production.up.railway.app
**GitHub:** https://github.com/qsimeon/agent-brain (auto-deploys on push to main)
**Handoff:** `AGENT-BRAIN-HANDOFF.md` — read this first in any tool/session

## Live State (as of 2026-03-05)
- **DB reset** — previous agents cleared; 3 dummy placeholders remain
- **Webhook push model** added — agents can receive notifications instead of polling
- **skill.md v2.1** — compact algorithmic protocol + downloadable `loop.py` script
- **Security hardened** — regex escaping, JSON parse safety, accessibility fixes

## Progress Summary

| Area | Status | Notes |
|------|--------|-------|
| Core API (21 endpoints) | ✅ | All routes functional, auth enforced, JSON parse safety |
| Signal schema + validation | ✅ | source, timestamp, data required; source validated against declared skills |
| Directive schema + validation | ✅ | instructions + context required |
| Skill-based task suggestions | ✅ | Dynamic per-agent sensing skills |
| /api docs page | ✅ | Dark-theme HTML reference at /api |
| skill.md v2.1 | ✅ | Compact algorithmic protocol + downloadable loop.py script |
| heartbeat.md v2 | ✅ | Per-role decision trees, exact curl |
| Dual-interneuron prevention | ✅ | Two-layer: register + claim |
| Random role assignment | ✅ | 50/50, not skill-biased |
| Auto-rotation scheduler | ✅ | Fires every 10min with 3+ agents (31 rotations confirmed) |
| Per-agent removal (admin) | ✅ | DELETE /api/agents/:name + dashboard button |
| Role reassignment (admin) | ✅ | PATCH /api/agents/:name + dashboard dropdown (dummies disabled) |
| Claim page → start loop | ✅ | Shows exact message to paste to agent + copy button |
| Frontend: biological terminal aesthetic | ✅ | DM Serif Display, IBM Plex Mono, dot-grid, no emoji |
| Outputs/gallery page | ✅ | No emoji, mono type labels |
| D3 network graph | ✅ | Force-directed, role colors, placeholder styling |
| Dashboard admin controls | ✅ | Role dropdown, remove button, persistent admin key field |
| Webhook push model | ✅ | OpenClaw + generic webhook support; fire-and-forget notifications |
| POST /api/signals/ping | ✅ | Interneuron can wake all sensors with webhookConfig |
| Security hardening | ✅ | Regex escaping (escapeRegex), parseJsonBody, consistent errorResponse |
| Accessibility | ✅ | rel=noopener, SVG titles, aria labels |
| AGENT-BRAIN-HANDOFF.md | ✅ | Committed, tool-agnostic |
| HW2 submission | ✅ | Doc + video at ~/Documents/Spring 26 Classes/MAS664 Agents/ |
| HW3 submission | ✅ | Same doc covers HW3 improvements |
| Agents looping persistently | 👤 | Webhooks now solve this for agents that register webhookConfig |
| First artifact produced | 👤 | 0 artifacts — needs actuators completing directives |
| MongoDB password rotation | 👤 | Old password briefly in git history |

## What's Complete

Everything is built, deployed, and hardened. TypeScript clean (0 errors). No emojis in UI. Webhooks solve the persistent-loop problem for agents that register webhookConfig. HW2 and HW3 submitted.

## What's Left

### Claude Can Handle
- Nothing blocking — codebase is complete and clean.
- Optional: add `lastActive` freshness indicator to dashboard
- Optional: update `/api` docs page to include the 2 new endpoints (signals/ping, webhookConfig in register)

### Human Action Needed
- **Get agents registered** — DB was reset. Use the messages in `recruitment-posts.md` to re-onboard Q_Agent and recruit classmates. Agents with webhookConfig will receive push notifications automatically.
- **Rotate MongoDB password** — was briefly in git history via old HANDOFF.md
- **Post to Canvas discussion board** — if required for HW3

## Cleanup Status

No dead files, no dead scripts, no orphaned code. Console.log statements in claim and auto-rotate routes are intentional Railway operational logs.

## File Map (current, accurate)

```
app/
  api/page.tsx          — /api HTML docs (dark theme, grouped by role)
  api/agents/           — register (+webhookConfig), list, detail (+DELETE +PATCH), me, claim/[token]
  api/brain/            — status, signals, directives, rotate
  api/signals/          — submit, list, tasks, ping (interneuron wakes sensors)
  api/directives/       — list, pending, accept, complete, artifact
  api/artifacts/        — gallery listing
  api/network/          — D3 graph data
  skill.md/route.ts     — protocol v2.1 (compact, links to loop.py)
  heartbeat.md/route.ts — per-role loop with decision trees
  skill.json/route.ts   — OpenClaw metadata
  scripts/              — /scripts index + /scripts/loop.py (downloadable Python)
  page.tsx              — landing page (dot-grid, live telemetry, terminal CTA)
  network/page.tsx      — D3 force graph
  outputs/page.tsx      — artifact gallery
  dashboard/page.tsx    — admin view (role dropdown, remove, persistent key)
  agents/[name]/page.tsx — agent detail
  claim/[token]/page.tsx — claim page + agent onboarding message
  layout.tsx            — nav with three-node SVG logo + accessibility
  globals.css           — design tokens, dot-grid, scan-line, terminal-block

lib/
  db/mongodb.ts         — connectDB() + auto-rotate init
  models/               — Agent (+webhookConfig), Signal (source), Directive, Artifact, BrainState
  utils/
    agent-helpers.ts    — getRealAgentCount()
    api-helpers.ts      — successResponse, errorResponse, escapeRegex, parseJsonBody, sanitizeInput
    auto-rotate.ts      — setInterval scheduler (60s check, 10min rotate, 3+ agents)
    notify-agent.ts     — push directives/pings via OpenClaw or generic webhooks
    skill-helpers.ts    — validateSkills(), assignRoleBySkills() (random 50/50)

scripts/
  seed.ts               — wipes DB, creates 3 dummy agents
  check-state.ts        — DB state inspector (shows skills + webhooks)

AGENT-BRAIN-HANDOFF.md  — universal tool-agnostic handoff (read first in any session)
recruitment-posts.md    — WhatsApp/LinkedIn drafts, agent onboarding instructions
STATUS.md               — this file
```

## Recommendations for Next Session

1. **Register Q_Agent fresh** — DB was reset. Use the onboarding message from `recruitment-posts.md`. Have it include `webhookConfig` during registration for push notifications.
2. **Recruit classmates** — Post the WhatsApp/LinkedIn drafts from `recruitment-posts.md`. Need 3+ real agents for network mode + auto-rotation.
3. **Test the full flow** — sensor signal → interneuron reads → directive issued (+ push notification to actuator) → actuator completes → artifact in /outputs.
