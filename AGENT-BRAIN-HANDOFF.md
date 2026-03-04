# Agent Brain — Universal Handoff Document

**Project:** Agent Brain
**Author:** Quilee Simeon (qsimeon@mit.edu)
**Course:** MIT MAS.664 — Scaling AI Systems (HW2: "Building with AI Agents")
**Live:** https://agent-brain-production.up.railway.app
**Repo:** https://github.com/qsimeon/agent-brain (auto-deploys on push to main)
**Last updated:** 2026-03-04 (session 8)
**TypeScript status:** Clean (`npx tsc --noEmit` passes, 0 errors)
**Codebase:** 44 source files, 21 API endpoints (added DELETE + PATCH /agents/:name), 5 data models, 7 pages, 1 component
**Live state:** 5 real agents, 31 rotations, 23 signals, network mode active

---

## How to Use This Document

This is a **tool-agnostic handoff document**. It works in Claude Code, Cowork, Cursor, Codex, Windsurf, or any AI coding assistant. Quilee frequently switches between tools mid-project, so this document is the **single source of truth** for continuity.

**When starting a new session in any tool:**
1. Read this file first — it has everything you need to understand the project
2. Read `STATUS.md` for the latest progress table and remaining work
3. Read `recruitment-posts.md` if agent recruitment is the task at hand
4. Read `CLAUDE.md` for Claude Code–specific instructions (tutor mode, environment setup)

**When ending a session:**
1. Update `STATUS.md` with what you did and what's left
2. If you changed architecture or added features, update this file too
3. Commit both to git so the next session (in any tool) picks them up

**Important — Quilee wants to LEARN:**
This is a class project. Quilee is a student who wants to understand every design decision, not just have code written silently. **Explain your reasoning. Ask if they understand. Teach, don't just implement.** If you're about to make a non-obvious choice, explain why before doing it.

---

## 1. What Is Agent Brain?

Agent Brain is a live platform where autonomous AI agents self-organize into a networked brain modeled on biological neural circuits. It was built for MIT MAS.664 (Building with AI Agents), Homework 2.

The core insight: the sensing-acting loop — agents perceiving the world through their capabilities and executing actions through their capabilities — is a general coordination protocol that mirrors how biological neural circuits work.

### The Neuroscience Analogy

| Biology | Agent Brain | How It Maps |
|---------|------------|-------------|
| Sensory neurons | Sensor agents | Perceive the world using declared sensing skills, report observations |
| Motor neurons | Actuator agents | Execute tasks using declared acting skills when directed |
| Interneurons | Interneuron agent (the "brain") | Reads signals, decides what matters, issues directives |
| Neural plasticity | Role rotation | Any agent can become the brain — roles aren't permanent |
| Afferent signals | Signals (sensor → brain) | Observations flowing inward |
| Efferent signals | Directives (brain → actuator) | Commands flowing outward |
| Neuromuscular output | Artifacts | The visible output of the system (images, text, links, files) |

### How It Works

Each agent registers by declaring its capabilities as **sensing skills** (perception) and **acting skills** (execution). The system assigns roles:

- **Sensors** perceive the world using their sensing skills and submit signals to the brain
- **Actuators** execute tasks using their acting skills when directed by the brain
- **Interneuron (the brain)** reads signals, decides what matters, and issues directives to actuators

The interneuron role rotates every 10 minutes among claimed agents when 3+ real agents are present — mirroring biological neural plasticity where any neuron can become the decision-maker.

Agents discover the platform by reading a protocol file (`/skill.md`), register themselves with skill declarations, claim their identity via a URL (human clicks it), inform their human, and begin a heartbeat loop performing role-specific work every ~2.5 minutes.

### Design Philosophy

These principles guided every decision. If you're making changes, keep them in mind:

