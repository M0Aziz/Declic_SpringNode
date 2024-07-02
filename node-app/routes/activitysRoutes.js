const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const User = require('../models/User');
const Comment = require('../models/Comment');

const Profile = require('../models/Profile');
const Notification = require('../models/Notification');
const multer = require('multer');
const verifyToken = require('../middleware/authMiddleware');
const axios = require('axios');

// Route pour créer une nouvelle activité


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images'); // Définissez le répertoire de destination des fichiers téléchargés
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Définissez le nom de fichier pour le fichier téléchargé
  },
});

const upload = multer({ storage: storage });


router.post('/', verifyToken ,upload.single('file'), async (req, res) => {
  console.log(req.file.filename);
  console.log(req.body);

  try {
    const { title, description, dateStart, dateEnd,unsubscribeDeadline, location, repeat, currency, city, category,showLocation, price, type } = req.body;
    const organizer = req.user; // L'organisateur est l'utilisateur actuel extrait du token
    const Picture = req.file.filename;
    const repeatArray = Object.keys(repeat).filter(key => repeat[key] === 'true');

    
    // Vérification des champs dans l'objet category
    const categoryArray = category.map(item => item.value);

  const newActivity = new Activity({
    organizer,
    name: title,
    description,
    dateStart ,
    dateEnd ,
    unsubscribeDeadline,
    location,
    repeat: repeatArray,
    currency,
    city,
    category: categoryArray,
    price,
    showLocation,
    profileType : type,
    image: Picture, // Chemin du fichier téléchargé
    date : new Date(),
  });

/*}else {

    const newActivity = new Activity({
      organizer,
      name : title,
      description,
      dateStart : startDate,
      dateEnd : endDate,
      unsubscribeDeadline,
      repeat: repeatArray,
      currency,
      city,
      category: categoryArray,
      price,
      profileType : type,
      image: Picture, // Chemin du fichier téléchargé
      date : new Date(),
    });

  }*/
    const savedActivity = await newActivity.save();
    res.status(201).json(savedActivity);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});



// Route pour qu'un utilisateur participe à un événement
router.put('/:activityId/participate/', verifyToken, async (req, res) => {
  try {
    const { activityId } = req.params;
     const userId = req.user;
     const io = req.io;
    // Récupérer les informations de l'utilisateur à partir du modèle User
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const { firstName, lastName } = user;

    // Vérifier si l'événement existe
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }


    // Vérifier si l'utilisateur est déjà dans la liste des participants ou de la liste d'attente
   // const participantIndex = activity.participants.findIndex(participantId => participantId.toString() === userId);
    //const waitingIndex = activity.waitingList.findIndex(waitingId => waitingId.toString() === userId);
    const isUserInWaitingList = activity.waitingList.includes(userId._id);
    const isUserInParticipant = activity.participants.includes(userId._id);

    console.log(isUserInParticipant);
    console.log(isUserInWaitingList);
    
    if (isUserInWaitingList || isUserInParticipant) {
      return res.json({ success: false, error: 'L\'utilisateur est déjà en liste d\'attente pour cet événement' });

    }
    
    // Ajouter l'utilisateur à la liste d'attente de l'événement
    activity.waitingList.push(userId);
    await activity.save();

    // Envoyer une notification à l'organisateur
    const organizerProfile = await Profile.findOne({ user: activity.organizer });
    if (!organizerProfile) {
      return res.status(404).json({ message: 'Profil de l\'organisateur non trouvé' });
    }

    const notificationContent = `${firstName} ${lastName} souhaite participer à votre événement "${activity.name}"`;
    let notification = await Notification.findOne({ recipient: activity.organizer, type: 'participation_request', content: activityId });

    if (notification) {
      // Mettre à jour la date et l'état de la notification existante
      notification.date = new Date();
      notification.vu = false;
      notification.vuByUser = false;

      await notification.save();
    } else {
      // Créer une nouvelle notification
      notification = new Notification({
        recipient: activity.organizer,
        type: 'participation_request',
        content: activityId,
        date: new Date()
      });
      await notification.save();
    }

    req.io.emit('newNotification', notification);

    res.json({ message: 'Demande de participation envoyée avec succès' });
  } catch (error) {
    res.status(500).json({ success: error , message: error.message });
  }
});


