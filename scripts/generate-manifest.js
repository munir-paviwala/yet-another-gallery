#!/usr/bin/env node
/**
 * yet-another-gallery — generate-manifest.js
 *
 * Scans the images/ directory for image files not already listed in
 * gallery-data.json and appends stub entries. Also converts non-webp
 * images (PNG, JPG, JPEG) to optimized WebP.
 *
 * Usage:
 *   node scripts/generate-manifest.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { convertToWebP } = require('./image-optimizer');

// ── Config ────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'images');
const DATA_FILE = path.join(ROOT, 'gallery-data.json');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

function walkImages(dir, skipExtras = false) {
  const found = [];
  if (!fs.existsSync(dir)) return found;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue; // skip hidden
    
    // Skip extras subdirectory if requested (e.g. for scanning main items)
    if (skipExtras && entry.name === 'extras' && entry.isDirectory()) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walkImages(fullPath, skipExtras));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTENSIONS.has(ext)) {
        const rel = path.relative(ROOT, fullPath).split(path.sep).join('/');
        found.push(rel);
      }
    }
  }
  return found;
}

function makeId() {
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function nameFromFile(filePath) {
  return path.basename(filePath, path.extname(filePath))
    .replace(/[-_]+/g, ' ')
    .trim();
}

async function main() {
  // Ensure images/ directory exists
  if (!fs.existsSync(IMAGES_DIR)) {
    console.log('📁 Creating images/ directory...');
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  // Ensure images/extras/ directory exists
  const EXTRAS_DIR = path.join(IMAGES_DIR, 'extras');
  if (!fs.existsSync(EXTRAS_DIR)) {
    console.log('📁 Creating images/extras/ directory...');
    fs.mkdirSync(EXTRAS_DIR, { recursive: true });
  }

  // Load existing manifest
  let manifest = {
    meta: { title: 'yet another gallery', subtitle: 'a collection' },
    items: [],
    extras: []
  };

  if (fs.existsSync(DATA_FILE)) {
    try {
      manifest = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (err) {
      console.error('⚠️ Could not parse gallery-data.json:', err.message);
      process.exit(1);
    }
  }

  if (!manifest.items) manifest.items = [];
  if (!manifest.extras) manifest.extras = [];

  let saveRequired = false;

  console.log('🔍 Checking existing database items for conversion...');

  // 1. Migrate existing PNG/JPG images in items to WebP
  for (const item of manifest.items) {
    if (item.file) {
      const ext = path.extname(item.file).toLowerCase();
      if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        try {
          const newPath = await convertToWebP(item.file);
          if (newPath !== item.file) {
            item.file = newPath;
            saveRequired = true;
          }
        } catch (err) {
          console.error(`Failed to convert existing item ${item.file}:`, err);
        }
      }
    }
  }

  // 2. Migrate existing PNG/JPG images in extras to WebP
  for (const item of manifest.extras) {
    if (item.file) {
      const ext = path.extname(item.file).toLowerCase();
      if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        try {
          const newPath = await convertToWebP(item.file);
          if (newPath !== item.file) {
            item.file = newPath;
            saveRequired = true;
          }
        } catch (err) {
          console.error(`Failed to convert existing extra ${item.file}:`, err);
        }
      }
    }
  }

  // 3. Scan for new main images
  const registeredItems = new Set(manifest.items.filter(i => typeof i.file === 'string').map(i => i.file));
  const allFiles = walkImages(IMAGES_DIR, true);
  const newFiles = allFiles.filter(f => !registeredItems.has(f));

  const newStubs = [];
  if (newFiles.length > 0) {
    console.log(`📸 Found ${newFiles.length} new main image files. Processing...`);
    for (const file of newFiles) {
      try {
        const ext = path.extname(file).toLowerCase();
        let finalFile = file;
        if (['.png', '.jpg', '.jpeg'].includes(ext)) {
          finalFile = await convertToWebP(file);
        }
        const finalExt = path.extname(finalFile).toLowerCase();
        const stub = {
          id: makeId(),
          type: finalExt === '.gif' ? 'gif' : 'image',
          file: finalFile,
          title: nameFromFile(finalFile),
          caption: '',
          date: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
          size: 'full'
        };
        manifest.items.push(stub);
        newStubs.push(stub);
        saveRequired = true;
      } catch (err) {
        console.error(`Failed to process new file ${file}:`, err);
      }
    }
  }

  // 4. Scan for new extras images
  const registeredExtras = new Set(manifest.extras.filter(i => typeof i.file === 'string').map(i => i.file));
  const allExtrasFiles = walkImages(EXTRAS_DIR, false);
  const newExtrasFiles = allExtrasFiles.filter(f => !registeredExtras.has(f));

  const newExtrasStubs = [];
  if (newExtrasFiles.length > 0) {
    console.log(`🖼️ Found ${newExtrasFiles.length} new extra image files. Processing...`);
    for (const file of newExtrasFiles) {
      try {
        const ext = path.extname(file).toLowerCase();
        let finalFile = file;
        if (['.png', '.jpg', '.jpeg'].includes(ext)) {
          finalFile = await convertToWebP(file);
        }
        const finalExt = path.extname(finalFile).toLowerCase();
        const stub = {
          id: makeId(),
          type: finalExt === '.gif' ? 'gif' : 'image',
          file: finalFile,
          title: nameFromFile(finalFile),
          caption: '',
          date: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 }
        };
        manifest.extras.push(stub);
        newExtrasStubs.push(stub);
        saveRequired = true;
      } catch (err) {
        console.error(`Failed to process new extra file ${file}:`, err);
      }
    }
  }

  if (saveRequired) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
    console.log(`\n💾 Saved changes to gallery-data.json`);
  }

  if (newStubs.length === 0 && newExtrasStubs.length === 0) {
    console.log('✅ Manifest is already fully up to date and all images are optimized.');
  } else {
    console.log('\n======================================================');
    if (newStubs.length > 0) {
      console.log(`✨ Added ${newStubs.length} new main items:`);
      newStubs.forEach(s => console.log(`  + ${s.file}`));
    }
    if (newExtrasStubs.length > 0) {
      console.log(`✨ Added ${newExtrasStubs.length} new extra items:`);
      newExtrasStubs.forEach(s => console.log(`  + ${s.file}`));
    }
    console.log('======================================================\n');
  }
}

main().catch(err => {
  console.error('Fatal error running generate-manifest:', err);
  process.exit(1);
});
