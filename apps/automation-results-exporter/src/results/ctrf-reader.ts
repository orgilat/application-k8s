import fs from 'fs';
import path from 'path';

type CtrfTest = {
  name?: string;
  status?: string;
  rawStatus?: string;
  duration?: number;
  suite?: string;
  filePath?: string;
};

type CtrfReport = {
  timestamp?: string;
  results?: {
    summary?: {
      tests?: number;
      passed?: number;
      failed?: number;
      skipped?: number;
      pending?: number;
      other?: number;
      start?: number;
      stop?: number;
    };
    tests?: CtrfTest[];
  };
};

export type SuiteRunResult = {
  suite: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  other: number;
  durationSeconds: number;
};

export type LatestRunResult = {
  exists: boolean;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  other: number;
  durationSeconds: number;
  completedAtSeconds: number;
  suites: SuiteRunResult[];
};

export function readLatestRunResult(filePath: string): LatestRunResult {
  return readCtrfRunResult(filePath);
}

export function readCtrfRunResult(filePath: string): LatestRunResult {
  if (!fs.existsSync(filePath)) {
    return emptyLatestRunResult();
  }

  const rawFileContent = fs.readFileSync(filePath, 'utf-8');
  const report = JSON.parse(rawFileContent) as CtrfReport;

  const summary = report.results?.summary;
  const tests = report.results?.tests ?? [];

  const total = summary?.tests ?? 0;
  const passed = summary?.passed ?? 0;
  const failed = summary?.failed ?? 0;
  const skipped = summary?.skipped ?? 0;
  const pending = summary?.pending ?? 0;
  const other = summary?.other ?? 0;

  const start = summary?.start ?? 0;
  const stop = summary?.stop ?? 0;

  const durationSeconds =
    start > 0 && stop >= start ? (stop - start) / 1000 : 0;

  const completedAtSeconds =
    stop > 0 ? stop / 1000 : getTimestampSeconds(report.timestamp);

  return {
    exists: true,
    total,
    passed,
    failed,
    skipped,
    pending,
    other,
    durationSeconds,
    completedAtSeconds,
    suites: buildSuitesResult(tests),
  };
}

function buildSuitesResult(tests: CtrfTest[]): SuiteRunResult[] {
  const suitesByName = new Map<string, SuiteRunResult>();

  for (const test of tests) {
    const suiteName = getSuiteName(test);
    const status = getNormalizedStatus(test.status ?? test.rawStatus);
    const durationSeconds = getDurationSeconds(test.duration);

    if (!suitesByName.has(suiteName)) {
      suitesByName.set(suiteName, {
        suite: suiteName,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        pending: 0,
        other: 0,
        durationSeconds: 0,
      });
    }

    const suite = suitesByName.get(suiteName)!;

    suite.total += 1;
    suite[status] += 1;
    suite.durationSeconds += durationSeconds;
  }

  return Array.from(suitesByName.values()).sort((a, b) =>
    a.suite.localeCompare(b.suite)
  );
}

function getSuiteName(test: CtrfTest): string {
  if (test.suite && test.suite.trim().length > 0) {
    return normalizeSuiteName(test.suite);
  }

  if (test.filePath && test.filePath.trim().length > 0) {
    return path.basename(test.filePath);
  }

  return 'unknown';
}

function normalizeSuiteName(rawSuite: string): string {
  const parts = rawSuite
    .split('>')
    .map((part) => part.trim())
    .filter(Boolean);

  const lastPart = parts.at(-1);

  if (!lastPart) {
    return 'unknown';
  }

  return lastPart;
}

function getNormalizedStatus(
  status?: string
): 'passed' | 'failed' | 'skipped' | 'pending' | 'other' {
  switch (status) {
    case 'passed':
      return 'passed';
    case 'failed':
      return 'failed';
    case 'skipped':
      return 'skipped';
    case 'pending':
      return 'pending';
    default:
      return 'other';
  }
}

function getDurationSeconds(duration?: number): number {
  if (!duration || duration <= 0) {
    return 0;
  }

  return duration / 1000;
}

function emptyLatestRunResult(): LatestRunResult {
  return {
    exists: false,
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    pending: 0,
    other: 0,
    durationSeconds: 0,
    completedAtSeconds: 0,
    suites: [],
  };
}

function getTimestampSeconds(timestamp?: string): number {
  if (!timestamp) {
    return 0;
  }

  const parsedTimestamp = new Date(timestamp).getTime();

  if (Number.isNaN(parsedTimestamp)) {
    return 0;
  }

  return parsedTimestamp / 1000;
}