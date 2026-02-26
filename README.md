# FLOQ App

> Post-Agile project management software for the FLOQ methodology.

## Stack
- **Next.js 15** (App Router + TypeScript)
- **PostgreSQL** + **Prisma ORM**
- **Clerk** authentication
- **Tailwind CSS** + **shadcn/ui**
- **Zustand** board state

## Quick Start

```bash
# Clone
git clone https://github.com/floqIT/Floq-App.git
cd Floq-App

# Install
npm install

# Setup env
cp .env.example .env.local
# Fill in DATABASE_URL and Clerk keys

# Generate Prisma client
npx prisma generate
npx prisma db push

# Run
npm run dev
```

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md)

## Phase 2 Features
- [x] Prisma schema (Outcome, Current, Stage, Signal, FocusWindow)
- [x] Board store (Zustand)
- [x] API routes (outcomes, currents, stage transitions)
- [ ] Board UI (Outcome cards, drag-to-move)
- [ ] Outcome detail panel
- [ ] Emergency engine
- [ ] Focus window scheduler
- [ ] Clerk auth integration

## White-Label Deployment
Each customer = one deployment. See ARCHITECTURE.md for details.
