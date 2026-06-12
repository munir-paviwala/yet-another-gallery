# yet-another-gallery

An immersive, personal, scroll-snap image gallery with a maximalist dark aesthetic. No fuss.

→ [View live](https://munir-paviwala.github.io/yet-another-gallery/) *(once GitHub Pages is enabled)*

---

## 🎨 Features
- **Cinematic snap layout** — Slides scale and fit the screen automatically with scroll snap.
- **Sticky scrolling captions** — Captions gracefully scroll away while images stick.
- **Visual Local Editor GUI** — Drag-and-drop reordering, edit metadata, add text/spacer slides visually.
- **No dependencies for production** — Production site is built purely with HTML/CSS/JS.

---

## 🛠️ Local Visual Editor

Instead of manually editing JSON files, you can use the built-in visual editor:

1. Drop new images into the `images/` directory.
2. Start the local server:
   ```bash
   npm run edit
   ```
3. Open **`http://localhost:3000`** in your browser.
4. **Features in the Editor:**
   - **Auto-Sync:** Newly dropped images are scanned and added automatically.
   - **Drag & Drop:** Reorder slides using the handles.
   - **Controls:** Add custom Text Slides or Spacers, change image sizing (cinematic `full` vs `framed`), and edit captions/titles.
   - **Save:** Click "Save Changes" to write straight back to `gallery-data.json`.

---

## 📝 Manual Configuration

If you prefer to edit configuration manually, you can edit `gallery-data.json` directly.

### Slide Types

| type | Description |
|------|-------------|
| `image` | Photo |
| `gif` | Animated GIF |
| `text` | Text-only slide (title + body) |
| `spacer` | Visual breathing space (small / medium / large / rule) |

### Image Sizes

| size | Layout |
|------|--------|
| `full` | Full-bleed cinematic (default) |
| `framed` | Centered image with a textured layout and side description text |

See [`scripts/README.md`](scripts/README.md) for data schema details.

---

## 🚀 Deployment to GitHub Pages

1. Go to repository Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: `main` / `root`
4. Save → your gallery will be live in ~60 seconds.

---

## ⚡ Tech Stack

- **Client:** Pure HTML5 + CSS3 + Vanilla Javascript.
- **Editor:** Node.js + Express (run locally).
