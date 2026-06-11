#!/usr/bin/env node
/**
 * yet-another-gallery — generate-manifest.js
 *
 * Scans the images/ directory for image files not already listed in
 * gallery-data.json and appends stub entries that you can fill in.
 *
 * Usage:
 *   node scripts/generate-manifest.js
 *
 * After running:
 *   1. Open gallery-data.json
 *   2. Scroll to the bottom — new stubs will be there
 *   3. Fill in title, caption, date, size for each
 *   4. Optionally insert text items or spacers between images
 *   5. git add . && git commit -m "add new images" && git push
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const ROOT      = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'images');
const DATA_FILE  = path.join(ROOT, 'gallery-data.json');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

// ── Load existing manifest ────────────────────────────────────────────────────

let manifest = {
  meta:  { title: 'yet another gallery', subtitle: 'a collection' },
  items: [],
};

if (fs.existsSync(DATA_FILE)) {
  try {
    manifest = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (err) {
    console.error('⚠️  Could not parse gallery-data.json:', err.message);
    console.error('    Fix the JSON syntax error and try again.');
    process.exit(1);
  }
}

// ── Collect already-registered image files ────────────────────────────────────

const registered = new Set(
  (manifest.items ?? [])
    .filter((item) => typeof item.file === 'string')
    .map((item) => item.file)
);

// ── Walk images/ directory ────────────────────────────────────────────────────

function walkImages(dir) {
  const found = [];
  if (!fs.existsSync(dir)) return found;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue; // skip hidden files

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      found.push(...walkImages(fullPath));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTENSIONS.has(ext)) {
        // Produce a path relative to the repo root, e.g. "images/demo/photo.jpg"
        const rel = path.relative(ROOT, fullPath).split(path.sep).join('/');
        found.push(rel);
      }
    }
  }
  return found;
}

// Ensure images/ directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  console.log('📁  Creating images/ directory...');
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

const allFiles = walkImages(IMAGES_DIR);

// ── Filter to new files only ──────────────────────────────────────────────────

const newFiles = allFiles.filter((f) => !registered.has(f));

if (newFiles.length === 0) {
  console.log('✅  No new images found. gallery-data.json is already up to date.');
  process.exit(0);
}

// ── Build stubs ───────────────────────────────────────────────────────────────

function makeId() {
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function nameFromFile(filePath) {
  return path.basename(filePath, path.extname(filePath))
    .replace(/[-_]+/g, ' ')
    .trim();
}

const stubs = newFiles.map((file) => {
  const ext = path.extname(file).toLowerCase();
  return {
    id:      makeId(),
    type:    ext === '.gif' ? 'gif' : 'image',
    file,
    title:   nameFromFile(file),   // ← edit this
    caption: '',                    // ← edit this
    date:    {},                    // ← e.g. { "year": 2024, "month": 7, "day": 3 }
    size:    'full',                // ← 'full' or 'framed'
  };
});

// ── Append to manifest and write ──────────────────────────────────────────────

if (!Array.isArray(manifest.items)) manifest.items = [];
manifest.items.push(...stubs);

fs.writeFileSync(DATA_FILE, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

// ── Report ────────────────────────────────────────────────────────────────────

console.log(`\n✅  Added ${stubs.length} new item${stubs.length !== 1 ? 's' : ''} to gallery-data.json:\n`);
newFiles.forEach((f) => console.log(`   + ${f}`));

console.log(`
📝  Next steps:
   1. Open gallery-data.json
   2. Scroll to the bottom — new items are there
   3. Fill in title, caption, and date for each
      date format: { "year": 2024, "month": 10, "day": 5 }
      (all fields optional — use as many or as few as you like)
   4. Change "size" to "framed" if you want a smaller framed look
   5. Optionally add text or spacer items between images:

      Text item:
      {
        "id": "note-001",
        "type": "text",
        "title": "a thought",
        "body": "write anything here. it can be long.",
        "date": { "year": 2024 }
      }

      Spacer item:
      { "id": "sp-001", "type": "spacer", "variant": "medium" }
      (variant: "small" | "medium" | "large" | "rule")

   6. git add . && git commit -m "add new images" && git push
`);
