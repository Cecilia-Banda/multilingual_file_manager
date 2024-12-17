const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { redisPubClient } = require('../config/redis');
const File = require('../models/file');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    
    // Create upload directory if it doesn't exist
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  }
});

const uploadFile = async (file) => {
  try {
    // Save file metadata to MongoDB
    const fileRecord = new File({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      status: 'pending'
    });

    await fileRecord.save();

    // Publish file upload event to Redis
    await redisPubClient.publish('file-upload', JSON.stringify({
      fileId: fileRecord._id,
      filename: file.filename
    }));

    return fileRecord;
  } catch (error) {
    console.error('Upload service error:', error);
    throw error;
  }
};

module.exports = {
  upload,
  uploadFile
};