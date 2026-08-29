import cloudinary from '../config/cloudinary.js';
import Message from '../models/message.model.js';

// ─── Image Auto-Cleanup Job ───────────────────────────────────────────────────
//
// Runs once on startup then every 24 hours.
// Finds every message with an imageUrl older than IMAGE_TTL_DAYS, deletes the
// asset from Cloudinary, then clears the imageUrl on the DB record so the job
// is fully idempotent (re-running never tries to delete an already-gone asset).
//
// Cloudinary public_id is extracted from the secure URL:
//   https://res.cloudinary.com/<cloud>/image/upload/v<ver>/<folder>/<file>.<ext>
//   → public_id = "<folder>/<file>"  (no version prefix, no extension)

const IMAGE_TTL_DAYS = 10;
const INTERVAL_MS    = 24 * 60 * 60 * 1000; // 24 hours
const ts             = () => new Date().toISOString();

/**
 * Extract Cloudinary public_id from a secure_url.
 * Returns null if the URL doesn't match the expected Cloudinary format.
 */
function extractPublicId(url) {
  if (!url) return null;
  try {
    // Pattern: .../upload/v<digits>/<rest>.<ext>  OR  .../upload/<rest>.<ext>
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]{2,5}$/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Run one cleanup pass: find old image messages, delete from Cloudinary, clear DB field.
 */
async function runCleanup() {
  const cutoff = new Date(Date.now() - IMAGE_TTL_DAYS * 24 * 60 * 60 * 1000);
  console.log(`[${ts()}] 🧹 imageCleanup: scanning for images older than ${cutoff.toDateString()} ...`);

  let deleted = 0;
  let failed  = 0;

  try {
    // Only fetch messages that still have an imageUrl (already-cleaned ones have '').
    const messages = await Message.find({
      imageUrl: { $nin: ['', null] },
      createdAt: { $lt: cutoff },
    }).select('_id imageUrl');

    if (messages.length === 0) {
      console.log(`[${ts()}] 🧹 imageCleanup: nothing to clean up.`);
      return;
    }

    console.log(`[${ts()}] 🧹 imageCleanup: found ${messages.length} image(s) to delete.`);

    for (const msg of messages) {
      const publicId = extractPublicId(msg.imageUrl);
      if (!publicId) {
        // URL format we don't recognise — clear the field anyway to avoid re-processing.
        console.warn(`[${ts()}] ⚠️  Could not extract public_id from: ${msg.imageUrl}`);
        await Message.updateOne({ _id: msg._id }, { $set: { imageUrl: '' } });
        continue;
      }

      try {
        const result = await cloudinary.uploader.destroy(publicId);
        if (result.result === 'ok' || result.result === 'not found') {
          // 'not found' = already deleted externally — still treat as success.
          await Message.updateOne({ _id: msg._id }, { $set: { imageUrl: '' } });
          deleted++;
          console.log(`[${ts()}] 🗑️  Deleted image  publicId=${publicId}  messageId=${msg._id}`);
        } else {
          console.warn(`[${ts()}] ⚠️  Cloudinary returned unexpected result for ${publicId}:`, result);
          failed++;
        }
      } catch (err) {
        console.error(`[${ts()}] ❌ Failed to delete ${publicId}:`, err.message);
        failed++;
      }
    }

    console.log(`[${ts()}] ✅ imageCleanup done — deleted: ${deleted}  failed: ${failed}`);
  } catch (err) {
    console.error(`[${ts()}] ❌ imageCleanup query failed:`, err.message);
  }
}

/**
 * Start the cleanup scheduler.
 * Called once from index.js after the DB connection is established.
 */
export function startImageCleanupJob() {
  console.log(`[${ts()}] 🕐 imageCleanup: scheduled — TTL ${IMAGE_TTL_DAYS} days, interval 24 h`);

  // Run immediately on startup (catches any backlog from before this job existed).
  runCleanup();

  // Then repeat every 24 hours.
  setInterval(runCleanup, INTERVAL_MS);
}
