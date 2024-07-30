const request = require('supertest');
const express = require('express');
const router = require('../routes/userRoutes'); 
const app = express();
const jwt = require('jsonwebtoken');

app.use(express.json());
app.use('/users', router);

describe('Users Routes', () => {
  let token;

  beforeAll(() => {
    token = jwt.sign({ _id: 'mockUserId' }, 'secret', { expiresIn: '3d' });
  });

  const mockInvalidTokenMiddleware = (req, res, next) => {
    req.user = null; 
    next();
  };

  app.use('/users', mockInvalidTokenMiddleware);

  describe('GET /users/block', () => {
    it('should return 401 if no token is provided or token is invalid', async () => {
      const response = await request(app).get('/users/block');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /users/unblock/:userId', () => {
    it('should return 401 if no token is provided or token is invalid', async () => {
      const response = await request(app).put('/users/unblock/userId');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /users/User', () => {
    it('should return 401 if no token is provided or token is invalid', async () => {
      const response = await request(app).get('/users/User');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /users/UserProfile/:username', () => {
    it('should return 401 if no token is provided or token is invalid', async () => {
      const response = await request(app).get('/users/UserProfile/username');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /users/:username', () => {
    it('should return 401 if no token is provided or token is invalid', async () => {
      const response = await request(app).get('/users/username');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /users/blockuser', () => {
    it('should return 401 if no token is provided or token is invalid', async () => {
      const response = await request(app).get('/users/blockuser');

      expect(response.status).toBe(401);
    });
  });
});
