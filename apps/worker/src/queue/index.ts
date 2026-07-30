import Redis from 'ioredis';

let client: Redis;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    client.on('error', (err) => log('redis_error', { error: err.message }));
  }
  return client;
}

export function log(type: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ type, ...data, ts: new Date().toISOString() }));
}