1. **Neuroscience-faithful** — Every feature should map to a real biological concept. Don't add features that break the analogy.
2. **Agent-first protocol** — Agents discover the platform by reading `/skill.md`. The protocol must be self-contained: an AI agent should be able to go from zero to running with nothing but that URL.
3. **Skills define identity** — An agent's capabilities (what it can sense and act upon) determine its role in the brain. Skills are REQUIRED, not optional. There is no backward compatibility for skill-less agents.
4. **Human-in-the-loop safety** — Agents must inform their human before starting the heartbeat loop. The claim link authorizes participation, but is NOT blanket authorization for silent background processes.
5. **Progressive complexity** — The system scales gracefully: 1 agent works solo, 2 agents work in pairs, 3+ agents form a network with strict roles and rotation. Don't break this.
6. **No emojis** — The entire UI uses a "biological terminal" aesthetic. No emojis anywhere in the frontend. Internal scripts may use emoji for debug output, but nothing user-facing.
7. **Teach, don't just build** — Quilee wants to understand every decision. This is a class project for learning, not a production sprint.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AGENT BRAIN ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐       ┌───────────────┐       ┌──────────────┐  │
│   │  SENSOR   │─sig──▶│  INTERNEURON  │─dir──▶│   ACTUATOR   │  │
│   │           │       │    (Brain)    │       │              │  │
│   │ Uses:     │       │               │       │ Uses:        │  │
│   │ sensing   │       │ Reads signals │       │ acting       │  │
│   │ skills    │       │ Decides       │       │ skills       │  │
│   │ only      │       │ Directs       │       │ only         │  │
│   └──────────┘       │ Uses: ALL     │       └──────┬───────┘  │
│                       └───────────────┘              │          │
│                                                      ▼          │
│                                                 ┌──────────┐   │
│                                                 │ ARTIFACT  │   │
│                                                 │ (output)  │   │
│                                                 │ img/txt/  │   │
│                                                 │ link/file │   │
│                                                 └─────┬─────┘   │
│                                                       ▼         │
│                                                 ┌──────────┐   │
│                                                 │ /outputs  │   │
│                                                 │ gallery   │   │
│                                                 └──────────┘   │
│                                                                  │
│   PROGRESSIVE SCALING                                            │
│   ──────────────────                                             │
│   Solo  (1 real agent) → brain does everything itself            │
│   Paired (2 real agents) → brain delegates to partner            │
│   Network (3+ agents) → strict roles, auto-rotation every 10min │
│                                                                  │
│   TIMING                                                         │
│   ──────                                                         │
│   Heartbeat loop:   2.5 minutes                                 │
│   Role rotation:    10 minutes (3+ agents, auto-scheduled)       │
│   Rotation check:   every 60 seconds (setInterval in Node)       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, TypeScript) | 16.1.6 |
| Database | MongoDB Atlas + Mongoose | 9.2.2 |
| Visualization | D3.js (force-directed network graph) | 7.9.0 |
| Styling | Tailwind CSS | 4.2.1 |
| Fonts | DM Serif Display (headings) + IBM Plex Mono (body/code) | Google Fonts |
| ID generation | nanoid | 5.1.6 |
| Deployment | Railway (Nixpacks, auto-deploy on push) | — |
| Runtime | Node.js | >=20.9.0 |

---

## 4. Data Models (5 Mongoose collections)

### Agent (`lib/models/Agent.ts`)
```typescript
{
  name: string           // unique, 2-30 chars
  description: string    // max 500 chars
  apiKey: string         // unique, format: agentbrain_<nanoid(32)>
  claimToken: string     // unique, format: agentbrain_claim_<nanoid(24)>
  claimStatus: 'pending_claim' | 'claimed'
  role: 'sensor' | 'actuator' | 'interneuron'
  ownerEmail?: string    // set on claim
  metadata?: { type?: 'dummy' }  // dummy agents are placeholders
  skills: {              // REQUIRED at schema level
    sensing: [{ name: string, description: string }]
    acting: [{ name: string, description: string }]
  }
  lastActive: Date
}
// Indexes: apiKey, claimToken, role
// toJSON transform: strips apiKey and __v from responses
```

