/**
 * Ankush & Yamini Wedding Experience Logic
 * Includes Scratch Card, Confetti Physics, Live Countdown, Calendar Sync & Wishes Wall
 */

import './audio.js';
import {
  subscribeToWishes,
  subscribeToPendingWishes,
  subscribeToApprovedWishes,
  submitWish,
  approveWish,
  deleteWish,
  isFirebaseConfigured
} from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial Film Loader & Gate
  initFilmLoader();

  // 2. Countdown & Interactive Scratch Card
  initCountdownAndScratch();

  // 3. Dynamic Calendar Integration (Apple ICS & Google Calendar)
  initCalendarDownload();

  // 4. Photo Gallery Lightbox Modal
  initGalleryLightbox();

  // 5. Interactive Wishes & Blessings Wall
  initWishesWall();

  // 6. Navigation & Mobile Menu
  initNavigation();

  // 7. Background Music Controller
  initAudioController();

  // 8. Hero Video Autoplay Management
  initHeroVideoAutoplay();

  // 9. RSVP Copy Phone Number
  initRsvpCopy();
});

/* ==========================================================================
   1. Opening Film Loader
   ========================================================================== */
function initFilmLoader() {
  const loader = document.getElementById('film-loader');
  const fill = document.getElementById('loader-fill');
  const pct = document.getElementById('loader-pct');
  const enterBtn = document.getElementById('loader-enter-btn');
  const track = document.getElementById('loader-track');

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 15) + 10;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      if (fill) fill.style.transform = 'scaleX(1)';
      if (pct) pct.textContent = '100%';
      setTimeout(() => {
        if (track) track.style.display = 'none';
        if (pct) pct.style.display = 'none';
        if (enterBtn) {
          enterBtn.style.display = 'inline-flex';
          enterBtn.focus();
        }
      }, 400);
    } else {
      if (fill) fill.style.transform = `scaleX(${progress / 100})`;
      if (pct) pct.textContent = `${progress}%`;
    }
  }, 120);

  const unlockSite = () => {
    if (loader) {
      loader.classList.add('is-done');
    }
    // Reveal music button once invitation is unlocked
    const musicBtn = document.getElementById('music-toggle-btn');
    if (musicBtn) {
      musicBtn.classList.add('is-visible');
    }
    // Start ambient background music
    if (window.weddingAudio) {
      window.weddingAudio.play();
      if (musicBtn) {
        musicBtn.setAttribute('aria-pressed', 'true');
        musicBtn.innerHTML = '<span>⏸</span>';
      }
    }
  };

  if (enterBtn) {
    enterBtn.addEventListener('click', unlockSite);
  }
}

/* ==========================================================================
   2. Countdown Timer & Scratch-off Foil
   ========================================================================== */
const WEDDING_TIMESTAMP = new Date('2027-01-28T10:00:00+05:30').getTime();

