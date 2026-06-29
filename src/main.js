// Import styles
import './style.css';

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('lead-modal');
  const leadForm = document.getElementById('lead-form');
  const btnLater = document.getElementById('btn-later');
  const btnWholesale = document.getElementById('btn-wholesale');
  const videoContainer = document.getElementById('video-container');
  const robotCheck = document.getElementById('robot-check');

  // Lock scroll initially
  document.body.style.overflow = 'hidden';

  // Start buffering and loading frames immediately behind the loading screens
  initScrollVideo(videoContainer);

  // 3-second loading sequence with countdown
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
    // Fade out robot check
    robotCheck.style.opacity = '0';
    
    // Slowly fade in the modal
    setTimeout(() => {
      robotCheck.style.display = 'none';
      modal.style.transition = 'opacity 1s ease';
      modal.style.opacity = '1';
      modal.style.pointerEvents = 'auto';
    }, 1000);
  }, 3000);

  function dismissModal() {
    // 1. Fade out modal over 1.5s
    modal.style.transition = 'opacity 1.5s ease';
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
    
    setTimeout(() => {
      modal.style.display = 'none';
      
      // 2. Fade in "Welcome" banner over 1.5s
      const welcomeBanner = document.getElementById('welcome-banner');
      welcomeBanner.style.display = 'flex';
      welcomeBanner.style.transition = 'opacity 1.5s ease';
      
      // Force browser reflow to ensure transition works
      void welcomeBanner.offsetWidth; 
      welcomeBanner.style.opacity = '1';
      
      // Keep banner visible for 1 second, then fade out and scroll
      setTimeout(() => {
        // 3. Fade out banner over 0.7s
        welcomeBanner.style.transition = 'opacity 0.7s ease';
        welcomeBanner.style.opacity = '0';
        
        // 4. At the exact same time, start the auto-scroll
        autoScrollToBottom(10000);
        
        setTimeout(() => {
          welcomeBanner.style.display = 'none';
        }, 700);
      }, 1500 + 1000); // 1.5s fade in + 1s read time
      
    }, 1500);
  }

  function autoScrollToBottom(durationMs) {
    // Determine how far down we need to scroll
    const targetY = document.body.scrollHeight - window.innerHeight;
    const startY = window.scrollY;
    const startTime = performance.now();

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      
      // Linear progress keeps video playback steady
      const currentY = startY + (targetY - startY) * progress;
      window.scrollTo(0, currentY);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Unlock scroll at the very end so they can scroll back up
        document.body.style.overflow = '';
      }
    }
    
    requestAnimationFrame(step);
  }

  // Handle lead form submission
  leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('phone-number').value;
    
    // Call mock API
    if (window.mockSubmitLead) {
      await window.mockSubmitLead(phone);
    }
    
    dismissModal();
  });

  // Phone masking
  const phoneInput = document.getElementById('phone-number');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      let x = e.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
      e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    });
  }


  // Handle "Maybe Later"
  btnLater.addEventListener('click', () => {
    dismissModal();
  });

  // Handle CTA button
  btnWholesale.addEventListener('click', () => {
    window.location.href = '/wholesale';
  });

  // ============================================
  // Scroll-bound video animation logic (from sample)
  // ============================================
  const TARGET_W = 1280;

  function getFit() {
    return window.innerWidth > 1024 ? 'cover' : 'contain';
  }

  function initScrollVideo(container) {
    const videoWidget = container.querySelector('.scrolling-video');
    const vid = videoWidget ? videoWidget.querySelector('video') : null;
    if (!vid) return;

    vid.muted = true;
    vid.setAttribute('playsinline', '');
    vid.removeAttribute('controls');
    vid.preload = 'auto';

    try {
      vid.crossOrigin = 'anonymous';
    } catch (e) {}

    const spacer = document.createElement('div');
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
    let N = 0;
    let iw = 0;
    let ih = 0;
    let drawn = -1;
    let total = 0;

    function syncSpacerHeight() {
      // Create a virtual height for scrolling
      spacer.style.height = (window.innerHeight * 5) + 'px'; 
    }

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(wrap.clientWidth * dpr);
      cv.height = Math.round(wrap.clientHeight * dpr);
      drawn = -1;
    }

    function draw(i) {
      const b = frames[i];
      if (!b) return;

      const cw = cv.width;
      const ch = cv.height;
      const fit = getFit();

      const s = fit === 'cover'
        ? Math.max(cw / iw, ch / ih)
        : Math.min(cw / iw, ch / ih);

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
      
      // Calculate scroll progress based on the spacer's position
      const rect = spacer.getBoundingClientRect();
      const scrollableDistance = rect.height - window.innerHeight;
      
      let p = 0;
      if (scrollableDistance > 0) {
        // Calculate how far we've scrolled down the spacer
        const scrolled = -rect.top;
        p = Math.min(1, Math.max(0, scrolled / scrollableDistance));
      }

      const i = Math.round(p * (N - 1));
      if (i !== drawn) draw(i);
      
      // Show CTA if at the bottom
      const cta = document.getElementById('bottom-cta');
      if (p >= 0.99) {
        cta.classList.add('active');
        container.classList.add('dimmed');
      } else {
        cta.classList.remove('active');
        container.classList.remove('dimmed');
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
        resizeWidth: TARGET_W,
        resizeHeight: Math.round(TARGET_W * vid.videoHeight / vid.videoWidth),
        resizeQuality: 'high'
      };
    }

    async function grab(slot) {
      const b = await createImageBitmap(vid, bitmapOpts());
      if (!iw) { iw = b.width; ih = b.height; }
      frames[slot] = b;
      if (slot === 0) { resizeCanvas(); draw(0); }
    }

    function finish() {
      N = frames.length;
      render();
      loading.classList.add('vs-loaded');
    }

    function extractByPlay() {
      let slot = 0;
      const pending = [];
      const cb = () => {
        pending.push(grab(slot++));
        if (!vid.ended) { vid.requestVideoFrameCallback(cb); }
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
      const dur = vid.duration || 1;
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

});
