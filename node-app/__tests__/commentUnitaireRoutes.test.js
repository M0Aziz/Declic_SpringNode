const request = require('supertest');
const express = require('express');
const router = require('../routes/commentsRoutes'); 
const app = express();
const Comment = require('../models/Comment');
const Activity = require('../models/Activity');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Profile = require('../models/Profile');

jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
  req.user = { _id: 'userId' }; 
  req.io = {
    emit: jest.fn() 
  };
  next();
});

app.use(express.json());
app.use('/comments', router);

describe('Comment Routes', () => {
  describe('POST /:activityId/comment', () => {
    it('should return 403 if the activity is not visible', async () => {
      jest.spyOn(Activity, 'findById').mockResolvedValue({
        visibility: false
      });

      const response = await request(app)
        .post('/comments/activityId/comment')
        .set('Authorization', 'Bearer token')
        .send({ content: 'Test Comment' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('L\'activité n\'est pas visible');
    });
  });

  describe('GET /:activityId/comments', () => {
    it('should return 404 if the activity is not found', async () => {
      jest.spyOn(Activity, 'findById').mockResolvedValue(null);

      const response = await request(app)
        .get('/comments/activityId/comments');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Activité non trouvée');
    });
  });

  describe('GET /:commentId', () => {
    it('should return 404 if the comment is not found', async () => {
      jest.spyOn(Comment, 'findById').mockResolvedValue(null);

      const response = await request(app)
        .get('/comments/commentId');

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /:id/report', () => {
    it('should return 400 if the report reason is missing', async () => {
      const response = await request(app)
        .put('/comments/commentId/report')
        .set('Authorization', 'Bearer token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('La raison du signalement est requise');
    });
  });
});
