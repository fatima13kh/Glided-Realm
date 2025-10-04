const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = 'events';
    if (file.fieldname === 'backgroundImage') folder = 'event-backgrounds';
    if (file.fieldname === 'ticketImage') folder = 'event-tickets';

    return {
      folder,
      allowed_formats: ['jpg', 'png', 'jpeg'],
      public_id: file.originalname.split('.')[0],
    };
  },
});

const upload = multer({ storage });

module.exports = { upload };
