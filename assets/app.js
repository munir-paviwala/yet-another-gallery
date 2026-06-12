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
  const slide = document.createElement('div');
  slide.className = 'gallery-slide slide-text';
  slide.setAttribute('role', 'listitem');

  slide.innerHTML = `
    <div class="slide-text-inner">
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
  initDotNavigation(container, slides);
}

// ── Fullscreen Toggle & Resnap ────────────────────────────────────────────────
function tryEnterFullscreen() {
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {
      // Ignore errors if user gesture wasn't strong enough
    });
  }
}

// Force scroll snap alignment on layout/size changes (fixes frozen slides)
function forceResnap() {
  const container = document.getElementById('gallery-scroll-container');
  if (!container) return;
  const activeSlide = container.querySelector('.gallery-slide.is-active');
  if (activeSlide) {
    activeSlide.scrollIntoView({ block: 'start' });
  }
}

window.addEventListener('resize', forceResnap);
document.addEventListener('fullscreenchange', () => {
  forceResnap();
  if (fullscreenBtn) {
    if (!document.fullscreenElement) {
      fullscreenBtn.textContent = 'enter fullscreen';
    } else {
      fullscreenBtn.textContent = 'exit fullscreen';
    }
  }
});

// Auto-enter fullscreen on first interaction
document.body.addEventListener('click', function autoFullscreen() {
  tryEnterFullscreen();
  document.body.removeEventListener('click', autoFullscreen);
}, { once: true });

const fullscreenBtn = document.getElementById('fullscreen-btn');
if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent double trigger with body click
    if (!document.fullscreenElement) {
      tryEnterFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
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

// ── Vertical Dot Navigation ───────────────────────────────────────────────────
function initDotNavigation(container, slides) {
  const hero = document.getElementById('landing');
  const allTargets = [];
  if (hero) allTargets.push(hero);

  slides.forEach(s => {
    if (!s.classList.contains('slide-spacer')) {
      allTargets.push(s);
    }
  });

  if (allTargets.length === 0) return;

  const nav = document.createElement('div');
  nav.className = 'dot-nav';
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Gallery slides navigation');
  document.body.appendChild(nav);

  const dots = [];

  allTargets.forEach((target, index) => {
    const dot = document.createElement('button');
    dot.className = 'dot-nav-item';
    if (index === 0) dot.classList.add('active');
    dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
    
    dot.addEventListener('click', () => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    nav.appendChild(dot);
    dots.push(dot);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const idx = allTargets.indexOf(entry.target);
          if (idx !== -1) {
            dots.forEach(d => d.classList.remove('active'));
            dots[idx].classList.add('active');
          }
        }
      });
    },
    { threshold: 0.5 }
  );

  allTargets.forEach(t => observer.observe(t));
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
  initSparkleTrail();

  // Setup ambient audio toggler
  const audioBtn = document.getElementById('audio-btn');
  if (audioBtn) {
    audioBtn.addEventListener('click', toggleAmbientAudio);
  }
}

// ── Particle Sparkle Trail ───────────────────────────────────────────────────
function initSparkleTrail() {
  const canvas = document.createElement('canvas');
  canvas.className = 'sparkle-canvas';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const colors = ['#ff4081', '#ffc107', '#00bcd4', '#ffd54f', '#ffffff'];

  class Particle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.size = Math.random() * 3 + 1.5;
      this.speedX = Math.random() * 1.6 - 0.8;
      this.speedY = Math.random() * 1.6 - 0.8 - 0.4; // drift up slightly
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.alpha = 1;
      this.decay = Math.random() * 0.02 + 0.015;
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.alpha -= this.decay;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      
      // Draw a 4-point star shape
      ctx.beginPath();
      const cx = this.x;
      const cy = this.y;
      const spikes = 4;
      const outerRadius = this.size;
      const innerRadius = this.size / 2.5;
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.moveTo(cx, cy - outerRadius)
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  window.addEventListener('mousemove', (e) => {
    // Disable sparkles when hovering over images/captions
    const target = e.target;
    if (
      target.closest('.slide-img') || 
      target.closest('.slide-framed-img') || 
      target.closest('.slide-caption-content') ||
      target.closest('img')
    ) {
      return;
    }

    for (let i = 0; i < 2; i++) {
      particles.push(new Particle(e.clientX, e.clientY));
    }
  });

  function animate() {
    ctx.clearRect(0, 0, width, height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      } else {
        p.draw();
      }
    }
    requestAnimationFrame(animate);
  }
  animate();
}

// ── Procedural Tanpura Synth Drone & Vinyl Crackle ──────────────────────────
let audioCtx = null;
let isAudioPlaying = false;
let tanpuraNodes = [];

function toggleAmbientAudio() {
  const btn = document.getElementById('audio-btn');
  const icon = btn ? btn.querySelector('.material-symbols-outlined') : null;

  if (isAudioPlaying) {
    if (audioCtx) {
      audioCtx.suspend();
    }
    isAudioPlaying = false;
    if (icon) icon.textContent = 'volume_off';
  } else {
    if (!audioCtx) {
      initTanpuraSynth();
    } else {
      audioCtx.resume();
    }
    isAudioPlaying = true;
    if (icon) icon.textContent = 'volume_up';
  }
}

function initTanpuraSynth() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  // Master gain control
  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.08, audioCtx.currentTime); // very soft/background drone
  masterGain.connect(audioCtx.destination);

  const fundamentalFreq = 65.4; // deep C2 drone
  
  // Low Triangle Oscillator for the deep warm foundation
  const subOsc = audioCtx.createOscillator();
  subOsc.type = 'triangle';
  subOsc.frequency.setValueAtTime(fundamentalFreq, audioCtx.currentTime);
  const subGain = audioCtx.createGain();
  subGain.gain.setValueAtTime(0.5, audioCtx.currentTime);
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(110, audioCtx.currentTime);

  subOsc.connect(subGain);
  subGain.connect(filter);
  filter.connect(masterGain);
  subOsc.start();
  tanpuraNodes.push(subOsc);

  // Plucking string simulation nodes (C3, G3, C4)
  const strings = [
    { freq: fundamentalFreq * 2, delay: 0, rate: 4.2 }, 
    { freq: fundamentalFreq * 3, delay: 1.1, rate: 4.2 }, 
    { freq: fundamentalFreq * 3, delay: 2.2, rate: 4.2 }, 
    { freq: fundamentalFreq * 4, delay: 3.3, rate: 4.2 }, 
  ];

  strings.forEach((str) => {
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(str.freq, audioCtx.currentTime);

    const stringGain = audioCtx.createGain();
    stringGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    
    const pluck = () => {
      const t = audioCtx.currentTime;
      stringGain.gain.setTargetAtTime(0.24, t, 0.08); // Pluck strike
      stringGain.gain.setTargetAtTime(0.001, t + 0.25, 1.4); // Slow ring decay
    };

    setTimeout(() => {
      if (!isAudioPlaying) return;
      pluck();
      setInterval(() => {
        if (isAudioPlaying) pluck();
      }, str.rate * 1000);
    }, str.delay * 1000);

    osc.connect(stringGain);
    stringGain.connect(masterGain);
    osc.start();
    tanpuraNodes.push(osc);
  });

  // Procedural Vinyl record surface crackle (Low Sparsity White Noise Buffer)
  const bufferSize = audioCtx.sampleRate * 2.5; 
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    let val = Math.random() * 2 - 1;
    // Sparse, filter crackles
    output[i] = Math.abs(val) > 0.985 ? val * 0.015 : val * 0.002;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.06, audioCtx.currentTime);

  noise.connect(noiseGain);
  noiseGain.connect(masterGain);
  noise.start();
  tanpuraNodes.push(noise);
}

init();
