# ExposureOps — Security Exposure Management Platform

A realistic SaaS product for managing assets, security findings, scans, remediations, tickets, and reports. Built as a learning lab for automation and observability practices.

Observability and Kubernetes will be added manually in later learning phases.

---

## Architecture

```
exposure-automation-lab/
├── apps/api        — Express + TypeScript REST API (port 3000)
├── apps/web        — React + TypeScript + Vite frontend (port 5173)
├── apps/worker     — Async job worker (scans, remediations, reports)
├── automation/     — Playwright UI and API test suite
└── packages/shared — Shared TypeScript types
```

**Services:** PostgreSQL (persistence) · Redis (job queue)

---

## Quick Start

```bash
cp .env.example .env
docker compose up --build
```

Open http://localhost:5173

---

## Run Locally (without Docker)

**API:**
```bash
cd apps/api
npm install
DATABASE_URL=postgresql://... REDIS_URL=redis://localhost:6379 npm run dev
```

**Web:**
```bash
cd apps/web
npm install
VITE_API_BASE_URL=http://localhost:3000 npm run dev
```

**Worker:**
```bash
cd apps/worker
npm install
DATABASE_URL=postgresql://... REDIS_URL=redis://localhost:6379 npm run dev
```

---

## Run Playwright Tests

```bash
# Start the stack first
docker compose up --build -d

# Run all tests
cd automation/playwright
npm install
npm test

# UI tests only
npm run test:ui

# API tests only
npm run test:api
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Liveness |
| GET | /ready | Readiness |
| GET | /api/dashboard/summary | Dashboard stats |
| GET | /api/dashboard/risk-trend | Risk trend data |
| GET | /api/dashboard/recent-activity | Recent activity |
| GET | /api/dashboard/top-risky-assets | Top risky assets |
| GET/POST | /api/assets | List / create assets |
| GET/PATCH/DELETE | /api/assets/:id | Asset CRUD |
| GET | /api/assets/:id/findings | Asset findings |
| GET | /api/assets/:id/scans | Asset scans |
| PATCH | /api/assets/:id/criticality | Update criticality |
| PATCH | /api/assets/:id/owner | Update owner |
| GET/POST | /api/findings | List / create findings |
| POST | /api/findings/:id/acknowledge | Acknowledge |
| POST | /api/findings/:id/false-positive | Mark FP |
| POST | /api/findings/:id/reopen | Reopen |
| POST | /api/findings/:id/start-remediation | Start remediation |
| POST | /api/findings/bulk/acknowledge | Bulk acknowledge |
| GET/POST | /api/scans | List / start scan |
| POST | /api/scans/:id/cancel | Cancel scan |
| GET/POST | /api/remediations | List / create |
| POST | /api/remediations/:id/approve | Approve |
| POST | /api/remediations/:id/start | Start |
| POST | /api/remediations/:id/complete | Complete |
| GET/POST | /api/tickets | List / create |
| GET/POST | /api/reports | List / generate |
| GET | /api/reports/:id/content | Report content |
| GET/POST | /api/users | List / create users |
| GET/PATCH | /api/settings | Settings |
| GET | /api/simulate/slow | Simulate slow response |
| GET | /api/simulate/error | Simulate error |
| GET | /api/simulate/flaky | Simulate flaky response |
| POST | /api/simulate/generate-activity | Generate activity |

---

## Demo User Roles

| Role | Description |
|------|-------------|
| admin | Full access |
| security_analyst | Manage findings, scans, remediations |
| automation_engineer | Run scans, view everything |
| viewer | Read-only |

Pass role via header: `x-user-role: admin`

---

## Seed Data

On first startup the API runs migrations and seeds:
- 20 assets (servers, domains, IPs, containers, buckets)
- 50 findings across severities
- 10 completed scans
- 5 remediations in various states
- 8 tickets
- 3 reports
- 5 users

---

## Troubleshooting

**API not starting:** Check `docker compose logs api` — wait for postgres healthcheck.

**Worker not processing:** Check `docker compose logs worker` — ensure Redis is reachable.

**Frontend blank:** Ensure `VITE_API_BASE_URL` matches the running API port.

**Tests failing:** Ensure `docker compose up` is fully healthy before running Playwright.
