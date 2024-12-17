const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const FileModel = require('../models/file'); // We'll create this model
const fileQueue = require('../config/redis');

// Helper function to ensure directory existence
const ensureDirectoryExistence = (filePath) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
};

// Create a new file
exports.createFile = async (req, res) => {
  try {
    const { filename, content } = req.body;
    const filePath = path.join(__dirname, '../uploads', filename);

    ensureDirectoryExistence(filePath);

    // Write file to filesystem
    await fs.promises.writeFile(filePath, content);

    // Create file record in MongoDB
    const fileRecord = new FileModel({
      filename: filename,
      path: filePath,
      content: content,
      user: req.user._id, // Assuming authentication middleware adds user
      createdAt: new Date(),
      size: Buffer.byteLength(content)
    });

    await fileRecord.save();

    res.status(201).json({ 
      message: 'File created successfully', 
      file: fileRecord 
    });
  } catch (err) {
    console.error('Error creating file:', err);
    res.status(500).json({ message: 'Server error while creating file' });
  }
};

// Read a file
exports.readFile = async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Find file in MongoDB
    const fileRecord = await FileModel.findOne({ 
      filename: filename, 
      user: req.user._id 
    });

    if (!fileRecord) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Read file content from filesystem
    const content = await fs.promises.readFile(fileRecord.path, 'utf8');

    res.json({
      filename: fileRecord.filename,
      content: content,
      metadata: fileRecord
    });
  } catch (err) {
    console.error('Error reading file:', err);
    res.status(500).json({ message: 'Server error while reading file' });
  }
};

// Update a file
exports.updateFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const { newFilename, content } = req.body;

    // Find existing file
    const existingFile = await FileModel.findOne({ 
      filename: filename, 
      user: req.user._id 
    });

    if (!existingFile) {
      return res.status(404).json({ message: 'File not found' });
    }

    const oldPath = existingFile.path;
    const newPath = path.join(path.dirname(oldPath), newFilename);

    // Rename file in filesystem
    await fs.promises.rename(oldPath, newPath);

    // Update file record in MongoDB
    existingFile.filename = newFilename;
    existingFile.path = newPath;
    
    if (content) {
      // Write new content if provided
      await fs.promises.writeFile(newPath, content);
      existingFile.content = content;
      existingFile.size = Buffer.byteLength(content);
    }

    existingFile.updatedAt = new Date();
    await existingFile.save();

    res.json({ 
      message: 'File updated successfully', 
      file: existingFile 
    });
  } catch (err) {
    console.error('Error updating file:', err);
    res.status(500).json({ message: 'Server error while updating file' });
  }
};

// Delete a file
exports.deleteFile = async (req, res) => {
  try {
    const { filename } = req.params;

    // Find file in MongoDB
    const fileRecord = await FileModel.findOne({ 
      filename: filename, 
      user: req.user._id 
    });

    if (!fileRecord) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Remove file from filesystem
    await fs.promises.unlink(fileRecord.path);

    // Remove file record from MongoDB
    await FileModel.deleteOne({ _id: fileRecord._id });

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Error deleting file:', err);
    res.status(500).json({ message: 'Server error while deleting file' });
  }
};

// Upload file 
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { originalname, filename, size, mimetype, path: filePath } = req.file;

    // Create file record in MongoDB
    const fileRecord = new FileModel({
      filename: originalname,
      systemFilename: filename,
      path: filePath,
      size: size,
      mimetype: mimetype,
      user: req.user._id,
      status: 'uploaded',
      uploadedAt: new Date()
    });

    await fileRecord.save();

    // Add to processing queue
    await fileQueue.add({ 
      fileId: fileRecord._id, 
      filename: originalname 
    });

    res.status(201).json({ 
      message: 'File uploaded and queued for processing', 
      file: fileRecord 
    });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ message: 'Server error during file upload' });
  }
};

// Fetch file list for authenticated user
exports.getUploadedFiles = async (req, res) => {
  try {
    // Fetch all file records for the current user
    const files = await FileModel.find({ 
      user: req.user._id 
    }).select('filename size mimetype uploadedAt status');

    res.json(files);
  } catch (err) {
    console.error('Error fetching file list:', err);
    res.status(500).json({ message: 'Server error while fetching file list' });
  }
};