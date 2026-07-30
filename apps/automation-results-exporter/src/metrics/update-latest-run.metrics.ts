import { config } from '../config';
import { readCtrfRunResult } from '../results/ctrf-reader';
import {
  automationLastRunDurationSeconds,
  automationLastRunStatus,
  automationLastRunSuiteDurationSeconds,
  automationLastRunSuites,
  automationLastRunTests,
  automationLastRunTestsBySuite,
  automationLastRunTimestampSeconds,
} from './automation.metrics';

export function updateLatestRunMetrics() {
  const latestRun = readCtrfRunResult(config.latestResultsFilePath);

  automationLastRunTests.set(
    { environment: config.environment, status: 'total' },
    latestRun.total
  );

  automationLastRunTests.set(
    { environment: config.environment, status: 'passed' },
    latestRun.passed
  );

  automationLastRunTests.set(
    { environment: config.environment, status: 'failed' },
    latestRun.failed
  );

  automationLastRunTests.set(
    { environment: config.environment, status: 'skipped' },
    latestRun.skipped
  );

  automationLastRunTests.set(
    { environment: config.environment, status: 'pending' },
    latestRun.pending
  );

  automationLastRunTests.set(
    { environment: config.environment, status: 'other' },
    latestRun.other
  );

  automationLastRunDurationSeconds.set(
    { environment: config.environment },
    latestRun.durationSeconds
  );

  automationLastRunTimestampSeconds.set(
    { environment: config.environment },
    latestRun.completedAtSeconds
  );

  automationLastRunStatus.set(
    { environment: config.environment, status: 'passed' },
    latestRun.exists && latestRun.total > 0 && latestRun.failed === 0 ? 1 : 0
  );

  automationLastRunStatus.set(
    { environment: config.environment, status: 'failed' },
    latestRun.exists && latestRun.failed > 0 ? 1 : 0
  );

  automationLastRunStatus.set(
    { environment: config.environment, status: 'missing' },
    latestRun.exists ? 0 : 1
  );

  updateSuiteMetrics(latestRun.suites);
}

function updateSuiteMetrics(
  suites: ReturnType<typeof readCtrfRunResult>['suites']
) {
  // Suite labels are dynamic: a suite that disappears between runs would
  // otherwise leave a stale series behind. Reset before re-setting.
  automationLastRunTestsBySuite.reset();
  automationLastRunSuiteDurationSeconds.reset();

  automationLastRunSuites.set(
    { environment: config.environment },
    suites.length
  );

  for (const suite of suites) {
    automationLastRunTestsBySuite.set(
      { environment: config.environment, suite: suite.suite, status: 'total' },
      suite.total
    );
    automationLastRunTestsBySuite.set(
      { environment: config.environment, suite: suite.suite, status: 'passed' },
      suite.passed
    );
    automationLastRunTestsBySuite.set(
      { environment: config.environment, suite: suite.suite, status: 'failed' },
      suite.failed
    );
    automationLastRunTestsBySuite.set(
      { environment: config.environment, suite: suite.suite, status: 'skipped' },
      suite.skipped
    );
    automationLastRunTestsBySuite.set(
      { environment: config.environment, suite: suite.suite, status: 'pending' },
      suite.pending
    );
    automationLastRunTestsBySuite.set(
      { environment: config.environment, suite: suite.suite, status: 'other' },
      suite.other
    );

    automationLastRunSuiteDurationSeconds.set(
      { environment: config.environment, suite: suite.suite },
      suite.durationSeconds
    );
  }
}
