const Redis = require('ioredis');

const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
});
client.on('error', (err) => console.error('[redis]', err.message));

module.exports = client;
