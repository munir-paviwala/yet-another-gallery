const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'images');
const DATA_FILE = path.join(ROOT, 'gallery-data.json');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

app.use(express.json({ limit: '50mb' }));
app.use('/images', express.static(IMAGES_DIR));
app.use(express.static(path.join(ROOT, 'editor')));

function walkImages(dir) {
  const found = [];
  if (!fs.existsSync(dir)) return found;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walkImages(fullPath));
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

app.get('/api/data', (req, res) => {
  let manifest = { meta: { title: 'yet another gallery', subtitle: 'a collection' }, items: [] };
  if (fs.existsSync(DATA_FILE)) {
    try {
      manifest = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (err) {
      console.error('Error reading gallery-data.json:', err);
    }
  }

  // Auto-scan for new images
  const registered = new Set((manifest.items || []).filter(i => typeof i.file === 'string').map(i => i.file));
  const allFiles = walkImages(IMAGES_DIR);
  const newFiles = allFiles.filter(f => !registered.has(f));

  if (newFiles.length > 0) {
    const stubs = newFiles.map(file => {
      const ext = path.extname(file).toLowerCase();
      return {
        id: makeId(),
        type: ext === '.gif' ? 'gif' : 'image',
        file,
        title: nameFromFile(file),
        caption: '',
        date: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
        size: 'full'
      };
    });
    if (!Array.isArray(manifest.items)) manifest.items = [];
    manifest.items.push(...stubs);
    
    // Save updated manifest
    fs.writeFileSync(DATA_FILE, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  }

  res.json(manifest);
});

app.post('/api/data', (req, res) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2) + '\n', 'utf-8');
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving:', err);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

app.listen(PORT, () => {
  console.log(`\n==============================================`);
  console.log(`✨ Gallery Editor running at: http://localhost:${PORT}`);
  console.log(`==============================================\n`);
});
