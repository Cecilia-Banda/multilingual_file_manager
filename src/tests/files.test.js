const fs = require('fs').promises;
const path = require('path');
const FileModel = require('../models/file');
const fileQueue = require('../config/redis');
const { 
  createFile, 
  readFile, 
  updateFile, 
  deleteFile, 
  uploadFile, 
  getUploadedFiles 
} = require('./fileController');

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn(),
    mkdirSync: jest.fn()
  },
  existsSync: jest.fn()
}));
jest.mock('../models/file');
jest.mock('../config/redis');
jest.mock('path');

describe('File Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock request and response objects
    mockReq = {
      body: {},
      params: {},
      user: { _id: 'user123' },
      file: null
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('createFile', () => {
    it('should successfully create a file', async () => {
      // Setup mock request
      mockReq.body = {
        filename: 'test.txt',
        content: 'Hello, World!'
      };

      // Mock path handling
      path.join.mockReturnValue('/path/to/uploads/test.txt');
      path.dirname.mockReturnValue('/path/to/uploads');
      
      // Mock filesystem checks
      fs.existsSync.mockReturnValue(true);

      // Mock FileModel
      const mockSave = jest.fn().mockResolvedValue({
        _id: 'file123',
        filename: 'test.txt',
        path: '/path/to/uploads/test.txt'
      });
      FileModel.mockImplementation(() => ({
        save: mockSave
      }));

      await createFile(mockReq, mockRes);

      // Assertions
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/path/to/uploads/test.txt', 
        'Hello, World!'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'File created successfully',
          file: expect.objectContaining({
            filename: 'test.txt'
          })
        })
      );
    });

    it('should handle file creation error', async () => {
      // Setup mock request
      mockReq.body = {
        filename: 'test.txt',
        content: 'Hello, World!'
      };

      // Mock filesystem to throw an error
      fs.writeFile.mockRejectedValue(new Error('Write error'));

      await createFile(mockReq, mockRes);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Server error while creating file'
      });
    });
  });

  describe('readFile', () => {
    it('should successfully read a file', async () => {
      // Setup mock request
      mockReq.params = { filename: 'test.txt' };

      // Mock FileModel findOne
      const mockFileRecord = {
        _id: 'file123',
        filename: 'test.txt',
        path: '/path/to/uploads/test.txt'
      };
      FileModel.findOne.mockResolvedValue(mockFileRecord);

      // Mock file reading
      fs.readFile.mockResolvedValue('File content');

      await readFile(mockReq, mockRes);

      // Assertions
      expect(FileModel.findOne).toHaveBeenCalledWith({
        filename: 'test.txt',
        user: 'user123'
      });
      expect(fs.readFile).toHaveBeenCalledWith('/path/to/uploads/test.txt', 'utf8');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'test.txt',
          content: 'File content'
        })
      );
    });

    it('should return 404 if file is not found', async () => {
      // Setup mock request
      mockReq.params = { filename: 'test.txt' };

      // Mock FileModel findOne to return null
      FileModel.findOne.mockResolvedValue(null);

      await readFile(mockReq, mockRes);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'File not found'
      });
    });
  });

  describe('updateFile', () => {
    it('should successfully update file', async () => {
      // Setup mock request
      mockReq.params = { filename: 'old.txt' };
      mockReq.body = {
        newFilename: 'new.txt',
        content: 'Updated content'
      };

      // Mock existing file
      const mockExistingFile = {
        _id: 'file123',
        filename: 'old.txt',
        path: '/path/to/uploads/old.txt',
        save: jest.fn().mockResolvedValue({})
      };
      FileModel.findOne.mockResolvedValue(mockExistingFile);

      // Mock path operations
      path.dirname.mockReturnValue('/path/to/uploads');
      path.join.mockReturnValue('/path/to/uploads/new.txt');

      await updateFile(mockReq, mockRes);

      // Assertions
      expect(fs.rename).toHaveBeenCalledWith(
        '/path/to/uploads/old.txt', 
        '/path/to/uploads/new.txt'
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/path/to/uploads/new.txt', 
        'Updated content'
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'File updated successfully'
        })
      );
    });

    it('should return 404 if file to update is not found', async () => {
      // Setup mock request
      mockReq.params = { filename: 'old.txt' };
      mockReq.body = { newFilename: 'new.txt' };

      // Mock no existing file
      FileModel.findOne.mockResolvedValue(null);

      await updateFile(mockReq, mockRes);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'File not found'
      });
    });
  });

  describe('deleteFile', () => {
    it('should successfully delete a file', async () => {
      // Setup mock request
      mockReq.params = { filename: 'test.txt' };

      // Mock file record
      const mockFileRecord = {
        _id: 'file123',
        filename: 'test.txt',
        path: '/path/to/uploads/test.txt'
      };
      FileModel.findOne.mockResolvedValue(mockFileRecord);

      // Mock delete operations
      FileModel.deleteOne.mockResolvedValue({});

      await deleteFile(mockReq, mockRes);

      // Assertions
      expect(fs.unlink).toHaveBeenCalledWith('/path/to/uploads/test.txt');
      expect(FileModel.deleteOne).toHaveBeenCalledWith({ _id: 'file123' });
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'File deleted successfully'
      });
    });

    it('should return 404 if file to delete is not found', async () => {
      // Setup mock request
      mockReq.params = { filename: 'test.txt' };

      // Mock no existing file
      FileModel.findOne.mockResolvedValue(null);

      await deleteFile(mockReq, mockRes);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'File not found'
      });
    });
  });

  describe('uploadFile', () => {
    it('should successfully upload a file', async () => {
      // Setup mock request with file
      mockReq.file = {
        originalname: 'test.pdf',
        filename: 'uniquefilename.pdf',
        size: 1024,
        mimetype: 'application/pdf',
        path: '/path/to/uploads/uniquefilename.pdf'
      };

      // Mock FileModel
      const mockSave = jest.fn().mockResolvedValue({
        _id: 'file123',
        filename: 'test.pdf'
      });
      FileModel.mockImplementation(() => ({
        save: mockSave
      }));

      // Mock queue add
      fileQueue.add.mockResolvedValue({});

      await uploadFile(mockReq, mockRes);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'File uploaded and queued for processing'
        })
      );
      expect(fileQueue.add).toHaveBeenCalledWith({
        fileId: 'file123',
        filename: 'test.pdf'
      });
    });

    it('should return 400 if no file is uploaded', async () => {
      // No file in request
      mockReq.file = null;

      await uploadFile(mockReq, mockRes);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'No file uploaded'
      });
    });
  });

  describe('getUploadedFiles', () => {
    it('should fetch user\'s uploaded files', async () => {
      // Mock files
      const mockFiles = [
        { 
          filename: 'test1.txt', 
          size: 1024, 
          mimetype: 'text/plain',
          uploadedAt: new Date(),
          status: 'uploaded'
        },
        { 
          filename: 'test2.pdf', 
          size: 2048, 
          mimetype: 'application/pdf',
          uploadedAt: new Date(),
          status: 'processed'
        }
      ];

      // Mock FileModel find
      FileModel.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockFiles)
      });

      await getUploadedFiles(mockReq, mockRes);

      // Assertions
      expect(FileModel.find).toHaveBeenCalledWith({ user: 'user123' });
      expect(mockRes.json).toHaveBeenCalledWith(mockFiles);
    });
  });
});