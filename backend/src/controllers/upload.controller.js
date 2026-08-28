import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';

/**
 * POST /api/upload
 * Accepts a single file field named "image" (multipart/form-data).
 * Streams the buffer from Multer memory storage to Cloudinary and returns the URL.
 */
export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const folder = req.query.folder || 'mern-chat';

    const streamUpload = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
            transformation: [{ width: 800, crop: 'limit', quality: 'auto:good' }],
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

    const result = await streamUpload();

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (err) {
    next(err);
  }
};
