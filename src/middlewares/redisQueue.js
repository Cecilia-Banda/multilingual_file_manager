const { redisSubClient, redisPubClient } = require('../config/redis');
const File = require('../models/file');

class QueueService {
  constructor() {
    this.setupSubscriptions();
  }

  setupSubscriptions() {
    // Subscribe to file upload channel
    redisSubClient.subscribe('file-upload');

    // Handle incoming messages
    redisSubClient.on('message', async (channel, message) => {
      if (channel === 'file-upload') {
        await this.processFileUpload(JSON.parse(message));
      }
    });
  }

  async processFileUpload(fileData) {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      await File.findByIdAndUpdate(fileData.fileId, { 
        status: 'completed' 
      });

      // Publish processing completion
      await redisPubClient.publish('file-process', JSON.stringify({
        fileId: fileData.fileId,
        status: 'completed'
      }));

    } catch (error) {
      console.error('File processing error:', error);
      

      await File.findByIdAndUpdate(fileData.fileId, { 
        status: 'failed' 
      });
    }
  }
}

module.exports = new QueueService();