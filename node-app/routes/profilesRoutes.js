

const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');
const Comment = require('../models/Comment');
const verifyToken = require('../middleware/authMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');




const uploadDir = path.join(__dirname, '..','public', 'images');
fs.existsSync(uploadDir) || fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });
/*router.post('/', AuthMiddl, upload.array('additionalImages'), async (req, res) => {
  try {
    console.log('Début de la route POST /'); 
    
    console.log('Données du formulaire :', req.body); 

  
    const CheckUsername = await User.findOne({ username: req.body.username });
    if (CheckUsername) {
      return res.status(400).json({ error: 'Vous devez choisir un autre Username' });
    }

const { bio, interests, profileType, city, birthDate, username } = req.body;
const user = req.user;
console.log('Données extraites du formulaire :', { bio, interests, profileType, city, birthDate, username, user }); // Affichage des données extraites du formulaire

    const imageFiles = []; // Tableau pour stocker les noms de fichiers des images

    if (req.files && req.files.length) {
        for (let i = 0; i < req.files.length; i++) {
            const base64Data = req.files[i].buffer.toString('base64'); // Convertir en base64
            const imageType = req.files[i].mimetype.split('/')[1]; // Récupérer l'extension du type de contenu de l'image
            const fileName = `${Date.now() + i}.${imageType}`;
            const filePath = path.join('public/images', fileName); // Chemin de fichier où enregistrer l'image
    
            fs.writeFileSync(filePath, base64Data, 'base64');
    
            imageFiles.push(fileName);
        }
    } else {
        console.log('Aucun fichier téléchargé');
    }
    
    console.log('Noms de fichiers des images :', imageFiles); // Affichage des noms de fichiers des images

    const newProfile = await Profile.create({
      bio,
      interests,
      profileType,
      city,
      birthDate,
      username,
      user,
      additionalImages: imageFiles // Stockez les noms des fichiers des images
    });

    console.log('Nouveau profil créé :', newProfile); // Affichage du nouveau profil créé
    
    const updatedUser = await User.findById(user);
    if (updatedUser) {
      updatedUser.firstTime = false;
      await updatedUser.save();
    }

    console.log('Utilisateur mis à jour :', updatedUser); // Affichage de l'utilisateur mis à jour

    console.log('Fin de la route POST / avec succès'); // Ajout d'un log pour indiquer la fin de la route avec succès

    res.status(201).json(newProfile);
  } catch (error) {
    console.error('Erreur dans la route POST / :', error); // Affichage des erreurs rencontrées
    res.status(400).json({ message: error.message });
  }
});*/


router.post('/', verifyToken, upload.array('additionalImages'), async (req, res) => {
  try {
    console.log('Début de la route POST /');

    const { bio, interests, profileType, city, birthDate, username } = req.body;
    const user = req.user;


    if (!bio || bio.length < 15 || !interests || interests.length < 2 || !profileType || !city || !birthDate || !username) {
      return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
    }

    if (bio.length < 15) {
      return res.status(400).json({ error: 'La biographie doit contenir au moins 15 caractères.' });
    }

    if (interests.length < 2) {
      return res.status(400).json({ error: 'Vous devez avoir au moins deux centres d\'intérêt.' });
    }

    const today = new Date();
    const birthDateObj = new Date(birthDate);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDifference = today.getMonth() - birthDateObj.getMonth();
    const dayDifference = today.getDate() - birthDateObj.getDate();
  
    if (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)) {
      age--;
    }
  
    if (age < 15) {
      return res.status(400).json({ error: 'Vous devez avoir au moins 15 ans.' });
    }

    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ error: 'Le nom d\'utilisateur doit commencer par une lettre ou un chiffre et ne contenir que des lettres et des chiffres' });
    }

    const existingProfile = await Profile.findOne({ username });
    if (existingProfile) {
      return res.status(400).json({ error: 'Le nom d\'utilisateur est déjà utilisé' });
    }

    //const imageFiles = req.files.map(file => file.filename);
    let imageFiles = [];
    if (req.files && req.files.length > 0) {
      imageFiles = req.files.map(file => file.filename);
    }


    if (imageFiles.length > 5) {
      return res.status(400).json({ error: 'Vous ne pouvez télécharger que jusqu\'à 5 images' });
    }

    if (imageFiles.length < 2) {
      return res.status(400).json({ error: 'Vous devez télécharger au moins 2 images' });
    }
    const newProfile = await Profile.create({
      bio,
      interests,
      profileType,
      city,
      birthDate,
      username,
      user,
      additionalImages: imageFiles
    });

    await User.findByIdAndUpdate(user, { firstTime: false }, { new: true });

    console.log('Fin de la route POST / avec succès');

    res.status(201).json(newProfile);
  } catch (error) {
    console.error('Erreur dans la route POST / :', error);
    res.status(400).json({ message: error.message });
  }
});

