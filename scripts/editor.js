const express = require('express');
const fs = require('fs');
const path = require('path');
const { convertToWebP } = require('./image-optimizer');

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'images');
const DATA_FILE = path.join(ROOT, 'gallery-data.json');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

app.use(express.json({ limit: '50mb' }));
app.use('/images', express.static(IMAGES_DIR));
app.use(express.static(path.join(ROOT, 'editor')));

function walkImages(dir, skipExtras = false) {
  const found = [];
  if (!fs.existsSync(dir)) return found;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    
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
  return path.basename(filePath, path.extname(filePath)).replace(/[-_]+/g, ' ').trim();
}

app.get('/api/data', async (req, res) => {
  let manifest = { meta: { title: 'yet another gallery', subtitle: 'a collection' }, items: [], extras: [] };
  if (fs.existsSync(DATA_FILE)) {
    try {
      manifest = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (err) {
      console.error('Error reading gallery-data.json:', err);
    }
  }

  if (!manifest.items) manifest.items = [];
  if (!manifest.extras) manifest.extras = [];

  let saveRequired = false;

  // 1. Auto-migrate existing PNG/JPG images in items and extras to WebP
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
          console.error(`Failed to auto-migrate active item ${item.file}:`, err);
        }
      }
    }
  }

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
          console.error(`Failed to auto-migrate extra item ${item.file}:`, err);
        }
      }
    }
  }

  // 2. Auto-scan for new images in images/ (skipping images/extras/)
  const registeredItems = new Set(manifest.items.filter(i => typeof i.file === 'string').map(i => i.file));
  const allFiles = walkImages(IMAGES_DIR, true);
  const newFiles = allFiles.filter(f => !registeredItems.has(f));

  if (newFiles.length > 0) {
    for (const file of newFiles) {
      try {
        const ext = path.extname(file).toLowerCase();
        let finalFile = file;
        if (['.png', '.jpg', '.jpeg'].includes(ext)) {
          finalFile = await convertToWebP(file);
        }
        const finalExt = path.extname(finalFile).toLowerCase();
        manifest.items.push({
          id: makeId(),
          type: finalExt === '.gif' ? 'gif' : 'image',
          file: finalFile,
          title: nameFromFile(finalFile),
          caption: '',
          date: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
          size: 'full'
        });
        saveRequired = true;
      } catch (err) {
        console.error(`Failed to process new file ${file}:`, err);
      }
    }
  }

  // 3. Auto-scan for new images in images/extras/
  const EXTRAS_DIR = path.join(IMAGES_DIR, 'extras');
  if (!fs.existsSync(EXTRAS_DIR)) {
    fs.mkdirSync(EXTRAS_DIR, { recursive: true });
  }

  const registeredExtras = new Set(manifest.extras.filter(i => typeof i.file === 'string').map(i => i.file));
  const allExtrasFiles = walkImages(EXTRAS_DIR, false);
  const newExtrasFiles = allExtrasFiles.filter(f => !registeredExtras.has(f));

  if (newExtrasFiles.length > 0) {
    for (const file of newExtrasFiles) {
      try {
        const ext = path.extname(file).toLowerCase();
        let finalFile = file;
        if (['.png', '.jpg', '.jpeg'].includes(ext)) {
          finalFile = await convertToWebP(file);
        }
        const finalExt = path.extname(finalFile).toLowerCase();
        manifest.extras.push({
          id: makeId(),
          type: finalExt === '.gif' ? 'gif' : 'image',
          file: finalFile,
          title: nameFromFile(finalFile),
          caption: '',
          date: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 }
        });
        saveRequired = true;
      } catch (err) {
        console.error(`Failed to process new extra file ${file}:`, err);
      }
    }
  }

  if (saveRequired) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  }

  res.json(manifest);
});

