const { register, login } = require('../controllers/authControllers');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../models/User');

describe('Authentication Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create mock request and response objects
    mockReq = {
      body: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      // Mock bcrypt hash
      bcrypt.hash.mockResolvedValue('hashedPassword');

      // Mock User save method
      const mockSave = jest.fn().mockResolvedValue({
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword'
      });
      User.mockImplementation(() => ({
        save: mockSave
      }));

      await register(mockReq, mockRes);

      // Assertions
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User registered',
          user: expect.objectContaining({
            username: 'testuser',
            email: 'test@example.com'
          })
        })
      );
    });

    it('should handle registration error', async () => {
      // Mock bcrypt hash
      bcrypt.hash.mockResolvedValue('hashedPassword');

      // Mock User save method to throw an error
      User.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error('Registration failed'))
      }));

      await register(mockReq, mockRes);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Registration failed'
      });
    });
  });

  describe('login', () => {
    it('should successfully login a user', async () => {
      // Mock user found in database
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        comparePassword: jest.fn().mockResolvedValue(true)
      };
      User.findOne.mockResolvedValue(mockUser);

      // Mock JWT sign
      jwt.sign.mockReturnValue('mockToken');

      await login(mockReq, mockRes);

      // Assertions
      expect(User.findOne).toHaveBeenCalledWith({ username: 'testuser' });
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: mockUser._id }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Login successful',
        token: 'mockToken'
      });
    });

    it('should return 404 if user is not found', async () => {
      // Mock user not found in database
      User.findOne.mockResolvedValue(null);

      await login(mockReq, mockRes);

      // Assertions
      expect(User.findOne).toHaveBeenCalledWith({ username: 'testuser' });
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User not found'
      });
    });

    it('should return 401 if password is invalid', async () => {
      // Mock user found but with invalid password
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        comparePassword: jest.fn().mockResolvedValue(false)
      };
      User.findOne.mockResolvedValue(mockUser);

      await login(mockReq, mockRes);

      // Assertions
      expect(User.findOne).toHaveBeenCalledWith({ username: 'testuser' });
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid credentials'
      });
    });

    it('should handle login error', async () => {
      // Mock database error
      User.findOne.mockRejectedValue(new Error('Database error'));

      await login(mockReq, mockRes);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Database error'
      });
    });
  });
});