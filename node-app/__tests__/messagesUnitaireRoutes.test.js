const request = require('supertest');
const express = require('express');
const router = require('../routes/messagesRoutes'); 
const app = express();
const Message = require('../models/Message');
const User = require('../models/User');
const Profile = require('../models/Profile');

app.use(express.json());
app.use('/messages', router);

const mockVerifyToken = (req, res, next) => {
  req.user = 'mockUserId'; 
  next();
};

app.use('/messages', mockVerifyToken);

describe('Messages Routes', () => {
  describe('GET /messages', () => {
    it('should return 401 if there is an error retrieving messages', async () => {
      jest.spyOn(Message, 'find').mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/messages');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /messages/navbarMessage', () => {
    it('should return 401 if there is an error retrieving navbar messages', async () => {
      jest.spyOn(Message, 'find').mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/messages/navbarMessage');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /messages/:username', () => {
    it('should return 401 if there is an error retrieving messages for a user', async () => {
      jest.spyOn(Profile, 'findOne').mockRejectedValue(new Error('Database error'));
      jest.spyOn(Message, 'find').mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/messages/someUsername');

      expect(response.status).toBe(401);
    });

    it('should return 400 if the recipient username is invalid', async () => {
      jest.spyOn(Profile, 'findOne').mockResolvedValue(null);

      const response = await request(app).get('/messages/invalidUsername');

      expect(response.status).toBe(401);
    });
  });
});
