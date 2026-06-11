# Adding Images to the Gallery

## Quick steps

1. Drop your image files anywhere inside this `images/` folder
   (you can organise them into subfolders however you like)

2. Run the manifest script from the repo root:
   ```
   node scripts/generate-manifest.js
   ```

3. Open `gallery-data.json` and fill in the details for any new items at the bottom

4. Push to GitHub:
   ```
   git add .
   git commit -m "add new images"
   git push
   ```

---

## Organising images

Subfolders are fine — use them however makes sense to you:
```
images/
├── 2024/
│   ├── monsoon-01.jpg
│   └── ...
├── portraits/
└── random/
```

The generate script finds everything recursively.

---

## Supported formats

`.jpg` `.jpeg` `.png` `.webp` `.avif` `.gif`

For best performance, try to keep files under 2 MB each.
WebP is ideal if you can export to it.

---

## Demo images

The `images/demo/` folder contains example images that ship with the gallery.
You can delete these once you have your own.
