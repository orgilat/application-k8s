import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

import { automationLogFilePath, automationLogger } from '../logger/automationLogger';

const FAILURE_STATUSES = ['failed', 'timedOut', 'interrupted'];

class StructuredJsonReporter implements Reporter {
  onBegin(_config: FullConfig, suite: Suite) {
    const totalTests = suite.allTests().length;
    automationLogger.info({
      event: 'run_started',
      message: `Automation run started with ${totalTests} tests`,
      total_tests: totalTests,
    });
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const base = {
      suite: getSuiteName(test),
      test_name: test.title,
      status: result.status,
      duration_ms: result.duration,
      retry: result.retry,
      project: getProjectName(test),
      file_path: test.location?.file,
    };

    automationLogger.info({
      event: 'test_finished',
      message: `Test finished: ${test.title} [${result.status}]`,
      ...base,
    });

    if (FAILURE_STATUSES.includes(result.status)) {
      const error = result.error;
      automationLogger.error({
        event: 'test_failed',
        message: `Test failed: ${test.title}`,
        ...base,
        error_message: error?.message,
        error_stack: error?.stack,
        stdout: toText(result.stdout),
        stderr: toText(result.stderr),
        trace_path: findAttachmentPath(result, 'trace'),
        video_path: findAttachmentPath(result, 'video'),
        screenshot_path: findAttachmentPath(result, 'screenshot'),
        attachments: result.attachments.map((a) => ({
          name: a.name,
          path: a.path,
          content_type: a.contentType,
        })),
      });
    }
  }

  onEnd(result: FullResult) {
    automationLogger.info({
      event: 'run_finished',
      message: `Automation run finished with status ${result.status}`,
      status: result.status,
      duration_ms: result.duration,
      log_file: automationLogFilePath,
    });
  }
}

function getSuiteName(test: TestCase): string {
  return test.parent?.title || 'unknown';
}

function getProjectName(test: TestCase): string | undefined {
  let suite: Suite | undefined = test.parent;
  while (suite) {
    const project = suite.project?.();
    if (project) {
      return project.name;
    }
    suite = suite.parent;
  }
  return undefined;
}

function toText(chunks: (string | Buffer)[]): string | undefined {
  if (!chunks || chunks.length === 0) {
    return undefined;
  }
  return chunks
    .map((chunk) => (typeof chunk === 'string' ? chunk : chunk.toString('utf-8')))
    .join('');
}

function findAttachmentPath(
  result: TestResult,
  name: string
): string | undefined {
  const attachment = result.attachments.find(
    (a) => a.name === name && Boolean(a.path)
  );
  return attachment?.path;
}

export default StructuredJsonReporter;
