# scripts/

## generate-manifest.js

Scans `images/` for new image files and appends stub entries to `gallery-data.json`.

```bash
node scripts/generate-manifest.js
```

**What it does:**
- Walks the entire `images/` directory (including subdirectories)
- Compares found files with what's already in `gallery-data.json`
- Appends stub entries for any new files to the bottom of the items array
- Prints a summary + next steps

**It does NOT:**
- Delete or modify existing entries
- Overwrite anything you've already filled in
- Require any npm packages (uses only Node.js builtins)

---

## The gallery-data.json format

```json
{
  "meta": {
    "title": "yet another gallery",
    "subtitle": "a collection"
  },
  "items": [
    {
      "id": "unique-id",
      "type": "image",
      "file": "images/folder/photo.jpg",
      "title": "Title of this image",
      "caption": "A note or thought about this image. Can be long. Can be a ramble.",
      "date": { "year": 2024, "month": 7, "day": 3 },
      "size": "full"
    }
  ]
}
```

### Item types

| type | What it shows |
|------|---------------|
| `image` | A regular photo |
| `gif` | An animated GIF (eager-loaded) |
| `text` | A text-only slide (use `title` + `body`) |
| `spacer` | Empty space (`variant`: `small`, `medium`, `large`, `rule`) |

### Date flexibility

All date fields are optional — use as many as you like:
- `{ "year": 2024 }` — just the year
- `{ "year": 2024, "month": 10 }` — month + year
- `{ "year": 2024, "month": 10, "day": 5 }` — full date

### Size options

| size | How it looks |
|------|-------------|
| `full` | Full-width cinematic (default) |
| `framed` | Smaller, with a visible border frame |