function initCountdownAndScratch() {
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minutesEl = document.getElementById('cd-minutes');
  const secondsEl = document.getElementById('cd-seconds');

  function updateClock() {
    const now = Date.now();
    const diff = Math.max(0, WEDDING_TIMESTAMP - now);

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    if (daysEl) daysEl.textContent = String(d).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(h).padStart(2, '0');
    if (minutesEl) minutesEl.textContent = String(m).padStart(2, '0');
    if (secondsEl) secondsEl.textContent = String(s).padStart(2, '0');
  }

  updateClock();
  setInterval(updateClock, 1000);

  // Scratch Foil Logic
  const canvas = document.getElementById('scratch-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const wrapper = canvas.parentElement;
  const resetBtn = document.getElementById('scratch-reset-btn');
  const hint = document.getElementById('scratch-hint');

  let isScratching = false;
  let isRevealed = false; // Always fresh on page load so user can always experience scratching

  function setupFoil() {
    const rect = wrapper.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.globalCompositeOperation = 'source-over';

    // Paint antique gold & sage green gradient foil
    const grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    grad.addColorStop(0, '#c88f36');
    grad.addColorStop(0.5, '#e8be77');
    grad.addColorStop(1, '#a67228');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Decorative Pattern on foil
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < rect.width; i += 30) {
      ctx.fillRect(i, 0, 1.5, rect.height);
    }

    // Centered label
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 14px "Cinzel", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '3px';
    ctx.fillText('✧ SCRATCH TO REVEAL ✧', rect.width / 2, rect.height / 2);
  }

  setupFoil();
  window.addEventListener('resize', () => {
    if (!isRevealed) setupFoil();
  });

  function scratch(e) {
    if (!isScratching || isRevealed) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();

    checkClearing();
  }

  function checkClearing() {
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      let transparentPixels = 0;
      const totalSampled = data.length / 16;

      for (let i = 3; i < data.length; i += 16) {
        if (data[i] < 128) transparentPixels++;
      }

      if (transparentPixels / totalSampled > 0.4) {
        isRevealed = true;
        canvas.style.transition = 'opacity 0.6s ease';
        canvas.style.opacity = '0';
        setTimeout(() => { 
          canvas.style.display = 'none'; 
          if (resetBtn) resetBtn.style.display = 'inline-flex';
        }, 600);

        if (hint) hint.textContent = '✨ Ready to celebrate together on 28th January 2027!';

        // Trigger joyful confetti explosion
        const rect = canvas.getBoundingClientRect();
        triggerConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    } catch (err) {}
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      isRevealed = false;
      canvas.style.display = 'block';
      canvas.style.transition = 'none';
      canvas.style.opacity = '1';
      setupFoil();
      resetBtn.style.display = 'none';
      if (hint) hint.textContent = '✧ Scratch the foil to reveal the live wedding countdown ✧';
    });
  }

  // Pointer & Touch Events
  canvas.addEventListener('mousedown', () => isScratching = true);
  window.addEventListener('mouseup', () => isScratching = false);
  canvas.addEventListener('mousemove', scratch);

  canvas.addEventListener('touchstart', (e) => {
    isScratching = true;
    scratch(e);
  }, { passive: true });
  window.addEventListener('touchend', () => isScratching = false);
  canvas.addEventListener('touchmove', scratch, { passive: true });
}

/* ==========================================================================
   Confetti Physics Burst
   ========================================================================== */
function triggerConfetti(originX, originY) {
  let canvas = document.getElementById('confetti-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.className = 'confetti-canvas';
    document.body.appendChild(canvas);
  }

  const ctx = canvas.getContext('2d');
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;

  const colors = ['#dca34b', '#c88f36', '#415e3f', '#284427', '#fbf8f2', '#eaf0e8'];
  const particleCount = 140;
  const particles = Array.from({ length: particleCount }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 10;
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      w: 6 + Math.random() * 8,
      h: 8 + Math.random() * 10,
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1
    };
  });

  const startTime = performance.now();
  function render(now) {
    const elapsed = (now - startTime) / 1000;
    ctx.clearRect(0, 0, width, height);

    let active = false;
    particles.forEach(p => {
      p.vy += 0.22; // gravity
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      p.life = Math.max(0, 1 - elapsed / 2.5);

      if (p.life > 0) {
        active = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    });

    if (active) {
      requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
  }

  requestAnimationFrame(render);
}

/* ==========================================================================
   3. Calendar Download (Smart Apple ICS / Google Calendar)
   ========================================================================== */
function initCalendarDownload() {
  const saveBtn = document.getElementById('save-calendar-btn');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const isApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);

    if (isApple) {
      // Generate standard RFC 5545 .ics blob
      const icsData = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//AnkushYaminiWedding//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        'UID:ankush-yamini-wedding-2027@celebration',
        'DTSTAMP:20261021T000000Z',
        'DTSTART:20270128T043000Z', // 10:00 AM IST in UTC
        'DTEND:20270128T183000Z',
        'SUMMARY:Ankush & Yamini Wedding Celebrations',
        'DESCRIPTION:With the divine blessings of H. H. Sant Rajinder Singh Ji Maharaj\\nWedding Celebrations of Ankush & Yamini\\nFor RSVP/Assistance: Rakesh Puri (Bobby) +91 9999266222',
        'LOCATION:Wedding Celebrations',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Ankush_Yamini_Wedding_28Jan2027.ics';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } else {
      // Google Calendar URL
      const gcalUrl = new URL('https://calendar.google.com/calendar/render');
      gcalUrl.searchParams.set('action', 'TEMPLATE');
      gcalUrl.searchParams.set('text', 'Ankush & Yamini Wedding Celebrations');
      gcalUrl.searchParams.set('dates', '20270128T043000Z/20270128T183000Z');
      gcalUrl.searchParams.set('details', 'With the divine blessings of H. H. Sant Rajinder Singh Ji Maharaj\nWedding Celebrations of Ankush & Yamini\nFor RSVP/Assistance: Rakesh Puri (Bobby) +91 9999266222');
      gcalUrl.searchParams.set('location', 'Wedding Celebrations');
      window.open(gcalUrl.toString(), '_blank', 'noopener,noreferrer');
    }
  });
}

