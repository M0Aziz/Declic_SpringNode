const express = require('express');
const router = express.Router();
const Activity = require('../../models/Activity');
const Comment = require('../../models/Comment');

const verifyToken = require('../../middleware/authMiddleware');
const Message = require('../../models/Message');


/*router.get('/', verifyToken, async (req, res) => {
    try {
        const { sort, filter } = req.query;
        const range = req.query.range ? JSON.parse(decodeURIComponent(req.query.range)) : null;
        const perPage = range ? (range[1] - range[0] + 1) : 10;
        const page = range ? (range[0] / perPage) + 1 : 1;

        let sortField, sortOrder;
        if (sort) {
            const [field, order] = JSON.parse(decodeURIComponent(sort));
            sortField = field;
            sortOrder = order === 'ASC' ? 1 : -1;
        } else {
            sortField = 'dateStart';
            sortOrder = 1;
        }

        const searchOptions = {};
        if (filter) {
            const decodedFilter = JSON.parse(decodeURIComponent(filter));
            if (decodedFilter.name) {
                searchOptions.name = { $regex: new RegExp(decodedFilter.name, 'i') };
            }
        }

        const pageSize = parseInt(perPage || 10);
        const pageActuelle = parseInt(page || 1);
        const startIndex = (pageActuelle - 1) * pageSize;
        const endIndex = page * pageSize;

        const activities = await Activity.find({ 'reported': { $exists: true, $not: { $size: 0 } } })
            .populate('organizer', 'firstName lastName')
            .populate('reported.user', 'firstName lastName')
            .sort({ 'reported.date': -1 })
            .skip(startIndex)
            .limit(pageSize);

        activities.forEach(activity => {
            if (activity.image) {
                activity.image = `http://localhost:5000/images/${activity.image}`;
            }
        });

        const totalCount = await Activity.countDocuments({ 'reported': { $exists: true, $not: { $size: 0 } } });

        res.set('Content-Range', `items ${startIndex}-${endIndex}/${totalCount}`);
        res.json(activities.map(activity => ({
            id: activity._id.toString(),
            ...activity._doc
        })));
    } catch (error) {
        console.error('Erreur lors de la récupération des activités signalées :', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des activités signalées' });
    }
});*/

/*router.get('/', verifyToken, async (req, res) => {
    try {
        const { sort, filter } = req.query;
        const range = req.query.range ? JSON.parse(decodeURIComponent(req.query.range)) : null;
        const perPage = range ? (range[1] - range[0] + 1) : 10;
        const page = range ? (range[0] / perPage) + 1 : 1;

        let sortField, sortOrder;
        if (sort) {
            const [field, order] = JSON.parse(decodeURIComponent(sort));
            sortField = field;
            sortOrder = order === 'ASC' ? 1 : -1;
        } else {
            sortField = 'dateStart';
            sortOrder = 1;
        }

        const searchOptions = {};
        if (filter) {
            const decodedFilter = JSON.parse(decodeURIComponent(filter));
            if (decodedFilter.name) {
                searchOptions.name = { $regex: new RegExp(decodedFilter.name, 'i') };
            }
        }

        const pageSize = parseInt(perPage || 10);
        const pageActuelle = parseInt(page || 1);
        const startIndex = (pageActuelle - 1) * pageSize;
        const endIndex = page * pageSize;

        const aggregationPipeline = [
            { $match: { 'reported': { $exists: true, $not: { $size: 0 } } } },
            { $unwind: '$reported' },
            { $sort: { 'reported.date': -1 } },
            {
                $group: {
                    _id: '$_id',
                    activity: { $first: '$$ROOT' },
                    reportedCount: { $sum: 1 }
                }
            },
            { $skip: startIndex },
            { $limit: pageSize },
            { $sort: { 'activity.dateStart': sortOrder } }
        ];

        const activities = await Activity.aggregate(aggregationPipeline)
            .lookup({ from: 'users', localField: 'activity.organizer', foreignField: '_id', as: 'organizer' })
            .lookup({ from: 'users', localField: 'activity.reported.user', foreignField: '_id', as: 'reported.user' })
            .exec();

        const totalCount = await Activity.countDocuments({ 'reported': { $exists: true, $not: { $size: 0 } } });

        res.set('Content-Range', `items ${startIndex}-${endIndex}/${totalCount}`);
        res.json(activities.map(result => ({
            id: result.activity._id.toString(),
            ...result.activity._doc,
            reportedCount: result.reportedCount
        })));
    } catch (error) {
        console.error('Erreur lors de la récupération des activités signalées :', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des activités signalées' });
    }
});*/

