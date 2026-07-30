const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

const router = express.Router();

// Configure Cloudinary (optional - works without config if env vars set)
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Multer: memory storage, max 2 files, 5MB each, image types only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, GIF, WebP images allowed'));
  }
});

// POST /api/upload - Public (complaint form image upload, max 2)
router.post('/', upload.array('images', 2), async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(503).json({ message: 'Image upload is not configured. Add Cloudinary credentials to server.' });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images provided' });
    }

    const uploadResults = await Promise.all(req.files.map(file =>
      new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'complaint-attachments' },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        Readable.from(file.buffer).pipe(uploadStream);
      })
    ));
    const urls = uploadResults.map(r => r.secure_url);

    res.json({ urls });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({
      message: err.message || 'Failed to upload images',
      error: err.message
    });
  }
});

module.exports = router;
