/**
 * yet-another-gallery — app.js
 *
 * Handles:
 *  - Loading gallery-data.json
 *  - Rendering all item types (image, gif, text, spacer)
 *  - Lightbox (open, close, navigate)
 *  - Keyboard navigation
 *  - Scroll animation fallback (IntersectionObserver for Firefox)
 */

// ── Data ─────────────────────────────────────────────────────────────────────

/** All image/gif items in order, used for lightbox navigation */
let imageItems = [];
let currentIndex = -1;

async function loadGalleryData() {
  try {
    const res = await fetch('gallery-data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[gallery] Could not load gallery-data.json:', err);
    return null;
  }
}

// ── Date Formatting ───────────────────────────────────────────────────────────

function formatDate(date) {
  if (!date || Object.keys(date).length === 0) return '';
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const parts = [];
  if (date.day)   parts.push(String(date.day));
  if (date.month) parts.push(MONTHS[date.month - 1]);
  if (date.year)  parts.push(String(date.year));
  return parts.join(' ');
}

// ── HTML Escaping ─────────────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Item Renderers ────────────────────────────────────────────────────────────

/**
 * Render an image or GIF item.
 * @param {object} item
 * @param {number} lightboxIndex — index within imageItems[], for lightbox
 * @returns {HTMLElement}
 */
function renderImageItem(item, lightboxIndex) {
  const size = item.size ?? 'full';
  const dateStr = formatDate(item.date);
  const isGif = item.type === 'gif';

  const el = document.createElement('div');
  el.className = `gallery-item item-image size-${size}`;
  el.setAttribute('role', 'listitem');

  // Accessibility
  el.setAttribute('tabindex', '0');
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', item.title ? `Open: ${item.title}` : 'Open image');

  // Build caption HTML
  const titleHTML  = item.title   ? `<p class="item-title">${esc(item.title)}</p>`         : '';
  const captionHTML= item.caption ? `<p class="item-caption-text">${esc(item.caption)}</p>` : '';
  const dateHTML   = dateStr       ? `<time class="item-date">${esc(dateStr)}</time>`        : '';

  if (size === 'full') {
    el.innerHTML = `
      <figure>
        <img
          src="${esc(item.file)}"
          alt="${esc(item.title ?? '')}"
          loading="${isGif ? 'eager' : 'lazy'}"
          decoding="async"
        >
        <div class="caption-overlay" aria-hidden="true">
          ${titleHTML}
          ${captionHTML}
          ${dateHTML}
        </div>
      </figure>
    `;
  } else {
    // framed — caption always visible below the image
    el.innerHTML = `
      <figure>
        <img
          src="${esc(item.file)}"
          alt="${esc(item.title ?? '')}"
          loading="${isGif ? 'eager' : 'lazy'}"
          decoding="async"
        >
        <figcaption class="caption-framed">
          ${titleHTML}
          ${captionHTML}
          ${dateHTML}
        </figcaption>
      </figure>
    `;
  }

  // Open lightbox on click or Enter/Space
  const open = () => openLightbox(lightboxIndex);
  el.addEventListener('click', open);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });

  return el;
}

/**
 * Render a text-only item.
 */
function renderTextItem(item) {
  const dateStr = formatDate(item.date);
  const el = document.createElement('div');
  el.className = 'gallery-item item-text';
  el.setAttribute('role', 'listitem');

  el.innerHTML = `
    ${dateStr ? `<p class="text-eyebrow">${esc(dateStr)}</p>` : ''}
    ${item.title ? `<h2 class="text-title">${esc(item.title)}</h2>` : ''}
    ${item.body  ? `<div class="text-body">${esc(item.body)}</div>`  : ''}
  `;

  return el;
}

/**
 * Render a spacer item.
 * variant: 'small' | 'medium' | 'large' | 'rule'
 */
function renderSpacerItem(item) {
  const el = document.createElement('div');
  const variant = item.variant ?? 'medium';
  el.className = `gallery-item item-spacer spacer-${variant}`;
  el.setAttribute('aria-hidden', 'true');
  return el;
}

// ── Gallery Renderer ──────────────────────────────────────────────────────────