router.get('/', verifyToken, async (req, res) => {
    try {
        const { sort, filter } = req.query;
        const range = req.query.range ? JSON.parse(decodeURIComponent(req.query.range)) : null;
        const perPage = range ? (range[1] - range[0] + 1) : 10;
        const page = range ? (range[0] / perPage) + 1 : 1;

        let sortField, sortOrder;
        if (sort) {
            const [field, order] = JSON.parse(decodeURIComponent(sort));
            sortField = field;
            sortOrder = order === 'ASC' ? 1 : -1;
        } else {
            sortField = 'reported.date'; // Default sort by report date
            sortOrder = -1;
        }

        const searchOptions = {};
        if (filter) {
            const decodedFilter = JSON.parse(decodeURIComponent(filter));
            if (decodedFilter.name) {
                searchOptions.name = { $regex: new RegExp(decodedFilter.name, 'i') };
            }
        }

        const pageSize = parseInt(perPage || 10);
        const pageActuelle = parseInt(page || 1);
        const startIndex = (pageActuelle - 1) * pageSize;
        const endIndex = page * pageSize;

        const aggregationPipeline = [
            { $match: { 'reported': { $exists: true, $not: { $size: 0 } } } },
            { $unwind: '$reported' },
            { $sort: { 'reported.date': sortOrder } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'reported.user',
                    foreignField: '_id',
                    as: 'reported.userDetails'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'organizer',
                    foreignField: '_id',
                    as: 'organizerDetails'
                }
            },
            { $skip: startIndex },
            { $limit: pageSize },
            {
                $project: {
                    id: '$reported._id',
                    name: 1,
                    organizer: { $arrayElemAt: ['$organizerDetails', 0] },
                    dateStart: 1,
                    dateEnd: 1,
                    city: 1,
                    description: 1,
                    reported: {
                        user: { $arrayElemAt: ['$reported.userDetails', 0] },
                        date: '$reported.date',
                        status: '$reported.status',
                        reason: '$reported.reason',
                        activity: '$reported.activity',
                    }
                }
            }
        ];

        const activities = await Activity.aggregate(aggregationPipeline);

        activities.forEach(activity => {
            if (activity.image) {
                activity.image = `http://localhost:5000/images/${activity.image}`;
            }
        });

        const totalCount = await Activity.countDocuments({ 'reported': { $exists: true, $not: { $size: 0 } } });

        res.set('Content-Range', `items ${startIndex}-${endIndex}/${totalCount}`);
        res.json(activities);
    } catch (error) {
        console.error('Erreur lors de la récupération des activités signalées :', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des activités signalées' });
    }
});



