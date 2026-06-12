const fs = require('fs');

const manifestPath = 'gallery-data.json';
const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Helper to convert old names to new webp names
function toWebpName(oldFile) {
  if (!oldFile) return oldFile;
  const match = oldFile.match(/images\/(.*)\.(png|jpg|jpeg)/i);
  if (match) {
    let name = match[1];
    name = name.trim().replace(/\s+/g, '-').toLowerCase();
    return `images/${name}.webp`;
  }
  return oldFile;
}

// 1. Update the old .png files to .webp
data.items.forEach(item => {
  if (item.file && item.file.match(/\.(png|jpg|jpeg)$/i)) {
    item.file = toWebpName(item.file);
  }
});
data.extras.forEach(item => {
  if (item.file && item.file.match(/\.(png|jpg|jpeg)$/i)) {
    item.file = toWebpName(item.file);
  }
});

// 2. Remove the auto-generated ones that start with 'item-mqaoua7n-' and the duplicate 'item-mqaoupvr-sh1f'
data.items = data.items.filter(item => {
  return !item.id.startsWith('item-mqaoua7n-') && item.id !== 'item-mqaoupvr-sh1f';
});
data.extras = data.extras.filter(item => {
  return !item.id.startsWith('item-mqaoua7n-') && item.id !== 'item-mqaoupvr-sh1f';
});

// 3. For the extras, the path should be images/extras/... but wait, the directory is empty.
// We should check if the file actually exists in images/extras/ or images/
// In fact, let's just make sure all paths in extras and items point to the correct file location.
data.extras.forEach(item => {
  if (item.file) {
    const filename = item.file.split('/').pop();
    if (fs.existsSync(`images/extras/${filename}`)) {
      item.file = `images/extras/${filename}`;
    } else if (fs.existsSync(`images/${filename}`)) {
      // It's actually in images/, so we should probably move the file or fix the path
      // Let's just fix the path to images/
      item.file = `images/${filename}`;
    }
  }
});

fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2));
console.log('Manifest fixed.');
