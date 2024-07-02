const express = require('express');
const router = express.Router();
const Newsletter = require('../../models/Newsletter');
const verifyToken = require('../../middleware/authMiddleware');
const nodemailer = require('nodemailer');

// GET all newsletter entries
router.get('/', verifyToken, async (req, res) => {
    try {


        const { sort  } = req.query;
        const { perPage } = req.query;
        
        // Extraire les champs de tri et la direction
        let sortField, sortOrder;
        if (sort) {
            const [field, order] = JSON.parse(sort);
            sortField = field;
            sortOrder = order === 'DESC' ? 1 : -1;
        } else {
            // Définir un tri par défaut si aucun paramètre de tri n'est fourni
            sortField = 'date';
            sortOrder = 1; // Tri ascendant par défaut
        }
        
        
        const totalCount = await Newsletter.countDocuments();
        
        const defaultPageSize = 10;
        const pageSize = perPage ? parseInt(perPage) : defaultPageSize;
        
        const page = parseInt(req.query.page || 1); // Page actuelle
        const startIndex = (page - 1) * pageSize; // Index de début
        const endIndex = Math.min(startIndex + pageSize, totalCount); // Index de fin, en tenant compte du nombre total d'utilisateurs
        
        const newsletters = await Newsletter.find() // Appliquer le filtre de recherche
            .sort({ [sortField]: sortOrder }) // Appliquer le tri
            .skip(startIndex)
            .limit(pageSize);
               

      

        res.set('Content-Range', `newsletters ${startIndex}-${endIndex}/${totalCount}`);
        res.json(newsletters.map(newsletter => ({ id: newsletter._id.toString(), ...newsletter._doc })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/:id', verifyToken, async (req, res) => {
    try {
        const newsletter = await Newsletter.findById(req.params.id);
        if (!newsletter) return res.status(404).json({ message: 'Newsletter entry not found' });
        res.json({ id: newsletter._id.toString(), ...newsletter._doc });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});





router.post('/send-emails', verifyToken, async (req, res) => {
    const { message } = req.body;


       if (!message || message.trim().length < 5) {
        console.error('Invalid message:', message); // Debugging: check invalid message
        return res.status(400).send('Le message doit contenir au moins 5 caractères.');
    }
    try {
        const newsletters = await Newsletter.find({}, 'email');

        if (!newsletters || newsletters.length === 0) {
            return res.status(404).send('No newsletters found');
        }

        const emails = newsletters.map(newsletter => newsletter.email);

    
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

        const mailPromises = emails.map(email => {
            const mailOptions = {
                from: 'spprtgemi@gmail.com',
                to: email,
                subject: 'Réponse à la newsletter',
                html: `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <img src="${logoUrl}" alt="Logo" style="width: 100px; height: auto;" />
                        </div>
                        <h2 style="text-align: center; color: #4CAF50;">Réponse à la newsletter</h2>
                        <p>${message}</p>
                        <p style=" margin-top: 20px;">Si vous avez des questions supplémentaires ou des préoccupations, n'hésitez pas à nous contacter à cette adresse email.</p>
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
                        <div style="text-align: center;">
                            <p>Vous recevez ce message parce que vous avez contacté Équipe Déclic. Si vous pensez que c'est une erreur, veuillez nous en informer immédiatement.</p>
                            <p>&copy; ${new Date().getFullYear()} Équipe Déclic. Tous droits réservés.</p>
                        </div>
                    </div>
                `
            };

            return transporter.sendMail(mailOptions);
        });

        await Promise.all(mailPromises);

        console.log('Emails envoyés avec succès'); 
        res.status(200).send('Emails envoyés avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'envoi des e-mails :', error); 
        res.status(500).send('Erreur lors de l\'envoi des e-mails');
    }
});

module.exports = router;
