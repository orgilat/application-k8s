import fs from 'fs';
import path from 'path';
import { readCtrfRunResult } from './ctrf-reader';

type TestStatus = 'total' | 'passed' | 'failed' | 'skipped' | 'pending' | 'other';
type RunStatus = 'passed' | 'failed' | 'other';

export type RunsHistoryResult = {
  runsDir: string;
  runsDirExists: boolean;
  runFilesCount: number;
  parseErrors: number;
  runsByStatus: Record<RunStatus, number>;
  testsByStatus: Record<TestStatus, number>;
  durationSecondsSum: number;
  durationSecondsCount: number;
};

export function readRunsHistory(resultsDir: string): RunsHistoryResult {
  const runsDir = path.join(resultsDir, 'runs');
  const history = createEmptyHistory(runsDir);

  if (!fs.existsSync(runsDir)) {
    return history;
  }

  const runFilePaths = fs
    .readdirSync(runsDir)
    .filter((fileName) => fileName.endsWith('.json'))
    .map((fileName) => path.join(runsDir, fileName));

  history.runsDirExists = true;
  history.runFilesCount = runFilePaths.length;

  for (const runFilePath of runFilePaths) {
    addRunToHistory(history, runFilePath);
  }

  return history;
}

function addRunToHistory(history: RunsHistoryResult, runFilePath: string) {
  try {
    const run = readCtrfRunResult(runFilePath);

    if (!run.exists) {
      return;
    }

    const runStatus = getRunStatus(run.total, run.failed);

    history.runsByStatus[runStatus] += 1;

    history.testsByStatus.total += run.total;
    history.testsByStatus.passed += run.passed;
    history.testsByStatus.failed += run.failed;
    history.testsByStatus.skipped += run.skipped;
    history.testsByStatus.pending += run.pending;
    history.testsByStatus.other += run.other;

    if (run.durationSeconds > 0) {
      history.durationSecondsSum += run.durationSeconds;
      history.durationSecondsCount += 1;
    }
  } catch {
    history.parseErrors += 1;
  }
}

function getRunStatus(total: number, failed: number): RunStatus {
  if (failed > 0) return 'failed';
  if (total > 0) return 'passed';
  return 'other';
}

function createEmptyHistory(runsDir: string): RunsHistoryResult {
  return {
    runsDir,
    runsDirExists: false,
    runFilesCount: 0,
    parseErrors: 0,
    runsByStatus: {
      passed: 0,
      failed: 0,
      other: 0,
    },
    testsByStatus: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      pending: 0,
      other: 0,
    },
    durationSecondsSum: 0,
    durationSecondsCount: 0,
  };
}