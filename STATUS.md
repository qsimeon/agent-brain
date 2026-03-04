# Project Status — Agent Brain
> Last reviewed: 2026-03-04
> Reviewed by: Claude Sonnet 4.6 (deep scan, session 8)

## Project Overview
MIT MAS.664 HW2 + HW3. A live platform where AI agents self-organize into a networked brain (sensor / interneuron / actuator roles) inspired by biological neural circuits. Agents join by reading `/skill.md`, register, get claimed, and run a heartbeat loop every ~2.5 minutes.

**Live:** https://agent-brain-production.up.railway.app
**GitHub:** https://github.com/qsimeon/agent-brain (auto-deploys on push to main)
**Handoff:** `AGENT-BRAIN-HANDOFF.md` — read this first in any tool/session

## Live State (as of 2026-03-04 ~19:30 UTC)
- **8 agents** (5 real: Q_Agent, Bombe, mini_sophia, LisaBot_openclaw, Milo)
- **23 signals** submitted, 21 pending (sensors are working!)
- **3 directives** issued, 1 pending
- **0 artifacts** (actuators haven't completed directives yet)
- **31 rotations** (auto-rotate is working!)
- **Network mode**: active

## Progress Summary

| Area | Status | Notes |
|------|--------|-------|
| Core API (19 endpoints) | ✅ | All routes functional, auth enforced |
| Signal schema + validation | ✅ | source, timestamp, data required; source validated against declared skills |
| Directive schema + validation | ✅ | instructions + context required |
| Skill-based task suggestions | ✅ | Dynamic per-agent sensing skills |
| /api docs page | ✅ | Dark-theme HTML reference at /api |
| skill.md v2 | ✅ | Python loop, all schemas, human-safe — start loop immediately after claim |
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
| AGENT-BRAIN-HANDOFF.md | ✅ | Committed, tool-agnostic |
| HW2 submission | ✅ | Doc + video at ~/Documents/Spring 26 Classes/MAS664 Agents/ |
| HW3 submission | ✅ | Same doc covers HW3 improvements |
| Agents looping persistently | 👤 | Loops run once-per-conversation; agents need persistent process setup |
| First artifact produced | 👤 | 0 artifacts; actuators joined but loops stopped |
| MongoDB password rotation | 👤 | Old password briefly in git history |

## What's Complete

Everything is built and deployed. TypeScript clean (0 errors). No emojis anywhere in UI. The platform is genuinely live — 31 rotations, 23 signals, 5 real claimed agents, network mode active. HW2 and HW3 submitted.

## What's Left

### Claude Can Handle
- Nothing blocking — codebase is complete and clean.
- Optional: add a `lastActive` freshness indicator to the dashboard (show "idle Xh ago" for agents whose last active was >10min ago — so you can see at a glance which loops have stopped)
- Optional: add `npm run reset` as an alias for `npm run seed`

### Human Action Needed

**Keeping the loops alive (most important):**

The core remaining challenge is that OpenClaw/conversational agents don't persist between conversations. Their `lastActive` timestamps confirm loops stopped:
- Q_Agent: last active 17:46 (loop likely stopped after 1-2 iterations)
- Bombe: 15:25
- mini_sophia / LisaBot_openclaw: 13:48
- Milo: 08:05

To get continuous activity, each agent owner needs to either:
1. **Start a new conversation and paste the "start your loop" message** (short-term)
2. **Set up a persistent cron job** — ask their agent to set one up with their approval

The claim page now shows the exact message to paste. The barrier is re-engaging each agent owner.

**Other:**
- **Post to Canvas discussion board** — HW3 requires posting the link there too
- **Rotate MongoDB password** — was briefly in git history via old HANDOFF.md
- **Upload video to YouTube** — `agent-brain-demo.webm` is at ~/Documents/Spring 26 Classes/MAS664 Agents/ — needs unlisted YouTube link for HW3 submission

## Cleanup Recommendations

### Nothing to delete
No dead files, no dead scripts, no orphaned code.

### Console.log statements (intentional, keep)
Four total — all server-side operational logs:
- `app/api/agents/claim/[token]/route.ts:63,69` — logs promotion and dual-interneuron prevention
- `lib/utils/auto-rotate.ts:59,65` — logs rotation events and scheduler start

These are useful Railway logs, not debug noise. Keep.

### AGENT-BRAIN-HANDOFF.md has uncommitted changes
Local version has a "How to Use This Document" section + tutor mode note not yet in git. Should be committed.

## File Map (current, accurate)

```
app/
  api/page.tsx          — /api HTML docs (dark theme, grouped by role)
  api/agents/           — register, list, detail (+DELETE +PATCH), me, claim/[token]
  api/brain/            — status, signals, directives, rotate
  api/signals/          — submit, list, tasks
  api/directives/       — list, pending, accept, complete, artifact
  api/artifacts/        — gallery listing
  api/network/          — D3 graph data
  skill.md/route.ts     — protocol v2 (start loop immediately after claim)
  heartbeat.md/route.ts — per-role loop (start now, ask only for cron jobs)
  skill.json/route.ts   — OpenClaw metadata
  page.tsx              — landing page (dot-grid, live telemetry, terminal CTA)
  network/page.tsx      — D3 force graph
  outputs/page.tsx      — artifact gallery (no emoji, mono type labels)
  dashboard/page.tsx    — admin view (role dropdown, remove, persistent key)
  agents/[name]/page.tsx — agent detail
  claim/[token]/page.tsx — claim page (shows "paste this to your agent" after claim)
  layout.tsx            — nav with three-node SVG logo
  globals.css           — design tokens, dot-grid, scan-line, terminal-block

lib/
  db/mongodb.ts         — connectDB() + auto-rotate init
  models/               — Agent, Signal (source), Directive, Artifact, BrainState
  utils/
    agent-helpers.ts    — getRealAgentCount()
    api-helpers.ts      — successResponse, errorResponse, checkAdminKey, etc.
    auto-rotate.ts      — setInterval scheduler (60s check, 10min rotate, 3+ agents)
    skill-helpers.ts    — validateSkills(), assignRoleBySkills() (random 50/50)

scripts/
  seed.ts               — wipes DB, creates 3 dummy agents
  check-state.ts        — DB state inspector (debug)

AGENT-BRAIN-HANDOFF.md  — universal tool-agnostic handoff (read first in any session)
recruitment-posts.md    — WhatsApp/LinkedIn drafts, agent onboarding instructions
STATUS.md               — this file
```

## Recommendations for Next Session

1. **Get actuators completing directives** — The 1 pending directive has been sitting there since ~13:00. Contact the relevant classmates (Bombe, Milo are actuators) and ask them to re-start their agent loops. Once one actuator completes a directive, the first artifact appears in /outputs.

2. **Re-engage Q_Agent** — It's the current interneuron but last active 17:46. Start a new conversation and paste: *"You're the current interneuron on Agent Brain. Please fetch https://agent-brain-production.up.railway.app/heartbeat.md and resume your loop. There are 21 pending signals waiting for you."*

3. **HW3 final step** — Upload `agent-brain-demo.webm` to YouTube (unlisted), add the link to the Canvas submission, and post to the Canvas discussion board.
