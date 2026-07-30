import { getRedis, log } from './queue';
import { processScan } from './jobs/scan';
import { processRemediation } from './jobs/remediation';
import { processReport } from './jobs/report';

const QUEUES = ['scan.run', 'remediation.run', 'report.generate'];

async function processJob(queue: string, raw: string) {
  const payload = JSON.parse(raw);
  log('job_received', { queue, payload });
  try {
    if (queue === 'scan.run') await processScan(payload);
    else if (queue === 'remediation.run') await processRemediation(payload);
    else if (queue === 'report.generate') await processReport(payload);
  } catch (e) {
    log('job_error', { queue, error: (e as Error).message });
  }
}

async function startWorker() {
  const redis = getRedis();
  log('worker_started', { queues: QUEUES });

  while (true) {
    try {
      const result = await redis.brpop(...QUEUES, 5);
      if (result) {
        const [queue, raw] = result;
        processJob(queue, raw).catch(e => log('job_crash', { error: e.message }));
      }
    } catch (e) {
      log('worker_error', { error: (e as Error).message });
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

startWorker();
