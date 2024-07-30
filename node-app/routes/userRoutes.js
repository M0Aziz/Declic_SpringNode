const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const multer = require('multer');
const User = require('../models/User');
const verifyToken = require('../middleware/authMiddleware');
const crypto = require('crypto');
const path = require('path');
const multiparty = require('multiparty');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const Profile = require('../models/Profile');
const Activity = require('../models/Activity');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');

const createToken = (_id) =>{

return jwt.sign({_id},process.env.SECRET,{expiresIn:'3d'})

}
/*const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    console.log('Destination du fichier :', path.resolve(__dirname, 'public/images'));
    cb(null, path.resolve(__dirname, 'public/images'));
  },
  filename: function(req, file, cb) {
    console.log('Nom du fichier :', new Date().toISOString() + file.originalname);
    cb(null, new Date().toISOString() + file.originalname);
  }
});



const upload = multer({ storage: storage });


router.post('/add-user', upload.single('profilePicture'),
  [
    body('firstName').trim().isLength({ min: 3 }).withMessage('Le prénom doit contenir au moins 3 caractères'),
    body('lastName').trim().isLength({ min: 3 }).withMessage('Le nom doit contenir au moins 3 caractères'),
    body('email').isEmail().withMessage('Adresse email non valide'),
    body('password').isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
  ],
  async (req, res) => {
    console.log('Requête reçue pour ajout d\'utilisateur');

    const { firstName, lastName, email, password } = req.body;
   if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier n\'a été téléchargé' });
    }
    console.log('Données reçues :', req.body);

    const profilePicture = req.file.path;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'L\'utilisateur existe déjà' });
      }

      const jwtSecret = crypto.randomBytes(32).toString('hex');

      const hashedPassword = await bcrypt.hash(password, 10);
      const token = jwt.sign({ email }, jwtSecret, { expiresIn: '3h' });
      const decodedToken = jwt.decode(token);

      console.log(token);
      console.log(decodedToken);


      user = new User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        profilePicture,
        token // Mot de passe hashé
      });

      await user.save();

      res.status(201).json(user);
      console.log('Utilisateur créé avec succès :', user);

    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur :', error);
      res.status(500).json({ message: 'Erreur lors de la création de l\'utilisateur' });
    }
  }
);
*/


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images'); // Définissez le répertoire de destination des fichiers téléchargés
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Définissez le nom de fichier pour le fichier téléchargé
  },
});

const upload = multer({ storage: storage });

router.post('/add-user', upload.single('profilePicture'), async (req, res) => {
  const { firstName, lastName, email, password  } = req.body;

  const profilePicture = req.file.filename;

  console.log('body',req.body);
  try {
   

    //console.log('file',req.file.path);
    //const profilePicturePath = req.file.path;

    // Vérifiez si l'utilisateur existe déjà

    /*const base64Data = profilePicture.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    const dataBuffer = Buffer.from(base64Data, 'base64');

    const fileName = Date.now() + '.png';
    const filePath = path.join('public/images', fileName);

    // Écrire le tampon dans un fichier
    fs.writeFileSync(filePath, dataBuffer);*/
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'L\'utilisateur existe déjà' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

   // const jwtSecret = crypto.randomBytes(32).toString('hex');
    //const token = jwt.sign({ email }, jwtSecret, { expiresIn: '3h' });

    user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      profilePicture: profilePicture,
    });

    await user.save();

    res.status(201).json(user);
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur :', error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'utilisateur' });
  }
});

router.post('/google-login', async (req, res) => {

  try {
 
    const { email, given_name, family_name, picture } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        firstName: given_name,
        lastName: family_name,
        email,
        profilePicture: picture, // Enregistrer l'URL de la photo de profil
        firstTime: true, // Premier login avec Google, définir firstTime sur true
      });

      await user.save();
    }


    user.isLoggedIn = true;
    user.lastLogin = new Date();
    await user.save();
    const token = createToken(user._id);
    const profile = await Profile.findOne({ user: user._id }).select('username');

    if (profile){
console.log(profile);
      res.status(200).json({ token, firstTime: user.firstTime, username: profile.username });

    }else {
    res.status(200).json({ token, firstTime: user.firstTime });
    }
  } catch (error) {
    console.error('Erreur lors de la connexion avec Google :', error);
    res.status(500).json({ error: 'Erreur lors de la connexion avec Google' });
  }
});


