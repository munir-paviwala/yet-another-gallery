const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/**
 * Optimizes an image file by converting it to WebP.
 * Deletes the original file if conversion succeeds.
 * @param {string} relativePath - Relative path from ROOT (e.g., 'images/photo.png')
 * @returns {Promise<string>} - The new relative path of the WebP image (e.g., 'images/photo.webp')
 */
async function convertToWebP(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const ext = path.extname(fullPath).toLowerCase();
  if (ext === '.webp') {
    return relativePath; // Already webp
  }

  const dir = path.dirname(fullPath);
  const baseName = path.basename(fullPath, ext);
  
  // Clean filename: replace spaces/special characters with hyphens to make it URL-safe
  const cleanBaseName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
    
  const newFileName = `${cleanBaseName || 'image'}.webp`;
  const newFullPath = path.join(dir, newFileName);
  const newRelPath = path.relative(ROOT, newFullPath).split(path.sep).join('/');

  // If the target webp filename already exists, append a suffix to prevent overwriting
  let finalFullPath = newFullPath;
  let finalRelPath = newRelPath;
  let counter = 1;
  while (fs.existsSync(finalFullPath) && finalFullPath !== fullPath) {
    const uniqueFileName = `${cleanBaseName || 'image'}-${counter}.webp`;
    finalFullPath = path.join(dir, uniqueFileName);
    finalRelPath = path.relative(ROOT, finalFullPath).split(path.sep).join('/');
    counter++;
  }

  console.log(`[optimizer] Converting: ${relativePath} -> ${finalRelPath}`);

  // Convert to WebP using sharp
  // quality: 85 offers a great balance of size and visual fidelity
  // rotate() auto-rotates based on EXIF orientation metadata
  await sharp(fullPath)
    .rotate()
    .webp({ quality: 85 })
    .toFile(finalFullPath);

  // Delete original file if it is not the same as final webp (e.g., if it was PNG/JPG)
  if (fullPath !== finalFullPath) {
    try {
      fs.unlinkSync(fullPath);
    } catch (err) {
      console.error(`[optimizer] Failed to delete original file ${fullPath}:`, err);
    }
  }

  return finalRelPath;
}

module.exports = {
  convertToWebP
};
