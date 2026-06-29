<style>
.scrolling-video video,
.scrolling-video .e-hosted-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 2px;
  opacity: 0.01;
  overflow: hidden;
  pointer-events: none;
  background: transparent !important;
}

.vs-spacer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  pointer-events: none;
}

.vs-cv-wrap {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}

.vs-cv {
  width: 100%;
  height: 100%;
  display: block;
}

.vs-loading {
  position: absolute;
  inset: 0;
  z-index: 2;
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  opacity: 1;
  transition: opacity 0.6s ease;
  pointer-events: none;
  animation: vs-pulse 2.6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}

.vs-loading.vs-loaded {
  opacity: 0;
  animation: none;
}

@keyframes vs-pulse {
  0%, 100% { background: rgba(0, 0, 0, 0.1); }
  50%      { background: rgba(0, 0, 0, 0.4); }
}
</style>

<script>
;(function () {

  // ================= EDIT THESE =================
  const TARGET_W = 1280; // downscale frames to cap memory (0 = keep source res)
  // ==============================================

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
      spacer.style.height = container.offsetHeight + 'px';
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

      const s =
        fit === 'cover'
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

      total = spacer.offsetHeight - wrap.offsetHeight;

      const rect = container.getBoundingClientRect();

      const p =
        total > 0
          ? Math.min(1, Math.max(0, -rect.top / total))
          : 0;

      const i = Math.round(p * (N - 1));

      if (i !== drawn) draw(i);
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
        resizeHeight: Math.round(
          TARGET_W * vid.videoHeight / vid.videoWidth
        ),
        resizeQuality: 'high'
      };
    }

    async function grab(slot) {
      const b = await createImageBitmap(vid, bitmapOpts());

      if (!iw) {
        iw = b.width;
        ih = b.height;
      }

      frames[slot] = b;

      if (slot === 0) {
        resizeCanvas();
        draw(0);
      }
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

        if (!vid.ended) {
          vid.requestVideoFrameCallback(cb);
        }
      };

      vid.requestVideoFrameCallback(cb);

      vid.addEventListener(
        'ended',
        async () => {
          await Promise.all(pending);
          finish();
        },
        { once: true }
      );

      const p = vid.play();

      if (p) {
        p.catch(extractBySeek);
      }
    }

    async function extractBySeek() {
      const dur = vid.duration || 1;
      const step = 1 / 30;

      let slot = 0;

      for (let t = 0; t < dur; t += step) {
        vid.currentTime = t;

        await new Promise((r) =>
          vid.addEventListener('seeked', r, { once: true })
        );

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

  document
    .querySelectorAll('.scroling-video-container')
    .forEach(initScrollVideo);

})();
</script>