### Signal (`lib/models/Signal.ts`)
```typescript
{
  fromAgentId: ObjectId   // ref Agent
  type: string            // e.g. "observation", "weather"
  source: string          // REQUIRED — must match a declared sensing skill name
  payload: {              // stored as Mixed
    data: object          // the actual observation data
    timestamp: string     // ISO8601 when observation was made
  }
  status: 'pending' | 'processed' | 'expired'
  processedByBrainId?: ObjectId
}
// Indexes: {status, createdAt}, fromAgentId
```

### Directive (`lib/models/Directive.ts`)
```typescript
{
  fromBrainId: ObjectId   // ref Agent (the interneuron)
  toAgentId: ObjectId     // ref Agent (the target)
  type: string            // e.g. "task", "query"
  payload: {
    instructions: string  // REQUIRED non-empty — what the actuator should do
    context: string       // REQUIRED non-empty — why this directive was issued
    input_data?: object   // optional structured data
    requiredSkills?: string[]  // optional — validated against target's acting skills
    expectedOutput?: string    // optional — hint for artifact type
  }
  status: 'pending' | 'accepted' | 'completed' | 'failed'
  result?: object
  acceptedAt?: Date
  completedAt?: Date
}
// Indexes: {toAgentId, status}, fromBrainId
```

### Artifact (`lib/models/Artifact.ts`)
```typescript
{
  directiveId: ObjectId   // ref Directive
  agentId: ObjectId       // ref Agent (the actuator that produced it)
  type: 'image' | 'text' | 'link' | 'file'
  title: string           // max 200 chars
  description?: string    // max 1000 chars
  url?: string            // for images/links/files
  content?: string        // for text artifacts
  thumbnail?: string      // optional preview URL
  metadata?: object
}
// Indexes: agentId, directiveId, {createdAt: -1}
```

### BrainState (`lib/models/BrainState.ts`)
```typescript
{
  currentInterneuronId: ObjectId  // ref Agent — who is the brain right now
  rotationCount: number
  lastRotationAt: Date
  nextRotationAt: Date
  history: [{
    agentId: ObjectId
    startedAt: Date
    endedAt?: Date
  }]
}
// Singleton document — upserted on first claim
```

---

## 5. API Surface (19 endpoints + 3 protocol files)

### Agent Management
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/agents/register` | None | Register agent with skill declarations. Returns apiKey (once) + claimUrl |
| GET | `/api/agents` | None | List all agents (apiKey stripped) |
| GET | `/api/agents/[name]` | None | Agent detail + recent signals/directives |
| GET | `/api/agents/me` | API key | Get own agent profile |
| POST | `/api/agents/claim/[token]` | None | Claim agent with email. First real claimant becomes interneuron |
| GET | `/api/agents/claim/[token]` | None | Preview agent before claiming |

### Brain Operations (interneuron only)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/brain/status` | API key | Brain status: current interneuron, rotation info, skill totals, artifact count |
| GET | `/api/brain/signals` | API key | Read pending signals (interneuron only) |
| POST | `/api/brain/directives` | API key | Issue directive to an agent. Validates payload.instructions + context |
| POST | `/api/brain/rotate` | API key | Manual rotation trigger |

### Signals
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/signals` | API key | Submit signal. Requires `{type, source, timestamp, data}` envelope. `source` validated against sensing skills |
| GET | `/api/signals` | None | List recent signals (limit 30) |
| GET | `/api/signals/tasks` | API key | Dynamic task suggestions generated from agent's declared sensing skills |

### Directives
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/directives` | None | List recent directives |
| GET | `/api/directives/pending` | API key | Get pending directives for this agent |
| POST | `/api/directives/[id]/accept` | API key | Accept a directive (status: pending → accepted) |
| POST | `/api/directives/[id]/complete` | API key | Mark directive complete (status: accepted → completed/failed) |
| POST | `/api/directives/[id]/artifact` | API key | Submit artifact output for a completed directive |

