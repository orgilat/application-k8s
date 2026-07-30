# Automation Results Exporter

A Prometheus exporter that turns Playwright CTRF test-result JSON files into
Prometheus metrics. It does not run tests and it does not push anything
anywhere — it reads files from disk and answers scrape requests.

```
Playwright  --(writes)-->  results/latest.json          <--(reads)--  automation-results-exporter --(scrape)--  Prometheus  --(query)--  Grafana
                            results/runs/*.json
```

---

## What problem this solves

Playwright (via `playwright-ctrf-json-reporter`) already produces a JSON
report per run. That's fine for a human opening `results/latest.json` after
a run, but it is invisible to the rest of the observability stack:

- There's no history — you can't graph "pass rate over the last 2 weeks."
- There's no alerting — nobody gets paged when the suite starts failing
  repeatedly, or when a run silently stops happening at all.
- It doesn't fit next to the rest of the system's metrics (API latency,
  error rates, container stats) that are already in Prometheus/Grafana.

The exporter is a small adapter: it reads the same JSON files a human would
read, and re-exposes the numbers in a format Prometheus already knows how to
scrape, store, alert on, and graph.

## Why Playwright itself should not stay always running

A test run is a batch job: it starts, executes a fixed set of tests, writes
a report, and exits. There is nothing to "keep running" — a live Playwright
process between runs would just be an idle browser automation tool holding
memory for no reason, and it still couldn't answer `GET /metrics` on demand
(it doesn't have an HTTP server, and it doesn't know when Prometheus wants
to scrape). Test execution and metrics exposition are different lifecycles
and belong in different processes.

## Why the exporter stays running

Prometheus's model is **pull-based**: it needs a long-lived HTTP endpoint it
can hit on its own schedule (`scrape_interval`, here `1m`). The exporter's
only job is to be that endpoint — an always-on, cheap, stateless Express
service that reads the latest files off disk *at scrape time* and renders
them as Prometheus text format. It holds no test-run state of its own; every
`/metrics` call recomputes the gauges from whatever is on disk right now.

## Why Prometheus pulls metrics instead of receiving pushes

This is a deliberate Prometheus design choice, not an implementation detail
of this project:

- **Service discovery stays on the monitoring side.** Prometheus already
  knows the full list of targets (`prometheus.yml`); targets don't need to
  know where Prometheus lives or manage retries/backoff to it.
- **A dead or hanging target fails safely.** If the exporter is down,
  Prometheus just marks the target `down` — it doesn't queue, retry, or lose
  data it was supposed to receive. A push model has to solve "what happens
  if the receiver is temporarily unreachable" itself (buffering, retry
  storms); pull sidesteps it.
- **Scrape health is itself a metric.** The `up{job="..."}` time series
  Prometheus generates for every target is what `ApiTargetDown`-style alerts
  key off. There's no equivalent free signal in a push model — you'd have to
  build "did we receive a push recently" tracking by hand.
- **Pace is controlled centrally.** One `scrape_interval` in one config file
  controls load, instead of every service independently deciding how often
  to push.

This is why the exporter is written as "always answer `/metrics` when
asked," never as "send metrics somewhere."

## Why `latest.json` is used for the latest state

`results/latest.json` is a single, stable filename that always reflects the
most recent completed run — see `scripts/run-with-results-history.js` in the
Playwright project, which copies the CTRF output there after every run. The
exporter's "current state" gauges (`automation_last_run_*`) read exactly
this one file, so "what's the current pass/fail state" is always an O(1)
file read, and Grafana can show "right now" without any query-time
aggregation.

## Why `runs/*.json` is used for historical metrics

Each run is also archived as `results/runs/<runId>.json`, one file per run,
never overwritten. The exporter's `runs-reader` walks that whole directory
on every scrape and aggregates counts, statuses, and durations across all
of them. This is what makes `automation_history_*` possible — total runs
ever recorded, pass/fail run counts, cumulative test counts and durations.
It's intentionally simple (full directory scan every scrape) because the
file count is small and scrape interval is a minute; if this ever needs to
scale to a very large number of retained runs, that's the point to
introduce pruning or a real datastore, not before.

