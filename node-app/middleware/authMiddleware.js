// middleware/authMiddleware.js

const User = require('../models/User');
const jwt = require('jsonwebtoken')
const verifyToken = async (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const token = req.headers.authorization.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ error: 'Token non fourni' });
  }
   
  
    try {
        const {_id} = await jwt.verify(token,process.env.SECRET)
      const user = await User.findOne({ _id }).select('_id'); 
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      req.user = user;
      next();
    } catch (error) {
      console.error('Erreur de vérification du token :', error);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expiré' });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Token invalide' });
      }
      res.status(500).json({ error: 'Erreur lors de la vérification du token' });
    }
  };
  

module.exports = verifyToken;