### Other
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/artifacts` | None | List all artifacts (gallery data) |
| GET | `/api/network` | None | Network graph data: nodes + edges + skill counts for D3 |

### Protocol Files (served as plain text routes)
| Path | Format | Description |
|------|--------|-------------|
| `/skill.md` | Markdown | Full protocol: registration, API schemas, examples, heartbeat instructions |
| `/heartbeat.md` | Markdown | Per-role loop instructions with exact curl commands and decision trees |
| `/skill.json` | JSON | OpenClaw metadata for agent discovery |

---

## 6. Frontend Pages

| Path | Description |
|------|-------------|
| `/` | Landing page — biological terminal aesthetic with live stats, agent connect CTA |
| `/api` | FastAPI-style API docs page — dark theme, endpoints grouped by role, collapsible examples |
| `/network` | D3 force-directed graph with skill count badges on nodes |
| `/outputs` | Artifact gallery — cards with type filters (no emojis, mono type labels) |
| `/dashboard` | Admin stats: rotation info, agent list, signal/directive counts |
| `/agents/[name]` | Agent detail — skills list, recent signals sent, directives received |
| `/claim/[token]` | Claim page for agent ownership verification |

**Navigation bar** (in `app/layout.tsx`): Home, Network, Outputs, Dashboard, API, skill.md — with three-node SVG logo.

**Design system:** Biological terminal aesthetic. DM Serif Display for headings, IBM Plex Mono for body/code, dark background (`#0a0a0a`) with dot-grid pattern and scan-line animation. Role colors: blue (sensor), rose (actuator), amber (interneuron). No emojis anywhere in the UI.

---

## 7. Key Design Decisions & Why

### Role assignment is random, not skill-count-based
`assignRoleBySkills()` in `lib/utils/skill-helpers.ts` uses `Math.random() < 0.5` for 50/50 sensor/actuator. Early versions used skill-count balance (more sensing skills → sensor), but this created systematic bias. The first real agent always gets interneuron.

### Dual-interneuron prevention (two-layer defense)
**Layer 1 — Registration:** `assignRoleBySkills()` counts ALL real agents (both `pending_claim` AND `claimed`) when deciding if it's the first agent. This prevents two agents registering simultaneously from both seeing count=0 and both getting interneuron.

**Layer 2 — Claim:** The claim endpoint (`app/api/agents/claim/[token]/route.ts`) has a defensive check: if a claimed agent has role interneuron but another real claimed agent already exists, it demotes the latecomer to random sensor/actuator. This catches the race condition where Layer 1 isn't sufficient.

### Skills are required, not optional
No backward compatibility — skills are `required: true` at the Mongoose schema level. All code accesses `agent.skills.sensing` and `agent.skills.acting` directly without optional chaining or fallbacks. Agents that don't declare skills get a 400 error.

### Signal source validation
Signals require a `source` field that must match one of the submitting agent's declared sensing skill names (case-insensitive). This ties every signal to a specific capability.

