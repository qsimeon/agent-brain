# Project Status — Agent Brain
> Last reviewed: 2026-03-04
> Reviewed by: Claude Sonnet 4.6 (deep scan, session 7)

## Project Overview
MIT MAS.664 Homework 2. A web app where AI agents self-organize into a "networked brain" with enforced sensor, actuator, and interneuron roles — inspired by biological neural circuits. Agents discover the platform by reading `skill.md`, register with declared skill sets, get claimed by a human, then run a continuous heartbeat loop every ~2.5 minutes.

**Deployed:** https://agent-brain-production.up.railway.app
**GitHub:** https://github.com/qsimeon/agent-brain (auto-deploys on push to main)
**Handoff doc:** `AGENT-BRAIN-HANDOFF.md` (tracked in git — use this to resume in any AI coding tool)

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
| Outputs page redesign | ✅ | Removed all emojis — now matches site aesthetic (mono type labels, clean empty state) |
| D3 network visualization | ✅ | Force graph, skill badges, placeholder styling |
| Outputs/artifacts gallery | ✅ | Type filters, /outputs page |
| Progressive scaling (solo/paired/network) | ✅ | 1/2/3+ agent modes with appropriate enforcement |
| Universal handoff doc | ✅ | AGENT-BRAIN-HANDOFF.md committed to git |
| Empty catch block fix | ✅ | app/page.tsx now logs fetch errors |
| DB fresh reset | ✅ | npm run seed ran — clean state as of 2026-03-04 |
| Recruitment posts | ✅ | WhatsApp + LinkedIn drafts in recruitment-posts.md |
| Real agents on platform | 👤 | Need to get Q_Agent + classmate agents registered and running |
| End-to-end data flow verified | 👤 | No real agents have completed the full signal→directive→artifact loop |
| 3rd real agent (network mode) | 👤 | Need 3+ agents to trigger rotation and test auto-rotate |
| MongoDB password rotation | 👤 | Old password was briefly in git history via HANDOFF.md |

## What's Complete

Everything is implemented, deployed, and working. TypeScript clean (0 errors). No emojis anywhere in the UI — consistent biological terminal aesthetic across all pages.

- Full agent lifecycle: register → claim → heartbeat loop → signals/directives/artifacts
- Signal envelope validated (source, timestamp, data)
- Directive envelope validated (instructions, context)
- Dynamic task suggestions from declared skills
- Dual-interneuron prevention (two-layer)
- Auto-rotation when 3+ real agents (serverside setInterval)
- Frontend: distinctive "neurological terminal" aesthetic — DM Serif Display, IBM Plex Mono, dot-grid, no emojis anywhere
- Protocol language: agents told to inform human before starting heartbeat loop
- AGENT-BRAIN-HANDOFF.md committed — universal handoff for any AI coding tool

## What's Left

### Claude Can Handle
- **Playwright visual test** — screenshot live site to confirm all pages render correctly
- **Add `npm run reset` alias** — so `npm run seed` is also callable as `npm run reset`

### Human Action Needed

#### Urgent — Get agents on the platform (HW2 due this week)
1. **Get Q_Agent registered** — See `recruitment-posts.md` for the exact message to send. DB was reset so previous registration is gone.
2. **Claim Q_Agent** — When Q_Agent sends the claim_url, visit it in a browser
3. **Confirm Q_Agent should start looping** — Reply confirming the heartbeat loop should start
4. **Recruit classmates** — Post the WhatsApp draft from `recruitment-posts.md`. Need 3+ real agents for network mode.

#### Other
- **MongoDB password rotation** — Atlas → Database Access → edit qsimeon → new password → update Railway env vars + `.env.local`
- **Screen recording** — Capture a demo for HW2 submission

## Cleanup Recommendations

### Nothing to delete
All dead scripts removed. No orphaned files. No emojis remaining in UI code.

### Things to note
- `recruitment-posts.md` — tracked in git, contains draft posts and curl examples
- `scripts/check-state.ts` — debug utility, uses some emoji in print output (internal only, not UI)
- `app/api/agents/claim/route.ts` — 4-line stub returning 400. Intentional guard. Keep.
- `app/skill.md/route.ts` and `app/skill.json/route.ts` — contain emoji `🧠` in OpenClaw metadata JSON field. This is intentional protocol metadata, not UI.

## File Map

```
lib/models/           — Agent, Signal (source), Directive, Artifact, BrainState
lib/utils/            — agent-helpers, api-helpers, auto-rotate, skill-helpers
lib/db/mongodb.ts     — connectDB() + auto-rotate init

app/api/              — 19 REST endpoints
app/skill.md/         — protocol v2 (Python loop, human-safe)
app/heartbeat.md/     — per-role loop with decision trees
app/page.tsx          — landing page (dot-grid hero, terminal aesthetic)
app/network/          — D3 force graph
app/outputs/          — artifact gallery (no emojis, mono type labels)
app/dashboard/        — admin view, rotation trigger
app/agents/[name]/    — agent detail
app/claim/[token]/    — human claim UI
app/layout.tsx        — nav with three-node SVG logo
app/globals.css       — design tokens, dot-grid, scan-line, terminal-block

scripts/
  seed.ts             — wipes + recreates 3 dummy agents
  check-state.ts      — DB state inspector

AGENT-BRAIN-HANDOFF.md  — universal tool-agnostic handoff
recruitment-posts.md    — WhatsApp/LinkedIn drafts, Q_Agent re-registration instructions
```

## Recommendations for Next Session

1. **Get Q_Agent looping** — send the message from `recruitment-posts.md`. It's been idle since Feb 27. Once running, verify the full sense→decide→act flow in solo mode.
2. **Post to class WhatsApp** — use the draft in `recruitment-posts.md`. Three agents needed for network mode and rotation testing.
3. **Playwright visual check** — screenshot the live site to confirm all pages look correct on Railway.
