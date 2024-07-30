const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Profile = require('../models/Profile');
const User = require('../models/User');
const multer = require('multer');

const verifyToken = require('../middleware/authMiddleware');



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images'); 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); 
  },
});

const upload = multer({ storage: storage });


router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  try {
    const sender = req.user;
    const content = req.body.content;
    const recipientId = await Profile.findOne({ username: req.body.username }).select('user');

    const areFriends = await checkIfFriends(sender, recipientId.user);
    if (!areFriends) {
      return res.status(400).json({ message: 'Vous ne pouvez envoyer des messages qu\'aux utilisateurs que vous suivez mutuellement' });
    }
    let newMessage;

    if (req.file) {
      const fileType = req.file.fieldname === 'image' ? 'image' : 'voice';

      newMessage = await Message.create({
        sender: sender._id,
        recipient: recipientId.user,
        content: req.file.filename, 
        type: fileType,

        date: new Date(),
      });
    } else {


      console.log('sender',sender._id)
      console.log('recipientId.user',recipientId.user)

      newMessage = await Message.create({
        sender: sender._id,
        recipient: recipientId.user,
        content: content,
        type: 'text',
        date: new Date(),
      });
    }

    const notificationContent = `Vous avez reçu un nouveau message de la part de ${sender._id}.`;
    const newNotification = new Notification({
      recipient: recipientId.user,
      type: 'new_message',
      content: notificationContent,
      date: new Date(),
    });
    await newNotification.save();
    req.io.emit('newMessage', newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/voice', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const sender = req.user;
    const recipientId = await Profile.findOne({ username: req.body.username }).select('user');

    let newMessage;

    if (req.file) {
      newMessage = await Message.create({
        sender: sender._id,
        recipient: recipientId.user,
        content: req.file.filename, 
        type: 'voice', 
        date: new Date(),
      });
    }

    const notificationContent = `Vous avez reçu un nouveau message vocal de la part de ${sender._id}.`;
    const newNotification = new Notification({
      recipient: recipientId.user,
      type: 'new_message',
      content: notificationContent,
      date: new Date(),
    });
    await newNotification.save();
    req.io.emit('newMessage', newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});




router.get('/', verifyToken, async (req, res) => {
  try {
    const senderId = req.user;

    const userMessagesSent = await Message.find({ sender: senderId }).distinct('recipient');
    const userMessagesReceived = await Message.find({ recipient: senderId }).distinct('sender');

   
   
   // let userIds = [...userMessagesSent, ...userMessagesReceived].filter((userId, index, array) => array.indexOf(userId) === index);


    let userIds = [...userMessagesSent, ...userMessagesReceived];

    // Supprimer les doublons en comparant les chaînes de caractères représentant les identifiants d'objet
    userIds = userIds.filter((userId, index) => {
      const stringId = userId.toString();
      return userIds.findIndex(id => id.toString() === stringId) === index;
    });
    

    const usersWithMessages = await Promise.all(userIds.map(async userId => {
      let lastMessage = null;
      
      const sentMessage = await Message.findOne({ sender: senderId, recipient: userId }).sort({ date: -1 });
      const receivedMessage = await Message.findOne({ sender: userId, recipient: senderId }).sort({ date: -1 });

      if (sentMessage && (!receivedMessage || sentMessage.date > receivedMessage.date)) {
        lastMessage = sentMessage;
      } else if (receivedMessage) {
        lastMessage = receivedMessage;
      }

      if (lastMessage && lastMessage.sender.toString() === senderId.toString()) {
        lastMessage.vuByUser = true;
        await lastMessage.save();
      }

      const unreadCountForUser = await Message.countDocuments({
        recipient: senderId,
        sender: userId,
        vuByUser: false
      });
      const user = await User.findById(userId);
      const userProfile = await Profile.findOne({ user: userId });

      return {
        id: userId,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        isLoggedIn: user.isLoggedIn,
        lastLogin: user.lastLogin,
        username: userProfile.username,
        lastMessage: lastMessage,
        unreadCount: unreadCountForUser

      };
    }));


   /* const unreadCount = usersWithMessages.reduce((total, user) => {
      if (user.lastMessage && !user.lastMessage.vuByUser) {
        return total + 1;
      }
      return total;
    }, 0);

    console.log('Nombre de messages non lus:', unreadCount);
    //console.log('usersWithMessages:', usersWithMessages);*/

    res.json(usersWithMessages); 
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/navbarMessage', verifyToken, async (req, res) => {
  try {
    const senderId = req.user;

    const userMessagesSent = await Message.find({ sender: senderId }).distinct('recipient');
    const userMessagesReceived = await Message.find({ recipient: senderId }).distinct('sender');

    let userIds = [...userMessagesSent, ...userMessagesReceived];

    userIds = userIds.filter((userId, index) => {
      const stringId = userId.toString();
      return userIds.findIndex(id => id.toString() === stringId) === index;
    });

    userIds = userIds.slice(0, 5);
    
    const usersWithMessages = await Promise.all(userIds.map(async userId => {
      let lastMessage = null;
      
      const sentMessage = await Message.findOne({ sender: senderId, recipient: userId }).sort({ date: -1 });
      const receivedMessage = await Message.findOne({ sender: userId, recipient: senderId }).sort({ date: -1 });

      if (sentMessage && (!receivedMessage || sentMessage.date > receivedMessage.date)) {
        lastMessage = sentMessage;
      } else if (receivedMessage) {
        lastMessage = receivedMessage;
      }

      if (lastMessage && lastMessage.sender.toString() === senderId.toString()) {
        lastMessage.vuByUser = true;
        await lastMessage.save();
      }

      const unreadCountForUser = await Message.countDocuments({
        recipient: senderId,
        sender: userId,
        vuByUser: false
      });
      const user = await User.findById(userId);
      const userProfile = await Profile.findOne({ user: userId });

      return {
        id: userId,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        isLoggedIn: user.isLoggedIn,
        lastLogin: user.lastLogin,
        username: userProfile.username,
        lastMessage: lastMessage,
        unreadCount: unreadCountForUser
      };
    }));

    res.json(usersWithMessages); 
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});




router.get('/:username', verifyToken , async (req, res) => {
  try {
    const senderId = req.user;

    recipientId = await Profile.findOne({ username : req.params.username }).select('user ');

   /* const areFriends = await checkIfFriends(senderId, recipientId.user);
    if (!areFriends) {
      return res.status(400).json({ message: 'Vous ne pouvez envoyer des messages qu\'aux utilisateurs que vous suivez mutuellement' });
    }*/
    const userMessages = await Message.find({ sender: senderId }).sort({ date: -1 });
    const uniqueUserIds = new Set();
    userMessages.forEach(message => {
      uniqueUserIds.add(message.recipient.toString());
    });
    const userIds = Array.from(uniqueUserIds);
    const usersProfile = await Profile.find({ user: { $in: userIds } });
    const users = await User.find({ _id: { $in: userIds } });
    
    const usersMap = new Map();
    users.forEach(user => {
      usersMap.set(user._id.toString(), { firstName: user.firstName, lastName: user.lastName, profilePicture: user.profilePicture, isLoggedIn : user.isLoggedIn , lastLogin : user.lastLogin  });
    });
    
    usersProfile.forEach(profile => {
      const userDetails = usersMap.get(profile.user.toString());
      if (userDetails) {
 
        userDetails.username = profile.username;
        userDetails.followers = profile.followers;
        userDetails.following = profile.following;
        userDetails.blockedUsers = profile.blockedUsers;
      }
    });
    

    console.log(usersProfile,userDetails);
    const usersWithMessages = userIds.map(userId => ({
      id: userId,
      ...usersMap.get(userId)
    }));
    res.json(usersWithMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



router.put('/mark-as-read/:username', verifyToken , async (req, res) => {
  recipientId = await Profile.findOne({ username : req.params.username }).select('user');


  try {
    await Message.updateMany(
      { sender: recipientId.user, recipient: req.user._id, vuByUser: false },
      { $set: { vuByUser: true } }

    );

  /*  await Notification.updateMany(
      { type: 'new_message', recipient: req.user._id, vuByUser: false },
      { $set: { vuByUser: true } }
    );*/

    res.status(200).json({ success: true, message: 'Messages and notifications marked as read successfully' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


router.put('/mark', verifyToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { type: 'new_message', recipient: req.user._id, vuByUser: false },
      { $set: { vuByUser: true } }
    );

    res.status(200).json({ success: true, message: 'Notifications marked as read successfully' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});



router.get('/:username/get', verifyToken , async (req, res) => {
  try {
    const senderId = req.user;
    const recipient = await Profile.findOne({ username: req.params.username }).select('user');

    const hasMessages = await checkIfMessagesExchanged(senderId, recipient.user);

    if (hasMessages) {

      await Message.updateMany({
        recipient: senderId,
        sender: recipient.user,
        vuByUser: false
      }, { vuByUser: true });

      const unreadCount = await Message.countDocuments({
        recipient: senderId,
        sender: recipient.user,
        vuByUser: false
      });
      const messages = await Message.find({
        $or: [
          { sender: senderId, recipient: recipient.user },
          { sender: recipient.user, recipient: senderId }
        ]
      }).sort({ date: 1 });


      //console.log(messages);
      return res.json({messages,unreadCount});
    }

  

    const areFriends = await checkIfFriends(senderId, recipient.user);

    if (!areFriends) {
      return res.status(400).json({ message: 'Vous ne pouvez envoyer des messages qu\'aux utilisateurs que vous suivez mutuellement' });
    }

    return res.status(400).json({ message: 'Vous n\'avez pas encore échangé de messages avec cet utilisateur.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


async function checkIfMessagesExchanged(userId1, userId2) {
  try {
    const messages = await Message.find({
      $or: [
        { sender: userId1, recipient: userId2 },
        { sender: userId2, recipient: userId1 }
      ]
    });

    return messages.length > 0; 
  } catch (error) {
    console.error('Erreur lors de la vérification des messages échangés :', error);
    return false; 
  }
}

async function checkIfFriends(userId1, userId2) {
  try {
    const profile1 = await Profile.findOne({ user: userId1 });
    const profile2 = await Profile.findOne({ user: userId2 });
    console.log('userId1 1:', userId1);
    console.log('userId2 2:', userId2);
    const isBlocked1 = profile2.blockedUsers.includes(userId1._id);
    const isBlocked2 = profile1.blockedUsers.includes(userId2);

    if (isBlocked1 || isBlocked2) {
      return false; 
    }
    const isFriend1 = profile1.followers.includes(userId2) && profile1.following.includes(userId2);
    console.log('Friend 1:', isFriend1);
const isFriend2 = profile2.followers.includes(userId1._id) && profile2.following.includes(userId1._id);
console.log('isFriend2 : ', isFriend2);

   

    return isFriend1 && isFriend2;
  } catch (error) {
    console.error('Erreur lors de la vérification des amis :', error);
    return false; 
  }
}


module.exports = checkIfFriends;


// Route pour signaler un message à l'administrateur
/*router.put('/report/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message non trouvé' });
    }

    message.reported = (message.reported || 0) + 1;
    await message.save();

    const notificationContent = `Le message avec l'ID ${messageId} a été signalé par un utilisateur.`;
    const newNotification = new Notification({
      recipient: 'admin', // Utilisez l'ID de l'administrateur ici
      type: 'message_reported',
      content: notificationContent,
      date: new Date()
    });
    await newNotification.save();

    res.json({ message: 'Message signalé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});*/

router.put('/:id/report', verifyToken, async (req, res) => {
  try {
    const Id = req.params.id;
    const userId = req.user._id;
    const { reason } = req.body;


    if (!reason) {
      return res.status(400).json({ error: 'La raison du signalement est requise' });
    }

    const Messageeeee = await Message.findById(Id);
    if (!Messageeeee) {
      return res.status(404).json({ error: 'Message non trouvée' });
    }


    const hasReported = Messageeeee.reported.some(report => report.user.toString() === userId.toString() && report.status === 'N');
    if (hasReported) {
      return res.status(400).json({ error: 'Vous avez déjà signalé cette activité' });
    }
    const newReport = {
      user: userId,
      date: new Date(),
      status: 'N',
      reason
    };

    Messageeeee.reported.push(newReport);
    await Messageeeee.save();

    res.json({ message: 'Signalement ajouté avec succès', Messageeeee });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du signalement:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du signalement' });
  }
});


module.exports = router;
