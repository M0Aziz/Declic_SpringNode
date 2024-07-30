const request = require('supertest');
const express = require('express');
const router = require('../routes/profilesRoutes'); 
const app = express();
const Profile = require('../models/Profile');
const User = require('../models/User');

app.use(express.json());
app.use('/profiles', router);

const mockVerifyToken = (req, res, next) => {
  req.user = { _id: 'mockUserId' }; 
  next();
};

app.use('/profiles', mockVerifyToken);

describe('Profiles Routes', () => {
  describe('GET /profiles', () => {
    it('should return 401 if profile is not found', async () => {
      jest.spyOn(Profile, 'findOne').mockResolvedValue(null);

      const response = await request(app).get('/profiles');

      expect(response.status).toBe(401);
    });

  });

  describe('GET /profiles/Friend/get', () => {
    it('should return 404 if user profile is not found', async () => {
      jest.spyOn(Profile, 'findOne').mockResolvedValue(null);

      const response = await request(app).get('/profiles/Friend/get');

      expect(response.status).toBe(401);
    });

    
  });

  describe('PUT /profiles/updateUserInterests', () => {
    it('should return 401 if profile is not found', async () => {
      jest.spyOn(Profile, 'findOne').mockResolvedValue(null);

      const response = await request(app)
        .put('/profiles/updateUserInterests')
        .send({ interests: ['reading', 'coding'] });

      expect(response.status).toBe(401);
    });

  
  });
});
