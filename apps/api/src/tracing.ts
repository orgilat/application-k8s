import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

// Resolve service version from the package manifest, falling back to 1.0.0.
let serviceVersion = '1.0.0';
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  serviceVersion = require('../package.json').version || serviceVersion;
} catch {
  /* keep default */
}

const serviceName = process.env.OTEL_SERVICE_NAME || 'exposure-api';
const deploymentEnvironment = process.env.NODE_ENV || 'local';
const tracesEndpoint =
  process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
  'http://tempo:4318/v1/traces';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    'deployment.environment': deploymentEnvironment,
  }),
  traceExporter: new OTLPTraceExporter({ url: tracesEndpoint }),
  instrumentations: [getNodeAutoInstrumentations()],
});

let started = false;

export async function startTracing(): Promise<void> {
  if (started) return;
  sdk.start();
  started = true;
  console.log(
    JSON.stringify({
      level: 'info',
      service: serviceName,
      event: 'tracing_started',
      endpoint: tracesEndpoint,
      environment: deploymentEnvironment,
    })
  );
}

export async function shutdownTracing(): Promise<void> {
  if (!started) return;
  try {
    await sdk.shutdown();
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        service: serviceName,
        event: 'tracing_shutdown_failed',
        message: error instanceof Error ? error.message : String(error),
      })
    );
  } finally {
    started = false;
  }
}