app.post('/api/data', async (req, res) => {
  try {
    const newManifest = req.body;
    if (!newManifest.items) newManifest.items = [];
    if (!newManifest.extras) newManifest.extras = [];

    // Load old manifest to find deleted files
    let oldManifest = { items: [], extras: [] };
    if (fs.existsSync(DATA_FILE)) {
      try {
        oldManifest = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      } catch (e) {}
    }
    if (!oldManifest.items) oldManifest.items = [];
    if (!oldManifest.extras) oldManifest.extras = [];

    // Find all files in new manifest
    const newFiles = new Set([
      ...newManifest.items.filter(i => i.file).map(i => i.file),
      ...newManifest.extras.filter(i => i.file).map(i => i.file)
    ]);

    // Find all files in old manifest
    const oldFiles = new Set([
      ...oldManifest.items.filter(i => i.file).map(i => i.file),
      ...oldManifest.extras.filter(i => i.file).map(i => i.file)
    ]);

    // 1. Delete files that were removed completely
    for (const file of oldFiles) {
      if (!newFiles.has(file)) {
        const fullPath = path.join(ROOT, file);
        if (fs.existsSync(fullPath)) {
          console.log(`[editor] Deleting file permanently: ${file}`);
          try {
            fs.unlinkSync(fullPath);
          } catch (err) {
            console.error(`Failed to delete file ${fullPath}:`, err);
          }
        }
      }
    }

    // 2. Restored from extras (in items but path starts with images/extras/)
    for (const item of newManifest.items) {
      if (item.file && item.file.startsWith('images/extras/')) {
        const oldFullPath = path.join(ROOT, item.file);
        const fileName = path.basename(item.file);
        const newRelPath = `images/${fileName}`;
        const newFullPath = path.join(ROOT, newRelPath);

        if (fs.existsSync(oldFullPath)) {
          console.log(`[editor] Restoring item: ${item.file} -> ${newRelPath}`);
          if (!fs.existsSync(path.dirname(newFullPath))) {
            fs.mkdirSync(path.dirname(newFullPath), { recursive: true });
          }
          
          let finalFullPath = newFullPath;
          let finalRelPath = newRelPath;
          let counter = 1;
          const ext = path.extname(fileName);
          const base = path.basename(fileName, ext);
          while (fs.existsSync(finalFullPath) && finalFullPath !== oldFullPath) {
            finalRelPath = `images/${base}-${counter}${ext}`;
            finalFullPath = path.join(ROOT, finalRelPath);
            counter++;
          }
          fs.renameSync(oldFullPath, finalFullPath);
          item.file = finalRelPath;
        }
      }
    }

    // 3. Discarded to extras (in extras but path does not start with images/extras/)
    for (const item of newManifest.extras) {
      if (item.file && item.file.startsWith('images/') && !item.file.startsWith('images/extras/')) {
        const oldFullPath = path.join(ROOT, item.file);
        const fileName = path.basename(item.file);
        const newRelPath = `images/extras/${fileName}`;
        const newFullPath = path.join(ROOT, newRelPath);

        if (fs.existsSync(oldFullPath)) {
          console.log(`[editor] Discarding item to extras: ${item.file} -> ${newRelPath}`);
          if (!fs.existsSync(path.dirname(newFullPath))) {
            fs.mkdirSync(path.dirname(newFullPath), { recursive: true });
          }
          
          let finalFullPath = newFullPath;
          let finalRelPath = newRelPath;
          let counter = 1;
          const ext = path.extname(fileName);
          const base = path.basename(fileName, ext);
          while (fs.existsSync(finalFullPath) && finalFullPath !== oldFullPath) {
            finalRelPath = `images/extras/${base}-${counter}${ext}`;
            finalFullPath = path.join(ROOT, finalRelPath);
            counter++;
          }
          fs.renameSync(oldFullPath, finalFullPath);
          item.file = finalRelPath;
        }
      }
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(newManifest, null, 2) + '\n', 'utf-8');
    res.json({ success: true, manifest: newManifest });
  } catch (err) {
    console.error('Error saving:', err);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n==============================================`);
  console.log(`✨ Gallery Editor running at: http://localhost:${PORT}`);
  console.log(`==============================================\n`);
});