router.get('/first-time', verifyToken , async (req, res) => {

  try {
    const userId = req.user;
console.log('User', userId);
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const profile = await Profile.findOne({ user: userId });

if (!profile) {
  return res.json({ firstTime: user.firstTime });
}

if (profile.username != null) {
  return res.json({ firstTime: user.firstTime, username: profile.username });
} else {
  return res.json({ firstTime: user.firstTime });
}

  } catch (error) {
    console.error("Erreur lors de la récupération de firstTime :", error);
    res.status(500).json({ message: "Erreur lors de la récupération de firstTime" });
  }
});



router.get('/auth/check-token', verifyToken , async (req, res) => {
  try {
    const user = await Profile.findOne({ user: req.user }).select('username');
    if (!user) {
      return res.status(404).json({ error: 'Profil non trouvé' });
    }
    const usernameBack = user.username;
    res.json({ usernameBack });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil :', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
});



router.put('/update-password', verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Les nouveaux mots de passe ne correspondent pas." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "L'ancien mot de passe est incorrect." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Mot de passe mis à jour avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur du serveur.", error });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'L\'utilisateur n\'existe pas' });
    }

    if (user.isBanned) {
      return res.status(401).json({ message: 'Votre compte est banni. Veuillez contacter l\'administration.' });
    }

    if (user.isSuspended && user.suspensionEndDate && user.suspensionEndDate > new Date()) {
      return res.status(401).json({ message: 'Votre compte est temporairement suspendu jusqu\'au ' + user.suspensionEndDate + '. Veuillez contacter l\'administration.' });
    }

    if (user.isSuspended && user.suspensionEndDate && user.suspensionEndDate < new Date()) {
      user.isSuspended = false;
      user.reasonForSuspension = ''; 
      user.suspensionEndDate = null;
      await user.save();
    }
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      user.isLoggedIn = true;
      user.lastLogin = new Date();
      await user.save();

      const token = createToken(user._id);
      const profile = await Profile.findOne({ user: user._id }).select('username');
      if (profile) {
        res.status(200).json({ token, firstTime: user.firstTime, username: profile.username, role: user.role });
      } else {
        res.status(200).json({ token, firstTime: user.firstTime, role: user.role });
      }
    } else {
      res.status(401).json({ message: 'Mot de passe incorrect' });
    }

  } catch (error) {
    console.error('Erreur lors de la connexion :', error);
    res.status(500).json({ message: 'Erreur lors de la connexion' });
  }
});


router.post('/logout', verifyToken , async (req, res) => {
  try {
    const userId = req.user; 
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    user.isLoggedIn = false;
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur lors de la déconnexion :', error);
    res.status(500).json({ error: 'Erreur lors de la déconnexion' });
  }
});


router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send('User not found');
    }

    const newPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();



    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'spprtgemi@gmail.com',
        pass: 'nfefgwvycewlayzo'
      }
    });
    
    const logoUrl = 'https://i.postimg.cc/62K82Z6D/Logo.png';
    const facebookIconUrl = 'https://i.postimg.cc/gw8w2spV/facebook-icon.png';
    const tiktokIconUrl = 'https://i.postimg.cc/2bxV45V3/tiktok-icon.png';
    const instagramIconUrl = 'https://i.postimg.cc/gj0FdJKJ/instagram-icon.webp';
    let mailOptions = {
      from: 'spprtgemi@gmail.com',
      to: email,
      subject: 'Réinitialisation de mot de passe',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${logoUrl}" alt="Logo" style="width: 100px; height: auto;" />
          </div>
          <h2 style="text-align: center; color: #4CAF50;">Réinitialisation de mot de passe</h2>
          <p>Bonjour ${user.firstName} ${user.lastName},</p>
          <p>Votre mot de passe a été réinitialisé avec succès. Voici votre nouveau mot de passe :</p>
          <p style="font-size: 20px; font-weight: bold;">${newPassword}</p>
          <p>Nous vous recommandons de changer ce mot de passe dès que vous vous connectez.</p>
          <p>Si vous avez des questions supplémentaires ou des préoccupations, n'hésitez pas à nous contacter à cette adresse email.</p>
          <p>Cordialement,</p>
          <p><strong>Équipe Déclic</strong></p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://facebook.com" style="margin: 0 10px;">
              <img src="${facebookIconUrl}" alt="Facebook" style="width: 30px; height: auto;" />
            </a>
            <a href="https://tiktok.com" style="margin: 0 10px;">
              <img src="${tiktokIconUrl}" alt="TikTok" style="width: 30px; height: auto;" />
            </a>
            <a href="https://instagram.com" style="margin: 0 10px;">
              <img src="${instagramIconUrl}" alt="Instagram" style="width: 30px; height: auto;" />
            </a>
          </div>
          <div style="text-align: center; color: #aaa; margin-top: 20px; font-size: 12px;">
            <p>Vous recevez ce message parce que vous avez demandé une réinitialisation de mot de passe. Si vous pensez que c'est une erreur, veuillez nous en informer immédiatement.</p>
            <p>&copy; ${new Date().getFullYear()} Équipe Déclic. Tous droits réservés.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).send('Un email avec un nouveau mot de passe a été envoyé.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Une erreur s\'est produite lors de la réinitialisation du mot de passe.');
  }
});

