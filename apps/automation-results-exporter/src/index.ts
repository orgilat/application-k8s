import { app } from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(
    JSON.stringify({
      level: 'info',
      service: 'automation-results-exporter',
      message: 'server started',
      port: config.port,
      environment: config.environment,
      resultsDir: config.resultsDir,
    })
  );
});