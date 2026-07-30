import Redis from 'ioredis';

let client: Redis;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    client.on('error', (err) => {
      console.error(JSON.stringify({ type: 'redis_error', error: err.message }));
    });
  }
  return client;
}

export async function enqueueJob(queue: string, payload: Record<string, unknown>): Promise<void> {
  const redis = getRedis();
  await redis.lpush(queue, JSON.stringify(payload));
}