router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user; // Récupère l'ID utilisateur du middleware
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


/*router.get('/search/:keyword', async (req, res) => {
  try {
    const keyword = req.params.keyword;
    if (keyword.length < 2) {
      return res.status(400).json({ message: 'Le mot-clé doit comporter au moins deux caractères' });
    }
    // Recherchez les utilisateurs dont le nom ou le prénom contient le mot-clé
    const users = await User.find({
      $or: [
        { firstName: { $regex: keyword, $options: 'i' } }, // i pour une recherche insensible à la casse
        { lastName: { $regex: keyword, $options: 'i' } }
      ]
    });


    const usersWithUsername = await Promise.all(users.map(async user => {
      const profile = await Profile.findOne({ user: user._id });
      if (profile) {
        return {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: profile.username
        };
      } else {
        return {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: null
        };
      }
    }));

    res.json(usersWithUsername);
    //res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Erreur lors de la recherche des utilisateurs' });
  }
});*/






router.get('/search/:keyword',verifyToken, async (req, res) => {
  try {
    const keyword = req.params.keyword;
    if (keyword.length < 2) {
      return res.status(400).json({ message: 'Le mot-clé doit comporter au moins deux caractères' });
    }
    
    const userId = req.user;

    const userProfile = await Profile.findOne({ user: userId }).populate('followers following', 'user');

    const users = await User.find({
      $or: [
        { firstName: { $regex: keyword, $options: 'i' } }, // i pour une recherche insensible à la casse
        { lastName: { $regex: keyword, $options: 'i' } }
      ]
    });

    const usersWithMatchingFriends = await Promise.all(users.map(async user => {
      const profile = await Profile.findOne({ user: user._id });
      if (profile) {
          // Recherche des amis en commun
       /*   const commonFriendsCount = await Profile.countDocuments({
              user: {
                  $in: profile.followers, // Les followers du profil de l'utilisateur recherché
                  $in: userProfile.following, // Les following de l'utilisateur actuellement connecté
                  $nin: [userId], // Exclure l'utilisateur actuellement connecté

                  

                  
              }
          })*/

               // Récupérer les followers de l'utilisateur recherché
        const userFollowers = profile.followers;
console.log('userFollowers',userFollowers);
        // Récupérer les personnes que vous suivez
        const yourFollowing = userProfile.following;
console.log('yourFollowing',yourFollowing);
        // Recherche des amis en commun
        const commonFriendsCount = userFollowers.filter(follower => {
          const followerId = follower.toString(); // Convertir l'ObjectId en chaîne de caractères
          return yourFollowing.some(following => following._id.toString() === followerId);
      }).length;
                return {
              _id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              profilePicture : user.profilePicture,
              username: profile.username,
              commonFriendsCount
          };
      } else {
          return {
              _id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              profilePicture : user.profilePicture,

              username: null,
              commonFriendsCount: 0
          };
      }
  }));
  

    res.json(usersWithMatchingFriends);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Erreur lors de la recherche des utilisateurs' });
  }
});


