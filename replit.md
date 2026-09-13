# QA Machine Board

Shared live QA tracking for CNC machines moving through six readiness checks before dispatch.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/qa-machine-board/` — responsive React board UI and live polling client
- `artifacts/api-server/src/routes/machines.ts` — machine, process, bulk update, summary, and activity routes
- `lib/api-spec/openapi.yaml` — source of truth for the typed machine API contract
- `lib/db/src/schema/machines.ts` — PostgreSQL tables and process state types

## Architecture decisions

- The first release is a responsive web board so QA members can use the same link on phones and desktop.
- Machine readiness is derived from the six process states: zero done is Not started, partial is In progress, and all six done is Completed / Ready to dispatch.
- The board uses short polling with generated React Query hooks so all open sessions converge on the shared PostgreSQL state without a separate realtime service.
- Each process update stores the operator name and timestamp, and also creates an activity entry for traceability.

## Product

QA members, supervisors, and department heads can add or edit machines, mark Reliability, Laser, LKC, FUC, CT, and TAG individually, select several machines for bulk updates, and see which machines are ready for dispatch.

## User preferences

- The user prefers a practical app focused on the QA department workflow before dispatch.

## Gotchas

- A person's name is required before process or bulk actions can be submitted; it is stored in the browser for the next visit.
- Regenerate API hooks with `pnpm --filter @workspace/api-spec run codegen` after changing `lib/api-spec/openapi.yaml`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
