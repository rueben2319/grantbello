# Grant Bello Family Tree

An interactive family tree management application for the Grant Bello family.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State**: TanStack Query + React Context
- **Visualization**: D3.js

## Getting Started

1. Clone the repo
2. Copy `.env.example` to `.env` and fill in your Supabase credentials
3. `npm install`
4. `npm run dev`

## Available Scripts
| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm test` | Run tests once |
| `npm run test:watch` | Watch mode tests |
| `npm run test:coverage` | Coverage report |
| `npm run lint` | ESLint check |

## Architecture
- `/src/components` — Reusable UI components
- `/src/pages` — Route-level page components
- `/src/hooks` — Custom React hooks (data fetching via TanStack Query)
- `/src/contexts` — React context providers (Auth)
- `/src/lib` — Utility functions
- `/src/types` — Shared TypeScript types
- `/src/integrations/supabase` — Generated Supabase client and types
- `/supabase/migrations` — Database schema migrations

## Database Schema
- **profiles** — User profiles (auto-created on signup)
- **families** — Family groups
- **persons** — Individual family members
- **relationships** — Parent/spouse connections between persons
- **family_roles** — User access roles per family (admin/editor/viewer)
