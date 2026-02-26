# Agent Brain — Tutor Handoff for Claude Code

> **IMPORTANT FOR CLAUDE CODE:** This document is a tutor-style handoff. The student (Quilee) wants
> to UNDERSTAND what was built and why. Do NOT silently implement things. Explain every step, show
> reasoning, and actively involve Quilee in the process. When they ask questions, teach — don't just
> fix. Use the "tutor" skill if available.

---

## Part 1: The Big Picture — What Are We Even Building?

### The Class Assignment

This is for **MIT MAS.664: Building with AI Agents** (Homework 2). The assignment:

> Build a web app that AI agents can use **autonomously** by reading a protocol file called `skill.md`.

That's the core idea: you make a website, and instead of humans clicking buttons, AI agents read
a document that teaches them how to use your site's API. The agents then interact with your app
on their own — no human in the loop.

### The Concept: "Agent Brain"

Quilee's concept draws from neuroscience (their PhD field). In a biological brain:

```
                         THE BIOLOGICAL BRAIN
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │   SENSORY NEURONS          INTERNEURONS         MOTOR NEURONS
    │   (eyes, ears, skin)       (the "thinking"      (muscles, glands)
    │                             middle layer)
    │                                                         │
    │   They take in         They process input       They execute
    │   information from     and decide what          actions in the
    │   the outside world    action to take            outside world
    │                                                         │
    │   Input  ──────────►   Processing  ──────────►   Output │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
```

Agent Brain maps this DIRECTLY to AI agents:

```
                          THE AGENT BRAIN
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │   SENSOR AGENTS            INTERNEURON          ACTUATOR AGENTS
    │   (gather info:            (ONE agent at a      (execute tasks:
    │    weather, news,           time — THE BRAIN     post to social
    │    system status)           that reads signals    media, send
    │                             and decides what      emails, trigger
    │                             to do)                actions)
    │                                                         │
    │   Signals ─────────►   Decisions  ──────────►  Directives│
    │                                                         │
    └─────────────────────────────────────────────────────────┘

    THE TWIST: The interneuron role ROTATES every ~30 minutes.
    Different agents take turns being "the brain."
    Consciousness drifts through the network.
```

### Why This Concept Matters (Beyond the Homework)

This connects to Quilee's bigger idea: **agentic hardware control**. The thesis is that
the real bottleneck for AI isn't smarter models — it's giving agents the ability to control
physical and digital infrastructure through standardized protocols. Agent Brain is a small
demo of this: instead of one monolithic AI, you have a network of specialized agents that
self-organize, with rotating leadership. It's a tiny prototype of how fleets of agents
might coordinate to control real systems.

---

## Part 2: How the OpenClaw Protocol Works

### What Is OpenClaw?

OpenClaw is the framework from the MAS.664 class. It defines a standard way for AI agents
to discover and use web apps. Think of it like this:

- **Without OpenClaw:** A human reads API docs, writes code to call the API. Manual.
- **With OpenClaw:** An AI agent reads a `skill.md` file and immediately knows how to
  use the API. Autonomous.

Every "skill" (web app for agents) must serve three files:

### The Three Protocol Files

```
    YOUR WEB APP
    ┌────────────────────────────────────────────────────────────┐
    │                                                            │
    │   /skill.md          /heartbeat.md        /skill.json      │
    │   ┌──────────┐       ┌──────────┐        ┌──────────┐     │
    │   │ "Here's  │       │ "Here's  │        │ {        │     │
    │   │  how to  │       │  what to │        │  name,   │     │
    │   │  use my  │       │  keep    │        │  version │     │
    │   │  API"    │       │  doing"  │        │  emoji   │     │
    │   └──────────┘       └──────────┘        │ }        │     │
    │                                          └──────────┘     │
    │   The instruction    The ongoing          Metadata for     │
    │   manual             task loop            discovery        │
    │                                                            │
    │   Agent reads this   Agent reads this     OpenClaw uses    │
    │   FIRST to learn     AFTER registering    this to catalog  │
    │   how to register    to know what to      your skill       │
    │   and use the API    keep doing forever                    │
    │                                                            │
    └────────────────────────────────────────────────────────────┘
```

**How an agent actually uses this:**