router.put('/:activityId/unsubscribe-waitinglist/', verifyToken, async (req, res) => {
  try {
    const { activityId } = req.params;
    const userId = req.user;
    const io = req.io;

    // Récupérer l'activité
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ message: 'Activité non trouvée' });
    }

    // Vérifier si l'utilisateur est dans la liste d'attente
    const waitingIndex = activity.waitingList.indexOf(userId._id);
    if (waitingIndex === -1) {
      return res.json({ success: false, error: 'L\'utilisateur n\'est pas dans la liste d\'attente de cet événement' });
    }

    // Retirer l'utilisateur de la liste d'attente
    activity.waitingList.splice(waitingIndex, 1);
    await activity.save();

    // Envoyer une notification à l'organisateur
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    const { firstName, lastName } = user;
    /*const notificationContent = `${lastName} s'est désinscrit de l'attente de "${activity.name}".`;
    const newNotification = new Notification({
      recipient: activity.organizer,
      type: 'waitinglist_unsubscribed',
      content: notificationContent,
      date: new Date()
    });
    await newNotification.save();*/

    // Recherchez si une notification existante correspondant à la désinscription de cet utilisateur de la liste d'attente de cet événement existe déjà
let existingNotification = await Notification.findOne({
  recipient: activity.organizer,
  type: 'waitinglist_unsubscribed',
  content: `${lastName} s'est désinscrit de l'attente de "${activity.name}".`
});

if (existingNotification) {
  // Si une notification existe, mettez à jour la date de la notification existante
  existingNotification.date = new Date();
  existingNotification.vu = false;
  existingNotification.vuByUser = false;  await existingNotification.save();
} else {
  // Sinon, créez une nouvelle notification avec les détails de la désinscription de la liste d'attente
  existingNotification = new Notification({
    recipient: activity.organizer,
    type: 'waitinglist_unsubscribed',
    content: `${lastName} s'est désinscrit de l'attente de "${activity.name}".`,
    date: new Date()
  });
  await existingNotification.save();
}





