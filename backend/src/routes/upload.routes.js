import { Router } from 'express';
import multer, { memoryStorage, MulterError } from 'multer';
import { uploadImage } from '../controllers/upload.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

// Use memory storage — buffer piped to Cloudinary in the controller
const upload = multer({
  storage: memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

const router = Router();

// Wrap upload in a custom callback so MulterError gets a clean JSON response
router.post(
  '/',
  authMiddleware,
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err instanceof MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ message: 'File too large — maximum size is 20 MB' });
        }
        return res.status(400).json({ message: err.message });
      }
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  uploadImage
);

export default router;
