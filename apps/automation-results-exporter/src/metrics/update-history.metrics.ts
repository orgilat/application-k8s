import { config } from '../config';
import { readRunsHistory } from '../results/runs-reader';
import {
  automationHistoryParseErrors,
  automationHistoryRunDurationSecondsCount,
  automationHistoryRunDurationSecondsSum,
  automationHistoryRuns,
  automationHistoryTests,
} from './automation.metrics';

export function updateHistoryMetrics() {
  const history = readRunsHistory(config.resultsDir);

  automationHistoryRuns.set(
    { environment: config.environment, status: 'total' },
    history.runFilesCount
  );

  automationHistoryRuns.set(
    { environment: config.environment, status: 'passed' },
    history.runsByStatus.passed
  );

  automationHistoryRuns.set(
    { environment: config.environment, status: 'failed' },
    history.runsByStatus.failed
  );

  automationHistoryRuns.set(
    { environment: config.environment, status: 'other' },
    history.runsByStatus.other
  );

  automationHistoryTests.set(
    { environment: config.environment, status: 'total' },
    history.testsByStatus.total
  );

  automationHistoryTests.set(
    { environment: config.environment, status: 'passed' },
    history.testsByStatus.passed
  );

  automationHistoryTests.set(
    { environment: config.environment, status: 'failed' },
    history.testsByStatus.failed
  );

  automationHistoryTests.set(
    { environment: config.environment, status: 'skipped' },
    history.testsByStatus.skipped
  );

  automationHistoryTests.set(
    { environment: config.environment, status: 'pending' },
    history.testsByStatus.pending
  );

  automationHistoryTests.set(
    { environment: config.environment, status: 'other' },
    history.testsByStatus.other
  );

  automationHistoryRunDurationSecondsSum.set(
    { environment: config.environment },
    history.durationSecondsSum
  );

  automationHistoryRunDurationSecondsCount.set(
    { environment: config.environment },
    history.durationSecondsCount
  );

  automationHistoryParseErrors.set(
    { environment: config.environment },
    history.parseErrors
  );
}
