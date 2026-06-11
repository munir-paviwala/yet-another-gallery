/**
 * yet-another-gallery — app.js
 *
 * Scroll-snap gallery with fullscreen cinematic slides.
 * Each slide uses IntersectionObserver to detect when it's "active"
 * and triggers entry animations + the caption fade-out cycle.
 */

// ── State ─────────────────────────────────────────────────────────────────────
let imageItems = [];
let currentIndex = -1;

// ── Data ──────────────────────────────────────────────────────────────────────
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

// ── Utilities ─────────────────────────────────────────────────────────────────
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

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Slide Builders ────────────────────────────────────────────────────────────

/**
 * Full-bleed image slide (size: 'full')
 * Image fills the screen; title/caption fade in then out.
 */
function buildFullSlide(item, lightboxIndex) {
  const dateStr = formatDate(item.date);

  const slide = document.createElement('div');
  slide.className = 'gallery-slide slide-image';
  slide.setAttribute('role', 'listitem');

  const hasCaption = item.title || item.caption || dateStr;

  slide.innerHTML = `
    <div class="slide-img-sticky">
      <img
        class="slide-img"
        src="${esc(item.file)}"
        alt="${esc(item.title ?? '')}"
        loading="lazy"
        decoding="async"
      >
    </div>
    ${hasCaption ? `
      <div class="slide-caption-scroll-container">
        <div class="slide-caption-content" aria-hidden="true">
          ${item.title   ? `<p class="slide-caption-title">${esc(item.title)}</p>` : ''}
          ${item.caption ? `<p class="slide-caption-sub">${esc(item.caption)}</p>` : ''}
          ${dateStr      ? `<time class="slide-caption-date">${esc(dateStr)}</time>` : ''}
        </div>
      </div>
    ` : ''}
  `;

  // Zoom on click
  const img = slide.querySelector('.slide-img');
  if (img) {
    img.addEventListener('click', () => {
      img.classList.toggle('zoomed');
    });
  }

  slide.setAttribute('tabindex', '0');
  slide.setAttribute('aria-label', item.title ? `Open: ${item.title}` : 'Open image');

  return slide;
}

/**
 * Framed image slide (size: 'framed')
 * ~55% image on left, rich text panel on right.
 */
function buildFramedSlide(item, lightboxIndex) {
  const dateStr = formatDate(item.date);

  const slide = document.createElement('div');
  slide.className = 'gallery-slide slide-framed';
  slide.setAttribute('role', 'listitem');

  slide.innerHTML = `
    <div class="slide-framed-inner">
      <div class="slide-framed-img-wrap">
        <img
          class="slide-framed-img"
          src="${esc(item.file)}"
          alt="${esc(item.title ?? '')}"
          loading="lazy"
          decoding="async"
        >
      </div>
      <div class="slide-framed-text">
        ${dateStr ? `<span class="framed-eyebrow">${esc(dateStr)}</span>` : ''}
        ${item.title   ? `<h2 class="framed-title">${esc(item.title)}</h2>` : ''}
        ${item.caption ? `<p class="framed-caption">${esc(item.caption)}</p>` : ''}
      </div>
    </div>
  `;

  // Clicking the image zooms it
  const img = slide.querySelector('.slide-framed-img');
  if (img) {
    img.addEventListener('click', () => {
      img.classList.toggle('zoomed');
    });
  }

  return slide;
}

/**
 * Text slide (type: 'text')
 */
function buildTextSlide(item) {
  const dateStr = formatDate(item.date);

  const slide = document.createElement('div');
  slide.className = 'gallery-slide slide-text';
  slide.setAttribute('role', 'listitem');

  slide.innerHTML = `
    <div class="slide-text-inner">
      ${dateStr     ? `<span class="slide-text-eyebrow">${esc(dateStr)}</span>` : ''}
      ${item.title  ? `<h2 class="slide-text-title">${esc(item.title)}</h2>` : ''}
      ${item.body   ? `<div class="slide-text-body">${esc(item.body)}</div>` : ''}
    </div>
  `;

  return slide;
}

