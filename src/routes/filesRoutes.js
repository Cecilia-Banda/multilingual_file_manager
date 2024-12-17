const express = require('express');
const { 
  createFile, 
  readFile, 
  updateFile, 
  deleteFile, 
  uploadFile, 
  getUploadedFiles
} = require('../controllers/fileController');
const router = express.Router();

router.post('/create', createFile);

router.get('/read/:filename', readFile);
router.put('/update/:filename', updateFile);

router.delete('/delete/:filename', deleteFile);

router.post('/upload', uploadFile);

router.get('/files', getUploadedFiles);

module.exports = router;