router.get('/getUserImages',verifyToken, async (req, res) => {
  try {
    const userProfile = await Profile.findOne({ user: req.user }).select('additionalImages');

    if (!userProfile) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    res.json(userProfile.additionalImages);
  } catch (error) {
    console.error('Erreur lors de la récupération des additionalImages :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
  });

router.get('/:id', async (req, res) => {
    try {
      const profile = await Profile.findById(req.params.id);
      if (!profile) {
        return res.status(404).json({ message: 'Profil non trouvé' });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });


  
router.put('/User', verifyToken, upload.single('profilePicture'), async (req, res) => {
  try {
    console.log('Données de la requête reçue:', req.body); // Afficher les données de la requête

    const { bio, profileType, city, birthDate, firstName, lastName } = req.body;
    let profilePicture = req.body.profilePicture || '';

    

    console.log('Données utilisées pour la mise à jour du profil :', { bio, profileType, city, birthDate, firstName, lastName, profilePicture });

    const updatedProfile = await Profile.findOneAndUpdate(
      { user: req.user }, 
      { $set: { bio, birthDate, city, profileType } },
      { new: true }
    );

    console.log('Profil mis à jour:', updatedProfile);

    let updateData = { $set: { firstName, lastName } };

  if (req.file) {
    updateData.$set.profilePicture = req.file.filename;
  }
  
    const user = await User.findOneAndUpdate(
      { _id: req.user },
      updateData,
      { new: true }
    );
    


    if (!updatedProfile || !user) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    console.log('Profil utilisateur mis à jour:', user);

    res.json(updatedProfile);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil :', error);
    res.status(400).json({ message: error.message });
  }
});


router.put('/UserImages', verifyToken, upload.array('additionalImages', 5), async (req, res) => {
  try {
    const userProfile = await Profile.findOne({ user: req.user }).select('additionalImages');

    if (!userProfile) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    const newImages = req.files.map(file => file.filename);
    console.log('New images: ', newImages);

    const removedImages = req.body.removedImages || [];
    console.log('Removed images: ', removedImages);

    const updatedImages = userProfile.additionalImages
      .filter(image => !removedImages.includes(image)) // Retirer les images supprimées
      .concat(newImages); 

    console.log('Updated images: ', updatedImages);

    const totalImages = updatedImages.length;
    console.log('Total images: ', totalImages);
    if (totalImages < 2 || totalImages > 5) {
      return res.status(400).json({ message: 'Le nombre d\'images doit être compris entre 2 et 5.' });
    }

    const updatedProfile = await Profile.findOneAndUpdate(
      { user: req.user },
      { $set: { additionalImages: updatedImages } },
      { new: true }
    );

    console.log('AdditionalImages mis à jour:', updatedProfile.additionalImages);
    res.json(updatedProfile);
  } catch (error) {
    console.error('Erreur lors de la mise à jour des additionalImages :', error);
    res.status(400).json({ message: error.message });
  }
});




router.get('/' , verifyToken, async (req, res) => {
  console.log(req.user);
  try {
    const userProfile = await Profile.findOne({ user: req.user }).select('interests');

    if (!userProfile) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    res.json(userProfile.interests);
  } catch (error) {
    console.error('Erreur lors de la récupération des intérêts :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});


router.get('/Friend/get', verifyToken, async (req, res) => {
  try {
      const currentUser = req.user;

      const userProfile = await Profile.findOne({ user: currentUser._id }).populate({
          path: 'friends.user',
          select: 'firstName lastName email profilePicture',
      });

      if (!userProfile) {
          return res.status(404).json({ message: "Profil de l'utilisateur introuvable." });
      }

      const uniqueFriends = {};

      userProfile.friends.forEach((friend) => {
          if (uniqueFriends[friend.user._id]) {
              if (uniqueFriends[friend.user._id].date < friend.date) {
                  uniqueFriends[friend.user._id] = { ...friend.toObject() };
              }
          } else {
              uniqueFriends[friend.user._id] = { ...friend.toObject() };
          }
      });

      const uniqueFriendsArray = Object.values(uniqueFriends);

      await Promise.all(uniqueFriendsArray.map(async (friend) => {
          const friendProfile = await Profile.findOne({ user: friend.user._id }).select('username');
          friend.username = friendProfile.username;
      }));

      uniqueFriendsArray.sort((a, b) => b.date - a.date);

      res.json(uniqueFriendsArray);
  } catch (error) {
      console.error("Erreur lors de la récupération des amis de l'utilisateur:", error);
      res.status(500).json({ message: "Une erreur est survenue lors de la récupération des amis de l'utilisateur." });
  }
});












router.put('/updateUserInterests', verifyToken, async (req, res) => {
  try {
    const { interests } = req.body; 

    const userProfile = await Profile.findOne({ user: req.user });

    if (!userProfile) {
      return res.status(404).json({ message: 'Profil non trouvé' });
    }

    userProfile.interests = interests;

    await userProfile.save();

    res.json({ message: 'Intérêts mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des intérêts :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});


  

router.put('/followers/:usernameFollower', verifyToken, async (req, res) => {
  try {
    console.log("Requête PUT reçue pour suivre un utilisateur.");

    const userId = req.user;
    console.log("ID de l'utilisateur actuel:", userId);

    const io = req.io;
    console.log('Socket :', io);

    const { usernameFollower } = req.params;
    console.log("Nom d'utilisateur du follower:", usernameFollower);

    const followerProfile = await Profile.findOne({ username: usernameFollower }).select('user profileType blockedUsers');
    console.log("Profil du follower trouvé:", followerProfile);

    if (!followerProfile) {
      console.log("Utilisateur introuvable.");
      throw new Error("Utilisateur introuvable");
    }

    if (followerProfile.blockedUsers.includes(userId)) {
      console.log("Impossible d'ajouter le follower, l'utilisateur actuel est bloqué par le follower.");
      throw new Error("Impossible d'ajouter le follower, l'utilisateur actuel est bloqué par le follower.");
    }

    const currentUserProfile = await Profile.findOne({ user: userId }).select('blockedUsers');
    if (currentUserProfile.blockedUsers.includes(followerProfile.user)) {
      console.log("Impossible d'ajouter le follower, le follower est bloqué par l'utilisateur actuel.");
      throw new Error("Impossible d'ajouter le follower, le follower est bloqué par l'utilisateur actuel.");
    }

    if (followerProfile.profileType === 'public') {
      const existingFriendship = await Profile.findOne({ user: followerProfile.user, 'friends.user':userId  });

      const updateFollowing = Profile.findOneAndUpdate(
        { user: userId },
        { $addToSet: { following: followerProfile.user } },
        { new: true }
      );
      const updateFollower = Profile.findOneAndUpdate(
        { user: followerProfile.user },
        { $addToSet: { followers: userId } },
        { new: true }
      );

      if (existingFriendship) {
        await Promise.all([
          updateFollowing,
          updateFollower,
        /*  Profile.findOneAndUpdate(
            { user: userId, 'friends.user': followerProfile.user },
            { $set: { 'friends.$.status': 'O', 'friends.$.date': Date.now() } },
            { new: true }
          ),*/
          Profile.findOneAndUpdate(
            { user: followerProfile.user, 'friends.user': userId },
            { $set: { 'friends.$.status': 'O', 'friends.$.date': Date.now() , 'friends.$.vuByUser' :false } },
            { new: true }
          )
        ]);
      } else {

   
        await Promise.all([
          updateFollowing,
          updateFollower,
          Profile.findOneAndUpdate(
            { user: followerProfile.user },
            { $addToSet: { friends: { user: userId, status: 'O', date: Date.now() } } },
            { new: true }
          )
        ]);
      }
    } else {

      const existingFriendship = await Profile.findOne({ user: followerProfile.user, 'friends.user':userId  });
      console.log(followerProfile.user);
      console.log(userId);

      console.log(existingFriendship);
      if (existingFriendship){
        await Profile.findOneAndUpdate(
          { user: followerProfile.user, 'friends.user': userId  },
          { $set:  { 'friends.$.status': 'N', 'friends.$.date': Date.now() , 'friends.$.vuByUser' :false} },
          { new: true }
        );
        
      }else{
      await Profile.findOneAndUpdate(
        { user: followerProfile.user },
        { $addToSet: { friends: { user: userId, status: 'N', date: Date.now()   } } },
        { new: true, upsert: true }
      );
    }
    }

    console.log("Envoi d'une notification au follower.");
    const username = await Profile.findOne({ user: userId }).select('username');
    const notificationType = followerProfile.profileType === 'public' ? 'add_friends' : 'add_friends_private';
    const notification = new Notification({
      recipient: followerProfile.user,
      type: notificationType,
      content: `${username.username}`,
      date: new Date()
    });
    await notification.save();
    req.io.emit('newNotification', notification);

    res.json({ message: "Follower ajouté avec succès" });
  } catch (error) {
    console.log("Erreur lors du traitement de la requête PUT:", error.message);
    res.status(400).json({ message: error.message });
  }
});


  router.put('/followers/:usernameFollower/remove', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const usernameFollower = req.params.usernameFollower;

        const user = await Profile.findOne({ user: userId });
        if (!user) {
            throw Error("Utilisateur introuvable");
        }

        const follower = await Profile.findOne({ username: usernameFollower });
        if (!follower) {
            throw Error("Follower introuvable");
        }

        if (user.blockedUsers.includes(follower.user)) {
            throw Error("Impossible de retirer le follower, l'utilisateur actuel bloque le follower");
        }

        if (follower.blockedUsers.includes(userId)) {
            throw Error("Impossible de retirer le follower, le follower bloque l'utilisateur actuel");
        }

        user.following.pull(follower.user);
        await user.save();

        follower.followers.pull(userId);
        await follower.save();

        const existingFriendshipUser = user.friends.find(friend => friend.user.equals(follower.user));
      /*  if (existingFriendshipUser) {
            existingFriendshipUser.status = 'NF'; // Not Friend
            existingFriendshipUser.date = Date.now(); // Mise à jour de la date
        }*/

        const existingFriendshipFollower = follower.friends.find(friend => friend.user.equals(userId));
        if (existingFriendshipFollower) {
            existingFriendshipFollower.status = 'NF'; // Not Friend
            existingFriendshipFollower.date = Date.now(); // Mise à jour de la date
        }else {

          follower.friends.push({ user: userId, status: 'NF', date: new Date() }); // Confirmed

        }

        await user.save();
        await follower.save();

        res.json({ message: "Follower retiré avec succès" });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});


router.put('/followers/private/:userId', verifyToken, async (req, res) => {
  try {
    const myUserId = req.user._id;
    const targetUserId = req.params.userId;

    const user = await Profile.findOne({ user: myUserId });
    if (!user) {
      throw Error("Utilisateur introuvable");
    }

    const targetUser = await Profile.findOne({ user: targetUserId });
    if (!targetUser) {
      throw Error("Utilisateur cible introuvable");
    }

    if (targetUser.blockedUsers.includes(myUserId)) {
      throw Error("Impossible d'accepter l'amitié, vous êtes bloqué par l'utilisateur cible.");
    }

    if (user.blockedUsers.includes(targetUserId)) {
      throw Error("Impossible d'accepter l'amitié, l'utilisateur cible est bloqué.");
    }

    const existingFriendshipIndex = user.friends.findIndex(friend => friend.user.equals(targetUserId));

    if (existingFriendshipIndex !== -1) {
      if (req.body.action === 'accept') {
        user.friends[existingFriendshipIndex].status = 'O'; // Confirmed
        user.friends[existingFriendshipIndex].date = new Date();
      } else if (req.body.action === 'delete') {
        user.friends[existingFriendshipIndex].status = 'D'; // Deleted
      }
    } else {
      if (req.body.action === 'accept') {
        user.friends.push({ user: targetUserId, status: 'O', date: new Date() }); // Confirmed
      }
    }

    if (req.body.action === 'accept') {
      await Promise.all([
        Profile.findOneAndUpdate({ user: myUserId }, { $addToSet: { followers: targetUserId } }, { new: true }),
        Profile.findOneAndUpdate({ user: targetUserId }, { $addToSet: { following: myUserId } }, { new: true })
      ]);
    }

    await Promise.all([user.save(), targetUser.save()]);

    const notification = new Notification({
      recipient: targetUserId,
      type: 'add_friends_private-accepet',
      content: user.username,
      date: new Date()
    });
    await notification.save();

    req.io.emit('newNotification', notification);


    
    res.json({ message: "Statut de l'amitié mis à jour avec succès" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});




router.put('/cancel/friendrequest/:username', verifyToken, async (req, res) => {
  try {
    const myUserId = req.user._id;

    const otherUserId = req.params.username;

    const otherUserProfile = await Profile.findOne({ username: otherUserId });
    if (!otherUserProfile) {
      throw new Error("Profil de l'autre utilisateur introuvable");
    }

    const friendRequest = otherUserProfile.friends.find(friend => friend.user.equals(myUserId) && friend.status === 'N');
    if (!friendRequest) {
      throw new Error("Aucune demande d'ami en attente de cet utilisateur");
    }

    friendRequest.status = 'D'; // 'D' pour annulé

    await otherUserProfile.save();

    res.json({ message: "Demande d'ami annulée avec succès" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});




router.get('/get/friends', verifyToken, async (req, res) => {
  const userId = req.user;
  //const id = req.params.id; 
const id =req.query.id;
  console.log(id);

  try {


    const activity = await Activity.findById(id);

    if (!activity) {
      return res.status(404).json({ error: 'Activité non trouvée' });
    }

    if (!activity.visibility) {
      return res.status(403).json({ error: 'Activité non visible' });
    }


    const currentDate = new Date();
    const unsubscribeDeadlineDate = new Date(activity.unsubscribeDeadline);
    if (currentDate >= unsubscribeDeadlineDate) {
      return res.status(400).json({ error: 'La date de l\'activité est antérieure ou égale à la date limite de désinscription' });
    }
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    const friends = await Profile.find({
      $and: [
        { followers: userId },
        { following: userId },
        { blockedUsers: { $ne: userId } }, 
        { 'user.blockedUsers': { $ne: userId } }, 
        { 'user._id': { $nin: activity.participants } },
        { 'user._id': { $nin: activity.waitingList } }


      ]
    }).populate('user', 'firstName lastName profilePicture');

   /* const friendsList = friends.map(friend => ({
      _id: friend.user._id,
      username: friend.username,
      firstName: friend.user.firstName,
      lastName: friend.user.lastName,
      profilePicture: friend.user.profilePicture,
    }));*/

    const friendsList = friends.map(friend => {
      if (friend.user._id.toString() === activity.organizer.toString()) {
        return null; // Exclure l'organisateur de la liste
      }
    
      return {
        _id: friend.user._id,
        username: friend.username,
        firstName: friend.user.firstName,
        lastName: friend.user.lastName,
        profilePicture: friend.user.profilePicture,
      };
    }).filter(Boolean);

    res.status(200).json(friendsList);
  } catch (error) {
    console.error('Erreur lors de la récupération des amis :', error.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des amis' });
  }
});


let typingStatus = {}; // Stocker l'état de frappe des utilisateurs

router.post('/typing', verifyToken, (req, res) => {
  const { recipient, isTyping } = req.body;
  
  typingStatus[recipient] = isTyping;
  console.log(`Typing status updated for recipient ${recipient}: ${isTyping}`);
  res.sendStatus(200);
});

router.get('/typing-status/:recipient', verifyToken, (req, res) => {
  const recipient = req.params.recipient;
  const isTyping = typingStatus[recipient];
  console.log(`Typing status checked for recipient ${recipient}: ${isTyping}`);
  res.status(200).json({ isTyping: isTyping || false });
});

router.put('/friends/:friendId/markAsRead', verifyToken, async (req, res) => {
  try {
    const friendId = req.params.friendId;
const myId = req.user;

const userProfile = await Profile.findOneAndUpdate(
  { 'friends._id' : friendId }, // Filtrer par votre ID utilisateur et l'ID de l'ami
  { $set: { 'friends.$.vuByUser': true } }, // Mettre à jour le champ vuByUser du friend correspondant
  { new: true }
);

if (!userProfile) {
  throw new Error("Impossible de trouver l'ami dans votre profil");
}
    res.json({ message: "Ami marqué comme lu avec succès" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});





router.delete('/:id', async (req, res) => {
    try {
      const deletedProfile = await Profile.findByIdAndUpdate(req.params.id);
      if (!deletedProfile) {
        return res.status(404).json({ message: 'Profil non trouvé' });
        
      }
  
      await Profile.updateMany(
        { followers: deletedProfile.user },
        { $pull: { followers: deletedProfile.user } }
      );
  
      await Profile.updateMany(
        { following: deletedProfile.user },
        { $pull: { following: deletedProfile.user } }
      );

      await Profile.findByIdAndUpdate(req.params.id, { followers: [], following: [] });

  

      console.log('ID de l\'utilisateur à désactiver :', deletedProfile.user);

      const updatedUser = await User.findByIdAndUpdate(
        deletedProfile.user,
        {
          firstName: 'utilisateur',
          lastName: 'declic',
          email: `utilisateur_declic_${Math.random().toString(36).substring(7)}@declic.com`,
          username: `declic_${Math.random().toString(36).substring(7)}`
        },
        { new: true }
      );
      if (!updatedUser) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
  
      await Comment.updateMany({ user: deletedProfile.user }, { visibility: false });
      const updatedEvents = await Activity.find({ organizer: deletedProfile.user });
    //  console.log('Updated Events:', updatedEvents); // Ajoutez cette ligne pour vérifier les événements récupérés

       await Activity.updateMany(
        { organizer: deletedProfile.user },
        { visibility: false }
      );
  
      /*const eventIds = updatedEvents.map(event => event._id);
      const eventParticipants = await Profile.find({ $or: [{ participants: { $in: eventIds } }, { waitingList: { $in: eventIds } }] });
      const notificationPromises = eventParticipants.map(async participant => {
        const eventNotifications = [];
        if (participant.participants && participant.participants.length > 0) {
          const participantsToNotify = participant.participants.filter(participantId => eventIds.includes(participantId));
          const participantNotifications = participantsToNotify.map(participantId => ({
            recipient: participantId,
            type: 'event_deleted',
            content: `L'événement auquel vous avez participé a été supprimé par l'utilisateur.`,
            date: new Date()
          }));
          eventNotifications.push(...participantNotifications);
        }
        if (participant.waitingList && participant.waitingList.length > 0) {
          const waitingListToNotify = participant.waitingList.filter(waitingId => eventIds.includes(waitingId));
          const waitingListNotifications = waitingListToNotify.map(waitingId => ({
            recipient: waitingId,
            type: 'event_deleted',
            content: `L'événement auquel vous étiez en liste d'attente a été supprimé par l'utilisateur.`,
            date: new Date()
          }));
          eventNotifications.push(...waitingListNotifications);
        }
        return Notification.insertMany(eventNotifications);
      });
      await Promise.all(notificationPromises);*/
  
     const currentDate = new Date();
     const participantIds = updatedEvents.flatMap(event => event.participants);
     const waitingListIds = updatedEvents.flatMap(event => event.waitingList);
     const userIds = [...participantIds, ...waitingListIds];
     const eventParticipants = await Profile.find({ user: { $in: userIds } });
     
     console.log('Event Participants:', eventParticipants);
     
     const notificationPromises = [];
     
     eventParticipants.forEach(async participant => {
         const eventNotifications = [];
     
         const participantEvents = updatedEvents.filter(event => {
             return event.participants.includes(participant.user) || event.waitingList.includes(participant.user);
         });
     
         participantEvents.forEach(event => {
             const eventDate = event.date;
             if (eventDate > currentDate) {
                 const notificationContent = `L'événement "${event.description}" auquel vous avez participé a été supprimé par l'utilisateur.`;
                 const notification = {
                     recipient: participant.user,
                     type: 'event_deleted',
                     content: notificationContent,
                     date: new Date()
                 };
                 eventNotifications.push(notification);
             }
         });
     
         if (eventNotifications.length > 0) {
             console.log(`Adding notifications for participant: ${participant.user}`);
             notificationPromises.push(Notification.insertMany(eventNotifications));
         }
     });
     
     try {
         console.log('Waiting for notification promises...');
         await Promise.all(notificationPromises);
         console.log('All notifications have been processed.');
     } catch (error) {
         console.error('Error inserting notifications:', error);
         throw error;
     }
     
      res.json({ message: 'Profil et utilisateur supprimés avec succès' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  


  router.get('/blocklistUser', async (req, res) => {
    res.json({message : 'hello'})
  });
  
  


 
  

module.exports = router;
