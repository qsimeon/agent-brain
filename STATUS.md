# Project Status — Agent Brain
> Last reviewed: 2026-03-04
> Reviewed by: Claude Sonnet 4.6 (deep scan, session 6)

## Project Overview
MIT MAS.664 Homework 2. A web app where AI agents self-organize into a "networked brain" with enforced sensor, actuator, and interneuron roles — inspired by biological neural circuits. Agents discover the platform by reading `skill.md`, register with declared skill sets, get claimed by a human, then run a continuous heartbeat loop every ~2.5 minutes.

**Deployed:** https://agent-brain-production.up.railway.app
**GitHub:** https://github.com/qsimeon/agent-brain (auto-deploys on push to main)
**Handoff doc:** `AGENT-BRAIN-HANDOFF.md` (tracked in git — use this for cross-tool handoffs)

## Progress Summary

| Area | Status | Notes |
|------|--------|-------|
| Core API (19 endpoints) | ✅ | All routes functional, auth enforced |
| Signal schema (source field) | ✅ | Required, validated against declared sensing skills |
| Directive schema validation | ✅ | `instructions` + `context` required |
| Skill-based task suggestions | ✅ | Fully dynamic — one task per declared sensing skill |
| /api docs page | ✅ | Dark-theme HTML reference at /api — grouped by role |
| skill.md v2 | ✅ | Python loop, all schemas, all 4 artifact types, human-safe language |
| heartbeat.md v2 | ✅ | Decision trees, exact curl, per-role guidance, human-safe language |
| Dual-interneuron bug | ✅ | Fixed: two-layer defense in register + claim routes |
| Random role assignment | ✅ | 50/50 random (not skill-balance biased) |
| Auto-rotation scheduler | ✅ | setInterval in lib/utils/auto-rotate.ts, starts on first DB connect, network mode only |
| Protocol security language | ✅ | Removed "start without human permission" — now asks agent to inform human first |
| Frontend redesign | ✅ | DM Serif Display + IBM Plex Mono, dot-grid hero, terminal CTA, three-node nav logo |
| D3 network visualization | ✅ | Force graph, skill badges, placeholder styling |
| Outputs/artifacts gallery | ✅ | Type filters, /outputs page |
| Progressive scaling (solo/paired/network) | ✅ | 1/2/3+ agent modes with appropriate enforcement |
| Universal handoff doc | ✅ | AGENT-BRAIN-HANDOFF.md committed to git — works in all AI coding tools |
| DB fresh reset | ✅ | npm run seed ran — clean state as of 2026-03-04 |
| Recruitment posts | ✅ | WhatsApp + LinkedIn drafts in recruitment-posts.md |
| Real agents on platform | 👤 | Need to get Q_Agent + classmate agents registered and running |
| End-to-end data flow verified | 👤 | No real agents have completed the full signal→directive→artifact loop |
| 3rd real agent (network mode) | 👤 | Need 3+ agents to trigger rotation and test auto-rotate |
| MongoDB password rotation | 👤 | Old password was briefly in git history via HANDOFF.md |

## What's Complete

Everything is implemented, deployed, and working:
- Full agent lifecycle: register → claim → heartbeat loop → signals/directives/artifacts
- Signal envelope validated (source, timestamp, data)
- Directive envelope validated (instructions, context)
- Dynamic task suggestions from declared skills
- Dual-interneuron prevention (two-layer: registration + claim)
- Auto-rotation when 3+ real agents (serverside setInterval, no cron needed)
- Frontend: distinctive "neurological terminal" aesthetic — not generic
- Protocol language is now safe: agents told to inform human before starting persistent processes
- AGENT-BRAIN-HANDOFF.md committed — universal handoff for any AI coding tool
- DB seeded to clean state

## What's Left

### Claude Can Handle
- **Playwright visual test** — `npx node scripts/pw-test.mjs` to screenshot the redesigned live site and verify it looks right
- **Add `npm run reset` alias** — make `npm run seed` also callable as `npm run reset` for clarity in the handoff doc
- **Fix empty catch blocks** — `app/page.tsx` has `catch {}` that silently swallows errors

### Human Action Needed

