# Playwright → Prometheus Automation Observability — Technical Guide

Audience: an Automation Engineer who knows Playwright/CI well and is
learning backend services, Prometheus exporters, and production
observability patterns. Everything in this document is verified against
the actual files in this repository — nothing here is aspirational unless
a section explicitly says so.

---

## 1. What problem this solves

A Playwright HTML report answers "what happened in *this* run." It cannot
answer:

- Is automation health getting worse over the last two weeks?
- Did last night's scheduled run even happen?
- Which suite/environment currently has the worst failure ratio?
- Should someone be paged right now?

That's the gap between **test reporting** and **automation observability**:

| Question | Answered by |
|---|---|
| Did test X pass in this run, and why not? | Playwright HTML report / CTRF JSON |
| Is the suite healthy *right now*? | Prometheus gauges (`automation_last_run_*`) |
| Is it getting healthier or worse over time? | Prometheus history gauges + Grafana graphs |
| Did automation silently stop running? | `automation_last_run_timestamp_seconds` + alert rule |
| Should someone be notified? | Alertmanager (later, see Phase 7) |

This repository already generates CTRF JSON reports (Phase 1) and archives
every run (Phase 2). This guide documents the exporter that bridges those
JSON files into Prometheus (Phase 3 onward).

---

## 2. Final architecture

```
Playwright test run
        |
        v
CTRF / JSON report generation   (playwright-ctrf-json-reporter, driven by playwright.config.ts)
        |
        v
automation/playwright/results/runs/<runId>.json     (one file per run, never overwritten)
        |
        v  (scripts/run-with-results-history.js copies the just-finished run)
automation/playwright/results/latest.json           (always the most recent run)
        |
        v  (read from disk, on every scrape — no state kept in memory)
automation-results-exporter  (Express + prom-client, apps/automation-results-exporter)
        |
        v
GET /metrics   (Prometheus text exposition format)
        |
        v  (pull, on a timer — see monitoring/prometheus/prometheus.yml)
Prometheus  (exposure-prometheus container, scrapes every 1m)
        |
        v
Grafana dashboards        <- not built yet (Phase 6)
Alertmanager alerts       <- wired for the `api` service already; automation alert rules are Phase 7
Loki logs                 <- not wired yet (Phase 8)
OpenTelemetry / Tempo     <- not wired yet (Phase 9)
Kubernetes / Helm         <- not deployed yet (Phase 10-12)
```

Component-by-component:

- **Playwright** — runs the suite in `automation/playwright/tests/{api,ui}`.
  Short-lived: starts, runs, writes a report, exits.
- **CTRF reporter** (`playwright-ctrf-json-reporter`) — a Playwright
  reporter plugin, configured in `playwright.config.ts`, that emits a
  normalized JSON report (`CtrfReport` shape) instead of Playwright's
  native JSON format.
- **`latest.json`** — always the most recent run's CTRF report, at a fixed
  path so the exporter never has to guess which file is "current."
- **`runs/*.json`** — one archived CTRF report per run, named by run ID,
  never overwritten — this is what makes historical metrics possible.
- **`automation-results-exporter`** — a small long-running Express service
  (`apps/automation-results-exporter`) that reads those two things and
  renders them as Prometheus metrics.
- **prom-client** — the Node.js Prometheus client library used to define
  Gauges and render the exposition format.
- **Express** — the HTTP framework serving `/health`, `/ready`, `/metrics`.
- **`/metrics`** — the actual scrape endpoint; recomputed on every request.
- **Prometheus** — `exposure-prometheus` container, defined in
  `docker-compose-monitoring.yml`, configured by
  `monitoring/prometheus/prometheus.yml`. Pulls from every target on
  `scrape_interval: 1m`.
- **Grafana, Loki, OpenTelemetry/Tempo, Kubernetes/Helm** — future phases,
  intentionally not implemented yet (see §17).

---

## 3. Existing repository structure

Paths that are part of this system today (verified to exist):

```
automation/playwright/
├── playwright.config.ts          # test runner + CTRF reporter config
├── package.json                  # test scripts, incl. test:observed
├── scripts/
│   └── run-with-results-history.js   # wraps `playwright test`, maintains latest.json
├── results/
│   ├── latest.json                # most recent run's CTRF report
│   └── runs/
│       └── <runId>.json           # one archived CTRF report per run
└── tests/
    ├── api/*.spec.ts
    └── ui/*.spec.ts

apps/automation-results-exporter/
├── Dockerfile
├── package.json
├── tsconfig.json
├── dist/                          # build output (git-ignored, tsc output)
└── src/
    ├── config.ts
    ├── app.ts
    ├── index.ts
    ├── routes/
    │   ├── health.routes.ts
    │   └── metrics.routes.ts
    ├── results/
    │   ├── ctrf-reader.ts
    │   └── runs-reader.ts
    └── metrics/
        ├── registry.ts
        ├── automation.metrics.ts
        ├── update-latest-run.metrics.ts
        └── update-history.metrics.ts

monitoring/
├── prometheus/
│   ├── prometheus.yml
│   └── rules/
│       ├── api-recording-rules.yml
│       └── api-alert-rules.yml
└── alertmanager/
    └── alertmanager.yml

docker-compose.yml              # main app stack: postgres, redis, api, worker, web
docker-compose-monitoring.yml   # observability stack: prometheus, node-exporter, cadvisor,
                                 # alertmanager, automation-results-exporter
```

