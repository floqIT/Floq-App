# FLOQ App — Architecture

## Stack
- **Next.js 15** (App Router, TypeScript) — full-stack framework
- **PostgreSQL + Prisma** — type-safe ORM, any hosting
- **Clerk** — auth + user management (white-label ready)
- **Tailwind CSS + shadcn/ui** — component system
- **Zustand** — client board state
- **Vercel** — primary deployment target

## Layers

### Data Layer (`prisma/schema.prisma`)
```
Organization (tenant)
  └── Workspace
        ├── Member (User + Role)
        ├── Current (Stream/Epic)
        ├── Outcome (Card/Ticket)
        │     ├── StageHistory
        │     ├── Signal
        │     ├── Comment
        │     └── FocusOutcome
        └── FocusWindow
```

### Logic Layer (`src/lib/services/`)
- `OutcomeService` — stage machine, IDEATE→DELIVER transitions
- `EmergencyEngine` — blocker detection, escalation
- `PivotEngine` — pivot window timer management
- `SignalProcessor` — metric tracking, pivot triggers
- `FocusScheduler` — focus window coordination
- `AIAssistant` — shape/build AI pair (Phase 3)

### API Layer (`src/app/api/`)
- `GET/POST /api/outcomes`
- `PATCH /api/outcomes/[id]/stage`
- `POST /api/outcomes/[id]/emergency`
- `GET/POST /api/currents`
- `GET/POST /api/focus-windows`
- `GET /api/signals`

### UI Layer (`src/app/`)
- `/` — Landing / workspace selector
- `/board` — Live FLOQ Board
- `/outcomes/[id]` — Outcome detail + history
- `/currents` — Stream management
- `/pipeline` — Ideation→Delivery view
- `/signals` — Metrics dashboard
- `/settings` — White-label config

## White-Label Strategy
Single-tenant per deployment. Each customer gets:
- Own PostgreSQL database
- Own Clerk application (or shared with subdomain)
- Own domain/subdomain
- Custom `Organization` record with logo/colors

Deploy via Docker or Vercel. Config via env vars.

## Phase Roadmap
- **Phase 1** ✅ FLOQ Framework documentation site (floqit.com)
- **Phase 2** 🔨 FLOQ App — core board + outcome management
- **Phase 3** 🔮 AI Pair integration (Claude/GPT in BUILD stage)
- **Phase 4** 🌐 White-label marketplace + onboarding flow
