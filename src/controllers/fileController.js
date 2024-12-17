const express = require('express');
const { upload, uploadFile } = require('../services/uploadServices');

const router = express.Router();

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileRecord = await uploadFile(req.file);

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: fileRecord._id,
        originalname: fileRecord.originalname,
        status: fileRecord.status
      }
    });
  } catch (error) {
    console.error('Upload route error:', error);
    res.status(500).json({ 
      error: 'File upload failed', 
      details: error.message 
    });
  }
});

module.exports = router;