> **Naming note:** this repository's monitoring compose file is named
> **`docker-compose-monitoring.yml`** (hyphen). It is *not*
> `docker-compose.monitoring.yml` (dot). Every command in this guide uses
> the real, hyphenated filename — copy from here, not from memory.

Not present in this repository (do not assume these exist):

- No `.github/workflows/` — §13 documents a recommended pattern, not an
  existing one.
- No `Jenkinsfile` — §14 is likewise a recommended pattern.
- No Kubernetes manifests or Helm chart — intentionally out of scope for
  this guide (§17, Phases 10-12).
- No Grafana dashboards or provisioning — intentionally out of scope
  (§17, Phase 6).
- `.env.example` at the repo root defines `API_PORT`, `WEB_PORT`,
  `DATABASE_URL`, `REDIS_URL`, worker/scan variables — it does **not**
  currently list the exporter's `PORT` / `AUTOMATION_ENV` / `RESULTS_DIR`.
  They have working defaults in `config.ts` and are set explicitly in
  `docker-compose-monitoring.yml`, so this isn't broken, just worth adding
  to `.env.example` for discoverability if you extend this setup.

---

## 4. Playwright reporting setup

Configuration lives in `automation/playwright/playwright.config.ts`:

```ts
const automationRunId =
  process.env.AUTOMATION_RUN_ID ||
  `run-${new Date().toISOString().replace(/[:.]/g, '-')}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['playwright-ctrf-json-reporter', {
      outputDir: 'results/runs',
      outputFile: `${automationRunId}.json`,
    }],
  ],
  // ...
});
```

Two things happen per test run:

1. **A unique run file is created.** `automationRunId` is either passed in
   via the `AUTOMATION_RUN_ID` env var, or generated from the current
   timestamp. The CTRF reporter writes straight to
   `results/runs/<automationRunId>.json` — Playwright itself never touches
   `latest.json`.
2. **`latest.json` is a separate step**, handled by
   `automation/playwright/scripts/run-with-results-history.js`, run via
   `npm run test:observed`:

   ```js
   const runId = process.env.AUTOMATION_RUN_ID || `run-${new Date().toISOString().replace(/[:.]/g, '-')}`;

   const child = spawn(playwrightBin, ['playwright', 'test', ...argsFromCli], {
     env: { ...process.env, AUTOMATION_RUN_ID: runId },
   });

   child.on('exit', (code, signal) => {
     const runResultPath = path.join(runsDir, `${runId}.json`);
     const latestPath = path.join(resultsDir, 'latest.json');

     if (fs.existsSync(runResultPath)) {
       fs.copyFileSync(runResultPath, latestPath);   // <-- the actual "update latest" step
     }

     if (typeof code === 'number') process.exit(code);  // <-- propagates Playwright's exit code
   });
   ```

   The script generates one `runId`, exports it as `AUTOMATION_RUN_ID` so
   Playwright's reporter uses the exact same ID, waits for the process to
   exit, then copies that run's file over `latest.json`. It always exits
   with Playwright's real exit code — a CI pipeline calling
   `npm run test:observed` still fails correctly when tests fail, even
   though `latest.json` gets updated either way (see the callout in §8 on
   why that "always update, even on failure" behavior matters).

**Why `latest.json` exists:** a fixed, predictable filename means the
exporter's "current state" read is a single `fs.existsSync` + one file
read — no need to sort/filter the `runs/` directory to find "the most
recent one" on every scrape.

**Why `runs/*.json` exists:** `latest.json` gets overwritten every run, so
on its own it cannot answer "how many runs failed in the last week." Every
run is additionally preserved, immutably, under its own run ID.

**How this supports both current and historical metrics:** the exporter
has exactly two read paths, matching this exactly — see §5.

---

## 5. What the exporter is, and what this one does

A **Prometheus exporter** is any HTTP service that exposes
`GET /metrics` in Prometheus's text exposition format. It is not part of
Prometheus itself — it's a small adapter you write for anything Prometheus
doesn't natively know how to scrape (a database, a queue, or here, a
directory of JSON test reports).

This exporter, specifically:

1. Reads `results/latest.json` → "what's the current state" gauges.
2. Scans `results/runs/*.json` → "what's the historical state" gauges.
3. Normalizes both into a single shape (`total/passed/failed/skipped/pending/other`,
   `durationSeconds`, `completedAtSeconds`) regardless of the underlying
   CTRF structure.
4. Updates prom-client `Gauge` objects with those numbers.
5. Exposes:
   - `GET /health` — process liveness.
   - `GET /ready` — resolved config (`environment`, `resultsDir`,
     `latestResultsFilePath`), so you can confirm at a glance which
     directory it's actually reading.
   - `GET /metrics` — the Prometheus scrape target.

Nothing in the exporter runs tests, watches the filesystem, or holds
state between requests — every `/metrics` call re-reads the files fresh.
This is a deliberate simplicity trade-off: correct-by-construction (there's
no cache to go stale) at the cost of doing a small amount of file I/O once
a minute, which is negligible at this scale.

---

## 6. File-by-file explanation

### `apps/automation-results-exporter/package.json`

```json
{
  "name": "automation-results-exporter",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.3",
    "prom-client": "^15.1.3"
  }
}
```

- **Responsibility:** declares the two runtime dependencies (`express` for
  HTTP, `prom-client` for metrics) and the three lifecycle scripts.
- **Why it exists:** standard Node service packaging — `dev` for local
  iteration via `tsx` (no separate compile step), `build`/`start` for the
  compiled path the Dockerfile uses.
- **Depends on:** nothing in this project.
- **Depended on by:** the Dockerfile (`npm install`, `npm run build`,
  `npm start`) and anyone running `npm run dev` locally.

### `apps/automation-results-exporter/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true
  },
  "include": ["src/**/*.ts"]
}
```

- **Responsibility:** compiles `src/**/*.ts` to `dist/` as CommonJS,
  strict-mode TypeScript.
- **Why it exists:** `node dist/index.js` (the production start command)
  needs plain JS; this is what produces it.
- **Depends on:** nothing. **Depended on by:** `npm run build`.

### `apps/automation-results-exporter/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY apps/automation-results-exporter/package*.json ./
RUN npm install
COPY apps/automation-results-exporter/tsconfig.json ./tsconfig.json
COPY apps/automation-results-exporter/src ./src
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "start"]
```

- **Responsibility:** builds a standalone image for the exporter.
- **Why it exists:** so the exporter can run as its own container, next to
  (not inside) the app it observes.
- **Important detail:** every `COPY` is prefixed with
  `apps/automation-results-exporter/...` because the Docker **build
  context is the repository root** (`context: .` in
  `docker-compose-monitoring.yml`), not the app folder itself. If you ever
  see `npm error Missing script: "build"` from this Dockerfile, it almost
  always means the build context was pointed at the wrong directory and
  `COPY package*.json ./` grabbed the wrong `package.json`.
- **Depends on:** `package*.json`, `tsconfig.json`, `src/`.
  **Depended on by:** `docker-compose-monitoring.yml`'s `build:` block.

### `src/config.ts`

```ts
import path from 'path';