/* ==========================================================================
   4. Photo Gallery Lightbox
   ========================================================================== */
function initGalleryLightbox() {
  const dialog = document.getElementById('lightbox-dialog');
  const imgEl = document.getElementById('lightbox-img');
  const captionEl = document.getElementById('lightbox-caption');
  const closeBtn = document.getElementById('lightbox-close-btn');

  if (!dialog || !imgEl) return;

  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const src = item.getAttribute('data-img-src') || item.querySelector('img')?.src;
      const title = item.getAttribute('data-caption') || item.querySelector('img')?.alt;
      if (src) {
        imgEl.src = src;
        if (captionEl) captionEl.textContent = title || '';
        dialog.showModal();
      }
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => dialog.close());
  }

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}

/* ==========================================================================
   5. Wishes & Blessings Wall (Real-Time Firestore Sync)
   ========================================================================== */
const HONORARY_WISHES = [];

function initWishesWall() {
  const listEl = document.getElementById('wishes-list');
  const form = document.getElementById('wish-form');
  const counterEl = document.getElementById('wishes-counter');
  const loadMoreBtn = document.getElementById('wishes-load-more');
  const remainingCountEl = document.getElementById('wishes-remaining-count');
  const eyebrowEl = document.querySelector('.wishes-section .eyebrow');

  // Moderation Dialog elements
  const reviewDialog = document.getElementById('review-dialog');
  const reviewCloseBtn = document.getElementById('review-close-btn');
  const tabPendingBtn = document.getElementById('tab-pending-btn');
  const tabApprovedBtn = document.getElementById('tab-approved-btn');
  const reviewPendingList = document.getElementById('review-pending-list');
  const reviewApprovedList = document.getElementById('review-approved-list');
  const pendingBadgeCount = document.getElementById('pending-badge-count');
  const approvedBadgeCount = document.getElementById('approved-badge-count');

  if (!listEl) return;

  const PAGE_SIZE = 6;
  let currentLimit = PAGE_SIZE;
  let allApprovedWishes = [];
  let pendingWishesList = [];

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  /* ---------------- Public Wishes Wall (Only Approved Wishes) ---------------- */
  function renderPublicWishes() {
    const visibleWishes = allApprovedWishes.slice(0, currentLimit);

    if (visibleWishes.length === 0) {
      listEl.innerHTML = `
        <div class="wishes-empty-state">
          <p>No wishes yet. Be the first to bless Ankush & Yamini! ✨</p>
        </div>
      `;
    } else {
      listEl.innerHTML = visibleWishes.map(w => `
        <article class="wish-card" data-wish-id="${escapeHtml(w.id)}">
          <div class="wish-card-header">
            <h4 class="wish-author">${escapeHtml(w.author)}</h4>
            ${w.id && !w.id.startsWith('honorary_') ? `
              <button type="button" class="wish-delete-btn" data-delete-id="${escapeHtml(w.id)}" aria-label="Remove wish">
                🗑️ Remove
              </button>
            ` : ''}
          </div>
          <p class="wish-text">${escapeHtml(w.message)}</p>
          <span class="wish-time">${escapeHtml(w.time || 'Blessing')}</span>
        </article>
      `).join('');
    }

    // Attach inline delete listeners (active in admin mode)
    listEl.querySelectorAll('.wish-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-delete-id');
        if (!id) return;
        if (confirm('Are you sure you want to remove this wish? It will be removed from all screens.')) {
          try {
            btn.textContent = 'Removing...';
            btn.disabled = true;
            await deleteWish(id);
          } catch (err) {
            console.error('Failed to delete wish:', err);
            alert('Failed to remove wish: ' + (err.message || 'Error'));
            btn.textContent = '🗑️ Remove';
            btn.disabled = false;
          }
        }
      });
    });

    // Update Counter
    if (counterEl) {
      const count = allApprovedWishes.length;
      counterEl.textContent = count === 0
        ? 'Be the first to leave a blessing ✨'
        : (count === 1 ? '1 Heartfelt Blessing' : `${count} Heartfelt Blessings`);
    }

    // Update Load More Button
    if (loadMoreBtn) {
      const remaining = allApprovedWishes.length - currentLimit;
      if (remaining > 0) {
        loadMoreBtn.style.display = 'inline-flex';
        if (remainingCountEl) {
          remainingCountEl.textContent = `(${remaining} more)`;
        }
      } else {
        loadMoreBtn.style.display = 'none';
      }
    }
  }

  // Load More button click
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      currentLimit += PAGE_SIZE;
      renderPublicWishes();
    });
  }

  /* ---------------- Real-time Listeners ---------------- */

  // Public listener: only receives APPROVED wishes!
  subscribeToWishes(
    (approvedList) => {
      const existingIds = new Set(approvedList.map(w => w.id));
      const filteredHonorary = HONORARY_WISHES.filter(hw => !existingIds.has(hw.id));
      allApprovedWishes = [...approvedList, ...filteredHonorary];
      renderPublicWishes();
      renderApprovedReviewList(allApprovedWishes);
    },
    (err) => {
      console.warn('Real-time sync error:', err);
    }
  );

  // Admin listener: receives PENDING wishes for approval
  subscribeToPendingWishes(
    (pendingList) => {
      pendingWishesList = pendingList;
      renderPendingReviewList(pendingWishesList);
    },
    (err) => {
      console.warn('Pending wishes listener error:', err);
    }
  );

  /* ---------------- Admin Review Moderation Modal ---------------- */
  function checkAdminAuth(callback) {
    if (localStorage.getItem('ay_admin_authenticated') === 'true') {
      callback();
      return;
    }
    const pin = prompt('Enter Secret Passcode to Review Wishes:');
    if (pin === '2027' || pin === 'admin') {
      localStorage.setItem('ay_admin_authenticated', 'true');
      document.body.classList.add('admin-mode');
      callback();
    } else if (pin !== null) {
      alert('Incorrect passcode.');
    }
  }

  function openReviewModal() {
    if (!reviewDialog) return;
    checkAdminAuth(() => {
      reviewDialog.showModal();
    });
  }

  // Auto-open if ?review=true or ?admin=1 is in URL
  if (window.location.search.includes('review=') || window.location.search.includes('admin=')) {
    setTimeout(() => openReviewModal(), 500);
  }

  // Eyebrow 5-tap trigger
  let tapCount = 0;
  let tapTimer = null;
  if (eyebrowEl) {
    eyebrowEl.style.cursor = 'pointer';
    eyebrowEl.title = 'Moderation access';
    eyebrowEl.addEventListener('click', () => {
      tapCount++;
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => { tapCount = 0; }, 1500);
      if (tapCount >= 5) {
        tapCount = 0;
        openReviewModal();
      }
    });
  }

  // Close review dialog
  if (reviewCloseBtn && reviewDialog) {
    reviewCloseBtn.addEventListener('click', () => reviewDialog.close());
    reviewDialog.addEventListener('click', (e) => {
      if (e.target === reviewDialog) reviewDialog.close();
    });
  }

  // Tab switching in review modal
  if (tabPendingBtn && tabApprovedBtn) {
    tabPendingBtn.addEventListener('click', () => {
      tabPendingBtn.classList.add('is-active');
      tabApprovedBtn.classList.remove('is-active');
      if (reviewPendingList) reviewPendingList.style.display = 'flex';
      if (reviewApprovedList) reviewApprovedList.style.display = 'none';
    });

    tabApprovedBtn.addEventListener('click', () => {
      tabApprovedBtn.classList.add('is-active');
      tabPendingBtn.classList.remove('is-active');
      if (reviewApprovedList) reviewApprovedList.style.display = 'flex';
      if (reviewPendingList) reviewPendingList.style.display = 'none';
    });
  }

  function renderPendingReviewList(pendingWishes) {
    if (pendingBadgeCount) pendingBadgeCount.textContent = pendingWishes.length;
    if (!reviewPendingList) return;

    if (pendingWishes.length === 0) {
      reviewPendingList.innerHTML = `
        <div class="wishes-empty-state">
          <p>✨ No pending wishes. All wishes have been reviewed!</p>
        </div>
      `;
      return;
    }

    reviewPendingList.innerHTML = pendingWishes.map(w => `
      <article class="review-card">
        <div class="review-card-header">
          <h4 class="review-card-author">${escapeHtml(w.author)}</h4>
          <span class="review-card-time">${escapeHtml(w.time || 'Pending Review')}</span>
        </div>
        <p class="review-card-text">${escapeHtml(w.message)}</p>
        <div class="review-actions">
          <button type="button" class="btn-approve" data-approve-id="${escapeHtml(w.id)}">
            <span>✅ Approve & Publish</span>
          </button>
          <button type="button" class="btn-reject" data-reject-id="${escapeHtml(w.id)}">
            <span>❌ Decline</span>
          </button>
        </div>
      </article>
    `).join('');

    // Attach approve listeners
    reviewPendingList.querySelectorAll('[data-approve-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-approve-id');
        btn.disabled = true;
        btn.innerHTML = '<span>Publishing...</span>';
        try {
          await approveWish(id);
        } catch (err) {
          console.error('Failed to approve wish:', err);
          alert('Could not approve wish: ' + (err.message || 'Error'));
          btn.disabled = false;
          btn.innerHTML = '<span>✅ Approve & Publish</span>';
        }
      });
    });

    // Attach reject listeners
    reviewPendingList.querySelectorAll('[data-reject-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-reject-id');
        if (confirm('Decline and permanently remove this wish?')) {
          btn.disabled = true;
          btn.innerHTML = '<span>Removing...</span>';
          try {
            await deleteWish(id);
          } catch (err) {
            console.error('Failed to decline wish:', err);
            btn.disabled = false;
            btn.innerHTML = '<span>❌ Decline</span>';
          }
        }
      });
    });
  }

  function renderApprovedReviewList(approvedWishes) {
    if (approvedBadgeCount) approvedBadgeCount.textContent = approvedWishes.length;
    if (!reviewApprovedList) return;

    if (approvedWishes.length === 0) {
      reviewApprovedList.innerHTML = `
        <div class="wishes-empty-state">
          <p>No published wishes yet.</p>
        </div>
      `;
      return;
    }

    reviewApprovedList.innerHTML = approvedWishes.map(w => `
      <article class="review-card">
        <div class="review-card-header">
          <h4 class="review-card-author">${escapeHtml(w.author)}</h4>
          <span class="review-card-time">${escapeHtml(w.time || 'Live')}</span>
        </div>
        <p class="review-card-text">${escapeHtml(w.message)}</p>
        <div class="review-actions">
          <button type="button" class="btn-reject" data-unpublish-id="${escapeHtml(w.id)}">
            <span>🗑️ Remove from Live Site</span>
          </button>
        </div>
      </article>
    `).join('');

    reviewApprovedList.querySelectorAll('[data-unpublish-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-unpublish-id');
        if (confirm('Remove this wish from the live website?')) {
          btn.disabled = true;
          btn.innerHTML = '<span>Removing...</span>';
          try {
            await deleteWish(id);
          } catch (err) {
            console.error('Failed to remove wish:', err);
            btn.disabled = false;
            btn.innerHTML = '<span>🗑️ Remove from Live Site</span>';
          }
        }
      });
    });
  }

  /* ---------------- Form Submission ---------------- */
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = form.querySelector('[name="sender_name"]');
      const msgInput = form.querySelector('[name="text_content"]');
      const submitBtn = form.querySelector('button[type="submit"]');

      const author = nameInput.value.trim();
      const message = msgInput.value.trim();

      if (!author || !message) return;

      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Sending your blessing...</span> <span>🕊️</span>';
      }

      try {
        await submitWish({ author, message });

        nameInput.value = '';
        msgInput.value = '';

        // Trigger flower celebration
        if (submitBtn) {
          const rect = submitBtn.getBoundingClientRect();
          triggerConfetti(rect.left + rect.width / 2, rect.top);
        }

        // Show elegant confirmation note to guest
        const formCard = form.closest('.wish-form-card');
        if (formCard) {
          const existingNote = formCard.querySelector('.wish-success-note');
          if (existingNote) existingNote.remove();

          const note = document.createElement('div');
          note.className = 'wish-success-note';
          note.innerHTML = `
            <span class="success-icon">🕊️</span>
            <h4>Thank You, ${escapeHtml(author)}!</h4>
            <p>Your loving blessing has been received by Ankush & Yamini with warmth and gratitude.</p>
          `;
          form.insertAdjacentElement('afterend', note);
          setTimeout(() => { note.remove(); }, 12000);
        }
      } catch (err) {
        console.error('Failed to submit wish:', err);
        alert('Could not submit wish. Please check your connection and try again.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      }
    });
  }
}

