# Agent Brain — MAS.664 Homework 2

## IMPORTANT: Tutor Mode

Quilee wants to LEARN and UNDERSTAND this project, not just have things built silently.
**Explain every step before doing it. Ask if they understand. Teach, don't just implement.**
Read HANDOFF.md for the full context — it has architecture diagrams, explanations of every
file, the neuroscience analogy, and where we left off.

## What This Is

A web app for MIT MAS.664 (Building with AI Agents) where AI agents self-organize into a
networked brain with three roles: sensors (gather info), actuators (execute tasks), and
one rotating interneuron (the brain that reads signals and issues directives). The concept
is inspired by biological neural circuits. The interneuron role rotates every ~30 min.

Agents interact with the platform by reading a `skill.md` protocol file that teaches them
the API, then running an autonomous heartbeat loop defined in `heartbeat.md`.

## Current State (Feb 25, 2026 — updated after Cowork session 2)

### DONE
- All code written (15 API endpoints, 4 models, 3 protocol files, 5 pages, D3 viz)
- TypeScript compiles clean
- MongoDB Atlas configured (project: agentbrain, cluster: Cluster0, region: us-east-1)
- Database user: qsimeon / agentbrain123
- Network access: 0.0.0.0/0
- .env.local configured with real connection string
- npm install done
- npm run seed done — 3 dummy agents + sample data in database
- npm run dev tested — frontend works at localhost:3000
- Hydration error fixed
- Frontend redesigned (no emojis, modern dark theme, SVG icons)
- skill.md rewritten with strict sensor/actuator role definitions and enforcement
- heartbeat.md rewritten to match

### NOT YET DONE
- [ ] Test API endpoints with curl (verify all 15 work)
- [ ] Deploy to Railway (so Q_Agent can reach it)
- [ ] Connect Quilee's Q_Agent (DigitalOcean: ssh root@159.65.43.243)
- [ ] Share URL with classmates for their agents to join

### Seeded Test API Keys
```
SensorBot:   agentbrain_sensor_7zzrGWpiVrjQZ7vopWzGHrzQ
ActuatorBot: agentbrain_actuator_dZC-rVcLF47_EoLRNI206iAN
ThinkBot:    agentbrain_think_fFeRyMDyRIJWE7g9kcl5Vw-p
```

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server at localhost:3000
npm run build        # Production build
npm run seed         # Seed database (reads .env.local)
```

## Stack

Next.js 16, React 19, Mongoose 9, MongoDB Atlas (free tier), D3.js 7, Tailwind CSS 4, nanoid

## Architecture

```
app/
  api/              # 15 REST endpoints (agents, signals, directives, brain)
  skill.md/         # Protocol: API docs for agents (Markdown)
  heartbeat.md/     # Protocol: task loop for agents (Markdown)
  skill.json/       # Protocol: metadata (JSON)
  page.tsx          # Landing page with live stats
  network/          # D3 force-directed graph visualization
  dashboard/        # Admin dashboard + rotation trigger
  agents/[name]/    # Agent detail page
  claim/[token]/    # Agent claiming page

lib/
  db/mongodb.ts     # Mongoose connection singleton
  models/           # Agent, Signal, Directive, BrainState schemas
  utils/            # Response helpers, auth, key generation

components/
  NetworkGraph.tsx  # D3 force graph (blue=sensor, red=actuator, gold=interneuron)

scripts/
  seed.ts           # Creates 3 dummy agents + sample data

.env.local          # CONFIGURED with real MongoDB credentials
railway.json        # Railway deployment config
```

## Key Concepts

- **Protocol files** (skill.md, heartbeat.md, skill.json): How agents discover and learn to use this app
- **Bearer token auth**: `Authorization: Bearer agentbrain_xxx` — agents get a key at registration
- **Claim flow**: Agent registers → gets claim URL → human clicks it → agent is active
- **Rotation**: Admin calls POST /api/brain/rotate → random agent becomes the new interneuron
- **BrainState**: Singleton MongoDB document tracking who is the current brain

## Detailed Documentation

Read **HANDOFF.md** for:
- Full system architecture diagrams (ASCII)
- The neuroscience analogy explained
- What every single file does
- How the OpenClaw protocol works
- Step-by-step deployment guide
- Glossary of all terms
