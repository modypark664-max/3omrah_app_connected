const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

// Dynamic storage params to allow both images and videos
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype && file.mimetype.startsWith('video/');
    const rawBaseName = path.parse(file.originalname || '').name || file.fieldname || 'upload';
    const sanitizedBaseName = rawBaseName
      .trim()
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'upload';
    const publicId = `${Date.now()}-${sanitizedBaseName}`;
    return {
      folder: 'expertease_uploads',
      resource_type: isVideo ? 'video' : 'image',
      allowed_formats: isVideo
        ? ['mp4', 'webm', 'ogg', 'mov']
        : ['jpeg', 'png', 'jpg', 'webp', 'gif', 'svg'],
      public_id: publicId
    };
  }
});

module.exports = {
  cloudinary,
  storage
};