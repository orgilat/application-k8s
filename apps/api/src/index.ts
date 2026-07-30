import { startTracing, shutdownTracing } from './tracing';

async function bootstrap() {
  // Tracing must start before any instrumented module (express, http, pg, ioredis)
  // is imported, so the app and db modules are loaded dynamically below.
  await startTracing();

  const { app } = await import('./app');
  const { default: migrate } = await import('./db/migrate');
  const { default: seed } = await import('./db/seed');

  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);

  await migrate();
  await seed();

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(
      JSON.stringify({
        level: 'info',
        service: 'exposure-api',
        event: 'api_started',
        port,
      })
    );
  });

  const gracefulShutdown = () => {
    server.close(async () => {
      await shutdownTracing();
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

bootstrap().catch((error) => {
  console.error(
    JSON.stringify({
      level: 'error',
      service: 'exposure-api',
      event: 'api_bootstrap_failed',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
  );

  process.exit(1);
});
