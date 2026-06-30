// Import styles
import './style.css';

// ── Scroll restoration ─────────────────────────────────────────────────────
// Prevent browser from jumping to the previous scroll position on reload.
if (history.scrollRestoration) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// ── Auth modal helpers ─────────────────────────────────────────────────────
function openAuthModal(modalEl) {
  modalEl.classList.add('auth-open');
  document.body.style.overflow = 'hidden';
}

function closeAuthModal(modalEl) {
  modalEl.classList.remove('auth-open');
  // Restore body scroll only if lead-modal is also gone
  const leadModal = document.getElementById('lead-modal');
  if (!leadModal || leadModal.style.display === 'none' || parseFloat(leadModal.style.opacity) === 0) {
    document.body.style.overflow = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // ── Element refs ──────────────────────────────────────────────────────────
  const modal          = document.getElementById('lead-modal');
  const leadForm       = document.getElementById('lead-form');
  const btnLater       = document.getElementById('btn-later');
  const videoContainer = document.getElementById('video-container');
  const robotCheck     = document.getElementById('robot-check');
  const topHeader      = document.getElementById('top-header');
  const bottomFooter   = document.getElementById('bottom-footer');
  const ctaOverlay     = document.getElementById('cta-overlay');

  // Auth modal refs
  const loginModal      = document.getElementById('login-modal');
  const signupModal     = document.getElementById('signup-modal');
  const btnLogin        = document.getElementById('btn-login');
  const btnSignup       = document.getElementById('btn-signup');
  const loginCloseBtn   = document.getElementById('login-close-btn');
  const signupCloseBtn  = document.getElementById('signup-close-btn');
  const switchToSignup  = document.getElementById('switch-to-signup');
  const switchToLogin   = document.getElementById('switch-to-login');

  // ── Scroll animation state ────────────────────────────────────────────────
  let cancelCurrentScroll = null;
  let animationTriggered  = false;     // true after modal is dismissed
  let upwardOnlyActive    = false;     // true after reaching stop
  let phase1Stop          = 1480;      // dynamic stop point in scroll px (default fallback)

  // ── Lock scroll initially (lead modal flow) ───────────────────────────────
  document.body.style.overflow = 'hidden';
  window.scrollTo(0, 0);
  setTimeout(() => window.scrollTo(0, 0), 50);

  // ── Start buffering video frames immediately ──────────────────────────────
  initScrollVideo(videoContainer);

  // ── 3-second robot-check countdown ───────────────────────────────────────
  let count = 3;
  const countEl = document.getElementById('countdown');
  const timerInterval = setInterval(() => {
    count--;
    if (count > 0) {
      countEl.textContent = count;
    } else {
      clearInterval(timerInterval);
    }
  }, 1000);

  setTimeout(() => {
    robotCheck.style.opacity = '0';
    setTimeout(() => {
      robotCheck.style.display = 'none';
      modal.style.transition = 'opacity 1s ease';
      modal.style.opacity = '1';
      modal.style.pointerEvents = 'auto';
    }, 1000);
  }, 3000);

  // ── autoScrollSegment ────────────────────────────────────────────────────
  function autoScrollSegment(startPixel, endPixel, durationMs, onComplete) {
    const startTime = performance.now();
    let canceled = false;

    cancelCurrentScroll = () => { canceled = true; };

    function step(currentTime) {
      if (canceled) return;
      const elapsed  = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased    = easeInOutCubic(progress);
      const currentY = startPixel + (endPixel - startPixel) * eased;
      window.scrollTo(0, currentY);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else if (onComplete) {
        onComplete();
      }
    }
    requestAnimationFrame(step);
  }

  // Smooth easing so the scroll feels natural rather than linear
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // ── Enable upward-only scroll past phase1Stop ─────────────────────────────
  function enableUpwardOnlyScroll() {
    upwardOnlyActive = true;
    document.body.style.overflow = ''; // release the lock — scrollbar appears

    let clampScheduled = false;
    window.addEventListener('scroll', () => {
      if (!upwardOnlyActive) return;
      if (window.scrollY > phase1Stop && !clampScheduled) {
        clampScheduled = true;
        // Push back to stop point on next frame to avoid jank
        requestAnimationFrame(() => {
          window.scrollTo({ top: phase1Stop, behavior: 'instant' });
          clampScheduled = false;
        });
      }
    }, { passive: true });
  }

  // ── CTA Overlay Helpers ───────────────────────────────────────────────────
  function showCtaOverlay() {
    if (!ctaOverlay) return;
    if (ctaOverlay.style.display === 'none') {
      ctaOverlay.style.display = 'flex';
      void ctaOverlay.offsetWidth; // force layout engine reflow
    }
    ctaOverlay.classList.add('cta-visible');
  }

  function hideCtaOverlay() {
    if (!ctaOverlay) return;
    if (ctaOverlay.classList.contains('cta-visible')) {
      ctaOverlay.classList.remove('cta-visible');
      // Hide completely after fade-out transition (0.8s)
      setTimeout(() => {
        if (!ctaOverlay.classList.contains('cta-visible')) {
          ctaOverlay.style.display = 'none';
        }
      }, 800);
    }
  }

  // ── Header / footer darkening when scrolled to the very top ──────────────
  function updateHeaderFooterDim() {
    if (!animationTriggered) return;
    if (window.scrollY < 30) {
      topHeader.classList.add('darkened');
      bottomFooter.classList.add('darkened');
    } else {
      topHeader.classList.remove('darkened');
      bottomFooter.classList.remove('darkened');
    }
  }

  window.addEventListener('scroll', updateHeaderFooterDim, { passive: true });

  // ── dismissModal (lead capture → animation sequence) ─────────────────────
  function dismissModal() {
    modal.style.transition = 'opacity 1.5s ease';
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';

    setTimeout(() => {
      modal.style.display = 'none';
      animationTriggered = true;

      // Show "Welcome" banner
      const welcomeBanner = document.getElementById('welcome-banner');
      welcomeBanner.style.display = 'flex';
      welcomeBanner.style.transition = 'opacity 1.5s ease';
      void welcomeBanner.offsetWidth;
      welcomeBanner.style.opacity = '1';

      setTimeout(() => {
        // Fade out banner over 1.5s to overlap with the start of the scroll animation
        welcomeBanner.style.transition = 'opacity 1.5s ease';
        welcomeBanner.style.opacity = '0';

        // Phase 1 — auto-scroll to stop point (overlapping with the banner fade out)
        autoScrollSegment(window.scrollY, phase1Stop, 5000, () => {
          console.log('Reached stop. Enabling upward-only scroll.');
          enableUpwardOnlyScroll();
          // Darken header/footer since we're at the stop (not at top)
          updateHeaderFooterDim();
          // Guarantee the CTA overlay shows immediately when auto-scroll completes
          showCtaOverlay();
        });

        setTimeout(() => {
          welcomeBanner.style.display = 'none';
        }, 1500);

      }, 1500 + 1000); // 1.5s fade-in + 1s read time

    }, 1500);
  }

  // ── Lead form submission ──────────────────────────────────────────────────
  leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('phone-number').value;
    if (window.mockSubmitLead) {
      await window.mockSubmitLead(phone);
    }
    dismissModal();
  });

  // ── Phone input masking ───────────────────────────────────────────────────
  const phoneInput = document.getElementById('phone-number');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      let x = e.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
      e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    });
  }

  // ── "Maybe Later" ────────────────────────────────────────────────────────
  btnLater.addEventListener('click', () => {
    dismissModal();
  });

  // ── LOGIN MODAL ───────────────────────────────────────────────────────────
  btnLogin.addEventListener('click', () => {
    closeAuthModal(signupModal);
    openAuthModal(loginModal);
  });

  loginCloseBtn.addEventListener('click', () => closeAuthModal(loginModal));

  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) closeAuthModal(loginModal);
  });

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    // TODO: wire up real auth
    closeAuthModal(loginModal);
  });

  // ── SIGN UP MODAL ─────────────────────────────────────────────────────────
  btnSignup.addEventListener('click', () => {
    closeAuthModal(loginModal);
    openAuthModal(signupModal);
  });

  signupCloseBtn.addEventListener('click', () => closeAuthModal(signupModal));

  signupModal.addEventListener('click', (e) => {
    if (e.target === signupModal) closeAuthModal(signupModal);
  });

  document.getElementById('signup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    // TODO: wire up real auth
    closeAuthModal(signupModal);
  });

  // ── Switch between auth modals ────────────────────────────────────────────
  switchToSignup.addEventListener('click', () => {
    closeAuthModal(loginModal);
    openAuthModal(signupModal);
  });

  switchToLogin.addEventListener('click', () => {
    closeAuthModal(signupModal);
    openAuthModal(loginModal);
  });

  // ── Password visibility toggles ───────────────────────────────────────────
  document.querySelectorAll('.toggle-pw').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁' : '🙈';
    });
  });

  // ── Escape key closes auth modals ─────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAuthModal(loginModal);
      closeAuthModal(signupModal);
    }
  });

  // ============================================================
  // Scroll-bound video animation logic
  // ============================================================
  const TARGET_W = 1280;

  function initScrollVideo(container) {
    const videoWidget = container.querySelector('.scrolling-video');
    const vid = videoWidget ? videoWidget.querySelector('video') : null;
    if (!vid) return;

    vid.muted = true;
    vid.setAttribute('playsinline', '');
    vid.removeAttribute('controls');
    vid.preload = 'auto';

    try { vid.crossOrigin = 'anonymous'; } catch (e) {}

    const spacer  = document.createElement('div');
    spacer.className = 'vs-spacer';

    const wrap = document.createElement('div');
    wrap.className = 'vs-cv-wrap';

    const cv = document.createElement('canvas');
    cv.className = 'vs-cv';

    const loading = document.createElement('div');
    loading.className = 'vs-loading';

    wrap.appendChild(cv);
    wrap.appendChild(loading);
    spacer.appendChild(wrap);
    container.appendChild(spacer);

    const ctx = cv.getContext('2d', { alpha: true });

    const frames = [];
    let N = 0, iw = 0, ih = 0, drawn = -1;
    let spacerHeight = 0;
    let scrollableDistance = 0;

    function syncSpacerHeight() {
      const computed = window.innerHeight * 5;
      spacerHeight = Math.max(computed, 3000);
      spacer.style.height = spacerHeight + 'px';
      scrollableDistance = spacerHeight - window.innerHeight;

      // Calculate the scroll position corresponding to 4.5 seconds of the video
      if (vid && vid.duration) {
        const targetTime = Math.min(4.5, vid.duration);
        phase1Stop = Math.round((targetTime / vid.duration) * scrollableDistance);
      }
    }

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width  = Math.round(wrap.clientWidth  * dpr);
      cv.height = Math.round(wrap.clientHeight * dpr);
      drawn = -1;
    }

    function draw(i) {
      const b = frames[i];
      if (!b) return;
      const cw = cv.width, ch = cv.height;

      // Contain scaling: keep 1:1 aspect ratio, no stretching, centered
      const s = Math.min(cw / iw, ch / ih);
      const dw = iw * s;
      const dh = ih * s;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(b, dx, dy, dw, dh);
      drawn = i;
    }

    function render() {
      if (!N) return;
      let p = 0;
      const scrollTop = window.scrollY !== undefined ? window.scrollY : window.pageYOffset;
      if (scrollableDistance > 0) {
        p = Math.min(1, Math.max(0, scrollTop / scrollableDistance));
      }
      const i = Math.round(p * (N - 1));
      if (i !== drawn) draw(i);

      // Trigger CTA overlay when scroll is close to phase1Stop (video 4.5s)
      if (animationTriggered) {
        if (scrollTop >= phase1Stop - 15) {
          showCtaOverlay();
        } else {
          hideCtaOverlay();
        }
      }
    }

    window.addEventListener('scroll', render, { passive: true });
    window.addEventListener('resize', () => {
      syncSpacerHeight();
      resizeCanvas();
      render();
    });

    function bitmapOpts() {
      if (!TARGET_W || !vid.videoWidth) return undefined;
      return {
        resizeWidth:   TARGET_W,
        resizeHeight:  Math.round(TARGET_W * vid.videoHeight / vid.videoWidth),
        resizeQuality: 'high',
      };
    }

    async function grab(slot) {
      const b = await createImageBitmap(vid, bitmapOpts());
      if (!iw) { iw = b.width; ih = b.height; }
      frames[slot] = b;
      if (slot === 0) { resizeCanvas(); draw(0); }
    }

    function prewarmGPU() {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 1;
      tempCanvas.height = 1;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        for (let i = 0; i < frames.length; i++) {
          if (frames[i]) {
            tempCtx.drawImage(frames[i], 0, 0, 1, 1);
          }
        }
      }
    }

    function finish() {
      N = frames.length;
      prewarmGPU();
      render();
      loading.classList.add('vs-loaded');
    }

    function extractByPlay() {
      let slot = 0;
      const pending = [];
      const cb = () => {
        pending.push(grab(slot++));
        if (!vid.ended) vid.requestVideoFrameCallback(cb);
      };
      vid.requestVideoFrameCallback(cb);
      vid.addEventListener('ended', async () => {
        await Promise.all(pending);
        finish();
      }, { once: true });
      const p = vid.play();
      if (p) p.catch(extractBySeek);
    }

    async function extractBySeek() {
      const dur  = vid.duration || 1;
      const step = 1 / 30;
      let slot = 0;
      for (let t = 0; t < dur; t += step) {
        vid.currentTime = t;
        await new Promise((r) => vid.addEventListener('seeked', r, { once: true }));
        await grab(slot++);
      }
      finish();
    }

    function start() {
      syncSpacerHeight();
      resizeCanvas();
      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        extractByPlay();
      } else {
        extractBySeek();
      }
    }

    if (vid.readyState >= 1) {
      start();
    } else {
      vid.addEventListener('loadedmetadata', start, { once: true });
    }
  }

  // ── Countdown Timer ───────────────────────────────────────────────────────
  const publishMeta = document.querySelector('meta[name="publish-date"]');
  const publishDateStr = publishMeta ? publishMeta.getAttribute('content') : null;
  const startDate = publishDateStr ? new Date(publishDateStr) : new Date();

  // Set end date to exactly one week (7 days) after the publish/metadata date
  const targetDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  const timerEl = document.getElementById('countdown-timer');
  if (timerEl) {
    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        timerEl.textContent = "00d 00h 00m 00s";
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      const pad = (num) => String(num).padStart(2, '0');
      timerEl.textContent = `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    };

    updateTimer();
    setInterval(updateTimer, 1000);
  }

});