router.put('/block/:userId', verifyToken, async (req, res) => {
  try {
    const userId = req.params.userId;

    const profile = await Profile.findOne({ user: req.user._id });

    if (!profile) {
      return res.json({ message: 'Profile not found' });
    }

    if (profile.blockedUsers.includes(userId)) {
      return res.json({ message: 'User already blocked' });
    }

    profile.blockedUsers.push(userId);

    await profile.save();

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


router.get('/block', verifyToken, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id });

    if (!profile) {
      return res.json({ message: 'Profile not found' });
    }

    if (!profile.blockedUsers ) {
      return res.json({ message: 'No blocked users found' });
    }

    const blockedUserProfiles = await Profile.find({ user: { $in: profile.blockedUsers } });

    const blockedUsersPromises = blockedUserProfiles.map(async (blockedUserProfile) => {
      const user = await User.findById(blockedUserProfile.user);
      return {
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        profilePicture: user.profilePicture,
        email: user.email,
        username: blockedUserProfile.username, // Ajouter le nom d'utilisateur du profil bloqué
      };
    });

    const blockedUsers = await Promise.all(blockedUsersPromises);

    res.json({ blockedUsers });
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


router.put('/unblock/:userId', verifyToken, async (req, res) => {
  try {
    const userId = req.params.userId;

    const profile = await Profile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    if (!profile.blockedUsers.includes(userId)) {
      return res.status(400).json({ message: 'User not blocked' });
    }

    profile.blockedUsers = profile.blockedUsers.filter(id => id.toString() !== userId);

    await profile.save();

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});




router.get('/User', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user }).select('firstName lastName email profilePicture');;
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const userProfile = await Profile.findOne({ user: user._id }).select('bio interests profileType city birthDate username ');;
    if (!userProfile) {
      return res.status(404).json({ message: 'Profil non trouvé pour cet utilisateur' });
    }

    const eventCount = await Activity.countDocuments({ organizer: user._id });
    console.log('Nombre d\'événements organisés par l\'utilisateur :', eventCount);


    res.json({ user, profile: userProfile, eventCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/UserProfile/:username', verifyToken, async (req, res) => {
  try {
const username = req.params.username;

    const userProfile = await Profile.findOne({ username: username }).select('followers profileType interests following bio additionalImages blockedUsers friends username user ');;
    if (!userProfile) {
      return res.status(404).json({ message: 'Profil non trouvé pour cet utilisateur' });
    }
    const user = await User.findOne({ _id: userProfile.user }).select('firstName lastName email profilePicture');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const BlockList = await Profile.findOne({user : req.user}).select('blockedUsers');

    const verif  = BlockList.blockedUsers.includes(userProfile.user);

    const eventCount = await Activity.countDocuments({ organizer: user._id });
    console.log('Nombre d\'événements organisés par l\'utilisateur :', eventCount);


    res.json({ user, profile: userProfile, eventCount, verif });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/:username',verifyToken, async (req, res) => {
  try {

    myblocklist = await Profile.findOne({ user : req.user}).select('blockedUsers');
    recipientId = await Profile.findOne({ username : req.params.username }).select('user followers following blockedUsers username');
    const user2 = await User.findById(recipientId.user).select('firstName lastName profilePicture isLoggedIn lastLogin');
    if (!user2) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const user = {
      _id: user2._id,
      firstName: user2.firstName,
      lastName: user2.lastName,
      profilePicture: user2.profilePicture,
      isLoggedIn: user2.isLoggedIn,
      lastLogin: user2.lastLogin,
      followers : recipientId.followers,
      following : recipientId.following,
      blockedUsers : recipientId.blockedUsers,
      myblocklist : myblocklist.blockedUsers
    };
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/blockuser', async (req, res) => {
  try {
    res.json({ message: 'Hello from the block user route!' });
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


router.put('/admin/information', verifyToken, upload.single('profilePicture'), async (req, res) => {
  try {
      const userId = req.user; // L'ID de l'utilisateur est extrait du token vérifié
      
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ error: 'Utilisateur introuvable' });
      }
      
      let profilePicture = req.body.profilePicture || '';
      if(user.password !== req.body.password){
      const hashedPassword = await bcrypt.hash(req.body.pawwsord, 10);
      user.password = hashedPassword || user.password;

      }
      user.firstName = req.body.firstName || user.firstName;
      user.lastName = req.body.lastName || user.lastName;
      user.profilePicture = profilePicture || user.profilePicture;

    
      await user.save();

      res.status(200).json({ message: 'Profil utilisateur mis à jour avec succès' });
  } catch (error) {
      console.error('Erreur lors de la mise à jour du profil utilisateur:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du profil utilisateur' });
  }
});
router.delete('/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});




module.exports = router;