const resultsDir = path.resolve(
  process.env.RESULTS_DIR ?? '../../automation/playwright/results'
);

export const config = {
  port: Number(process.env.PORT ?? 3001),
  environment: process.env.AUTOMATION_ENV ?? 'local',
  resultsDir,
  latestResultsFilePath: path.join(resultsDir, 'latest.json'),
};
```

- **Responsibility:** the single source of truth for runtime configuration.
- **Why it exists:** every other file imports `config` instead of reading
  `process.env` directly — one place to see (and override) every knob.
- **Depends on:** Node's `path` module.
- **Depended on by:** `index.ts`, `app.ts` (indirectly via routes),
  `health.routes.ts`, `update-latest-run.metrics.ts`,
  `update-history.metrics.ts`.

### `src/app.ts`

```ts
import express from 'express';
import { healthRouter } from './routes/health.routes';
import { metricsRouter } from './routes/metrics.routes';

export const app = express();
app.use(express.json());
app.use(healthRouter);
app.use(metricsRouter);
```

- **Responsibility:** assembles the Express app and wires in both routers.
- **Why it exists:** separating "build the app" from "start listening"
  (which is `index.ts`'s job) makes the app importable/testable without
  binding a real port.
- **Depends on:** `express`, `health.routes.ts`, `metrics.routes.ts`.
  **Depended on by:** `index.ts`.

### `src/index.ts`

```ts
import { app } from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(JSON.stringify({
    level: 'info',
    service: 'automation-results-exporter',
    message: 'server started',
    port: config.port,
    environment: config.environment,
    resultsDir: config.resultsDir,
  }));
});
```

- **Responsibility:** the actual process entry point — binds the port.
- **Why it exists:** logs one structured JSON line on startup, which is
  exactly the shape a log pipeline like Loki/Promtail wants to parse later
  (see §17, Phase 8) with zero changes.
- **Depends on:** `app.ts`, `config.ts`. **Depended on by:** nothing (it's
  the entry point — `node dist/index.js`).

### `src/routes/health.routes.ts`

```ts
export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'automation-results-exporter' });
});