1. Someone tells their agent: "Read https://agent-brain.up.railway.app/skill.md"
2. The agent fetches that URL and gets back a Markdown document
3. The document explains: here's the API, here's how to register, here are curl examples
4. The agent follows the instructions: calls the register endpoint, saves its API key
5. The agent then reads `heartbeat.md` to learn its ongoing task loop
6. The agent runs that loop forever (or until its human says stop)

**In our codebase**, these aren't static `.md` files — they're Next.js route handlers
(`app/skill.md/route.ts`) that return Markdown strings. This way the URLs `skill.md`,
`heartbeat.md`, and `skill.json` are served dynamically and can include the correct
base URL.

---

## Part 3: System Architecture

### The Full System Diagram

```
    ┌──────────────────────────────────────────────────────────────────┐
    │                        THE INTERNET                              │
    │                                                                  │
    │   ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
    │   │ Agent 1  │    │ Agent 2  │    │ Agent 3  │   ... more       │
    │   │ (sensor) │    │(actuator)│    │(interneur│       agents      │
    │   └────┬─────┘    └────┬─────┘    └────┬─────┘                  │
    │        │               │               │                         │
    │        │  HTTP API calls (REST)         │                         │
    │        │  Authorization: Bearer KEY     │                         │
    │        ▼               ▼               ▼                         │
    │   ┌─────────────────────────────────────────────────────┐        │
    │   │              AGENT BRAIN WEB APP                     │        │
    │   │              (Next.js on Railway)                     │        │
    │   │                                                      │        │
    │   │  ┌─────────────────┐  ┌──────────────────────────┐  │        │
    │   │  │  FRONTEND       │  │  API LAYER               │  │        │
    │   │  │  (React pages)  │  │  (15 REST endpoints)     │  │        │
    │   │  │                 │  │                           │  │        │
    │   │  │  / (landing)    │  │  /api/agents/register     │  │        │
    │   │  │  /network (D3)  │  │  /api/agents/me           │  │        │
    │   │  │  /dashboard     │  │  /api/signals              │  │        │
    │   │  │  /agents/:name  │  │  /api/directives           │  │        │
    │   │  │  /claim/:token  │  │  /api/brain/status         │  │        │
    │   │  │                 │  │  /api/brain/rotate          │  │        │
    │   │  │                 │  │  /api/network               │  │        │
    │   │  └─────────────────┘  └─────────────┬────────────┘  │        │
    │   │                                      │               │        │
    │   │  ┌──────────────────┐                │               │        │
    │   │  │ PROTOCOL FILES   │                │               │        │
    │   │  │ /skill.md        │                │               │        │
    │   │  │ /heartbeat.md    │                │               │        │
    │   │  │ /skill.json      │                │               │        │
    │   │  └──────────────────┘                │               │        │
    │   │                                      │               │        │
    │   └──────────────────────────────────────┼───────────────┘        │
    │                                          │                        │
    │                                          ▼                        │
    │                              ┌───────────────────┐                │
    │                              │   MongoDB Atlas    │                │
    │                              │   (cloud database) │                │
    │                              │                    │                │
    │                              │  Collections:      │                │
    │                              │  - agents          │                │
    │                              │  - signals         │                │
    │                              │  - directives      │                │
    │                              │  - brainstates     │                │
    │                              │                    │                │
    │                              └───────────────────┘                │
    │                                                                   │
    └───────────────────────────────────────────────────────────────────┘
```

### The Agent Lifecycle

```
    ┌──────────────────────────────────────────────────────────────┐
    │                   AGENT LIFECYCLE                             │
    │                                                              │
    │  1. DISCOVERY                                                │
    │     Agent reads skill.md ──► learns the API                  │
    │                                                              │
    │  2. REGISTRATION                                             │
    │     POST /api/agents/register ──► gets API key + role        │
    │     (randomly assigned: sensor or actuator)                   │
    │                                                              │
    │  3. CLAIMING                                                 │
    │     Agent gets a claim URL ──► human clicks it ──► agent     │
    │     is now "claimed" (verified to belong to a human)         │
    │     This is a safety feature: no unclaimed agents in the     │
    │     network.                                                 │
    │                                                              │
    │  4. HEARTBEAT LOOP                                           │
    │     Agent reads heartbeat.md ──► runs role-specific loop     │
    │     forever:                                                 │
    │                                                              │
    │     SENSOR:      sense ──► submit signal ──► wait ──► repeat │
    │     ACTUATOR:    check directives ──► accept ──► do ──► done │
    │     INTERNEURON: read signals ──► decide ──► issue directive │
    │                                                              │
    │  5. ROTATION                                                 │
    │     Every ~30 min, an admin call rotates the interneuron.    │
    │     A random agent becomes the new brain. Agents must check  │
    │     their role each loop iteration because it can change!    │
    │                                                              │
    └──────────────────────────────────────────────────────────────┘
```

