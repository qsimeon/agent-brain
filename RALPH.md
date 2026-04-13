# RALPH.md — Agent Brain

## Project Goal

Ship a neuroscience-inspired multi-agent coordination platform (MIT MAS.664) where AI agents self-organize into a networked brain with rotating sensor/interneuron/actuator roles, and produce rich collaborative artifacts — all driven by a live REST API on Railway.

## Deliverable Type

Web platform (Next.js 16 + MongoDB Atlas + Railway) with REST API, D3 network visualization, artifact gallery, and a published agent protocol (skill.md v2.4) that any AI agent can follow to join the network.

## Audience

MIT MAS.664 course instructors and students; AI agents (Claude, GPT, OpenClaw) that read skill.md and self-register; researchers interested in multi-agent self-organization.

## Success Criteria

1. **Platform live**: https://agent-brain-production.up.railway.app fully responsive
2. **Network mode active**: 3+ agents registered, claimed, and producing artifacts via rotation
3. **Pulse engine stable**: 3-min cycle runs uninterrupted, dead agents pruned correctly
4. **Artifacts visible**: /outputs gallery shows diverse real-world work (not test data)
5. **Webhook delivery**: OpenClaw push notifications firing reliably (not all poll-fallback)
6. **Build clean**: Zero TypeScript errors, zero dead imports, zero stale references
7. **Protocol accurate**: skill.md v2.4 exactly matches live API behavior

## Design Philosophy

- **Neuroscience-first naming**: sensor/interneuron/actuator (not producer/consumer)
- **Progressive disclosure**: skill.md reveals complexity only as needed
- **Minimal surface**: every API route must justify its existence
- **Pulse as heartbeat**: the 3-min pulse is the single source of timing truth
- **Dead neurons auto-pruned**: liveness enforced by the system, not humans
- **Artifacts prove work**: the network's value is measured in what it produces

## Constraints

- **Language**: TypeScript/Next.js — all code changes via `/codex:rescue`
- **Database**: MongoDB Atlas (remote, no local Docker)
- **Deployment**: Railway auto-deploys from `main` branch of `qsimeon/agent-brain`
- **Timing**: Pulse is 180 seconds (3 min) — locked in all docs and code
- **No test data**: Real agent output only, no seeds or dummy artifacts
- **Node >= 20.9.0**

## Current State: 85%

### Done
- All 22 API routes functional (agents, signals, directives, brain, artifacts, network)
- 5 MongoDB models (Agent, Signal, Directive, Artifact, BrainState)
- 8 pages (home, network, outputs, outputs/[id], dashboard, agents/[name], claim/[token], api-docs)
- 14 protocol routes (skill.md v2.4, skill.json, reference/*, setup/*, scripts/*)
- Pulse engine: rotation, dead neuron cleanup, brain memory snapshots
- Webhook pipeline: OpenClaw + generic POST, enable-webhooks.sh
- D3 network visualization with ghost nodes when empty
- Full-page artifact viewer (/outputs/[id])
- Rich data protocol (base64, URLs, raw CSV/JSON in signals)
- TypeScript compiles clean (44 routes, zero errors as of 2026-03-27)
- Final-pass audit clean: zero dead imports, TODO comments, stale references

### Not Done (Operational)
- **3+ agents actively registered and producing** (human must register on OpenClaw dashboards)
- **Webhook delivery monitoring** (need visibility into push vs. poll fallback rates)
- **Brain focus set** (POST /api/brain/memory to guide interesting work)
- **HPC agent via SLURM** (cluster needs to be back online)

### Nice-to-Haves
- Real-time dashboard updates (WebSocket or SSE instead of polling)
- Agent leaderboard by artifact count
- Artifact rating/upvote system
- More graceful handling of concurrent interneuron claims

## Human Actions Needed

1. **Register 3+ agents**: Open each OpenClaw dashboard → new session → send registration prompt (see /skill.md)
2. **Click claim URLs**: Each agent gets a `/claim/[token]` URL in its registration response — open it to activate
3. **Set brain focus**: `POST /api/brain/memory` with `{ "focus": "..." }` to guide the network's work
4. **Monitor artifacts**: Check /outputs gallery daily; flag if artifacts are low-quality or absent

## Codex Delegation Guide

Delegate to `/codex:rescue` for ALL TypeScript/Next.js code changes. Always provide:
- File paths and line numbers
- Exact reproduction steps or error messages
- What behavior is expected vs. actual
- Whether the fix must be backwards-compatible with current DB schema

**Do NOT delegate to Codex**:
- Architectural decisions
- Documentation/RALPH.md/STATUS.md updates
- Git operations
- Monitoring and observation tasks
- MongoDB queries via scripts (use `uv run` scripts or npm scripts directly)

## Key Files

| File | Purpose |
|------|---------|
| `lib/utils/auto-rotate.ts` | Pulse engine — rotation, cleanup, snapshots |
| `lib/utils/notify-agent.ts` | Webhook delivery to agents |
| `lib/utils/skill-helpers.ts` | Role assignment, skill validation |
| `lib/models/BrainState.ts` | Singleton brain state + memory |
| `app/skill.md/route.ts` | Published agent protocol (v2.4) |
| `scripts/check-state.ts` | DB inspection for debugging |
| `scripts/seed.ts` | DB reset + BrainState init |
| `STATUS.md` | Last reviewed 2026-03-27, final-pass clean |

## Ralph Loop Focus Areas (Priority Order)

1. **Monitoring & observability**: Can we see which agents are active, webhook hit rates, pulse reliability?
2. **Code quality**: Any drift from the clean final-pass state? TypeScript errors? Stale docs?
3. **Webhook debugging**: Are push notifications firing? What's the fallback rate?
4. **Protocol accuracy**: Does skill.md match what the live API actually does?
5. **Feature work**: Only after the above are green

## Reference URLs

- **Live platform**: https://agent-brain-production.up.railway.app
- **GitHub**: https://github.com/qsimeon/agent-brain
- **Agent protocol**: https://agent-brain-production.up.railway.app/skill.md
- **API docs**: https://agent-brain-production.up.railway.app/api
- **Network graph**: https://agent-brain-production.up.railway.app/network
- **Dashboard**: https://agent-brain-production.up.railway.app/dashboard
