const request = require('supertest');
const express = require('express');
const notificationRoutes = require('../routes/notificationsRoutes');
const Notification = require('../models/Notification');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
jest.mock('jsonwebtoken');
jest.mock('../models/Notification');
jest.mock('../models/User');

const verifyToken = require('../middleware/authMiddleware');

const app = express();
app.use(express.json());
app.use('/notifications', notificationRoutes);

beforeAll(() => {
  User.findOne = jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue({ _id: 'userId' })
  });
});

describe('Notification Routes', () => {
  let token;

  beforeAll(() => {
    token = jwt.sign({ _id: 'userId' }, 'secret', { expiresIn: '3d' });
    jwt.verify = jest.fn().mockReturnValue({ _id: 'userId' });
  });

  describe('GET /notifications', () => {
  

    it('should return 500 if there is an error', async () => {
      Notification.countDocuments.mockRejectedValue(new Error('Erreur lors de la récupération des notifications'));
      Notification.find.mockRejectedValue(new Error('Erreur lors de la récupération des notifications'));

      const response = await request(app)
        .get('/notifications')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.statusCode).toBe(500);
      expect(response.body.message).toBe('Erreur lors de la récupération des notifications.');
    });
  });

  describe('PUT /notifications/:notificationId/markAsRead', () => {
    it('should mark a notification as read', async () => {
      Notification.findByIdAndUpdate.mockResolvedValue({ vuByUser: true });

      const response = await request(app)
        .put('/notifications/dummyNotificationId/markAsRead/')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Notification marquée comme lue avec succès.');
    });

    it('should return 500 if there is an error', async () => {
      Notification.findByIdAndUpdate.mockRejectedValue(new Error('Erreur lors de la mise à jour du statut de la notification'));

      const response = await request(app)
        .put('/notifications/dummyNotificationId/markAsRead/')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.statusCode).toBe(500);
      expect(response.body.message).toBe('Erreur lors de la mise à jour du statut de la notification.');
    });
  });

  describe('PUT /notifications/markAllAsRead', () => {


    it('should return 200 if all notifications are already read', async () => {
      Notification.find.mockResolvedValue([{ _id: '1', vu: true }, { _id: '2', vu: true }]);

      const response = await request(app)
        .put('/notifications/markAllAsRead')
        .set('Authorization', `Bearer ${token}`)
        .send({ notificationIds: ['1', '2'] });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Toutes les notifications sont déjà marquées comme lues');
    });

    it('should return 400 if no notification ids are provided', async () => {
      const response = await request(app)
        .put('/notifications/markAllAsRead')
        .set('Authorization', `Bearer ${token}`)
        .send({ notificationIds: [] });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('Aucune notification à mettre à jour');
    });

  
  });
});