io.emit('newNotification', existingNotification);

    res.json({ message: 'Désinscription réussie de la liste d\'attente de l\'événement' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Route pour récupérer toutes les activités
router.get('/', async (req, res) => {
    try {
      const activities = await Activity.find();
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Route pour récupérer une activité par son ID
  router.get('/myevents', verifyToken, async (req, res) => {
    try {
      const perPage = 10; // Nombre d'événements par page
      const page = req.query.page || 1; // Numéro de page, par défaut 1
      const searchTerm = req.query.searchTerm || ''; // Terme de recherche, par défaut vide
  
      const query = { organizer: req.user }; // Filtrer par organisateur
  
      // Si un terme de recherche est fourni, ajoutez-le à la requête de recherche
      if (searchTerm) {
        query.name = { $regex: searchTerm, $options: 'i' }; // Recherche insensible à la casse
      }
  
      // Compter le nombre total d'événements correspondant à la requête
      const totalEvents = await Activity.countDocuments(query);
  
      // Récupérer les événements paginés
      const events = await Activity.find(query)
        .populate({
          path: 'participants',
          select: 'profilePicture',
        })
        .sort({ date: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage);
  
      res.json({
        events,
        currentPage: page,
        totalPages: Math.ceil(totalEvents / perPage),
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  


  
  router.get('/upComing', verifyToken, async (req, res) => {
    try {
        const { category, city, startDate,match  } = req.query; 
        const userId = req.user._id; 

        const currentDate = new Date();
        let query = { 
            unsubscribeDeadline: { $gt: currentDate }, 
            organizer: { $ne: userId }, 
            participants: { $ne: userId }, 
            visibility: true ,
            profileType: 'public'

        };

        if (category) {
            query.category = category;
        }
        if (city) {
            query.city = city;
        }
        if (startDate) {
          query.unsubscribeDeadline = { $gte: new Date(startDate) };
          query.dateStart = { $gte: new Date(startDate) };
      }
      
        if (req.query.price === 'gratuit') {
          query.price = 0; // Filtrer les activités gratuites
      } else if (req.query.price === 'payant') {
          query.price = { $gt: 0 }; // Filtrer les activités payantes (prix supérieur à zéro)
      }
      const userProfile = await Profile.findOne({ user: userId }).exec();



      if (match) {
        switch (match) {
          case 'profile':
            query.$and = [
              {
                $expr: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: '$category',
                          as: 'category',
                          cond: { $in: ['$$category', userProfile.interests] }
                        }
                      }
                    },
                    { $multiply: [{ $size: '$category' }, 0.3] }
                  ]
                }
              },
              { city: userProfile.city }
            ];
            break;
          case 'interest':
            query.$expr = {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: '$category',
                      as: 'category',
                      cond: { $in: ['$$category', userProfile.interests] }
                    }
                  }
                },
                { $multiply: [{ $size: '$category' }, 0.3] }
              ]
            };
            break;
          case 'location':
            query.city = userProfile.city;
            break;
          case 'all':
            query.$or = [
              {
                $expr: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: '$category',
                          as: 'category',
                          cond: { $in: ['$$category', userProfile.interests] }
                        }
                      }
                    },
                    { $multiply: [{ $size: '$category' }, 0.3] }
                  ]
                }
              },
              { city: userProfile.city }
            ];
            break;
          default:
            break;
        }
      }

        const activities = await Activity.find(query)
            .populate({
                path: 'participants',
                select: 'profilePicture',
            })
            .sort({ date: -1 }); // Trier les activités par date croissante

       /* if (!activities) {
            return res.status(404).json({ message: 'Aucune activité trouvée' });
        }

        res.json(activities);*/

        const joinedActivities = activities.filter(activity => {
          return activity.participants.every(participant => !participant.equals(userId));
        });

      if (!joinedActivities) {
          return res.status(404).json({ message: 'Aucune activité trouvée' });

      }

    
      const recommendedActivities = joinedActivities.map(activity => {
        const isRecommended = checkIfActivityMatchesProfile(activity, userProfile);
        return { ...activity.toObject(), isRecommended };
      });

      res.json(recommendedActivities);

      /*res.json(joinedActivities);*/
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});