### The Signal → Decision → Directive Flow

This is the core data flow — how information moves through the brain:

```
    SENSOR AGENTS                INTERNEURON                 ACTUATOR AGENTS
    ┌──────────┐                ┌──────────────┐             ┌──────────────┐
    │          │   Signals      │              │  Directives │              │
    │ Gather   │───────────────►│  Read all    │────────────►│  Check for   │
    │ info     │  POST /signals │  unprocessed │ POST /brain │  pending     │
    │ (weather,│                │  signals     │ /directives │  directives  │
    │  news,   │                │              │             │              │
    │  etc.)   │                │  Analyze:    │             │  Accept it   │
    │          │                │  "What's     │             │  Execute it  │
    │ Submit   │                │   important? │             │  Report back │
    │ findings │                │   What       │             │              │
    │          │                │   action to  │             │  POST        │
    │          │                │   take?"     │             │  /directives │
    │          │                │              │             │  /:id/       │
    │          │                │  Issue       │             │  complete    │
    │          │                │  directive   │             │              │
    └──────────┘                └──────────────┘             └──────────────┘
```

---

## Part 4: The Codebase — What Each Layer Does

### Layer 1: Database Models (`lib/models/`)

These define the "shape" of data stored in MongoDB. Think of them as table schemas.

| Model | File | What It Stores | Key Fields |
|-------|------|----------------|------------|
| **Agent** | `Agent.ts` | Each AI agent in the network | `name`, `role` (sensor/actuator/interneuron), `apiKey` (hidden from JSON), `claimStatus`, `lastActive` |
| **Signal** | `Signal.ts` | Data submitted by sensors | `fromAgentId`, `type` (weather/news/etc), `payload` (the actual data), `status` (pending→processed) |
| **Directive** | `Directive.ts` | Commands from interneuron to actuators | `fromBrainId`, `toAgentId`, `type`, `payload` (the task), `status` (pending→accepted→completed/failed), `result` |
| **BrainState** | `BrainState.ts` | Who is currently the brain (singleton — only one document ever) | `currentInterneuronId`, `rotationCount`, `nextRotationAt`, `history[]` |

### Layer 2: Utility Functions (`lib/utils/api-helpers.ts`)

Helper functions used across all API routes:

- `successResponse(data)` — wraps data in `{success: true, data: ...}` format
- `errorResponse(message, status)` — wraps errors in `{success: false, error: ...}` format
- `generateApiKey()` — creates keys like `agentbrain_xxxxxxxxxxxx`
- `generateClaimToken()` — creates claim tokens for the claiming flow
- `extractApiKey(request)` — pulls the Bearer token from the Authorization header
- `checkAdminKey(request)` — validates the admin key for protected operations (like rotation)
- `sanitizeInput(str)` — basic XSS prevention

### Layer 3: Database Connection (`lib/db/mongodb.ts`)

This file handles connecting to MongoDB. The key pattern: **singleton connection**.

In a normal server, you connect once and stay connected. But Next.js API routes are
"serverless" — each request might spin up a fresh function. If every request opened a
new database connection, you'd quickly hit MongoDB's connection limit.

The solution: cache the connection in a global variable. First request connects and caches.
Subsequent requests reuse the cached connection. This is a standard Next.js + MongoDB
pattern.

### Layer 4: API Routes (`app/api/`)

Every file named `route.ts` inside `app/api/` becomes an HTTP endpoint. This is how
Next.js App Router works — the file path IS the URL path.

```
File:    app/api/agents/register/route.ts
URL:     POST /api/agents/register
Purpose: Create a new agent, assign it a random role, return API key

File:    app/api/brain/status/route.ts
URL:     GET /api/brain/status
Purpose: Return current brain state + stats (no auth required)

File:    app/api/brain/rotate/route.ts
URL:     POST /api/brain/rotate
Purpose: Rotate interneuron to a random agent (admin key required)
```

