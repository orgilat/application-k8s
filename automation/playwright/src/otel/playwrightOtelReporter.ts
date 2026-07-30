import path from 'path';
import {
  context,
  Span,
  SpanStatusCode,
  trace,
} from '@opentelemetry/api';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
} from '@playwright/test/reporter';

import { getTracer, shutdownTracing, startTracing } from './tracing';

type AttributeValue = string | number | boolean | string[] | undefined;

const serviceName = 'playwright-automation';

function getRunId() {
  return (
    process.env.AUTOMATION_RUN_ID ||
    `run-${new Date().toISOString().replace(/[:.]/g, '-')}`
  );
}

function getEnvironment() {
  return process.env.AUTOMATION_ENV || 'local';
}

function compactAttributes(attributes: Record<string, AttributeValue>) {
  const cleaned: Record<string, string | number | boolean | string[]> = {};

  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== '') {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

function isFailureStatus(status: string) {
  return status === 'failed' || status === 'timedOut' || status === 'interrupted';
}

function getSuiteName(test: TestCase) {
  const titlePath = test.titlePath().filter(Boolean);
  const testTitle = test.title;

  const meaningfulParts = titlePath.filter((part) => part !== testTitle);

  const lastMeaningfulPart = meaningfulParts.at(-1);

  if (lastMeaningfulPart) {
    return lastMeaningfulPart;
  }

  if (test.location?.file) {
    return path.basename(test.location.file);
  }

  return 'unknown';
}

function getProjectName(test: TestCase) {
  return test.parent.project()?.name;
}

function getErrorMessage(error?: TestError) {
  if (!error) {
    return undefined;
  }

  return error.message || error.value;
}

function getErrorStack(error?: TestError) {
  if (!error) {
    return undefined;
  }

  return error.stack;
}

function getAttachmentPath(result: TestResult, attachmentNamePart: string) {
  const attachment = result.attachments.find((item) =>
    item.name.toLowerCase().includes(attachmentNamePart.toLowerCase())
  );

  return attachment?.path;
}

function getAttachmentPaths(result: TestResult) {
  return result.attachments
    .map((attachment) => attachment.path)
    .filter((attachmentPath): attachmentPath is string => Boolean(attachmentPath));
}

function getTestEndTime(result: TestResult) {
  return new Date(result.startTime.getTime() + result.duration);
}

function getSpanIds(span: Span) {
  const spanContext = span.spanContext();

  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
}

class PlaywrightOtelReporter implements Reporter {
  private runId = getRunId();
  private environment = getEnvironment();
  private runSpan?: Span;
  private runContext = context.active();
  private totalTests = 0;
  private passed = 0;
  private failed = 0;
  private skipped = 0;
  private timedOut = 0;
  private interrupted = 0;

  async onBegin(_config: FullConfig, suite: Suite) {
    await startTracing();

    this.totalTests = suite.allTests().length;

    const tracer = getTracer();

    this.runSpan = tracer.startSpan('automation.run', {
      attributes: compactAttributes({
        'service.name': serviceName,
        'automation.run_id': this.runId,
        'automation.environment': this.environment,
        'automation.total_tests': this.totalTests,
      }),
    });

    this.runContext = trace.setSpan(context.active(), this.runSpan);

    this.runSpan.addEvent(
      'automation.run.started',
      compactAttributes({
        'automation.run_id': this.runId,
        'automation.environment': this.environment,
        'automation.total_tests': this.totalTests,
      })
    );

    // Emit the run's trace_id/span_id to stdout so the same ids land in Loki
    // (via Alloy) — enabling Log -> trace_id -> Tempo correlation in Grafana.
    const runSpanIds = getSpanIds(this.runSpan);

    console.log(
      JSON.stringify({
        level: 'info',
        service: serviceName,
        event: 'automation_trace_started',
        automation_run_id: this.runId,
        environment: this.environment,
        trace_id: runSpanIds.traceId,
        span_id: runSpanIds.spanId,
      })
    );
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.updateCounters(result.status);

    const tracer = getTracer();
    const suiteName = getSuiteName(test);
    const projectName = getProjectName(test);
    const firstError = result.error ?? result.errors[0];

    const testSpan = tracer.startSpan(
      'automation.test',
      {
        startTime: result.startTime,
        attributes: compactAttributes({
          'service.name': serviceName,
          'automation.run_id': this.runId,
          'automation.environment': this.environment,
          'test.name': test.title,
          'test.suite': suiteName,
          'test.status': result.status,
          'test.expected_status': test.expectedStatus,
          'test.duration_ms': result.duration,
          'test.retry': result.retry,
          'test.project': projectName,
          'test.file_path': test.location?.file,
          'artifact.trace_path': getAttachmentPath(result, 'trace'),
          'artifact.video_path': getAttachmentPath(result, 'video'),
          'artifact.screenshot_path': getAttachmentPath(result, 'screenshot'),
          'artifact.attachments': getAttachmentPaths(result),
        }),
      },
      this.runContext
    );

    if (isFailureStatus(result.status)) {
      const errorMessage = getErrorMessage(firstError);
      const errorStack = getErrorStack(firstError);

      testSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });

      if (firstError) {
        testSpan.recordException({
          name: 'PlaywrightTestError',
          message: errorMessage ?? 'Playwright test failed',
          stack: errorStack,
        });
      }

      testSpan.setAttributes(
        compactAttributes({
          'error.message': errorMessage,
          'error.stack': errorStack,
        })
      );

      testSpan.addEvent(
        'automation.test.failed',
        compactAttributes({
          'test.name': test.title,
          'test.suite': suiteName,
          'test.status': result.status,
          'test.retry': result.retry,
          'error.message': errorMessage,
        })
      );
    } else {
      testSpan.setStatus({
        code: SpanStatusCode.OK,
      });

      testSpan.addEvent(
        'automation.test.completed',
        compactAttributes({
          'test.name': test.title,
          'test.suite': suiteName,
          'test.status': result.status,
          'test.duration_ms': result.duration,
        })
      );
    }

    testSpan.end(getTestEndTime(result));
  }

  async onEnd(result: FullResult) {
    if (this.runSpan) {
      this.runSpan.setAttributes(
        compactAttributes({
          'automation.result_status': result.status,
          'automation.passed': this.passed,
          'automation.failed': this.failed,
          'automation.skipped': this.skipped,
          'automation.timed_out': this.timedOut,
          'automation.interrupted': this.interrupted,
        })
      );

      if (this.failed > 0 || this.timedOut > 0 || this.interrupted > 0) {
        this.runSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: 'Automation run completed with failures',
        });
      } else {
        this.runSpan.setStatus({
          code: SpanStatusCode.OK,
        });
      }

      this.runSpan.addEvent(
        'automation.run.finished',
        compactAttributes({
          'automation.result_status': result.status,
          'automation.passed': this.passed,
          'automation.failed': this.failed,
          'automation.skipped': this.skipped,
          'automation.timed_out': this.timedOut,
          'automation.interrupted': this.interrupted,
        })
      );

      this.runSpan.end();
    }

    await shutdownTracing();
  }

  private updateCounters(status: TestResult['status']) {
    switch (status) {
      case 'passed':
        this.passed += 1;
        break;
      case 'failed':
        this.failed += 1;
        break;
      case 'skipped':
        this.skipped += 1;
        break;
      case 'timedOut':
        this.timedOut += 1;
        break;
      case 'interrupted':
        this.interrupted += 1;
        break;
      default:
        break;
    }
  }
}

export default PlaywrightOtelReporter;