/**
 * Photo Upload Service
 *
 * Strategy:
 * 1. If CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are set → upload to Cloudinary
 * 2. Otherwise → save to disk at public/uploads/ and return a local URL
 *
 * Both paths return { url, publicId } so the controller is cloud-agnostic.
 */

const path = require('path');
const fs   = require('fs');
const crypto = require('crypto');

const UPLOADS_DIR = path.resolve(__dirname, '../../public/uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─── Cloudinary (optional) ────────────────────────────────────────────────────
let cloudinary = null;
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  try {
    cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    console.log('☁️  Cloudinary configured — photos will be uploaded to Cloudinary');
  } catch {
    console.warn('⚠️  cloudinary package not found — falling back to local disk storage');
    cloudinary = null;
  }
} else {
  console.log('📁 Cloudinary not configured — photos will be saved to local disk (public/uploads/)');
}

// ─── Upload to Cloudinary ─────────────────────────────────────────────────────
const uploadToCloudinary = (buffer, mimetype) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'moveinsync/visitors',
        resource_type: 'image',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto:good', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

// ─── Save to local disk ───────────────────────────────────────────────────────
const saveLocally = (buffer, mimetype) => {
  const ext      = mimetype.split('/')[1] || 'jpg';
  const filename = `visitor_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);

  fs.writeFileSync(filepath, buffer);

  // Return a server-relative URL (served as static files by Express)
  const url = `/uploads/${filename}`;
  return { url, publicId: filename };
};

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Upload a photo buffer to the appropriate backend.
 *
 * @param {Buffer} buffer - Raw image buffer from multer
 * @param {string} mimetype - MIME type (e.g. 'image/jpeg')
 * @returns {Promise<{ url: string, publicId: string }>}
 */
const uploadPhoto = async (buffer, mimetype) => {
  if (cloudinary) {
    return uploadToCloudinary(buffer, mimetype);
  }
  return saveLocally(buffer, mimetype);
};

/**
 * Delete a photo from the appropriate backend.
 * For Cloudinary: uses public_id.
 * For local: deletes the file.
 *
 * @param {string} publicId
 */
const deletePhoto = async (publicId) => {
  if (!publicId) return;
  try {
    if (cloudinary) {
      await cloudinary.uploader.destroy(publicId);
    } else {
      const filepath = path.join(UPLOADS_DIR, publicId);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }
  } catch (e) {
    console.warn('Photo delete failed (non-fatal):', e.message);
  }
};

module.exports = { uploadPhoto, deletePhoto };