function renderGallery(data) {
  const grid = document.getElementById('gallery-grid');
  const subtitleEl = document.getElementById('gallery-header-subtitle');
  if (!grid) return;

  // Update header subtitle from meta
  if (subtitleEl && data.meta?.subtitle) {
    subtitleEl.textContent = data.meta.subtitle;
  }

  // First pass: collect all image/gif items for lightbox navigation
  imageItems = [];
  data.items.forEach((item) => {
    if (item.type === 'image' || item.type === 'gif') {
      imageItems.push(item);
    }
  });

  // Second pass: render all items
  let lbIndex = 0; // tracks position within imageItems
  data.items.forEach((item) => {
    let el = null;

    if (item.type === 'image' || item.type === 'gif') {
      el = renderImageItem(item, lbIndex);
      lbIndex++;
    } else if (item.type === 'text') {
      el = renderTextItem(item);
    } else if (item.type === 'spacer') {
      el = renderSpacerItem(item);
    }

    if (el) grid.appendChild(el);
  });

  // Init scroll animation fallback for browsers without scroll-driven animations
  initScrollFallback();
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

const lightbox  = document.getElementById('lightbox');
const lbImg     = document.getElementById('lightbox-img');
const lbTitle   = document.getElementById('lightbox-title');
const lbCaption = document.getElementById('lightbox-caption');
const lbDate    = document.getElementById('lightbox-date');
const lbCounter = document.getElementById('lightbox-counter');
const lbPrev    = document.getElementById('lightbox-prev');
const lbNext    = document.getElementById('lightbox-next');
const lbClose   = document.getElementById('lightbox-close');

function openLightbox(index) {
  if (!lightbox || index < 0 || index >= imageItems.length) return;
  currentIndex = index;
  populateLightbox(index);
  lightbox.showModal();
}

function populateLightbox(index) {
  const item = imageItems[index];
  if (!item) return;

  lbImg.src = item.file;
  lbImg.alt = item.title ?? '';

  lbTitle.textContent = item.title ?? '';
  lbTitle.hidden = !item.title;

  lbCaption.textContent = item.caption ?? '';
  lbCaption.hidden = !item.caption;

  const dateStr = formatDate(item.date);
  lbDate.textContent = dateStr;
  lbDate.hidden = !dateStr;

  lbCounter.textContent = `${index + 1} / ${imageItems.length}`;
  lbPrev.disabled = index === 0;
  lbNext.disabled = index === imageItems.length - 1;
}

function navigate(direction) {
  const next = currentIndex + direction;
  if (next < 0 || next >= imageItems.length) return;
  currentIndex = next;
  populateLightbox(currentIndex);
}

// Close on backdrop click (click lands directly on <dialog>, not its children)
lightbox?.addEventListener('click', (e) => {
  if (e.target === lightbox) lightbox.close();
});

lbClose?.addEventListener('click', () => lightbox?.close());
lbPrev?.addEventListener('click', () => navigate(-1));
lbNext?.addEventListener('click', () => navigate(1));

// Keyboard
document.addEventListener('keydown', (e) => {
  if (!lightbox?.open) return;
  if (e.key === 'ArrowLeft')  { e.preventDefault(); navigate(-1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1);  }
  // Escape is handled natively by <dialog>
});

// ── Scroll Animation Fallback ─────────────────────────────────────────────────

/**
 * IntersectionObserver-based fallback for browsers that don't support
 * CSS scroll-driven animations (currently: Firefox).
 *
 * In supporting browsers, CSS `animation-timeline: view()` handles this.
 * The initial opacity: 0; transform: translateY(...) is set in CSS.
 */
function initScrollFallback() {
  // Skip if native scroll-driven animations are supported
  if (CSS.supports('(animation-timeline: view()) and (animation-range: entry)')) return;
  // Skip if user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Just show everything immediately
    document.querySelectorAll('.gallery-item').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // Apply transition and reveal
        el.style.transition = 'opacity 0.65s ease, transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
        observer.unobserve(el);
      });
    },
    {
      threshold: 0.04,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  document.querySelectorAll('.gallery-item').forEach((el) => observer.observe(el));
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return; // Not on the gallery page

  const data = await loadGalleryData();

  if (!data) {
    grid.innerHTML = `
      <p style="
        text-align: center;
        color: var(--text-muted);
        padding: 6rem 2rem;
        font-family: var(--font-display);
        font-style: italic;
        font-size: 1.4rem;
        column-span: all;
      ">
        gallery-data.json not found.<br>
        <small style="font-family: var(--font-ui); font-size: 0.8rem; opacity: 0.6;">
          Run <code>node scripts/generate-manifest.js</code> to create it.
        </small>
      </p>
    `;
    return;
  }

  renderGallery(data);
}

init();
