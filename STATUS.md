# Project Status — Agent Brain
> Last reviewed: 2026-02-25
> Reviewed by: Claude (deep scan)

## Project Overview
Agent Brain is a Next.js 16 + MongoDB web platform built for MIT MAS.664 (Building with AI Agents) Homework 2. It implements a distributed AI agent network modeled on biological neurons: **sensors** gather data, one rotating **interneuron** processes signals and issues directives, and **actuators** execute those directives. Agents discover and interact with the platform autonomously by reading a `skill.md` protocol file (OpenClaw framework).

## Progress Summary
| Area | Status | Notes |
|------|--------|-------|
| MongoDB models (Agent, Signal, Directive, BrainState) | ✅ | All 4 complete with proper indexing |
| REST API (20 endpoints) | ✅ | All endpoints implemented and typed |
| Protocol files (skill.md, heartbeat.md, skill.json) | ✅ | Comprehensive agent instructions |
| Frontend pages (landing, network, dashboard, agent detail, claim) | ✅ | All 5 pages complete |
| D3 force-directed network visualization | ✅ | Interactive, real-time, color-coded |
| Database seeding script | ✅ | Creates 3 agents + sample data |
| Railway deployment config | ✅ | railway.json configured |
| .env.local with real MongoDB credentials | ✅ | Real values present (localhost URLs) |
| npm install | ✅ | node_modules present |
| Database seeded | ❓ | Not confirmed — needs `npm run seed` |
| Local dev tested | ❓ | Not confirmed — needs `npm run dev` |
| Deployed to Railway | 👤 | Needs human action |
| Production seeded | 👤 | Needs human action |
| OpenClaw agent connected | 👤 | Needs human action |
| README.md | ⏳ | Missing — only HANDOFF.md exists |

## What's Complete
All code has been written: 34 TypeScript/TSX files, 4 MongoDB models, 20 API endpoints, 5 frontend pages, D3 visualization, and the OpenClaw protocol files. The project is architecturally sound with good TypeScript coverage, proper auth (Bearer tokens + admin key), input validation, and excellent documentation (HANDOFF.md is 14.8KB of thorough guidance). The `.env.local` file has real MongoDB Atlas credentials — the database connection is configured and ready.

## What's Left

### Claude Can Handle
- Add a `README.md` at the project root (summarizing what it is and how to run it)
- Fix silent `catch` blocks in `app/page.tsx` — errors are swallowed with empty `catch {}`, should at minimum log to console

### Human Action Needed
- **Run `npm run seed`** — must be run with a working MongoDB connection to populate the database with dummy agents and sample data. Output will print API keys for testing.
- **Run `npm run dev`** and manually test the UI at `http://localhost:3000`
- **Deploy to Railway**: push to GitHub, connect repo to Railway, set environment variables (see HANDOFF.md §Deploying to Railway)
- **Update APP_URL** in Railway environment variables to the actual Railway deployment URL after first deploy
- **Seed production DB** after Railway deploy: `MONGODB_URI="production-uri" npx tsx scripts/seed.ts`
- **Connect OpenClaw agent**: tell your agent to `Read https://your-app.up.railway.app/skill.md`

### Needs Clarification
- Is the database already seeded? If so, skip `npm run seed` to avoid duplicate agents.
- Which DigitalOcean droplet hosts the OpenClaw agent (for final integration testing)?

## Cleanup Recommendations

### Safe to Delete
- `.next-build/` — Stale build artifact directory that duplicates `.next/`. Not referenced by any script or config. Safe to remove (~50MB).

### Should Update
- `HANDOFF.md` §"Left To Do" — Items 1 and 2 (configure .env.local, run npm install) are now complete. Worth updating so the next reader knows the current state.

### Code to Clean Up
- `app/page.tsx` — Empty `catch {}` blocks silently swallow fetch errors. At minimum add `console.error` so failures surface during development.

## Recommendations for Next Session
1. **Run and verify locally first** — `npm run seed` then `npm run dev`. Check all 5 pages and test the agent registration API with curl before deploying.
2. **Deploy to Railway** — The config is ready (`railway.json`); just needs a GitHub push and Railway env vars set.
3. **Connect the OpenClaw agent** — Final step for the homework submission: point your agent at `skill.md` and watch it self-register.
