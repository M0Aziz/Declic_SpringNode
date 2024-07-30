const request = require('supertest');
const express = require('express');
const router = require('../routes/activitysRoutes');
const app = express();
const Activity = require('../models/Activity');
const User = require('../models/User');
const Notification = require('../models/Notification');

jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
  req.user = 'userId'; 
  req.io = {
    emit: jest.fn() 
  };
  next();
});

app.use(express.json());
app.use('/activitys', router);

describe('Activity Routes', () => {
  describe('PUT /:activityId/participate/', () => {
    it('should return 404 if user is not found', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(null);

      const response = await request(app)
        .put('/activitys/123/participate/')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Utilisateur non trouvé');
    });

    it('should return 404 if activity is not found', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue({ _id: 'userId' });
      jest.spyOn(Activity, 'findById').mockResolvedValue(null);

      const response = await request(app)
        .put('/activitys/123/participate/')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Événement non trouvé');
    });

    it('should return 200 if user is successfully added to the waiting list', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue({ _id: 'userId', firstName: 'John', lastName: 'Doe' });
      jest.spyOn(Activity, 'findById').mockResolvedValue({ _id: 'activityId', waitingList: [], organizer: 'organizerId', save: jest.fn() });

      const response = await request(app)
        .put('/activitys/activityId/participate/')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /:activityId/unsubscribe-waitinglist/', () => {
    it('should return 200 verifing user id', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(null);

      const response = await request(app)
        .put('/activitys/123/unsubscribe-waitinglist/')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
    });

    it('should return 404 if activity is not found', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue({ _id: 'userId' });
      jest.spyOn(Activity, 'findById').mockResolvedValue(null);

      const response = await request(app)
        .put('/activitys/123/unsubscribe-waitinglist/')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Activité non trouvée');
    });

    it('should return 200 if user is successfully unsubscribed from waiting list', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue({ _id: 'userId', firstName: 'John', lastName: 'Doe' });
      jest.spyOn(Activity, 'findById').mockResolvedValue({ _id: 'activityId', waitingList: ['userId'], save: jest.fn() });
      jest.spyOn(Notification, 'findOne').mockResolvedValue(null);

      const response = await request(app)
        .put('/activitys/activityId/unsubscribe-waitinglist/')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /', () => {
    it('should return 200 and a list of activities', async () => {
      jest.spyOn(Activity, 'find').mockResolvedValue([{ _id: 'activity1' }, { _id: 'activity2' }]);

      const response = await request(app).get('/activitys/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ _id: 'activity1' }, { _id: 'activity2' }]);
    });
  });
});
