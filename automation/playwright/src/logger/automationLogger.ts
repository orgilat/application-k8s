import fs from 'fs';
import path from 'path';
import winston from 'winston';

// Environment label, defaulting to "local".
export const automationEnvironment = process.env.AUTOMATION_ENV || 'local';

// Reuse the run id from the wrapper script (run-with-results-history.js) when
// provided, so the .jsonl log file shares the same id as the CTRF report.
// Otherwise generate one id, once per process.
export const automationRunId =
  process.env.AUTOMATION_RUN_ID ||
  `run-${new Date().toISOString().replace(/[:.]/g, '-')}`;

// results/logs lives next to results/runs (CTRF) and results/latest.json.
const logsDir = path.resolve(process.cwd(), 'results', 'logs');
fs.mkdirSync(logsDir, { recursive: true });

export const automationLogFilePath = path.join(
  logsDir,
  `${automationRunId}.jsonl`
);

// JSON logs to both stdout (picked up by Alloy -> Loki when run in Docker)
// and a per-run JSONL file. Winston's json format writes one JSON object per
// line, which is exactly JSONL.
export const automationLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'playwright-automation',
    environment: automationEnvironment,
    run_id: automationRunId,
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: automationLogFilePath }),
  ],
});
