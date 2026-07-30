import { Gauge } from 'prom-client';
import { registry } from './registry';

export const automationLastRunTests = new Gauge({
  name: 'automation_last_run_tests',
  help: 'Number of tests in the latest automation run by status',
  labelNames: ['environment', 'status'] as const,
  registers: [registry],
});

export const automationLastRunDurationSeconds = new Gauge({
  name: 'automation_last_run_duration_seconds',
  help: 'Duration of the latest automation run in seconds',
  labelNames: ['environment'] as const,
  registers: [registry],
});

export const automationLastRunStatus = new Gauge({
  name: 'automation_last_run_status',
  help: 'Latest automation run status. The active status label has value 1, others 0',
  labelNames: ['environment', 'status'] as const,
  registers: [registry],
});

export const automationLastRunTimestampSeconds = new Gauge({
  name: 'automation_last_run_timestamp_seconds',
  help: 'Unix timestamp of the latest automation run completion time',
  labelNames: ['environment'] as const,
  registers: [registry],
});
export const automationHistoryRuns = new Gauge({
  name: 'automation_history_runs',
  help: 'Number of stored automation runs by status',
  labelNames: ['environment', 'status'] as const,
  registers: [registry],
});

export const automationHistoryTests = new Gauge({
  name: 'automation_history_tests',
  help: 'Number of tests across stored automation runs by status',
  labelNames: ['environment', 'status'] as const,
  registers: [registry],
});

export const automationHistoryRunDurationSecondsSum = new Gauge({
  name: 'automation_history_run_duration_seconds_sum',
  help: 'Sum of durations across stored automation runs in seconds',
  labelNames: ['environment'] as const,
  registers: [registry],
});

export const automationHistoryRunDurationSecondsCount = new Gauge({
  name: 'automation_history_run_duration_seconds_count',
  help: 'Number of stored automation runs with duration data',
  labelNames: ['environment'] as const,
  registers: [registry],
});

export const automationHistoryParseErrors = new Gauge({
  name: 'automation_history_parse_errors',
  help: 'Number of run result JSON files that failed to parse',
  labelNames: ['environment'] as const,
  registers: [registry],
});
export const automationLastRunTestsBySuite = new Gauge({
  name: 'automation_last_run_tests_by_suite',
  help: 'Number of tests in the latest automation run by suite and status',
  labelNames: ['environment', 'suite', 'status'] as const,
  registers: [registry],
});

export const automationLastRunSuiteDurationSeconds = new Gauge({
  name: 'automation_last_run_suite_duration_seconds',
  help: 'Total test duration in the latest automation run by suite',
  labelNames: ['environment', 'suite'] as const,
  registers: [registry],
});

export const automationLastRunSuites = new Gauge({
  name: 'automation_last_run_suites',
  help: 'Number of suites detected in the latest automation run',
  labelNames: ['environment'] as const,
  registers: [registry],
});