router.get('/home/guest', async (req, res) => {
  try {
    const currentDate = new Date();
    const activities = await Activity.aggregate([
      {
        $match: {
          unsubscribeDeadline: { $gt: currentDate },
          visibility: true,
          profileType: 'public'
        }
      },
      { $sample: { size: 3 } },
      {
        $lookup: {
          from: 'users', // Le nom de la collection MongoDB contenant les participants
          localField: 'participants', // Le champ dans la collection Activity qui contient les participants
          foreignField: '_id', // Le champ dans la collection User qui est référencé par les participants
          as: 'participants' // Le nom du champ où seront placées les données peuplées
        }
      },
      {
        $project: {
          'participants.profilePicture': 1,
          'participants._id': 1,

          'dateStart': 1,
  'dateEnd' : 1,
  'city': 1,
  'name': 1,
  'location': 1,
  'price' : 1,
  'currency' : 1,
  'category': 1,
  'image' : 1,
  'unsubscribeDeadline':1
          // Sélectionner uniquement les images de profil des participants
          // inclure d'autres champs nécessaires ici
        }
      } // Sélectionner 3 activités au hasard
    ]);

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/home/user', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id; 
    const currentDate = new Date();
    const userProfile = await Profile.findOne({ user: userId }).exec();

    let query = {
      unsubscribeDeadline: { $gt: currentDate },
      organizer: { $ne: userId },
      participants: { $ne: userId },
      visibility: true,
      profileType: 'public'
    };

    const activities = await Activity.find(query)
      .populate({
        path: 'participants',
        select: 'profilePicture',
      })
      .sort({ date: -1 });

    const recommendedActivities = activities.filter(activity => {
      return checkIfActivityMatchesProfile(activity, userProfile);
    }).slice(0, 3).map(activity => {
      const isRecommended = checkIfActivityMatchesProfile(activity, userProfile);
      return { ...activity.toObject(), isRecommended };
    }); 

    res.json(recommendedActivities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});




const checkIfActivityMatchesProfileMatch = (activity, userProfile, match) => {
  let isRecommended = null;
  const totalInterests = userProfile.interests.length;
  const matchingInterests = userProfile.interests.filter(interest => activity.category.includes(interest)).length;
  const interestsMatch = calculateThreshold(totalInterests, matchingInterests);
  const locationMatch = userProfile.city === activity.city || (activity.showLocation && userProfile.city === activity.location);

  if (match === 'profile') {
    if (interestsMatch && locationMatch) isRecommended = 'profile';
  } else if (match === 'interest') {
    if (interestsMatch) isRecommended = 'interest';
  } else if (match === 'location') {
    if (locationMatch) isRecommended = 'location';
  } else if (match === 'all') {
    if (interestsMatch || locationMatch) isRecommended = 'all';
  }

  return false;
};

const checkIfActivityMatchesProfile = (activity, userProfile) => {
  let isRecommended = null;

  //const interestsMatch = activity.category.some(category => userProfile.interests.includes(category));
  //const totalCategories = activity.category.length;
  const totalInterests = userProfile.interests.length;
//conosle.log(totalInterests);
  //const matchingInterests = activity.category.filter(category => userProfile.interests.includes(category)).length;
  const matchingInterests = userProfile.interests.filter(interest => activity.category.includes(interest)).length;
  //conosle.log(matchingInterests);

  //const interestsMatch = matchingInterests / totalCategories > 0.5;

  const interestsMatch = calculateThreshold(totalInterests, matchingInterests);

  const locationMatch = userProfile.city === activity.city || (activity.showLocation && userProfile.city === activity.location);

  if (interestsMatch && locationMatch) {
    isRecommended = 'profile'; 
  } else if (interestsMatch) {
    isRecommended = 'interest'; 
  } else if (locationMatch) {
    isRecommended = 'location'; 
  }

  return isRecommended;
};


const calculateThreshold = (totalInterests, matchingInterests) => {
  const matchPercentage = (matchingInterests / totalInterests) * 100;

  let threshold = 0;
  if (totalInterests <= 3) {
    threshold = 0.5;
  } else if (totalInterests <= 5) {
    threshold = 0.4; 
  } else {
    threshold = 0.3; 
  }

  return matchPercentage >= threshold;
};

router.get('/upComing/guest', async (req, res) => {
  try {
      const { category, city, startDate } = req.query; 
      const perPage = 10; 
      const page = req.query.page || 1;
      const currentDate = new Date();
      let query = { 
          unsubscribeDeadline: { $gt: currentDate }, 
          visibility: true ,
          profileType: 'public'

      };

      if (category) {
          query.category = category;
      }
      if (city) {
          query.city = city;
      }
      if (startDate) {
        query.unsubscribeDeadline = { $gte: new Date(startDate) };
        query.dateStart = { $gte: new Date(startDate) };
    }
    
      if (req.query.price === 'gratuit') {
        query.price = 0; // Filtrer les activités gratuites
    } else if (req.query.price === 'payant') {
        query.price = { $gt: 0 }; // Filtrer les activités payantes (prix supérieur à zéro)
    }
    

    const totalActivities = await Activity.countDocuments(query);


      const activities = await Activity.find(query)
          .populate({
              path: 'participants',
              select: 'profilePicture',
          })
          .sort({ date: 1 })
          .skip((page - 1) * perPage)
          .limit(perPage); 

     /* if (!activities) {
          return res.status(404).json({ message: 'Aucune activité trouvée' });
      }

      res.json(activities);*/
      const totalPages = Math.ceil(totalActivities / perPage);

  
    if (!activities) {
      return res.status(404).json({ message: 'Aucune activité trouvée' });
  }
  
    res.json({activities,currentPage: page,totalPages });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});


router.get('/joined', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const perPage = 10; // Nombre d'activités par page
    const page = req.query.page || 1; // Numéro de page, par défaut 1
    const searchTerm = req.query.searchTerm || ''; // Terme de recherche, par défaut vide

    // Récupérer toutes les activités avec les participants populés
    let activities = await Activity.find().populate({
      path: 'participants',
      select: 'profilePicture firstName lastName', // Sélectionnez les champs que vous souhaitez récupérer
    });

    // Si un terme de recherche est fourni, filtrer les activités correspondantes
    if (searchTerm) {
      activities = activities.filter(activity => {
        return activity.name.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filtrer les activités auxquelles l'utilisateur participe
    activities = activities.filter(activity => {
      return activity.participants.some(participant => participant._id.toString() === userId.toString());
    });

    // Pagination
    const totalActivities = activities.length;
    const paginatedActivities = activities.slice((page - 1) * perPage, page * perPage);

    res.json({
      activities: paginatedActivities,
      currentPage: page,
      totalPages: Math.ceil(totalActivities / perPage),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});






  router.get('/:id', verifyToken, async (req, res) => {
    try {
        let activity = await Activity.findById(req.params.id)
            .populate({
                path: 'organizer',
                model: 'User',
                select: 'firstName lastName email profilePicture'
            })
            .exec();

        if (!activity) {
            return res.status(404).json({ message: 'Activité non trouvée' });
        }

        // Maintenant, nous allons peupler le profil de l'organisateur
        let profile = await Profile.findOne({ user: activity.organizer._id })
            .select('username')
            .exec();

        // Créer une copie de l'activité
        let activityCopy = activity.toObject();

        // Ajouter le profil à l'organisateur dans la copie
        activityCopy.organizer.profile = profile;

        res.json(activityCopy);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.get('/:id/public', async (req, res) => {
  try {
 const { id } = req.params;

 const activity = await Activity.findById(id);
 if (!activity) {
   return res.status(404).json({ message: 'Activité non trouvée' });
 }

 res.json(activity);
} catch (error) {
 res.status(500).json({ message: 'Erreur serveur', error });
}
});


router.get('/waitingList/:eventId', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId =  req.user;
    // Vérifier si l'événement existe
    const activity = await Activity.findById(eventId);
    if (!activity) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Récupérer les utilisateurs dans la liste d'attente avec leurs informations
    const waitingList = await Promise.all(activity.waitingList.map(async userId => {
      const user = await User.findById(userId);
      const profile = await Profile.findOne({ user: userId });

      return {
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        username: profile.username
      };
    }));

    res.json(waitingList);
  } catch (error) {
    console.error('Erreur lors de la récupération de la liste d\'attente de l\'événement :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});


router.get('/participants/:eventId', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId =  req.user;

    // Vérifier si l'événement existe
    const activity = await Activity.findById(eventId);
    if (!activity) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Récupérer les informations sur les participants avec leurs profils
    const participants = await Promise.all(activity.participants.map(async userId => {
      const user = await User.findById(userId);
      const profile = await Profile.findOne({ user: userId });

      return {
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        username: profile.username
      };
    }));

    res.json(participants);
  } catch (error) {
    console.error('Erreur lors de la récupération des participants de l\'événement :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});


router.put('/:id/report', verifyToken, async (req, res) => {
  try {
    const activityId = req.params.id;
    const userId = req.user._id;
    const { reason } = req.body;


    if (!reason) {
      return res.status(400).json({ error: 'La raison du signalement est requise' });
    }

    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ error: 'Activité non trouvée' });
    }


       // Vérifiez si l'utilisateur a déjà signalé cette activité
    const hasReported = activity.reported.some(report => report.user.toString() === userId.toString() && report.status === 'N');
    if (hasReported) {
      return res.status(400).json({ error: 'Vous avez déjà signalé cette activité' });
    }
    const newReport = {
      user: userId,
      date: new Date(),
      status: 'N',
      activity : activityId,
      reason
    };

    activity.reported.push(newReport);
    await activity.save();

    res.json({ message: 'Signalement ajouté avec succès', activity });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du signalement:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du signalement' });
  }
});

router.get('/:id/comments', verifyToken, async (req, res) => {
  try {
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      let comments = await Comment.find({ activity: req.params.id })
          .skip(skip)
          .limit(limit)
          .populate({
              path: 'user',
              model: 'User',
              select: 'firstName lastName profilePicture'
          })
          .exec();

      // Vérifier s'il y a des commentaires
      /* if (!comments || comments.length === 0) {
          return res.status(404).json({ message: 'Aucun commentaire trouvé pour cette activité' });
      }*/

      // Maintenant, nous allons peupler le profil de chaque utilisateur
      for (let i = 0; i < comments.length; i++) {
          let profile = await Profile.findOne({ user: comments[i].user._id })
              .select('username')
              .exec();

          // Ajouter le profil à l'utilisateur dans la copie
          comments[i].user.profile = profile;
      }

      res.json(comments);
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});



  // Route pour mettre à jour partiellement une activité
  router.put('/:id', verifyToken, upload.single('file'), async (req, res) => {
    try {

      const event = await Activity.findById(req.params.id);

      // Vérifier si l'événement existe
      if (!event) {
          return res.status(404).json({ message: 'Événement non trouvé' });
      }


      if (!event.visibility) {
        return res.status(404).json({ message: 'Événement non Visible' });
    }
console.log('event.organizer.toString()', event.organizer.toString());
console.log('req.user._id', req.user._id);

      // Vérifier si l'utilisateur authentifié est l'organisateur de l'événement
      if (event.organizer.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à mettre à jour cet événement' });
      }

      const { title, description, startDate, endDate, unsubscribeDeadline, location, repeat, currency, city, category, price, profileType } = req.body;
      const organizer = req.user;
      //const repeatArray = Object.keys(repeat).filter(key => repeat[key] === 'true');
      const repeatArray = JSON.parse(repeat);
      const Picture = req.file;
   
      const categoryArray = category[0].split(','); // Divisez la chaîne en un tableau de catégories

      const formattedCategories = categoryArray.map((category, index) => {
        return category.trim(); // Supprimez les espaces blancs inutiles
      });
      
      console.log(formattedCategories);
      console.log(location);
      let updatedActivityData = {
        name: title,
        description,
        dateStart: startDate,
        dateEnd: endDate,
        unsubscribeDeadline,
        location,
        repeat: repeatArray,
        currency,
        city,
        category: formattedCategories, // Assurez-vous de conserver le même format de catégorie
        price,
        profileType,
      };
      // Vérifiez si une nouvelle image a été téléchargée
      if (Picture) {
        updatedActivityData.image = req.file.filename; // Mettez à jour le nom du fichier d'image
      }
      const updatedActivity = await Activity.findByIdAndUpdate(req.params.id, updatedActivityData, { new: true });
      if (!updatedActivity) {
        return res.status(404).json({ message: 'Activité non trouvée' });
      }
      res.json(updatedActivity);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  
  router.put('/:activityId/accept/:userIdAccepet', verifyToken, async (req, res) => {
    try {
      const { activityId, userIdAccepet } = req.params;
      const userId = req.user;
      const io = req.io;

      const activity = await Activity.findById(activityId);
      if (!activity) {
        return res.json({ success: false, error: 'Événement non trouvé' });
      }
  
     
      const userIndex = activity.waitingList.indexOf(userIdAccepet);
      if (userIndex === -1) {
        return res.json({ success: false, error:'L\'utilisateur n\'est pas en liste d\'attente pour cet événement' });
      }
  
      activity.waitingList.splice(userIndex, 1); 
      activity.participants.push(userIdAccepet); 
      await activity.save();
      const notificationContent = `Votre participation à "${activity.name}" a été acceptée.`;
      const notificationIdentifier = `${activity._id}-${notificationContent}`;
      let notification = await Notification.findOne({ recipient: userIdAccepet, content: new RegExp(`^${activity._id}-`) });

      // Envoyer une notification à l'utilisateur
     // const notificationContent = `Votre participation à "${activity.name}" a été acceptée.`;



      if (notification) {
        // Mettre à jour la notification existante
        notification.date = new Date();
        notification.vu = false;
        notification.vuByUser = false;
        notification.type= 'participation_accepted';

        notification.content= notificationIdentifier;

        await notification.save();
      } else {
        // Créer une nouvelle notification
        notification = new Notification({
          recipient: userIdAccepet,
          type: 'participation_accepted',
          content: notificationIdentifier,
          date: new Date()
        });
        await notification.save();
      }

      io.emit('newNotification', notification);

      res.json({ message: 'Utilisateur accepté avec succès dans l\'événement' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });


  router.put('/:activityId/remove/:userIdRemove', verifyToken, async (req, res) => {
    try {
      const { activityId, userIdRemove } = req.params;
      const userId = req.user;
      const io = req.io;

      const activity = await Activity.findById(activityId);
      if (!activity) {
        return res.json({ success: false, error: 'Événement non trouvé' });
      }
  
      const participantIndex = activity.participants.indexOf(userIdRemove);
      if (participantIndex === -1) {
        return res.json({ success: false, error: 'L\'utilisateur n\'est pas dans la liste des participants pour cet événement' });
      }
  
      activity.participants.splice(participantIndex, 1); 
      activity.waitingList.push(userIdRemove); 
      await activity.save();
  

      const notificationContent = `Votre participation à "${activity.name}" a été annulée.`;
      const notificationIdentifier = `${activity._id}-${notificationContent}`;
      let notification = await Notification.findOne({ recipient: userIdRemove, content: new RegExp(`^${activity._id}-`) });
      // Envoyer une notification à l'utilisateur
    

      if (notification) {
        // Mettre à jour la notification existante
        notification.date = new Date();
        notification.content= notificationIdentifier;
        notification.type= 'participation_removed';

        notification.vu = false;
        notification.vuByUser = false;
        await notification.save();
      } else {
        // Créer une nouvelle notification
        notification = new Notification({
          recipient: userIdRemove,
          type: 'participation_removed',
          content: notificationIdentifier,
          date: new Date()
        });
        await notification.save();
      }

      io.emit('newNotification', notification);
  
      res.json({ message: 'Utilisateur retiré avec succès de la liste des participants et ajouté à la liste d\'attente' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  


  const updateNotificationForParticipant = async (activity, participant,req) => {
    const io = req.io;

    try {
      // Construire le nouvel identifiant de notification
      const notificationContent = `Votre participation à "${activity.name}" n'est plus valide.`;
      const notificationIdentifier = `${activity._id}-${notificationContent}`;
  
      // Rechercher la notification existante par destinataire et contenu
      let notification = await Notification.findOne({
        recipient: participant,
        content: new RegExp(`^${activity._id}-`)
      });
  
      if (notification) {
        // Mettre à jour les propriétés de la notification
        notification.date = new Date(); // Mettre à jour la date
        notification.vu = false; // Marquer comme non vu (facultatif selon votre logique)
        notification.vuByUser = false; // Marquer comme non vu par l'utilisateur (facultatif selon votre logique)
        notification.type = 'participation_not_valid'; // Mettre à jour le type de notification
        notification.content = notificationIdentifier; // Mettre à jour le contenu de la notification
  
        // Sauvegarder la notification mise à jour
        await notification.save();

        req.io.emit('newNotification', notification);

  
        console.log(`Notification mise à jour pour ${participant} :`, notification);
      } else {
        console.log(`Aucune notification trouvée pour ${participant} correspondant à l'activité ${activity._id}`);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la notification :', error);
      throw error; // Gérer l'erreur selon votre logique (logging, renvoyer une erreur, etc.)
    }
  };
  router.delete('/:id', async (req, res) => {
    try {
      const activity = await Activity.findById(req.params.id);
  
      if (!activity) {
        return res.status(404).json({ message: 'Activité non trouvée' });
      }
  
      // Vérifier la date de unsubscribeDeadline
      if (new Date(activity.unsubscribeDeadline) > new Date()) {
        // Si la date est valide, mettre à jour les participants et envoyer une notification
        if (activity.participants.length > 0) {
          // Créer une notification pour chaque participant
          for (let participant of activity.participants) {
            await updateNotificationForParticipant(activity, participant,req);
          }
        }
  
        // Mettre à jour l'activité pour la rendre non visible (visibility: false)
        const deletedActivity = await Activity.findByIdAndUpdate(req.params.id, { visibility: false }, { new: true });
  
        if (!deletedActivity) {
          return res.status(404).json({ message: 'Activité non trouvée' });
        }

        activity.participants = [];
        activity.waitingList = [];
  
        // Enregistrer les changements
        await activity.save();
  
        return res.json({ message: 'Activité supprimée avec succès' });
      } else {
        // Si la date de unsubscribeDeadline est dépassée, supprimer simplement l'activité sans notification
        const deletedActivity = await Activity.findByIdAndDelete(req.params.id);
  
        if (!deletedActivity) {
          return res.status(404).json({ message: 'Activité non trouvée' });
        }
  
        return res.json({ message: 'Activité supprimée avec succès' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  


router.put('/:activityId/unsubscribe/', verifyToken, async (req, res) => {
    try {
      const { activityId } = req.params;
  const userId = req.user;
  const io = req.io;

      // Récupérer l'activité
      const activity = await Activity.findById(activityId);
      if (!activity) {
        return res.status(404).json({ message: 'Activité non trouvée' });
      }
  
      // Vérifier si l'utilisateur est inscrit à l'événement
      const participantIndex = activity.participants.indexOf(userId._id);
      if (participantIndex === -1) {
        return res.status(400).json({ message: 'L\'utilisateur n\'est pas inscrit à cet événement' });
      }
  
      // Vérifier si la date limite de désinscription est dépassée
      const currentDate = new Date();
      if (currentDate > activity.unsubscribeDeadline) {
        return res.status(400).json({ message: 'La date limite de désinscription est dépassée' });
      }
  
      // Retirer l'utilisateur de la liste des participants
      activity.participants.splice(participantIndex, 1);
      await activity.save();
  
  // Envoyer une notification à l'organisateur
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'Utilisateur non trouvé' });
  }
  const { firstName, lastName } = user;
  /*const notificationContent = `${lastName} s'est désinscrit de l'événement "${activity.name}".`;
  const newNotification = new Notification({
    recipient: activity.organizer,
    type: 'participant_unsubscribed',
    content: notificationContent,
    date: new Date()
  });
  await newNotification.save();*/

// Recherchez si une notification existante correspondant à la désinscription de ce participant de cet événement existe déjà
let existingNotification = await Notification.findOne({
  recipient: activity.organizer,
  type: 'participant_unsubscribed',
  content: `${lastName} s'est désinscrit de l'événement "${activity.name}".`
});

if (existingNotification) {
  // Si une notification existe, mettez à jour la date de la notification existante
  existingNotification.date = new Date();
  existingNotification.vu = false;
  existingNotification.vuByUser = false;
  await existingNotification.save();
} else {
  // Sinon, créez une nouvelle notification avec les détails de la désinscription
  existingNotification = new Notification({
    recipient: activity.organizer,
    type: 'participant_unsubscribed',
    content: `${lastName} s'est désinscrit de l'événement "${activity.name}".`,
    date: new Date()
  });
  await existingNotification.save();
}


  io.emit('newNotification', existingNotification);


      res.json({ message: 'Désinscription réussie de l\'événement' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  router.post('/generate-image', async (req, res) => {
    const { prompt } = req.body;
  
    try {
      const response = await axios.post('https://api.openai.com/v1/images/generations', {
        prompt,
        n: 1,
        size: '256x256'
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
  
      res.json(response.data);
    } catch (error) {
      if (error.response) {
        console.error('Error response data:', error.response.data);
        if (error.response.data.error.code === 'billing_hard_limit_reached') {
          res.status(402).send('Billing limit reached. Please upgrade your plan or wait until your billing cycle resets.');
        } else {
          res.status(500).send('Erreur lors de la génération de l\'image');
        }
      } else if (error.request) {
        console.error('Error request data:', error.request);
        res.status(500).send('No response received from OpenAI API');
      } else {
        console.error('General error message:', error.message);
        res.status(500).send('An unexpected error occurred');
      }
    }
  });

module.exports = router;
