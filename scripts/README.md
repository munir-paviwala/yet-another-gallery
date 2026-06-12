# scripts/

This directory contains helper scripts for scanned content discovery and metadata editing.

---

## 1. `editor.js` (Visual Editor Backend)

Runs a local Node.js Express server to power the offline graphical editor.

```bash
npm run edit
# (runs "node scripts/editor.js" under the hood)
```

**Key Behaviors:**
- **Local Network Safety:** Explicitly binds to host `127.0.0.1` (localhost). This ensures the server is only accessible from your machine and is isolated from the local network (e.g. public Wi-Fi).
- **Auto-Scanner:** Upon loading `http://localhost:3000`, it scans your `images/` directory, detects untracked images, generates unique IDs for them, and automatically adds stub items to `gallery-data.json`.
- **API endpoints:**
  - `GET /api/data`: Serves the gallery data structure.
  - `POST /api/data`: Writes the updated metadata JSON structure back to `gallery-data.json`.

---

## 2. `generate-manifest.js` (CLI discovery tool)

If you prefer command-line usage or are preparing files via script:

```bash
node scripts/generate-manifest.js
```

**Key Behaviors:**
- Scans `images/` recursively.
- Appends stub entries for any untracked images to the bottom of the items array in `gallery-data.json`.
- Does **not** modify or delete existing items in the manifest.

---

## 📝 Manifest Data Format

The structure of `gallery-data.json`:

```json
{
  "meta": {
    "title": "yet another gallery",
    "subtitle": "but Munir's"
  },
  "items": [
    {
      "id": "item-unique-id",
      "type": "image",
      "file": "images/photo.png",
      "title": "Stealing non-Perfectionism",
      "caption": "Stealing quotes and designs...",
      "date": {
        "year": 2026,
        "month": 6
      },
      "size": "full"
    }
  ]
}
```

### Supported Item Schema

- **`type`**: `image` | `gif` | `text` | `spacer`
- **`size`** *(image types only)*: `full` (cinematic snap layout) | `framed` (split aesthetic details layout)
- **`variant`** *(spacer types only)*: `small` | `medium` | `large` | `rule` (renders a clean visual dividing line)