healthRouter.get('/ready', (_req, res) => {
  res.json({
    status: 'ready',
    environment: config.environment,
    resultsDir: config.resultsDir,
    latestResultsFilePath: config.latestResultsFilePath,
  });
});
```

- **Responsibility:** liveness (`/health`) and configuration visibility
  (`/ready`).
- **Why `/ready` echoes config instead of just saying "ready":** when
  something looks wrong (e.g. metrics are all zero), the first debugging
  step is "is it even reading the directory I think it's reading?" —
  `/ready` answers that without needing container exec access.
- **Depends on:** `express`, `config.ts`. **Depended on by:** `app.ts`.

### `src/routes/metrics.routes.ts`

```ts
export const metricsRouter = Router();

metricsRouter.get('/metrics', async (_req, res) => {
  try {
    updateLatestRunMetrics();
    updateHistoryMetrics();

    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      service: 'automation-results-exporter',
      message: 'failed to generate metrics',
      error: error instanceof Error ? error.message : String(error),
    }));
    res.status(500).send('failed to generate metrics\n');
  }
});
```

- **Responsibility:** the actual scrape endpoint. This is the only place
  in the whole exporter where "update metrics" and "read files" get
  triggered — on demand, per request.
- **Why both updates run on every request:** Prometheus's scrape is the
  trigger for freshness — there's no background timer re-reading files on
  its own schedule.
- **Depends on:** `registry.ts`, `update-latest-run.metrics.ts`,
  `update-history.metrics.ts`. **Depended on by:** `app.ts`.

### `src/results/ctrf-reader.ts`

```ts
export function readCtrfRunResult(filePath: string): LatestRunResult {
  if (!fs.existsSync(filePath)) {
    return emptyLatestRunResult();     // exists: false, everything 0 — never throws
  }
  const report = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CtrfReport;
  const summary = report.results?.summary;
  // ... extracts total/passed/failed/skipped/pending/other, durationSeconds, completedAtSeconds
}
```

- **Responsibility:** parse **one** CTRF JSON file into a normalized
  `LatestRunResult`. This is the only file that knows what a CTRF report's
  JSON shape looks like.
- **Why it can't crash:** it's called both on `latest.json` (which may
  not exist yet on a fresh checkout) and on every file under `runs/`
  (which could theoretically contain a partially-written or corrupt file).
  Missing file → `emptyLatestRunResult()`. The caller (`runs-reader.ts`)
  additionally wraps its own call in `try/catch` for JSON parse errors.
- **Depends on:** Node's `fs`. **Depended on by:** `runs-reader.ts`,
  `update-latest-run.metrics.ts`.

### `src/results/runs-reader.ts`

```ts
export function readRunsHistory(resultsDir: string): RunsHistoryResult {
  const runsDir = path.join(resultsDir, 'runs');
  const history = createEmptyHistory(runsDir);
  if (!fs.existsSync(runsDir)) return history;

  const runFilePaths = fs.readdirSync(runsDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(runsDir, f));

  for (const runFilePath of runFilePaths) {
    addRunToHistory(history, runFilePath);   // reads via readCtrfRunResult, catches parse errors
  }
  return history;
}
```

- **Responsibility:** aggregate **every** file under `results/runs/` into
  totals — `runsByStatus`, `testsByStatus`, `durationSecondsSum`,
  `durationSecondsCount`, `parseErrors`.
- **Why it re-scans the whole directory on every call:** simplicity. At
  the scale of a single project's test history (tens to low hundreds of
  run files), a full directory scan once a minute is cheap. This is
  explicitly the place to revisit if run history grows very large (see
  Production Notes, §16).
- **A run counts as `failed`** if it has at least one failed test, `passed`
  if it has zero failures and at least one test, otherwise `other`
  (handles the zero-test/parse-error edge case without a fake status).
- **Depends on:** `fs`, `path`, `ctrf-reader.ts`. **Depended on by:**
  `update-history.metrics.ts`.

### `src/metrics/registry.ts`

```ts
export const registry = new Registry();
collectDefaultMetrics({ register: registry });
```

- **Responsibility:** the single `prom-client` `Registry` every metric in
  this service registers into.
- **Why it exists as its own file:** avoids a circular-import mess — every
  metric file and the metrics route needs the same registry instance.
- **`collectDefaultMetrics`** additionally adds standard Node.js process
  metrics (CPU, memory, event loop lag, GC) for free — useful for
  monitoring the exporter itself, not just what it reports on.
- **Depends on:** `prom-client`. **Depended on by:** every file in
  `metrics/`, and `metrics.routes.ts`.

### `src/metrics/automation.metrics.ts`

Defines every custom `Gauge` this exporter exposes (see full list and
rationale in §7-8). All nine metrics register into the shared `registry`
and are exported as named constants for the `update-*` files to call
`.set()` on.

- **Depends on:** `prom-client`, `registry.ts`. **Depended on by:**
  `update-latest-run.metrics.ts`, `update-history.metrics.ts`.

### `src/metrics/update-latest-run.metrics.ts`

Reads `config.latestResultsFilePath` through `readCtrfRunResult`, then
calls `.set()` on every last-run gauge, including deriving the tri-state
`automation_last_run_status{status="passed|failed|missing"}` from
`exists`/`total`/`failed`.

- **Depends on:** `config.ts`, `ctrf-reader.ts`, `automation.metrics.ts`.
  **Depended on by:** `metrics.routes.ts`.

### `src/metrics/update-history.metrics.ts`

Reads `config.resultsDir` through `readRunsHistory`, then calls `.set()`
on every history gauge.

- **Depends on:** `config.ts`, `runs-reader.ts`, `automation.metrics.ts`.
  **Depended on by:** `metrics.routes.ts`.

---

## 7. Metrics design

### Current-state metrics (from `latest.json`)

| Metric | Labels | Example | Dashboard use | Alert use |
|---|---|---|---|---|
| `automation_last_run_tests` | `environment`, `status` (`total\|passed\|failed\|skipped\|pending\|other`) | `automation_last_run_tests{environment="local",status="failed"} 3` | Stat panel: "failed tests in last run" | Fire when `status="failed"` > 0 |
| `automation_last_run_duration_seconds` | `environment` | `... 23.6` | Time-series: run duration trend | Fire on abnormally long runs |
| `automation_last_run_status` | `environment`, `status` (`passed\|failed\|missing`) | `...{status="failed"} 1` | Single-stat "current health" (green/red) | Fire when `status="failed"` == 1 |
| `automation_last_run_timestamp_seconds` | `environment` | `...1784048338.93` | "Last run: X minutes ago" | Fire on stale automation, see §12 |

### Historical metrics (from `runs/*.json`)

| Metric | Labels | Example | Dashboard use | Alert use |
|---|---|---|---|---|
| `automation_history_runs` | `environment`, `status` (`total\|passed\|failed\|other`) | `...{status="failed"} 5` | Bar/pie: pass vs fail run counts | Fire on rising failed-run count over a window |
| `automation_history_tests` | `environment`, `status` | `...{status="failed"} 12` | Trend: cumulative failed tests | Rarely alerting directly — feeds ratios |
| `automation_history_run_duration_seconds_sum` | `environment` | `...142.8` | Combine with `_count` for average duration | — |
| `automation_history_run_duration_seconds_count` | `environment` | `...6` | Denominator for average duration | — |
| `automation_history_parse_errors` | `environment` | `...0` | Data-quality panel | Fire if > 0 — a run file is corrupt |

Plus standard `process_*` metrics from `collectDefaultMetrics` (CPU,
memory, event loop lag) — useful for "is the exporter itself healthy,"
separate from automation health.

---

## 8. Gauge vs Counter

Every metric above is a **`Gauge`**, not a `Counter` — this is correct for
this specific architecture, and worth understanding *why*, not just
copying.

A Prometheus `Counter` may only increase (a reset to zero is only valid on
process restart, and `rate()`/`increase()` are built assuming that). It
models "total events since the process started" — e.g. `http_requests_total`
in the `api` service (see `monitoring/prometheus/rules/api-recording-rules.yml`
for a real Counter-based example in this same repo).

This exporter is not counting events it has personally witnessed — it is
**recomputing current state from files on disk, from scratch, on every
scrape**:

- `automation_history_runs` isn't incremented once per new run — it's the
  *count of files currently in `runs/`* every time `/metrics` is hit.
- If someone deletes old files from `results/runs/` (see rotation note in
  §16), that number should legitimately go **down**. A `Counter` going
  down is either impossible (client libraries reject it) or is
  misinterpreted by Prometheus as a process restart, silently corrupting
  any `rate()`/`increase()` query built on top of it.
- The exporter has zero memory between requests. It doesn't know "how many
  runs there were last time" — `Gauge.set()` is exactly the right
  operation: "here is the current true value," full stop.

**When would Counter be correct instead?** If the architecture changed to
an event-driven model — e.g. the exporter exposed `POST /runs` and
Playwright's CI job pushed a "run finished" event to it directly, with the
exporter incrementing an in-memory counter once per received event. That
is a fundamentally different design (push, not pull; event-count, not
file-scan) and is not what this repository implements.

> **Concrete warning:** do not "optimize" this exporter by switching to a
> `Counter` and incrementing it once per file found while scanning
> `runs/`. Every scrape re-scans the *entire* directory, so a `Counter`
> would re-count the same files again and again, growing unboundedly and
> lying about actual run counts. `Gauge.set()` (replace, not add) is the
> only correct operation for a "recompute from source of truth" reader.

---

## 9. Docker Compose integration

The service, as it exists today in `docker-compose-monitoring.yml`:

```yaml
automation-results-exporter:
  build:
    context: .
    dockerfile: apps/automation-results-exporter/Dockerfile
  container_name: exposure-automation-results-exporter
  ports:
    - "3001:3001"
  environment:
    PORT: 3001
    AUTOMATION_ENV: local
    RESULTS_DIR: /app/results
  volumes:
    - ./automation/playwright/results:/app/results:ro
  restart: unless-stopped
  networks:
    - monitoring
```

Field by field:

- **`build.context: .`** — the repo root, not the app folder. This is why
  the Dockerfile's `COPY` lines are prefixed with the full app path (§6).
- **`ports: "3001:3001"`** — exposes the exporter on the *host* at
  `localhost:3001`, for your own browser/curl access. This has nothing to
  do with how Prometheus reaches it (next point).
- **`environment`** — `RESULTS_DIR: /app/results` is the container-side
  path, matching the volume mount target below, **not** the host path.
- **`volumes: ./automation/playwright/results:/app/results:ro`** — maps
  the host's results directory into the container at `/app/results`,
  **read-only**. The exporter only ever reads test results; it has no
  business writing to them, and `:ro` enforces that at the OS level, not
  just by convention.
- **`networks: [monitoring]`** — required so `exposure-prometheus` (also
  on the `monitoring` network) can resolve the exporter by Docker's
  internal DNS. Without a shared network, the containers cannot reach each
  other by service name regardless of published host ports. *(This line
  was added during implementation — the exporter is unreachable from
  Prometheus without it.)*

**Why Prometheus scrapes `automation-results-exporter:3001`, not
`localhost:3001`:** inside the `exposure-prometheus` container, `localhost`
means *that container itself* — there is no exporter listening there.
Docker Compose's embedded DNS resolves a **service name**
(`automation-results-exporter`) to the right container's IP, but only for
containers attached to the **same network**. `localhost:3001` would only
work if Prometheus and the exporter shared a network namespace (they
don't — each container gets its own). This is the single most common
mistake when wiring a new scrape target: copying the `ports:` host-side
port into `prometheus.yml` instead of the service name.

---

## 10. Prometheus YAML

`monitoring/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 1m
  scrape_timeout: 10s

scrape_configs:
  # ...
  - job_name: automation-results-exporter
    metrics_path: /metrics
    static_configs:
      - targets:
          - automation-results-exporter:3001
```

- **`global.scrape_interval: 1m`** — applies to every job unless
  overridden per-job; this is how often Prometheus pulls `/metrics` from
  every target, including this exporter.
- **`job_name`** — becomes the `job` label on every metric this target
  produces (visible in the PromQL results in §11/§12 as
  `job="automation-results-exporter"`).
- **`metrics_path: /metrics`** — explicit here, though `/metrics` is
  Prometheus's default path anyway; kept explicit for clarity.
- **`targets`** — Docker service name + container port, per §9.

**How `/targets` should look**, once healthy — from
http://localhost:9090/targets:

```
automation-results-exporter   UP
```

**How to debug a `DOWN` target**, in order:

1. Is the container even running? `docker ps | grep automation-results-exporter`
2. Is `/metrics` reachable from *outside* Docker?
   `curl http://localhost:3001/metrics`
3. Is `/metrics` reachable from *inside the Prometheus container*, using
   the service name?
   `docker exec exposure-prometheus wget -qO- http://automation-results-exporter:3001/metrics`
   — if step 2 works but step 3 doesn't, it's a Docker networking issue
   (missing `networks:` entry — see §9), not an application bug.
4. Check the actual scrape error Prometheus recorded:
   `curl -s http://localhost:9090/api/v1/targets | grep -A2 automation-results-exporter`
   (the `lastError` field is usually the fastest path to the real cause).
5. **Did you just edit `prometheus.yml`?** Prometheus does not hot-reload
   a bind-mounted config file. `docker restart exposure-prometheus` (or
   send a reload signal if `--web.enable-lifecycle` is set). A newly added
   job simply won't appear under `/targets` at all until this happens —
   easy to mistake for a scrape failure when it's actually stale config.

**How to test PromQL:** open http://localhost:9090/graph, or query the
HTTP API directly:

```bash
curl -s --get http://localhost:9090/api/v1/query \
  --data-urlencode 'query=automation_last_run_tests' | jq
```

---

## 11. Local validation flow

```bash
# 1. Generate results (from automation/playwright)
cd automation/playwright
npm install
npm run test:observed
#   -> writes results/latest.json
#   -> writes results/runs/<runId>.json

# 2. Confirm the files exist
ls results/latest.json
ls results/runs

# 3. Build the exporter locally (optional sanity check before Docker)
cd ../../apps/automation-results-exporter
npm install
npm run build

# 4. Start the full stack (from the repo root)
cd ../..
docker compose -f docker-compose.yml -f docker-compose-monitoring.yml up -d --build

# 5. Check the exporter directly
curl http://localhost:3001/health
curl http://localhost:3001/ready
curl http://localhost:3001/metrics | grep automation_

# 6. Check Prometheus discovered it
curl -s http://localhost:9090/api/v1/targets | python -c \
  "import json,sys; d=json.load(sys.stdin); [print(t['labels']['job'], t['health']) for t in d['data']['activeTargets']]"

# 7. Test PromQL (see §12 for the full query list)
curl -s --get http://localhost:9090/api/v1/query \
  --data-urlencode 'query=automation_last_run_status' | jq
```

If `prometheus.yml` was edited after Prometheus was already running,
`docker restart exposure-prometheus` before step 6 (see §10).

---

## 12. Useful PromQL

```promql
# Latest run: failed test count
automation_last_run_tests{status="failed"}

# Latest run: passed test count
automation_last_run_tests{status="passed"}

# Latest run failed? (1 = yes)
automation_last_run_status{status="failed"} == 1

# Latest run passed? (1 = yes)
automation_last_run_status{status="passed"} == 1

# Is the latest run "missing" (latest.json absent)?
automation_last_run_status{status="missing"} == 1

# Historical runs grouped by outcome
automation_history_runs

# Historical tests grouped by outcome
automation_history_tests

# Historical failure ratio (failed runs / total runs)
automation_history_runs{status="failed"} / automation_history_runs{status="total"}

# Average historical run duration
automation_history_run_duration_seconds_sum / automation_history_run_duration_seconds_count

# Time since the last run completed, in seconds
time() - automation_last_run_timestamp_seconds

# Is the exporter itself up?
up{job="automation-results-exporter"}
```

---

## 13. GitHub Actions integration

**Not present in this repository today** — no `.github/workflows/`
directory exists yet. This section documents the recommended pattern for
when CI is added; treat it as a starting point, not something to inspect.

The key constraint: a GitHub Actions job is **short-lived** — it starts,
runs, and the runner disappears. The exporter must live somewhere that
persists across job runs, so it can serve `/metrics` continuously. Three
patterns, in increasing production-readiness:

| Pattern | Fits | How |
|---|---|---|
| Upload results as a workflow artifact | Local learning / small teams | `actions/upload-artifact` after the test step; a human (or a separate scheduled job) downloads it into the exporter's `RESULTS_DIR` |
| Upload to shared storage (S3, etc.) | Small production setups | CI job syncs `results/` to S3; the exporter (running elsewhere, always-on) syncs from the same bucket on a timer or via a sidecar |
| Push to an ingestion endpoint | Production, multiple CI sources | The exporter (or a small companion service) exposes `POST /runs`; CI `curl`s the finished CTRF file to it directly — no shared filesystem needed |

A concise workflow skeleton (artifact-upload pattern, matches this repo's
actual test command):

```yaml
# .github/workflows/playwright.yml  (example — does not exist in this repo yet)
name: Playwright
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - working-directory: automation/playwright
        run: npm install
      - working-directory: automation/playwright
        run: npm run test:observed
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-results
          path: automation/playwright/results/
```

`if: always()` matters — you want the results uploaded whether the suite
passed or failed, same reasoning as
`run-with-results-history.js` always updating `latest.json` regardless of
exit code (§4).

---

## 14. Jenkins integration

Also **not present in this repository**. Same core constraint as GitHub
Actions: a Jenkins pipeline stage is short-lived; the exporter must run
outside the pipeline, continuously, reading from wherever results end up.

Practical pattern:

1. Jenkins runs `npm run test:observed` inside `automation/playwright`.
2. Jenkins archives `automation/playwright/results/**` as build artifacts
   (`archiveArtifacts`), and/or uploads them to shared/S3 storage.
3. The exporter reads from a directory that's kept in sync with that
   shared location — either a network volume mounted into both Jenkins
   agents and the exporter's host, or a small sync job (cron + `aws s3
   sync`, rsync, etc.) that mirrors the shared storage into the exporter's
   `RESULTS_DIR`.

Concise example:

```groovy
// Jenkinsfile (example — does not exist in this repo yet)
pipeline {
  agent any
  stages {
    stage('Playwright') {
      steps {
        dir('automation/playwright') {
          sh 'npm install'
          sh 'npm run test:observed'
        }
      }
    }
  }
  post {
    always {
      archiveArtifacts artifacts: 'automation/playwright/results/**', allowEmptyArchive: true
      // e.g. sh 'aws s3 sync automation/playwright/results/ s3://ci-results/playwright/'
    }
  }
}
```

---

## 15. Adapting to existing company reporting systems

**Key rule: only the reader changes. The exporter pattern stays the
same.**

```
Allure / JUnit XML / custom JSON / CI artifacts / S3 reports
        |
        v
a new reader  (parses the specific format)
        |
        v
the same normalized shape:
  { exists, total, passed, failed, skipped, pending, other,
    durationSeconds, completedAtSeconds }
        |
        v
the same Prometheus metrics (automation.metrics.ts — unchanged)
```

Concretely, to adopt this pattern against an existing Allure or JUnit XML
setup:

1. Write `allure-reader.ts` (or `junit-reader.ts`) implementing exactly the
   same function signature as `ctrf-reader.ts`'s `readCtrfRunResult` —
   same return shape, same "never throw, return an empty/zeroed result
   with `exists: false` if the file is missing or malformed" contract.
2. Write the equivalent of `runs-reader.ts` if the new format also has a
   "many historical files" concept, reusing the new reader per-file.
3. Point `update-latest-run.metrics.ts` / `update-history.metrics.ts` at
   the new reader instead of the CTRF one.
4. Leave `automation.metrics.ts`, both routers, `registry.ts`, `config.ts`,
   the Dockerfile, the Compose service, and the Prometheus job **entirely
   untouched** — they only ever consumed the normalized shape, never the
   original report format.

If a company runs multiple frameworks at once (e.g. Playwright *and* a
Java suite emitting JUnit XML), add a `suite` or `framework` label
alongside `environment`/`status` on the same metrics, with one reader per
format feeding the same gauges — rather than building parallel metric
families per framework.

---

## 16. Production notes

- **Do not put `test_name`, `run_id`, `error_message`, or `file_path` on
  a Prometheus label.** Labels create a new time series per distinct
  value — a label with unbounded cardinality (a test name, a UUID, a full
  error string) will make Prometheus's storage grow without bound and can
  degrade query performance badly. This exporter correctly uses only
  `environment` and `status` (a small, fixed set of values) as labels —
  keep it that way if you extend it.
- **Use logs (Loki, later) for anything you'd want to grep** — which test
  failed and why, stack traces, full error text. Use Prometheus purely for
  numeric health (counts, ratios, durations, booleans-as-0/1).
- **Rotate old run files.** `runs-reader.ts` scans the entire `runs/`
  directory on every scrape (§6) — fine at current scale, but if history
  grows into the thousands of files, add rotation (delete/archive files
  past N days or N runs) or move history into a real datastore
  (S3 + a periodic rollup, or a small database) rather than scaling the
  per-scrape directory scan indefinitely.
- **The exporter should never run tests.** It only reads files and
  exposes metrics — keep test execution entirely in CI/CD or local
  developer runs, never inside the exporter process.
- **CI/CD generates reports; the exporter only ever consumes them.** This
  separation is what lets the exporter stay simple and stateless.
- **A Dockerfile per service is the right unit for production packaging**
  — this exporter's own image, independent of the `api`/`worker`/`web`
  images, is exactly the shape you want for an eventual Kubernetes
  `Deployment` (§17).
- **Docker Compose is for local/single-host orchestration**, not a
  production deployment target — it's the right tool for what this
  repository currently is (a learning lab / local stack), and the natural
  predecessor to Kubernetes manifests once you need multi-host scheduling,
  autoscaling, or managed rollouts.

---

## 17. Future phases

Not a timeline — a dependency-ordered list of what to build next, each
phase assuming the previous ones are in place.

- **Phase 1 — Playwright reports.** CTRF JSON reporter configured
  (done, `playwright.config.ts`).
- **Phase 2 — `latest.json` and `runs/*.json`.** Run archiving and
  "current" pointer (done, `scripts/run-with-results-history.js`).
- **Phase 3 — Custom exporter.** Reads both, exposes `/metrics`
  (done, `apps/automation-results-exporter`).
- **Phase 4 — Docker Compose and Prometheus scrape.** Exporter
  containerized, wired into `docker-compose-monitoring.yml` and
  `prometheus.yml` (done).
- **Phase 5 — PromQL validation.** Confirm targets are `UP` and queries
  return real data (done — see §11/§12).
- **Phase 6 — Grafana dashboard.** Visualize the metrics from §7 (not
  started — explicitly out of scope for this guide).
- **Phase 7 — Alertmanager rules.** Automation-specific alert rules
  (e.g. `ApiTargetDown`-style rules already exist for the `api` service in
  `monitoring/prometheus/rules/api-alert-rules.yml` — the equivalent for
  `automation_last_run_status`/`automation_last_run_timestamp_seconds`
  does not exist yet).
- **Phase 8 — Loki logs.** Ship the exporter's structured JSON stdout
  logs (already the right shape, §6) into Loki via Promtail.
- **Phase 9 — OpenTelemetry / Tempo traces.** Relevant mainly for the
  `api` service's request chains, not this exporter (it has no meaningful
  span to trace) — but the same collector can scrape this exporter's
  `/metrics` alongside shipping traces.
- **Phase 10 — Kubernetes Job/CronJob and Deployment.** Playwright runs
  become a `CronJob` (scheduled) or `Job` (CI-triggered) writing to a
  `PersistentVolumeClaim`; the exporter becomes a single-replica
  `Deployment` reading the same PVC read-only.
- **Phase 11 — Helm.** Package the exporter's Deployment/Service (and
  optionally the Playwright CronJob) as a Helm chart for repeatable
  deploys across environments.
- **Phase 12 — Prometheus Operator and ServiceMonitor.** Replace the
  static `targets:` entry in `prometheus.yml` with a `ServiceMonitor`
  resource selecting the exporter's `Service` — scrape target discovery
  becomes dynamic instead of hardcoded by hostname.

---

## 18. Final summary

> I can implement Playwright automation observability by generating
> structured test reports, preserving latest and historical runs, exposing
> them through a custom Prometheus exporter, scraping them with
> Prometheus, and visualizing or alerting on automation health through
> Grafana and Alertmanager.

See also: [`docs/playwright-prometheus-automation-observability-visual-runbook.md`](playwright-prometheus-automation-observability-visual-runbook.md)
for a shorter, operational companion to keep open while working.