/**
 * Spacer slide (type: 'spacer')
 * Does NOT snap — it's just visual breathing room.
 */
function buildSpacerSlide(item) {
  const el = document.createElement('div');
  const variant = item.variant ?? 'medium';
  el.className = `gallery-slide slide-spacer spacer-${variant}`;
  el.setAttribute('aria-hidden', 'true');
  return el;
}

// ── Gallery Renderer ──────────────────────────────────────────────────────────
function renderGallery(data) {
  const container = document.getElementById('gallery-scroll-container');
  if (!container) return;

  // Collect image items for lightbox
  imageItems = [];
  data.items.forEach((item) => {
    if (item.type === 'image' || item.type === 'gif') imageItems.push(item);
  });

  // Build slides
  let lbIndex = 0;
  const slides = [];

  data.items.forEach((item) => {
    let slide = null;

    if (item.type === 'image' || item.type === 'gif') {
      const size = item.size ?? 'full';
      if (size === 'framed') {
        slide = buildFramedSlide(item, lbIndex);
      } else {
        slide = buildFullSlide(item, lbIndex);
      }
      lbIndex++;
    } else if (item.type === 'text') {
      slide = buildTextSlide(item);
    } else if (item.type === 'spacer') {
      slide = buildSpacerSlide(item);
    }

    if (slide) {
      container.appendChild(slide);
      slides.push(slide);
    }
  });

  // Wire up active-state detection
  initSlideObserver(slides);
  initCounterBadge(slides);
}

// ── Fullscreen Toggle ─────────────────────────────────────────────────────────
const fullscreenBtn = document.getElementById('fullscreen-btn');
if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      fullscreenBtn.textContent = 'exit fullscreen';
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        fullscreenBtn.textContent = 'enter fullscreen';
      }
    }
  });

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      fullscreenBtn.textContent = 'enter fullscreen';
    } else {
      fullscreenBtn.textContent = 'exit fullscreen';
    }
  });
}

// ── Slide Active Observer ─────────────────────────────────────────────────────
function initSlideObserver(slides) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    slides.forEach((s) => s.classList.add('is-active'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-active');
        } else {
          entry.target.classList.remove('is-active');
        }
      });
    },
    { threshold: 0.6 }
  );

  slides.forEach((s) => observer.observe(s));
}

// ── Floating Slide Counter ─────────────────────────────────────────────────────
function initCounterBadge(slides) {
  const badge = document.createElement('div');
  badge.className = 'slide-counter-badge';
  badge.id = 'slide-counter-badge';
  document.body.appendChild(badge);

  const countedSlides = slides.filter(s => !s.classList.contains('slide-spacer'));
  const total = countedSlides.length;
  let hideTimer;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const idx = countedSlides.indexOf(entry.target);
          if (idx !== -1) {
            badge.textContent = `${idx + 1} / ${total}`;
            badge.classList.add('visible');
            clearTimeout(hideTimer);
            hideTimer = setTimeout(() => badge.classList.remove('visible'), 2200);
          }
        }
      });
    },
    { threshold: 0.6 }
  );

  countedSlides.forEach((s) => observer.observe(s));
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const container = document.getElementById('gallery-scroll-container');
  if (!container) return;

  const data = await loadGalleryData();

  if (!data) {
    container.innerHTML = `
      <div class="gallery-slide slide-text" style="opacity:1;">
        <div class="slide-text-inner" style="opacity:1;transform:none;text-align:center;">
          <p style="font-family:var(--font-display);font-style:italic;font-size:1.6rem;color:var(--text-muted);">
            gallery-data.json not found.
          </p>
          <p style="font-size:0.8rem;margin-top:1rem;opacity:0.5;">
            Run <code>node scripts/generate-manifest.js</code> to create it.
          </p>
        </div>
      </div>
    `;
    return;
  }

  renderGallery(data);
}

init();