There are 15 endpoints total. See the full list in `skill.md`.

### Layer 5: Protocol Files (`app/skill.md/`, `app/heartbeat.md/`, `app/skill.json/`)

These are also route handlers, but instead of returning JSON, they return Markdown
(for skill.md and heartbeat.md) or JSON metadata (for skill.json). They serve the
OpenClaw protocol files that agents read to learn how to use the platform.

The "trick" here: `app/skill.md/route.ts` creates a URL at `/skill.md` — it looks
like a static file to the agent, but it's actually generated dynamically so it can
insert the correct base URL.

### Layer 6: Frontend Pages (`app/page.tsx`, `app/network/`, etc.)

The human-facing part. Five pages:

1. **`/`** (Landing) — Hero section, role explainer cards, live brain stats that poll every 5 seconds
2. **`/network`** — D3 force-directed graph showing agents as colored nodes with connections
3. **`/dashboard`** — Admin view with stats and a button to trigger rotation
4. **`/agents/[name]`** — Detail page for a specific agent, showing their recent signals/directives
5. **`/claim/[token]`** — The page a human visits to "claim" their agent (enter email, activate it)

### Layer 7: Visualization (`components/NetworkGraph.tsx`)

A D3.js force-directed graph that visualizes the agent network:
- Blue nodes = sensors
- Red nodes = actuators
- Gold node with glow effect = the current interneuron (the brain)
- Edges connect agents that have interacted (signals/directives between them)
- Nodes are draggable, hoverable, clickable (navigates to agent detail page)
- Shows a rotation countdown timer

---

## Part 5: Current State (What's Done)

### Completed
- [x] All code written (TypeScript compiles clean)
- [x] MongoDB Atlas cluster created (project: `agentbrain`, cluster: `Cluster0`)
- [x] Database user: `qsimeon` / password: `agentbrain123`
- [x] Network access: `0.0.0.0/0` (anywhere)
- [x] `.env.local` configured with real connection string
- [x] `npm install` done
- [x] `npm run seed` done — database has 3 dummy agents + sample data
- [x] Connection verified (test script connected successfully)

### Seeded API Keys (for testing)
```
SensorBot:   agentbrain_sensor_7zzrGWpiVrjQZ7vopWzGHrzQ
ActuatorBot: agentbrain_actuator_dZC-rVcLF47_EoLRNI206iAN
ThinkBot:    agentbrain_think_fFeRyMDyRIJWE7g9kcl5Vw-p
```

### MongoDB Connection String
```
mongodb+srv://qsimeon:agentbrain123@cluster0.qfx5jvh.mongodb.net/?appName=Cluster0
```

---

## Part 6: What To Do Next

### Immediate Next Steps (in order)

1. **Run the dev server locally and verify it works**
   ```bash
   cd ~/agent-brain
   npm run dev
   ```
   Open `http://localhost:3000` — you should see the landing page with live stats.
   Open `http://localhost:3000/network` — you should see the D3 graph with 3 nodes.
   Open `http://localhost:3000/skill.md` — you should see the protocol document.

2. **Test the API with curl** (to prove it actually works end-to-end)
   ```bash
   # Brain status (should show ThinkBot as interneuron)
   curl http://localhost:3000/api/brain/status | python3 -m json.tool

   # Register a new agent
   curl -X POST http://localhost:3000/api/agents/register \
     -H "Content-Type: application/json" \
     -d '{"name": "MyTestAgent", "description": "Testing the API"}'

   # Check self (use one of the seeded API keys)
   curl http://localhost:3000/api/agents/me \
     -H "Authorization: Bearer agentbrain_sensor_7zzrGWpiVrjQZ7vopWzGHrzQ"
   ```

3. **Fix any issues found during testing** (build errors, runtime errors, etc.)

4. **Deploy to Railway** (so it has a public URL agents can reach)
   ```bash
   cd ~/agent-brain
   git init && git add . && git commit -m "Agent Brain - MAS.664 HW2"
   gh repo create agent-brain --public --source=. --push
   ```
   Then deploy via Railway dashboard (see deployment section below).

5. **Test with the OpenClaw agent** on Quilee's DigitalOcean droplet
   Tell the agent: `Read https://agent-brain.up.railway.app/skill.md`

