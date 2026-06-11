# yet-another-gallery

An immersive, personal image gallery. Dark mode, gulaabi palette, no fuss.

→ [View live](https://munir-paviwala.github.io/yet-another-gallery/) *(once GitHub Pages is enabled)*

---

## Adding new images

1. Drop images into `images/` (any subfolder structure you like)
2. Run: `node scripts/generate-manifest.js`
3. Edit the new entries in `gallery-data.json` (title, caption, date, size)
4. `git add . && git commit -m "add new images" && git push`

See [`scripts/README.md`](scripts/README.md) for full format details.

---

## Item types in gallery-data.json

| type | Description |
|------|-------------|
| `image` | Photo |
| `gif` | Animated GIF |
| `text` | Text-only slide (title + body) |
| `spacer` | Breathing space (small / medium / large / rule) |

## Enabling GitHub Pages

1. Go to repo Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: `main` / `root`
4. Save → your gallery will be live in ~60 seconds

---

## Tech

Pure HTML + CSS + vanilla JS. No build step. No dependencies.
Open `index.html` directly in a browser to preview locally.