## Why Gauge is used instead of Counter

Every metric in `automation.metrics.ts` is a `Gauge`, deliberately not a
`Counter`. A Prometheus `Counter` is only allowed to increase (or reset to
zero on process restart) — it models things like "total requests served
since the process started." That's the wrong shape here:

- These numbers are **recomputed from files on every scrape**, not
  accumulated in memory. If someone deletes old files under `results/runs/`,
  `automation_history_runs` should legitimately go down. A `Counter` going
  down is treated as a process restart by Prometheus (`rate()`/`increase()`
  handle it as a reset) — using one here would silently corrupt any rate
  calculation.
- The exporter has no memory between scrapes. It doesn't know or care what
  the previous value was; it just reports "here is the current true value,"
  which is precisely what `Gauge` means.

If you ever want rate-like queries (e.g. "runs per hour"), do that in
PromQL over the Gauge with `deriv()`/recording rules, rather than trying to
force a Counter onto data that can decrease.

## Adapting this to other report formats (Allure, JUnit XML, etc.)

The whole integration surface with the report format is two files:
`src/results/ctrf-reader.ts` (parses one run's file) and
`src/results/runs-reader.ts` (aggregates many). Nothing else — `config.ts`,
the routes, the registry, and `automation.metrics.ts` — knows or cares what
format the reports are in.

To support Allure, JUnit XML, or anything else:

1. Write a new reader (e.g. `junit-reader.ts`) that parses that format and
   returns the same shape `ctrf-reader.ts` returns today: total, passed,
   failed, skipped, pending, other, durationSeconds, completedAtSeconds,
   plus an `exists` flag that's `false` (with all zeros) when the file is
   missing or unparsable — never throw.
2. Point `runs-reader.ts` at the new reader instead of `ctrf-reader.ts`.
3. Leave `automation.metrics.ts`, the routes, and Prometheus/Grafana
   entirely untouched — they only consume the normalized shape, not the
   original report format.

If a company runs multiple frameworks (say Playwright *and* a Java suite
producing JUnit XML) at once, the cleanest extension is one reader per
format feeding into the same metric set, with a `suite` or `framework`
label added alongside `environment`/`status` to tell them apart in Grafana.

## Moving this to Kubernetes later

Nothing here is Docker-Compose-specific by design — it's a stateless HTTP
service reading a mounted directory, which maps directly onto Kubernetes
primitives when that migration happens:

- **Playwright → `Job` / `CronJob`.** Test runs are still batch work; a
  `CronJob` (scheduled runs) or `Job` (triggered by CI) replaces `docker
  compose run`, writing results to a `PersistentVolumeClaim` instead of a
  bind mount.
- **Exporter → `Deployment`.** A single-replica `Deployment` mounting the
  same `PersistentVolumeClaim` (read-only) that the Playwright `Job` writes
  to, exposed via a `Service` on port 3001 — directly equivalent to the
  Compose service today.
- **Prometheus scraping → `ServiceMonitor`.** With the Prometheus Operator,
  a `ServiceMonitor` selecting the exporter's `Service` replaces the static
  `targets:` entry in `prometheus.yml` — same `/metrics` path, now
  discovered dynamically instead of hardcoded by hostname.
- **Grafana dashboards** — unchanged. They query the same metric names
  (`automation_last_run_*`, `automation_history_*`) regardless of whether
  Prometheus is running in Compose or Kubernetes.
- **Loki for logs** — the exporter already logs structured JSON lines to
  stdout (see `index.ts` and the error handling in `metrics.routes.ts`);
  that's exactly the shape Promtail/Loki want, no code changes needed, just
  a log-shipping sidecar/DaemonSet once on Kubernetes.
- **OpenTelemetry/Tempo for traces** — out of scope for this exporter (it
  has no meaningful request chain to trace), but relevant for the `api`
  service it sits next to; the same collector that ships to Tempo can scrape
  this exporter's `/metrics` too.

None of this requires changing the exporter's code — only where it's
deployed and how Prometheus finds it, which is the point of keeping report
parsing, metrics definitions, and transport concerns in separate files.

---

## Endpoints

| Method | Path      | Purpose                                                        |
|--------|-----------|-----------------------------------------------------------------|
| GET    | `/health` | Liveness — process is up.                                       |
| GET    | `/ready`  | Readiness — reports configured `environment`, `resultsDir`, `latestResultsFilePath`. |
| GET    | `/metrics`| Prometheus text-format metrics. Re-reads the result files on every call. |

## Metrics reference

**Latest run** (from `results/latest.json`):

| Metric | Labels | Meaning |
|---|---|---|
| `automation_last_run_tests` | `environment`, `status` (`total\|passed\|failed\|skipped\|pending\|other`) | Test count in the most recent run. |
| `automation_last_run_duration_seconds` | `environment` | Wall-clock duration of the most recent run. |
| `automation_last_run_status` | `environment`, `status` (`passed\|failed\|missing`) | `1` for the active state, `0` for the others. |
| `automation_last_run_timestamp_seconds` | `environment` | Unix timestamp the most recent run completed. |

**History** (from `results/runs/*.json`):

| Metric | Labels | Meaning |
|---|---|---|
| `automation_history_runs` | `environment`, `status` (`total\|passed\|failed\|other`) | Count of archived runs by outcome. |
| `automation_history_tests` | `environment`, `status` | Test counts summed across all archived runs. |
| `automation_history_run_duration_seconds_sum` | `environment` | Sum of durations across all archived runs. |
| `automation_history_run_duration_seconds_count` | `environment` | Number of archived runs with valid duration data. |
| `automation_history_parse_errors` | `environment` | Run files that failed to parse as JSON. |

Plus the standard Node.js process metrics from `prom-client`'s
`collectDefaultMetrics` (CPU, memory, event loop lag, GC).

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | HTTP port the exporter listens on. |
| `AUTOMATION_ENV` | `local` | Value of the `environment` label on every metric. |
| `RESULTS_DIR` | `../../automation/playwright/results` | Directory containing `latest.json` and `runs/`. |

## Running it

Via the full stack (recommended — this is how it's wired into Prometheus):

```bash
docker compose -f docker-compose.yml -f docker-compose-monitoring.yml up -d --build
```

Standalone, for local development:

```bash
cd apps/automation-results-exporter
npm install
npm run dev
```

## Verifying it end to end

1. Generate results: run the Playwright suite so `automation/playwright/results/latest.json`
   and `automation/playwright/results/runs/*.json` exist
   (`npm run test:observed` in `automation/playwright`).
2. Start the stack: `docker compose -f docker-compose.yml -f docker-compose-monitoring.yml up -d --build`
3. Check the exporter directly:
   - http://localhost:3001/health
   - http://localhost:3001/ready
   - http://localhost:3001/metrics
4. Check Prometheus discovered it: http://localhost:9090/targets — `automation-results-exporter` should be `UP`.
5. Run PromQL queries at http://localhost:9090/graph:
   - `automation_last_run_tests`
   - `automation_last_run_status`
   - `automation_history_runs`
   - `automation_history_tests`

### Known gotcha: Prometheus does not hot-reload `prometheus.yml`

The config file is a plain bind mount (`:ro`), so editing
`monitoring/prometheus/prometheus.yml` or adding a new scrape job does
**not** take effect until Prometheus reloads it. Either send a reload signal
(if `--web.enable-lifecycle` is set) or simply restart the container:

```bash
docker restart exposure-prometheus
```

Without this, a newly added job will silently not appear under `/targets`
at all — it's easy to mistake for a scrape failure when it's actually a
stale config.

## Notes on the current Compose wiring

Two small additions were necessary beyond the metric/route implementation
itself, both already applied and verified working:

- The `automation-results-exporter` service is attached to the `monitoring`
  Docker network so that `exposure-prometheus` (also on that network) can
  reach it by service name at `automation-results-exporter:3001`. Without a
  shared network, Prometheus cannot resolve or scrape the target even
  though both containers are running.
- This repository's monitoring compose file is named
  `docker-compose-monitoring.yml` (hyphen), not `docker-compose.monitoring.yml`
  (dot) — use the hyphenated name when running `docker compose -f ... -f ...`
  commands against this project.
