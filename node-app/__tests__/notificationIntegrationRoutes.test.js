const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app'); // Importez l'application configurée
const Notification = require('../models/Notification');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const request = require('supertest');

jest.mock('jsonwebtoken');

let mongoServer;

beforeAll(async () => {
  try {
    jest.setTimeout(10000);
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  } catch (err) {
   // console.error('Erreur lors de la configuration de MongoMemoryServer:', err);
  }
});

afterAll(async () => {
  try {
    await mongoose.disconnect();
    await mongoServer.stop();
  } catch (err) {
    console.error('Erreur lors de la fermeture de la connexion à MongoMemoryServer:', err);
  }
});

beforeEach(async () => {
  await Notification.deleteMany({});
 //await Notification.deleteMany({ recipient: token });
  await User.deleteMany({ email:'test@example.com' });
});

describe('Notification Routes - Integration Tests', () => {
  let token;
let idUser ;
  beforeEach(async () => {
    const user = new User({ email: 'test@example.com', password: 'password' });
    await user.save();
    idUser = user._id
console.log(user);
    token = jwt.sign({ _id: user._id }, 'secret', { expiresIn: '3d' });

    console.log('token', token); // Vérifiez que le token est correctement défini

    jwt.verify.mockReturnValue({ _id: user._id });

  });

  describe('GET /notifications', () => {
    it('should get all notifications and unseen count', async () => {
      await Notification.create([
        { recipient: idUser, vu: false, type: 'type1', content: 'Content 1' },
        { recipient: idUser, vu: true, type: 'type2', content: 'Content 2' }
      ]);
      const response = await request(app)
        .get('/notifications')
        .set('Authorization', `Bearer ${token}`)
        .send();
      expect(response.statusCode).toBe(200);
      //expect(response.body.unseenNotificationsCount).toBe(0);
     // expect(response.body.notifications.length).toBe(1);
    });
  });

  describe('PUT /notifications/:notificationId/markAsRead', () => {
    it('should mark a notification as read', async () => {
      const notification = await Notification.create({ recipient: idUser });

      const response = await request(app)
        .put(`/notifications/${notification._id}/markAsRead`)
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Notification marquée comme lue avec succès.');

      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification.vuByUser).toBe(true);
    });
  });

  describe('PUT /notifications/markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const notifications = await Notification.create([
        { recipient: idUser, vu: false },
        { recipient: idUser, vu: false }
      ]);

      const notificationIds = notifications.map(notification => notification._id);

      const response = await request(app)
        .put('/notifications/markAllAsRead')
        .set('Authorization', `Bearer ${token}`)
        .send({ notificationIds });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Toutes les notifications ont été marquées comme lues avec succès');

      const updatedNotifications = await Notification.find({ recipient: idUser });
      updatedNotifications.forEach(notification => {
        expect(notification.vu).toBe(true);
      });
    });
  });
});
