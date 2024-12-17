const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalname: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  }
});


// Add a method to get a safe version of the file for responses
fileSchema.methods.toSafeObject = function() {
    return {
      id: this._id,
      filename: this.filename,
      size: this.size,
      mimetype: this.mimetype,
      status: this.status,
      uploadedAt: this.uploadedAt
    };
  };

module.exports = mongoose.model('File', fileSchema);