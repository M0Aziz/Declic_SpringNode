const express = require('express');
const router = express.Router();
const Contact = require('../../models/Contact');
const verifyToken = require('../../middleware/authMiddleware');
const nodemailer = require('nodemailer');
// GET all contacts
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


const totalCount = await Contact.countDocuments();

const defaultPageSize = 10;
const pageSize = perPage ? parseInt(perPage) : defaultPageSize;

const page = parseInt(req.query.page || 1); // Page actuelle
const startIndex = (page - 1) * pageSize; // Index de début
const endIndex = Math.min(startIndex + pageSize, totalCount); // Index de fin, en tenant compte du nombre total d'utilisateurs

const contacts = await Contact.find() // Appliquer le filtre de recherche
    .sort({ [sortField]: sortOrder }) // Appliquer le tri
    .skip(startIndex)
    .limit(pageSize);
       



        res.set('Content-Range', `contacts ${startIndex}-${endIndex}/${totalCount}`);
        res.json(contacts.map(contact => ({ id: contact._id.toString(), ...contact._doc })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/:id', verifyToken, async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);
        if (!contact) return res.status(404).json({ message: 'Contact not found' });
        res.json({ id: contact._id.toString(), ...contact._doc });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



router.post('/send-email/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;

    console.log('Received email request for ID:', id); 
    console.log('Message:', message); 


    if (!message || message.trim().length < 5) {
        console.error('Invalid message:', message); 
        return res.status(400).send('Le message doit contenir au moins 5 caractères.');
    }

    try {
        const contact = await Contact.findById(id);
        if (!contact) {
            console.error('Contact not found'); 
            return res.status(404).send('Contact not found');
        }

        const { email, firstName, lastName, subject } = contact;
        console.log('Contact details:', { email, firstName, lastName, subject }); 

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
            subject: `Response to ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="${logoUrl}" alt="Logo" style="width: 100px; height: auto;" />
                    </div>
                    <h2 style="text-align: center; color: #4CAF50;">Response to ${subject}</h2>
                    <p>Bonjour ${firstName} ${lastName},</p>
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

        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully'); 
        res.status(200).send('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error); 
        res.status(500).send('Error sending email');
    }
});

module.exports = router;
