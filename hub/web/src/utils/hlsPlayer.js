let hlsModulePromise = null;

function loadHlsConstructor() {
  if (!hlsModulePromise) {
    hlsModulePromise = import('hls.js/dist/hls.light.mjs')
      .then(mod => mod?.default || mod)
      .catch(() => null);
  }
  return hlsModulePromise;
}

function isAppleSafariOrIosWebKit() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIos =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints) > 1);
  if (isIos) return true;
  return /AppleWebKit/i.test(ua) && /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|FxiOS/i.test(ua);
}

export function destroyHlsPlayer(videoEl) {
  if (!videoEl) return;
  const existing = videoEl.__dshHlsInstance;
  if (existing) {
    delete videoEl.__dshHlsInstance;
    try {
      existing.destroy();
    } catch {}
  }
}

export async function attachSmartHlsPlayer(
  videoEl,
  { hlsUrl = '', fallbackSrc = '', onFallback = null } = {}
) {
  if (!videoEl) return false;
  destroyHlsPlayer(videoEl);

  if (!hlsUrl) {
    if (fallbackSrc && videoEl.getAttribute('src') !== fallbackSrc) {
      videoEl.src = fallbackSrc;
    }
    return false;
  }

  const canNative = Boolean(
    videoEl.canPlayType?.('application/vnd.apple.mpegurl') ||
      videoEl.canPlayType?.('application/x-mpegURL')
  );

  // 1. iPhone / iPad / macOS Safari: use Apple's zero-overhead native C++ HLS engine directly
  if (canNative && isAppleSafariOrIosWebKit()) {
    videoEl.dataset.dshHlsActive = 'native';
    videoEl.src = hlsUrl;
    return true;
  }

  // 2. Chrome / Edge / Firefox / Android / Feishu WebView: lazy-load hls.js light MSE engine
  const Hls = await loadHlsConstructor();
  if (!videoEl.isConnected) return false;

  if (Hls && typeof Hls.isSupported === 'function' && Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 30,
      maxBufferLength: 18,
      maxMaxBufferLength: 36,
      manifestLoadingMaxRetry: 2,
      manifestLoadingRetryDelay: 500,
      fragLoadingMaxRetry: 4,
      fragLoadingRetryDelay: 600,
    });
    videoEl.__dshHlsInstance = hls;
    videoEl.dataset.dshHlsActive = 'mse';
    let mediaRecoveredOnce = false;

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data?.fatal) return;
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !mediaRecoveredOnce) {
        mediaRecoveredOnce = true;
        try {
          hls.recoverMediaError();
          return;
        } catch {}
      }
      destroyHlsPlayer(videoEl);
      delete videoEl.dataset.dshHlsActive;
      if (fallbackSrc && videoEl.isConnected) {
        videoEl.dataset.dshHlsFailed = '1';
        videoEl.src = fallbackSrc;
        try {
          videoEl.load();
        } catch {}
        onFallback?.();
      }
    });

    hls.loadSource(hlsUrl);
    hls.attachMedia(videoEl);
    return true;
  }

  // 3. Fallback if browser lacks MSE but advertises native m3u8 support
  if (canNative) {
    videoEl.dataset.dshHlsActive = 'native';
    videoEl.src = hlsUrl;
    return true;
  }

  // 4. Ultimate fallback: direct HTTP Range stream
  if (fallbackSrc) {
    videoEl.src = fallbackSrc;
  }
  return false;
}