router.get('/Message', verifyToken, async (req, res) => {
    try {
        const { sort, filter } = req.query;
        const range = req.query.range ? JSON.parse(decodeURIComponent(req.query.range)) : null;
        const perPage = range ? (range[1] - range[0] + 1) : 10;
        const page = range ? (range[0] / perPage) + 1 : 1;

        let sortField, sortOrder;
        if (sort) {
            const [field, order] = JSON.parse(decodeURIComponent(sort));
            sortField = field;
            sortOrder = order === 'ASC' ? 1 : -1;
        } else {
            sortField = 'reported.date'; // Default sort by report date
            sortOrder = -1;
        }

        const searchOptions = {};
        if (filter) {
            const decodedFilter = JSON.parse(decodeURIComponent(filter));
            if (decodedFilter.name) {
                searchOptions.name = { $regex: new RegExp(decodedFilter.name, 'i') };
            }
        }

        const pageSize = parseInt(perPage || 10);
        const pageActuelle = parseInt(page || 1);
        const startIndex = (pageActuelle - 1) * pageSize;
        const endIndex = page * pageSize;
      /*  const aggregationPipeline = [
            { $match: { ...searchOptions, 'reported': { $exists: true, $not: { $size: 0 } } } },
            { $unwind: '$reported' },
            { $sort: { [sortField]: sortOrder } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'reported.user',
                    foreignField: '_id',
                    as: 'reported.userDetails'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'sender',
                    foreignField: '_id',
                    as: 'senderDetails'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'recipient',
                    foreignField: '_id',
                    as: 'recipientDetails'
                }
            },
            { $skip: startIndex },
            { $limit: pageSize },
            {
                $project: {
                    reported: {
                        _id: '$reported._id',
                        user: { $arrayElemAt: ['$reported.userDetails', 0] },
                        date: '$reported.date',
                        status: '$reported.status',
                        reason: '$reported.reason'
                    },
                    message: {
                        id: '$_id',
                        content: '$content',
                        date: '$date',
                        sender: { $arrayElemAt: ['$senderDetails', 0] },
                        recipient: { $arrayElemAt: ['$recipientDetails', 0] }
                    }
                }
            },
            { $match: { 'reported.user': { $ne: null } } } // Filtrer les signalements avec un utilisateur associé
        ];


        const reportedMessages = await Message.aggregate(aggregationPipeline);
        const totalCount = await Message.countDocuments({ 'reported': { $exists: true, $not: { $size: 0 } } });

        res.set('Content-Range', `items ${startIndex}-${endIndex}/${totalCount}`);
        res.json(reportedMessages);*/



          // Fetch messages with non-empty reported array
          const messages = await Message.find({
            ...searchOptions,
            'reported.0': { $exists: true } // Check if there's at least one reported entry
        })
        .populate('reported.user', 'firstName lastName email')
        .populate('sender', 'firstName lastName email')
        .populate('recipient', 'firstName lastName email')
        .sort({ [sortField]: sortOrder })
        .skip(startIndex)
        .limit(pageSize);

        // Transform the messages to the required format
       /* const reportedMessages = messages.flatMap(message => 
            message.reported.map(report => ({
                id : report._id,
                reported: {
                    _id: report._id,
                    user: report.user,
                    date: report.date,
                    status: report.status,
                    reason: report.reason
                },
                message: {
                    id: message._id,
                    content: message.content,
                    date: message.date,
                    sender: message.sender,
                    recipient: message.recipient
                }
            }))
        );*/

         // Transform the messages to the required format
         const reportedMessages = messages.flatMap(message => 
            message.reported.map(report => {
                let userReported = report.user;
                let userConcentred = null;
                if (String(report.user._id) === String(message.sender._id)) {
                    userConcentred = message.recipient;
                } else if (String(report.user._id) === String(message.recipient._id)) {
                    userConcentred = message.sender;
                }
                return {
                    id: report._id,
                    reported: {
                        _id: report._id,
                        user: userReported,
                        date: report.date,
                        status: report.status,
                        reason: report.reason
                    },
                    message: {
                        id: message._id,
                        content: message.content,
                        date: message.date,
                        userReported: userReported,
                        userConcentred: userConcentred
                    }
                };
            })
        );
        const totalCount = await Message.countDocuments({ 'reported.0': { $exists: true } });

        res.set('Content-Range', `items ${startIndex}-${endIndex}/${totalCount}`);
        res.json(reportedMessages);
    } catch (error) {
        console.error('Erreur lors de la récupération des messages signalés :', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des messages signalés' });
    }
});




router.get('/Comment', verifyToken, async (req, res) => {
    try {
        const { sort, filter } = req.query;
        const range = req.query.range ? JSON.parse(decodeURIComponent(req.query.range)) : null;
        const perPage = range ? (range[1] - range[0] + 1) : 10;
        const page = range ? (range[0] / perPage) + 1 : 1;

        let sortField, sortOrder;
        if (sort) {
            const [field, order] = JSON.parse(decodeURIComponent(sort));
            sortField = `reported.${field}`;
            sortOrder = order === 'ASC' ? 1 : -1;
        } else {
            sortField = 'reported.date'; // Default sort by report date
            sortOrder = -1;
        }

        const searchOptions = {};
        if (filter) {
            const decodedFilter = JSON.parse(decodeURIComponent(filter));
            if (decodedFilter.content) {
                searchOptions.content = { $regex: new RegExp(decodedFilter.content, 'i') };
            }
        }

        const pageSize = parseInt(perPage || 10);
        const pageActuelle = parseInt(page || 1);
        const startIndex = (pageActuelle - 1) * pageSize;
        const endIndex = page * pageSize;

        // Fetch comments with non-empty reported array
        const comments = await Comment.find({
            ...searchOptions,
            'reported.0': { $exists: true } // Check if there's at least one reported entry
        })
        .populate('reported.user', 'firstName lastName email')
        .populate('user', 'firstName lastName email')
        .populate('activity', 'name')
        .sort({ [sortField]: sortOrder })
        .skip(startIndex)
        .limit(pageSize);

        // Transform the comments to the required format
        const reportedComments = comments.flatMap(comment => 
            comment.reported.map(report => {
                return {
                    id: report._id,
                    reported: {
                        _id: report._id,
                        user: report.user,
                        date: report.date,
                        status: report.status,
                        reason: report.reason
                    },
                    comment: {
                        id: comment._id,
                        content: comment.content,
                        date: comment.date,
                        user: comment.user,
                        activity: {
                            id: comment.activity._id,
                            name: comment.activity.name
                        }
                    }
                };
            })
        );

        const totalCount = await Comment.countDocuments({ 'reported.0': { $exists: true } });

        res.set('Content-Range', `items ${startIndex}-${endIndex}/${totalCount}`);
        res.json(reportedComments);
    } catch (error) {
        console.error('Erreur lors de la récupération des commentaires signalés :', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des commentaires signalés' });
    }
});


/*router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body.reported;

        const activity = await Activity.findOne({ 'reported._id': id });
        if (!activity) {
            return res.status(404).json({ error: 'Activité non trouvée' });
        }

        const reportedIndex = activity.reported.findIndex(report => report._id.toString() === id);
        if (reportedIndex === -1) {
            return res.status(404).json({ error: 'Signalement non trouvé' });
        }

        activity.reported[reportedIndex].status = status;
        await activity.save();

        res.json({ message: 'Statut du signalement mis à jour avec succès' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du signalement :', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du signalement' });
    }
});*/


router.put('/:id', verifyToken, async (req, res) => {
    try {
        console.log(req.body);
        const { id } = req.params;
        const { status } = req.body;

        if (status !== 'O' && status !== 'N') {
            return res.status(400).json({ error: 'Le statut doit être "O" ou "N"' });
        }

        const activity = await Activity.findOne({ 'reported._id': id });
        if (!activity) {
            return res.status(404).json({ error: 'Activité non trouvée' });
        }

        const reportedIndex = activity.reported.findIndex(report => report._id.toString() === id);
        if (reportedIndex === -1) {
            return res.status(404).json({ error: 'Signalement non trouvé' });
        }

        if (activity.reported[reportedIndex].status === status) {
            return res.json({ message: 'Le statut du signalement est déjà à jour', reported: {
                id: activity.reported[reportedIndex]._id.toString(),
                ...activity.reported[reportedIndex].toObject()
            } });
        }

        activity.reported[reportedIndex].status = status;
        await activity.save();

        const formattedReport = {
            id: activity.reported[reportedIndex]._id.toString(),
            ...activity.reported[reportedIndex].toObject()
        };

        res.json({ message: 'Statut du signalement mis à jour avec succès', reported: formattedReport });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du signalement :', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du signalement' });
    }
});