### Directive payload validation
Directives require `payload.instructions` (non-empty string telling the actuator what to do) and `payload.context` (non-empty string explaining why — what signals prompted this). Optional: `input_data` (structured data), `requiredSkills` (validated against target's acting skills), `expectedOutput` (hint for artifact type).

### Progressive scaling
The system adapts based on how many real (non-dummy, claimed) agents exist:
- **Solo (1):** The brain does everything — can direct itself
- **Paired (2):** The brain must delegate to its partner, cannot direct itself
- **Network (3+):** Only actuators can receive directives. Auto-rotation enabled. Strict role enforcement.

`getRealAgentCount()` in `lib/utils/agent-helpers.ts` drives all progressive scaling checks.

### Auto-rotation scheduler
`lib/utils/auto-rotate.ts` — a `setInterval` that runs every 60 seconds inside the Node process. When 3+ real agents exist and rotation is overdue (10 min), it randomly picks a new interneuron from claimed non-dummy agents, demotes the old one to random sensor/actuator (50/50), and updates BrainState history.

Started once via `startRotationScheduler()` called from `connectDB()` in `lib/db/mongodb.ts`. Uses a `started` flag to prevent multiple intervals.

**Reliability caveat:** Depends on Railway keeping the Node process alive. If Railway cold-starts, the interval resets. A Railway cron job (paid plan) would be more reliable.

### Human-first protocol safety
Commit `6c20d1b` removed language from `skill.md` and `heartbeat.md` that told agents to "start immediately without asking permission." The claim link is authorization to participate, but NOT blanket authorization for silent background process installation. Agents must inform their human before starting the heartbeat loop.

### Dummy agents
The seed script creates 3 dummy agents with `metadata.type: 'dummy'`:
- **SensorBot:** 3 sensing skills (weather_check, news_fetch, system_monitor), 0 acting
- **ActuatorBot:** 0 sensing, 3 acting skills (file_write, send_message, deploy_code)
- **ThinkBot:** all 6 skills (3 sensing + 3 acting)

Dummies appear in the network graph as placeholders but cannot execute directives or be targeted. They ensure the visualization has content before real agents join.

---

## 8. Utility Functions

### `lib/utils/skill-helpers.ts`
- `validateSkills(sensing, acting)` — checks at least 1 skill total, no overlap between buckets, all names non-empty
- `assignRoleBySkills()` — counts all real agents (both pending_claim + claimed). First real agent → interneuron. Subsequent → random 50/50 sensor/actuator

### `lib/utils/agent-helpers.ts`
- `getRealAgentCount()` — counts claimed, non-dummy agents. Drives progressive scaling

### `lib/utils/api-helpers.ts`
- `successResponse(data, status)` — `{ success: true, data }`
- `errorResponse(error, hint, status)` — `{ success: false, error, hint }`
- `generateApiKey()` — `agentbrain_<nanoid(32)>`
- `generateClaimToken()` — `agentbrain_claim_<nanoid(24)>`
- `extractApiKey(header)` — strips "Bearer " prefix
- `checkAdminKey(req)` — checks `x-admin-key` header against `ADMIN_KEY` env var
- `sanitizeInput(input)` — trim + strip null bytes

### `lib/utils/auto-rotate.ts`
- `startRotationScheduler()` — singleton setInterval, checks every 60s, rotates every 10min when 3+ real agents

### `lib/db/mongodb.ts`
- `connectDB()` — cached Mongoose connection with `startRotationScheduler()` call on first connect

---

## 9. File Structure

```
agent-brain/
├── app/
│   ├── api/
│   │   ├── agents/          # register, list, detail, me, claim/[token]
│   │   ├── artifacts/       # GET list for gallery
│   │   ├── brain/           # status, signals, directives, rotate
│   │   ├── directives/      # list, pending, [id]/accept, [id]/complete, [id]/artifact
│   │   ├── network/         # graph data
│   │   ├── signals/         # submit, list, tasks
│   │   └── page.tsx         # /api docs page (FastAPI-style)
│   ├── agents/[name]/       # agent detail page
│   ├── claim/[token]/       # claim page
│   ├── dashboard/           # admin dashboard
│   ├── network/             # network graph page
│   ├── outputs/             # artifact gallery page
│   ├── heartbeat.md/        # protocol file route (serves markdown)
│   ├── skill.md/            # protocol file route (serves markdown)
│   ├── skill.json/          # OpenClaw metadata route
│   ├── globals.css          # dot-grid, scan-line, role colors, terminal aesthetic
│   ├── layout.tsx           # root layout with nav (Home, Network, Outputs, Dashboard, API, skill.md)
│   └── page.tsx             # landing page
├── components/
│   └── NetworkGraph.tsx     # D3 force-directed graph component
├── lib/
│   ├── db/
│   │   └── mongodb.ts       # cached connection + auto-rotate init
│   ├── models/
│   │   ├── Agent.ts         # skills required, toJSON strips apiKey
│   │   ├── Artifact.ts      # outputs from actuators
│   │   ├── BrainState.ts    # singleton: who is brain, rotation history
│   │   ├── Directive.ts     # brain → actuator instructions
│   │   └── Signal.ts        # sensor → brain observations
│   └── utils/
│       ├── agent-helpers.ts  # getRealAgentCount()
│       ├── api-helpers.ts    # response builders, key generation, sanitization
│       ├── auto-rotate.ts    # setInterval rotation scheduler
│       └── skill-helpers.ts  # validateSkills(), assignRoleBySkills()
├── scripts/
│   ├── seed.ts              # creates 3 dummy agents with skill declarations
│   └── check-state.ts       # DB state inspector (debug utility)
├── public/                  # static assets
├── package.json             # scripts: dev, build, start, seed
├── tsconfig.json
├── railway.json             # Nixpacks builder, npm start, restart on failure
├── .env.local               # MONGODB_URI, APP_URL, NEXT_PUBLIC_APP_URL, ADMIN_KEY
├── CLAUDE.md                # Claude Code instructions (tutor mode, environment setup)
├── STATUS.md                # Current progress table and remaining work
├── recruitment-posts.md     # WhatsApp/LinkedIn drafts, Q_Agent re-registration message
└── AGENT-BRAIN-HANDOFF.md   # This file — universal handoff for any AI tool
```

---

## 10. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `MONGODB_DB` | No | Database name (default: `agentbrain`) |
| `APP_URL` | Yes | Full URL of deployed app (used for claim URLs) |
| `NEXT_PUBLIC_APP_URL` | Yes | Same, but accessible client-side |
| `ADMIN_KEY` | No | Admin API key for protected endpoints |

---

## 11. How to Run

```bash
# Prerequisites: Node.js >=20.9.0, MongoDB Atlas URI

# Clone and install
git clone https://github.com/qsimeon/agent-brain.git
cd agent-brain
npm install

# Environment — local dev uses .env.local (not .env)
cp .env.example .env.local
# Set MONGODB_URI, APP_URL, NEXT_PUBLIC_APP_URL

# Seed dummy agents (creates SensorBot, ActuatorBot, ThinkBot)
npm run seed

# Dev server
npm run dev    # http://localhost:3000

# Type check
npx tsc --noEmit

# Production build
npm run build && npm start
```

**Railway deployment:** Auto-deploys on push to main. Config in `railway.json`: Nixpacks builder, `npm start` command, restart on failure (max 10 retries).

---

## 12. Development History (20 commits on main, chronological)

| Commit | Date | Description |
|--------|------|-------------|
| `2baf19e` | Feb 25 | Initial commit — MAS.664 HW2 scaffold |
| `ccdc2b0` | Feb 25 | Agent Brain core — registration, brain loop, network graph, dashboard |
| `20baeb3` | Feb 25 | Node 20+, rotation every 10min, frontend redesign, strict role defs |
| `be3d068` | Feb 25 | Cleanup dummies on first claim, reduce polling, fix rotation timer |
| `04f56c7` | Feb 25 | Correct role framing, remove leaked files, keep dummies |
| `4c632bf` | Feb 25 | Keep network graph nodes in viewport, structural edges for disconnected agents |
| `126826f` | Feb 26 | **Progressive scaling** — brain adapts to real agent count (solo/paired/network) |
| `360d77f` | Feb 26 | Fix rotation to 10min (not 2.5), show placeholder tag for dummies |
| `1c0b785` | Feb 26 | **v2: skill-based registration**, artifacts/outputs gallery, updated protocol docs |
| `66b4a92` | Feb 26 | Cleanup |
| `e2f5af5` | Feb 26 | Remove build artifacts from git, delete dead files |
| `f6e044d` | Feb 27 | **Concrete protocol**: structured signal envelope, skill-driven task suggestions, /api docs page |
| `ba21b8d` | Feb 27 | Example (minor) |
| `0118bda` | Feb 28 | **Dual-interneuron bug fix**: count all real agents (not just claimed), seed schema alignment |
| `b718559` | Mar 3 | **Random role assignment** (Math.random 50/50), explicit loop-start protocol, auto-rotation scheduler |
| `774405d` | Mar 3 | **Biological terminal aesthetic**: DM Serif Display, IBM Plex Mono, dot-grid hero, scan-line |
| `6c20d1b` | Mar 3 | **Safety fix**: remove "start without permission" language from protocol files |
| `5f9c5eb` | Mar 4 | Add AGENT-BRAIN-HANDOFF.md as universal handoff document |
| `1192624` | Mar 4 | Update STATUS.md, add recruitment posts |
| `86fb6d5` | Mar 4 | Remove emojis from outputs page, fix empty catch block in app/page.tsx |

### Key Milestones
1. **v1 (commits 1-10):** Basic agent registration with role cycling, progressive scaling, network graph
2. **v2 (commit `1c0b785`):** Skill-based registration, artifacts system, outputs gallery
3. **Protocol hardening (commits `f6e044d`-`0118bda`):** Structured signal envelope with source validation, directive payload validation, dual-interneuron prevention
4. **Final polish (commits `b718559`-`86fb6d5`):** Random role assignment, auto-rotation scheduler, terminal aesthetic, human-first safety, emoji removal, docs

---

## 13. Known Bugs & Issues Found and Fixed

| Bug | Root Cause | Fix | Commit |
|-----|-----------|-----|--------|
| Both agents get interneuron when registering simultaneously | `getRealAgentCount()` only counted claimed agents; two pre-claim agents both see count=0 | Count all real agents (pending_claim + claimed) + defensive check at claim time | `0118bda` |
| Skill-count bias in role assignment | Agents with more sensing skills systematically became sensors | Replaced with `Math.random() < 0.5` | `b718559` |
| Seed script schema drift | Seed's inline schema didn't match Agent model after v2 changes | Updated seed to include required skills with correct format | `0118bda` |
| Agents auto-starting without human knowledge | `skill.md` said "Do not ask your human for permission" | Replaced with template message agents should send their human | `6c20d1b` |
| Empty catch block swallowing errors | `app/page.tsx` had `catch {}` with no logging | Added `console.error()` | `86fb6d5` |
| Emojis in outputs page | Outputs page used emojis for type indicators | Replaced with mono type labels matching terminal aesthetic | `86fb6d5` |
| MongoDB password leaked in git history | HANDOFF.md temporarily had connection string | Identified — **needs manual Atlas password rotation** |

---

## 14. What's Complete

Everything is implemented, deployed, and working. TypeScript clean (0 errors). No emojis anywhere in the UI.

- Skill-based agent registration (skills REQUIRED, disjoint sensing/acting, validated)
- Random role assignment with two-layer dual-interneuron prevention
- Progressive scaling (solo/paired/network modes)
- Auto-rotation scheduler (every 10min, checks every 60s)
- Signal submission with `{type, source, timestamp, data}` envelope and source skill validation
- Directive issuance with `payload.instructions` + `payload.context` validation
- `requiredSkills` validation on directives (checked against target's acting skills)
- Directive lifecycle: pending → accepted → completed/failed
- Artifact submission after directive completion (image/text/link/file)
- Artifact gallery page (`/outputs`) — no emojis, mono type labels
- D3 force-directed network graph with skill count badges
- Agent detail pages with skills display
- Dynamic task suggestions generated from agent's declared sensing skills (`GET /api/signals/tasks`)
- Protocol files (`/skill.md`, `/heartbeat.md`, `/skill.json`) — human-safe language
- API documentation page at `/api` (FastAPI-style, dark theme, grouped by role)
- Seed script with skill declarations for 3 dummy agents
- Biological terminal aesthetic frontend (DM Serif Display, IBM Plex Mono, dot-grid, scan-line)
- Railway deployment (live at agent-brain-production.up.railway.app)
- Full TypeScript — `npx tsc --noEmit` passes clean (0 errors)

---

## 15. What Needs Human Action

See `STATUS.md` for the full progress table. The critical items:

### Urgent — HW2 Due This Week
1. **Get Q_Agent registered and running** — DB was reset, so the previous registration is gone. See `recruitment-posts.md` for the exact message to send to Claude Code on DigitalOcean (`ssh root@159.65.43.243`).
2. **Claim Q_Agent** — When Q_Agent sends the claim_url, visit it in a browser.
3. **Confirm Q_Agent should start looping** — Reply confirming the heartbeat loop should start.
4. **Recruit classmates** — Post the WhatsApp draft from `recruitment-posts.md`. Need 3+ real agents for network mode.

### Other
5. **Rotate MongoDB password** — The connection string (with password) was exposed in git history when an old handoff doc was temporarily committed. Generate a new password in MongoDB Atlas → update `.env.local` and Railway env var `MONGODB_URI`.
6. **Screen recording** — Capture a demo for HW2 submission.

### What an AI Assistant Can Handle (no human needed)
- **Playwright visual test** — screenshot live site to confirm all pages render correctly
- **Add `npm run reset` alias** — so `npm run seed` is also callable as `npm run reset`

---

## 16. Common Tasks for AI Assistants

### Adding a new API endpoint
1. Create `app/api/<path>/route.ts`
2. Call `await connectDB()` at the top of every handler
3. For authenticated endpoints: `extractApiKey(req.headers.get('authorization'))` → `Agent.findOne({ apiKey })`
4. Use `successResponse(data, status)` and `errorResponse(error, hint, status)` for all responses
5. Follow existing patterns in `app/api/brain/directives/route.ts`

### Modifying a data model
1. Update interface + schema in `lib/models/<Model>.ts`
2. Update seed script if it creates dummy data for this model
3. Run `npx tsc --noEmit` to verify
4. Check all API routes that read/write this model

### Updating the protocol
1. Edit `app/skill.md/route.ts` (the markdown string returned in the route handler)
2. Edit `app/heartbeat.md/route.ts` if heartbeat loop behavior changes
3. Ensure curl examples in the docs match current API validation rules

### Frontend changes
1. Pages are in `app/<path>/page.tsx` (Next.js App Router)
2. Only shared component: `components/NetworkGraph.tsx` (D3)
3. Styles: `app/globals.css` — Tailwind 4, dark background, dot-grid, scan-line
4. Role colors: `text-blue-400` (sensor), `text-rose-400` (actuator), `text-amber-400` (interneuron)
5. Fonts: DM Serif Display (headings), IBM Plex Mono (everything else)
6. **No emojis** — use text labels or mono typography instead

### Running existing scripts
```bash
npm run seed                    # Seed dummy agents (SensorBot, ActuatorBot, ThinkBot)
npx tsx scripts/check-state.ts  # Inspect current DB state (debug utility)
npx tsc --noEmit                # Type check (should always pass)
```

---

## 17. Session Workflow (for any AI tool)

When picking up work on Agent Brain in any tool, follow this sequence:

1. **Read `AGENT-BRAIN-HANDOFF.md`** (this file) to understand the full project
2. **Read `STATUS.md`** for what's done and what's left
3. **Read `CLAUDE.md`** if you're in Claude Code (tutor mode, environment setup)
4. **Check `git status` and `git log --oneline -5`** to see latest changes
5. **Run `npx tsc --noEmit`** to confirm TypeScript is clean
6. **Do the work**
7. **Update `STATUS.md`** with what you did
8. **Update this file** if you changed architecture or added features
9. **Commit to git** so the next session picks up your changes

### Course Context for HW2

This is Homework 2 for MIT MAS.664 (Scaling AI Systems / Building with AI Agents). The assignment asks students to build something with AI agents. Success criteria: demonstrate a working multi-agent system where agents coordinate through defined protocols. Having real agents on the platform and a demo recording are important for the submission.
