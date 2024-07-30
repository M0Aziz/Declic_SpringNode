const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Activity = require('../models/Activity');
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Notification = require('../models/Notification'); 
router.post('/:activityId/comment',verifyToken, async (req, res) => {
  try {
    const { activityId } = req.params;
    const { content}  = req.body;
const user = req.user._id;
const io = req.io;
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ message: 'Activité non trouvée' });
    }
    if (!activity.visibility) {
      return res.status(403).json({ message: 'L\'activité n\'est pas visible' });
    }
    console.log(activity.participants.includes(user))

    if (activity.organizer.toString() !== user.toString() && !activity.participants.includes(user)) {
      return res.status(403).json({ message: 'Vous devez être inscrit à l\'activité pour poster un commentaire' });
    }
    const isOrganizer = user.equals(activity.organizer);

    if (isOrganizer) {
      // Vérifier s'il existe déjà des commentaires
      const existingComments = await Comment.find({ activity: activityId });
      if (existingComments.length === 0) {
        return res.status(403).json({ message: 'L\'organisateur ne peut pas commenter tant qu\'il n\'y a pas de commentaires.' });
      }
    }
    const newComment = await Comment.create({ user, activity: activityId, content, date: new Date() });

    if (!isOrganizer) {
      let notification = await Notification.findOne({ recipient: activity.organizer, type: 'new-commentaire', content: activityId });

      if (notification) {
        notification.date = new Date();
        notification.vu = false;
        notification.vuByUser = false;
        await notification.save();
      } else {
        notification = new Notification({
          recipient: activity.organizer,
          type: 'new-commentaire',
          content: activityId,
          date: new Date()
        });
        await notification.save();
      }
      io.emit('newNotification', notification);
    }
    const commenters = await Comment.find({ activity: activityId }).distinct('user');
    for (const commenterId of commenters) {
      if (!commenterId.equals(activity.organizer) && !commenterId.equals(user)) {
        let notification = await Notification.findOne({ recipient: commenterId, type: 'new-commentaire', content: activityId });

        if (notification) {
          notification.date = new Date();
          notification.vu = false;
          notification.vuByUser = false;
          await notification.save();
        } else {
          notification = new Notification({
            recipient: commenterId,
            type: 'new-commentaire',
            content: activityId,
            date: new Date()
          });
          await notification.save();
        }

        io.emit('newNotification', notification);
      }
    }

    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:activityId/comments', async (req, res) => {
  try {
    const { activityId } = req.params;
    const page = req.query.page || 1; 
    const limit = 10; 

    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ message: 'Activité non trouvée' });
    }
    if (!activity.visibility) {
      return res.status(403).json({ message: 'L\'activité n\'est pas visible' });
    }

    const startIndex = (page - 1) * limit;
    const commentsQuery = Comment.find({ activity: activityId });

    const totalComments = await Comment.countDocuments({ activity: activityId });
    const comments = await Comment.find({ activity: activityId })
    .populate('user', 'firstName lastName profilePicture') 
    .sort({ date: 1 }) 
    .skip(startIndex) 
    .limit(limit); 

for (let comment of comments) {
    if (comment.user) {
        const profile = await Profile.findOne({ user: comment.user._id }).select('username');
        if (profile) {
          console.log('profile',profile);

            comment.user.username = profile.username;
        }
    }
}

res.json({ comments, totalComments }); 



  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const comment = await Comment.findById(commentId).populate('user', 'firstName lastName profilePicture');
    
    if (!comment) {
      return res.status(404).json({ message: 'Commentaire non trouvé' });
    }

    res.status(200).json(comment);
  } catch (error) {
    console.error('Une erreur s\'est produite lors de la récupération du commentaire :', error);
    res.status(500).json({ message: 'Une erreur s\'est produite lors de la récupération du commentaire' });
  }
});



router.put('/:id/report', verifyToken, async (req, res) => {
  try {
    const Id = req.params.id;
    const userId = req.user._id;
    const { reason } = req.body;


    if (!reason) {
      return res.status(400).json({ error: 'La raison du signalement est requise' });
    }

    const commentaire = await Comment.findById(Id);
    if (!commentaire) {
      return res.status(404).json({ error: 'Commenatire non trouvée' });
    }


    const hasReported = commentaire.reported.some(report => report.user.toString() === userId.toString() && report.status === 'N');
    if (hasReported) {
      return res.status(400).json({ error: 'Vous avez déjà signalé cette activité' });
    }
    const newReport = {
      user: userId,
      date: new Date(),
      status: 'N',
      reason
    };

    commentaire.reported.push(newReport);
    await commentaire.save();

    res.json({ message: 'Signalement ajouté avec succès', commentaire });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du signalement:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du signalement' });
  }
});


module.exports = router;