router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Recherche de l'activité qui contient le signalement
        const activity = await Activity.findOne({ 'reported._id': id })
            .populate('organizer', 'firstName lastName')
            .populate('reported.user', 'firstName lastName');
        
        if (!activity) {
            return res.status(404).json({ error: 'Signalement non trouvé' });
        }

        // Trouver le signalement spécifique
        const report = activity.reported.id(id);
        if (!report) {
            return res.status(404).json({ error: 'Signalement non trouvé' });
        }

        // Formater la réponse avec `id` au lieu de `_id`
        const formattedReport = {
            id: report._id.toString(),
            ...report.toObject(),
            user: report.user ? {
                id: report.user._id.toString(),
                ...report.user.toObject()
            } : null,
            activity: {
                id: activity._id.toString(),
                name: activity.name,
                dateStart: activity.dateStart,
                dateEnd: activity.dateEnd,
                city: activity.city,
                description: activity.description,
                organizer: activity.organizer ? {
                    id: activity.organizer._id.toString(),
                    firstName: activity.organizer.firstName,
                    lastName: activity.organizer.lastName
                } : null
            }
        };

        res.json(formattedReport);
    } catch (error) {
        console.error('Erreur lors de la récupération du signalement :', error);
        res.status(500).json({ error: 'Erreur lors de la récupération du signalement' });
    }
});




module.exports = router;