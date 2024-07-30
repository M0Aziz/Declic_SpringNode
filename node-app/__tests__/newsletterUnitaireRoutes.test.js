const request = require('supertest');
const express = require('express');
const router = require('../routes/newsletterRoutes'); 
const app = express();
const Newsletter = require('../models/Newsletter');

app.use(express.json());
app.use('/', router);

describe('Newsletter Routes', () => {
  describe('POST /newsletter', () => {
    it('should return 400 if the email is already subscribed', async () => {
      jest.spyOn(Newsletter, 'findOne').mockResolvedValueOnce({ email: 'test@example.com' });

      const response = await request(app)
        .post('/newsletter')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Cet e-mail est déjà inscrit à la newsletter.');
    });
  });
});
