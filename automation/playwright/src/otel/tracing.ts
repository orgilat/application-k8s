import { trace, Tracer } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

const serviceName = 'playwright-automation';

const serviceVersion = process.env.npm_package_version ?? '1.0.0';

const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
  'http://tempo:4318/v1/traces';

const traceExporter = new OTLPTraceExporter({
  url: otlpEndpoint,
});

const otelSdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    'deployment.environment': process.env.AUTOMATION_ENV ?? 'local',
  }),
  traceExporter,
});

let tracingStarted = false;

export async function startTracing() {
  if (tracingStarted) {
    return;
  }

  await otelSdk.start();
  tracingStarted = true;

  console.log(
    JSON.stringify({
      level: 'info',
      service: serviceName,
      event: 'otel_tracing_started',
      message: 'OpenTelemetry tracing started for Playwright automation',
      otlpEndpoint,
    })
  );
}

export async function shutdownTracing() {
  if (!tracingStarted) {
    return;
  }

  await otelSdk.shutdown();
  tracingStarted = false;
}

export function getTracer(): Tracer {
  return trace.getTracer(serviceName, serviceVersion);
}