/* ==========================================================================
   6. Navigation & Mobile Menu
   ========================================================================== */
function initNavigation() {
  const toggle = document.getElementById('mobile-nav-toggle');
  const navLinks = document.getElementById('nav-links');
  const siteNav = document.querySelector('.site-nav');

  if (toggle && navLinks) {
    const closeMenu = () => {
      navLinks.classList.remove('mobile-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '☰';
    };

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navLinks.classList.toggle('mobile-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.innerHTML = isOpen ? '✕' : '☰';
    });

    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        closeMenu();
      });
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (siteNav && !siteNav.contains(e.target)) {
        if (navLinks.classList.contains('mobile-open')) {
          closeMenu();
        }
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('mobile-open')) {
        closeMenu();
      }
    });
  }
}

/* ==========================================================================
   7. Background Audio Controller
   ========================================================================== */
function initAudioController() {
  const musicBtn = document.getElementById('music-toggle-btn');
  if (!musicBtn || !window.weddingAudio) return;

  let lastTriggerTime = 0;
  const handleToggle = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const now = Date.now();
    if (now - lastTriggerTime < 300) return;
    lastTriggerTime = now;

    window.weddingAudio.toggle();
  };

  // If loader is absent or already dismissed, reveal button immediately
  const loader = document.getElementById('film-loader');
  if (!loader || loader.classList.contains('is-done')) {
    musicBtn.classList.add('is-visible');
  }

  musicBtn.addEventListener('click', handleToggle);
  musicBtn.addEventListener('touchend', handleToggle, { passive: false });
}

