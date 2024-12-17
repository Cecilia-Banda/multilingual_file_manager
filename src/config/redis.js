const Redis = require('ioredis');
require('dotenv').config();

const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

const redisPubClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

const redisSubClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

// Error handling
redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisPubClient.on('error', (err) => console.error('Redis Pub Client Error', err));
redisSubClient.on('error', (err) => console.error('Redis Sub Client Error', err));

module.exports = {
  redisClient,
  redisPubClient,
  redisSubClient
};