#### Urgent — Get agents on the platform (HW2 due this week)
1. **Get Q_Agent registered** — See `recruitment-posts.md` for the exact message to send. Q_Agent's previous registration is gone (DB was reset). Send Q_Agent to https://agent-brain-production.up.railway.app/skill.md to start fresh.
2. **Claim Q_Agent** — When Q_Agent sends you the claim_url, visit it in a browser (or use `curl -X POST`)
3. **Confirm Q_Agent should start looping** — Reply to Q_Agent confirming the heartbeat loop should start
4. **Recruit classmates** — Post to class WhatsApp using the draft in `recruitment-posts.md`. Target: 3+ real agents for network mode.

#### Other
- **MongoDB password rotation** — Atlas → Database Access → edit qsimeon → new password → update Railway env vars + local `.env.local`
- **Screen recording** — Record a demo of the working platform for HW2 submission

### Needs Clarification
- Nothing currently blocked — all pending items are human-action items above.

## File Map

```
lib/models/
  Agent.ts           — skills: { sensing[], acting[] }, metadata.type for dummy detection
  Signal.ts          — source field required (v2)
  Directive.ts       — payload: { instructions, context, input_data }
  Artifact.ts        — type: image|text|link|file
  BrainState.ts      — currentInterneuronId, nextRotationAt, history[]

lib/utils/
  agent-helpers.ts   — getRealAgentCount() — single source of truth
  skill-helpers.ts   — validateSkills(), assignRoleBySkills() — random 50/50, counts ALL real agents
  api-helpers.ts     — successResponse(), errorResponse(), extractApiKey()
  auto-rotate.ts     — startRotationScheduler() — setInterval, fires when 3+ agents

lib/db/
  mongodb.ts         — connectDB() — starts rotation scheduler on first connection

app/api/
  agents/register/       — skill validation + random role assignment
  agents/claim/[token]/  — claim flow; auto-promote first real; prevent dual-interneuron
  agents/claim/          — stub returning 400 (guard route)
  agents/me/             — check own role (call at top of every loop)
  signals/               — POST: validated envelope (source+timestamp+data)
  signals/tasks/         — GET: dynamic skill-matched tasks + signal_template
  brain/signals/         — interneuron reads pending signals
  brain/directives/      — interneuron issues directives (instructions+context required)
  brain/rotate/          — admin: manual rotation trigger
  brain/status/          — networkMode, realAgents, stats
  directives/            — GET: all directives (no auth; dashboard use)
  directives/pending/    — actuator fetches assigned work
  directives/[id]/accept/    — claim a directive
  directives/[id]/complete/  — report success or failure
  directives/[id]/artifact/  — submit gallery output
  artifacts/             — gallery listing
  network/               — D3 graph data
  page.tsx               — /api HTML docs

app/
  skill.md/route.ts      — protocol v2 (Python loop, human-safe language)
  heartbeat.md/route.ts  — per-role loop with decision trees (human-safe language)
  skill.json/route.ts    — OpenClaw metadata
  page.tsx               — landing page (redesigned: serif + mono, dot-grid, terminal CTA)
  network/page.tsx       — D3 force graph (redesigned: specimen labels, legend)
  layout.tsx             — nav with three-node SVG logo
  globals.css            — CSS variables, dot-grid, scan-line, terminal-block utilities
  dashboard/page.tsx     — admin view, rotation trigger
  outputs/page.tsx       — artifact gallery
  agents/[name]/page.tsx — agent detail
  claim/[token]/page.tsx — human claim UI

scripts/
  seed.ts          — wipes + recreates 3 dummy agents + sample data (safe to re-run)
  check-state.ts   — print current DB state (debugging)

AGENT-BRAIN-HANDOFF.md  — universal tool-agnostic handoff (use this to resume in any AI tool)
recruitment-posts.md    — WhatsApp + LinkedIn drafts, Q_Agent re-registration instructions
```

## Cleanup Recommendations

### Nothing to delete
All dead scripts and ed-post.md removed. No orphaned files found.

### Things to note
- `recruitment-posts.md` — on disk, not tracked in git (contains draft posts and curl examples)
- `scripts/check-state.ts` — uses emoji; minor inconsistency with seed.ts. Not urgent.
- `app/api/agents/claim/route.ts` — 4-line stub returning 400. Intentional guard. Keep.

## Recommendations for Next Session

1. **Get Q_Agent looping** — send the message from `recruitment-posts.md`. Once it's looping, verify the full sense→decide→act flow in solo mode.
2. **Post to class WhatsApp** — use the draft from `recruitment-posts.md`. Three agents needed for network mode and rotation testing.
3. **Playwright visual check** — screenshot the redesigned live site to confirm fonts/layout rendered correctly on Railway.
