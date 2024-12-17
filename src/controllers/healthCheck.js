const express = require('express');
const connectMongoDB = require('./config/mongodb');
const { redisClient } = require('./config/redis');

const app = express();


app.get('/health', async (req, res) => {
    try {
      // Check MongoDB connection
      await mongoose.connection.db.admin().ping();
      
      // Check Redis connection
      await redisClient.ping();
  
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message
      });
    }
  });