/* ==========================================================================
   8. Hero Video Autoplay Management
   ========================================================================== */
function initHeroVideoAutoplay() {
  const video = document.getElementById('hero-main-video');
  if (!video) return;

  // Guarantee muted state on properties and attributes (required for unrestricted browser autoplay)
  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');

  const startPlayback = () => {
    video.muted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Will activate on first interaction if blocked by browser policy
      });
    }
  };

  // Attempt play immediately and on media ready events
  startPlayback();
  video.addEventListener('loadeddata', startPlayback, { once: true });
  video.addEventListener('canplay', startPlayback, { once: true });

  // First interaction fallback (tap/click/scroll)
  const onFirstInteraction = () => {
    if (video.paused) {
      startPlayback();
    }
    window.removeEventListener('touchstart', onFirstInteraction);
    window.removeEventListener('click', onFirstInteraction);
    window.removeEventListener('scroll', onFirstInteraction);
  };
  window.addEventListener('touchstart', onFirstInteraction, { once: true, passive: true });
  window.addEventListener('click', onFirstInteraction, { once: true });
  window.addEventListener('scroll', onFirstInteraction, { once: true, passive: true });
}

/* ==========================================================================
   9. RSVP Copy Phone Number
   ========================================================================== */
function initRsvpCopy() {
  const copyButtons = document.querySelectorAll('.copy-phone-btn');
  if (!copyButtons.length) return;

  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const phone = btn.getAttribute('data-phone');
      const textSpan = btn.querySelector('.copy-phone-text') || btn.querySelector('span:last-child');
      const originalText = textSpan ? textSpan.textContent : 'Copy Number';

      if (!phone || phone.includes('[') || phone.includes('number')) {
        if (textSpan) {
          textSpan.textContent = 'Coming soon';
          setTimeout(() => { textSpan.textContent = originalText; }, 2000);
        }
        return;
      }

      const showCopied = () => {
        if (textSpan) textSpan.textContent = 'Copied!';
        btn.style.borderColor = 'var(--gold-amber)';
        setTimeout(() => {
          if (textSpan) textSpan.textContent = originalText;
          btn.style.borderColor = '';
        }, 2500);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(phone).then(showCopied).catch(() => fallbackCopy(phone, showCopied));
      } else {
        fallbackCopy(phone, showCopied);
      }
    });
  });

  function fallbackCopy(text, callback) {
    const temp = document.createElement('textarea');
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    try {
      document.execCommand('copy');
      if (callback) callback();
    } catch (err) {}
    document.body.removeChild(temp);
  }
}