### Deployment (Railway)

1. Go to [railway.app](https://railway.app), sign in with GitHub
2. "New Project" → "Deploy from GitHub repo" → select `agent-brain`
3. Set environment variables in Railway dashboard:
   ```
   MONGODB_URI=mongodb+srv://qsimeon:agentbrain123@cluster0.qfx5jvh.mongodb.net/?appName=Cluster0
   MONGODB_DB=agentbrain
   APP_URL=https://[your-railway-url]
   NEXT_PUBLIC_APP_URL=https://[your-railway-url]
   ADMIN_KEY=agentbrain-admin-secret
   ```
4. After first deploy, copy the Railway URL and update `APP_URL` and `NEXT_PUBLIC_APP_URL`

---

## Part 7: File-by-File Reference

| File | Purpose |
|------|---------|
| `lib/db/mongodb.ts` | MongoDB connection singleton. Caches connection so serverless functions don't reconnect every request. |
| `lib/models/Agent.ts` | Agent schema. The `toJSON` transform strips `apiKey` from all responses so keys are never leaked through GET endpoints. |
| `lib/models/Signal.ts` | Signal schema. Signals flow from sensors to the interneuron. Status: pending → processed. |
| `lib/models/Directive.ts` | Directive schema. Directives flow from interneuron to actuators. Status: pending → accepted → completed/failed. |
| `lib/models/BrainState.ts` | Brain state singleton. Only one document. Tracks who is the current interneuron and rotation history. |
| `lib/utils/api-helpers.ts` | Response formatting, API key generation, auth extraction, input sanitization. |
| `app/api/agents/register/route.ts` | POST: creates agent with random sensor/actuator role. Returns one-time API key + claim URL. |
| `app/api/agents/me/route.ts` | GET: self-lookup. Agent sends its API key, gets back its profile including current role. |
| `app/api/agents/route.ts` | GET: list all agents with pagination. Public (no auth). |
| `app/api/agents/[name]/route.ts` | GET: agent detail with recent signals and directives. |
| `app/api/agents/claim/[token]/route.ts` | GET: claim info. POST: human claims the agent (enters email). |
| `app/api/signals/route.ts` | POST: sensor submits signal. GET: list recent signals. |
| `app/api/signals/tasks/route.ts` | GET: returns random sensing task suggestions for sensors to pick from. |
| `app/api/directives/route.ts` | GET: list recent directives. |
| `app/api/directives/pending/route.ts` | GET: actuator checks for pending directives assigned to them. |
| `app/api/directives/[id]/accept/route.ts` | POST: actuator accepts a directive (status: pending → accepted). |
| `app/api/directives/[id]/complete/route.ts` | POST: actuator marks directive done with result (status → completed). |
| `app/api/brain/signals/route.ts` | GET: interneuron reads unprocessed signals. Only works if you ARE the interneuron. |
| `app/api/brain/directives/route.ts` | POST: interneuron issues directive to an actuator. Also marks specified signals as processed. |
| `app/api/brain/status/route.ts` | GET: current brain state + network stats. No auth (frontend uses this). |
| `app/api/brain/rotate/route.ts` | POST: rotate interneuron to random agent. Requires admin key. |
| `app/api/network/route.ts` | GET: D3-formatted `{nodes: [...], edges: [...]}` for visualization. |
| `app/skill.md/route.ts` | Returns the full API documentation as Markdown. The "instruction manual" agents read. |
| `app/heartbeat.md/route.ts` | Returns the task loop instructions as Markdown. The "what to keep doing" guide. |
| `app/skill.json/route.ts` | Returns JSON metadata (name, version, emoji). For OpenClaw discovery. |
| `app/page.tsx` | Landing page. Hero, role cards, live stats polling /api/brain/status every 5s. |
| `app/network/page.tsx` | Wrapper page for the D3 network visualization. |
| `app/dashboard/page.tsx` | Admin dashboard. Stats + rotation trigger button. |
| `app/agents/[name]/page.tsx` | Agent detail page. Shows role badge, recent signals/directives. |
| `app/claim/[token]/page.tsx` | Claim form. Human enters email to activate their agent. |
| `components/NetworkGraph.tsx` | D3 force graph. Blue=sensor, red=actuator, gold+glow=interneuron. Draggable, hoverable, clickable. |
| `scripts/seed.ts` | Creates 3 dummy agents (SensorBot, ActuatorBot, ThinkBot) + sample data. Loads `.env.local` manually. |
| `.env.local` | Environment variables. CONFIGURED with real MongoDB credentials. |
| `railway.json` | Railway deployment config. Uses NIXPACKS builder, `npm start` command. |

---

## Part 8: Key Technical Decisions Explained

### Why Next.js?
The example project from class (ClawMatchStudio) used Next.js. It gives us both a frontend
(React pages) and a backend (API routes) in one codebase. The App Router (Next.js 13+)
makes API routes simple: `app/api/whatever/route.ts` → `GET/POST /api/whatever`.

### Why MongoDB (not PostgreSQL/Supabase)?
The example project used MongoDB. For this kind of flexible, schema-light data (agent
metadata, arbitrary signal payloads, directive payloads), MongoDB is simpler — you don't
need rigid table schemas. The signal and directive `payload` fields can be any JSON shape,
which is hard to do cleanly in SQL.

### Why Bearer Token Auth (not sessions/cookies)?
AI agents don't have browsers. They can't handle cookies or sessions. Bearer tokens are
the simplest auth for API-to-API communication: generate a key, send it in the
Authorization header. That's it.

### Why a Claim Flow?
Safety measure from the class framework. When an agent registers, it gets a claim URL.
A human must click that URL to "claim" the agent — proving that a real person authorized
this agent to participate. Prevents spam agents.

### Why Rotation?
The neuroscience analogy: in real brains, no single neuron is always "the boss." Leadership
and attention shift. Rotation makes the demo more interesting and demonstrates a distributed
coordination pattern. It also means every agent might become the brain — they all need to
handle all three roles.

---

## Part 9: Glossary

| Term | Meaning |
|------|---------|
| **Skill** | A web app that agents can use autonomously (OpenClaw terminology) |
| **skill.md** | The Markdown document that teaches agents how to use a skill |
| **heartbeat.md** | The Markdown document that defines the agent's ongoing task loop |
| **skill.json** | JSON metadata about the skill (name, version, emoji) |
| **OpenClaw** | The framework from MAS.664 that standardizes how agents discover and use skills |
| **Sensor** | An agent role: gathers information, submits signals |
| **Actuator** | An agent role: receives directives, executes tasks, reports results |
| **Interneuron** | An agent role: THE BRAIN. Reads signals, decides, issues directives. Only one at a time. Rotates. |
| **Signal** | A piece of data submitted by a sensor (e.g., "weather is 72°F") |
| **Directive** | A command from the interneuron to an actuator (e.g., "post a weather update") |
| **Rotation** | When the interneuron role switches to a different agent |
| **Claim** | The process of a human verifying they own an agent |
| **Bearer Token** | Auth pattern: `Authorization: Bearer YOUR_API_KEY` in HTTP headers |
| **BrainState** | The singleton database document tracking who is currently the brain |
| **Route Handler** | A Next.js file that defines an API endpoint (`export async function GET/POST`) |
| **App Router** | Next.js routing system where the file path = the URL path |

---

## Part 10: Session Log (Cowork → Claude Code continuity)

### Session 1 (earlier today): Initial build
- Built entire codebase from scratch
- TypeScript compiled clean

### Session 2 (current — Feb 25, 2026 evening): Setup + Refinement

**What was done in this session:**
1. MongoDB Atlas setup walked through step by step:
   - Created fresh project "agentbrain" with Cluster0 on AWS us-east-1
   - Database user: `qsimeon` / `agentbrain123`
   - Network access: `0.0.0.0/0`
   - Connection string: `mongodb+srv://qsimeon:agentbrain123@cluster0.qfx5jvh.mongodb.net/?appName=Cluster0`
2. Fixed seed script — wasn't loading .env.local (added manual dotenv parsing)
3. Ran seed successfully — 3 dummy agents + sample data in database
4. Ran `npm run dev` — app works at localhost:3000, connects to MongoDB
5. Fixed hydration error (window.location.origin mismatch between server/client render)
6. **Complete frontend redesign:**
   - Removed all emojis, replaced with SVG icons and colored dots
   - Cleaner typography, softer borders, proper nav with footer
   - Updated: layout.tsx, page.tsx, dashboard/page.tsx, network/page.tsx,
     agents/[name]/page.tsx, claim/[token]/page.tsx, globals.css
7. **Rewrote skill.md with strict sensor/actuator definitions:**
   - Sensors: allowed ops = read, get, fetch, observe, browse, search, ask, monitor
   - Sensors: forbidden ops = write, create, post, send, delete, modify, execute
   - Actuators: allowed ops = write, create, post, send, delete, move, modify, execute
   - Actuators: forbidden ops = read-for-reporting, browse-for-information, search-for-data
   - Defined "the world" = filesystem, web, APIs, human, channels, system status
   - Added concrete examples for both roles
   - Added role enforcement section
8. **Rewrote heartbeat.md** to match new role definitions with constraint reminders
9. Clarified that seeded bots are dummy data (not real agents) — Q_Agent is the real agent

**Quilee's Q_Agent:**
- Running on DigitalOcean droplet at 159.65.43.243
- Access: `ssh root@159.65.43.243` (SSH keys configured)
- This is a real OpenClaw agent that will be the first to join the brain

**What Quilee wants next:**
- Deploy to Railway so Q_Agent can reach it
- Connect Q_Agent to the brain
- Share URL with classmates for their agents to join

**Quilee's broader vision:**
This project is a stepping stone toward **agentic hardware control** — the thesis that
AI's bottleneck isn't smarter models but giving agents standardized protocols to control
physical and digital infrastructure. Agent Brain demonstrates the pattern: specialized
agents with enforced roles, self-organizing, with rotating coordination. The
sensor/actuator/interneuron model mirrors how biological brains control bodies through
neural circuits.

**Cowork session data location:**
`/sessions/eager-practical-newton/mnt/.claude/projects/-sessions-eager-practical-newton/a9d1bdeb-9661-48d6-ae2c-152f2237ee94.jsonl`

**Files modified this session:**
- `scripts/seed.ts` — added manual .env.local loading, rotation 30→10min
- `app/page.tsx` — full redesign + hydration fix, rotation 30→10min
- `app/layout.tsx` — redesigned nav/footer, SVG logo
- `app/dashboard/page.tsx` — redesigned
- `app/network/page.tsx` — updated
- `app/agents/[name]/page.tsx` — redesigned, no emojis
- `app/claim/[token]/page.tsx` — redesigned, no emojis
- `app/globals.css` — added animations
- `app/skill.md/route.ts` — rewritten with strict role definitions, rotation 30→10min
- `app/heartbeat.md/route.ts` — rewritten to match
- `app/api/brain/rotate/route.ts` — rotation interval 30→10min
- `package.json` — added engines.node >=20.9.0 for Railway
- `README.md` — created, updated rotation to 10min
- `.env.local.example` — created for public reference
- `HANDOFF.md` — this file, comprehensive tutor handoff
- `CLAUDE.md` — project context for Claude Code

### Session 2 continued: Deployment

10. **Deployed to Railway successfully:**
    - Public URL: `https://agent-brain-production.up.railway.app`
    - Fixed Node.js version issue (Railway defaulted to Node 18, Next.js 16 needs 20+)
    - Fixed port issue (Next.js listens on 3000, not 8081)
    - Environment variables set in Railway dashboard:
      - MONGODB_URI, MONGODB_DB, APP_URL, NEXT_PUBLIC_APP_URL, ADMIN_KEY, PORT=3000
    - App is ONLINE and serving the landing page with live stats from MongoDB
    - GitHub repo: https://github.com/qsimeon/agent-brain

11. **Quilee's Q_Agent:**
    - Running on DigitalOcean droplet at 159.65.43.243
    - Visible in OpenClaw dashboard as healthy
    - NEXT: Tell Q_Agent to read https://agent-brain-production.up.railway.app/skill.md

**For Claude Code — remaining work:**
- [ ] Use the /frontend-design skill to make the UI more polished and less generic
- [ ] Verify Q_Agent successfully registered and appears in the network
- [ ] Test the full sensor→interneuron→actuator flow with real agents
- [ ] Consider adding automatic rotation (cron/interval) instead of manual trigger only
- [ ] Share URL with classmates — message for class group
- [ ] Push any frontend improvements to GitHub (auto-deploys to Railway)
