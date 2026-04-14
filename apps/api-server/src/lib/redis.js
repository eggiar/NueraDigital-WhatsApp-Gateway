const Redis = require('ioredis');

// Using the REDIS_URL from env, usually redis://localhost:6379 or redis://redis:6379 in Docker
const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
  console.error('Redis connection error:', err);
});

connection.on('connect', () => {
  console.log('Connected to Redis successfully');
});

module.exports = { connection };
