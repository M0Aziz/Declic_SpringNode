const mongoose = require('mongoose');

const connectDB = async () => {
 
  try {
   /* await mongoose.connect('mongodb://localhost:27017/declic', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });*/

   await mongoose.connect('mongodb://atlas-sql-662a6549e6044373f2acb35d-sbven.a.query.mongodb.net/declic?ssl=true&authSource=admin')
    console.log('Connexion à MongoDB réussie');
  } catch (error) {
    console.error('Erreur lors de la connexion à MongoDB:', error.message);
    process.exit(1); // Quitte l'application avec un code d'erreur
  }
};

module.exports = connectDB;
