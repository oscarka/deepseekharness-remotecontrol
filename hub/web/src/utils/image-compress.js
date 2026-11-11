// Low-memory iOS WebKit-safe screenshot & photo compressor.
// Avoids upfront multi-MB `FileReader.readAsDataURL` UTF-16 string allocation,
// enforces canvas max area (< 3.6M px vs iOS Safari 16.7M px GPU crash limit),
// releases canvas VRAM immediately (`width = 0`), and caps output payload size
// so mobile proxy HTTP/2 POSTs never stall or wedge the connection.

const MAX_DIMENSION_PX = 1440;
const MAX_CANVAS_AREA_PX = 3_600_000;
const MAX_RAW_FALLBACK_BYTES = 1.2 * 1024 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.decoding = 'async';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Image decode failed'));
    el.src = src;
  });
}

function encodeCanvasJpeg(img, targetW, targetH, quality) {
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    // Release iOS Safari / WebKit backing store VRAM immediately
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function compressImageFile(file) {
  if (!file) throw new Error('未选择图片文件');
  const origMime = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';
  const origName = file.name || `screenshot-${Date.now()}.jpg`;
  const baseName = origName.replace(/\.[a-zA-Z0-9]+$/, '') || 'screenshot';

  // Small images (< 220 KB) can be read directly if dimensions are safe,
  // but we decode via lightweight ObjectURL first to avoid multi-MB RAM spikes.
  const canUseObjectUrl =
    typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
  let objectUrl = '';

  try {
    const decodeSrc = canUseObjectUrl
      ? ((objectUrl = URL.createObjectURL(file)), objectUrl)
      : await readFileAsDataUrl(file);
    const img = await loadImageElement(decodeSrc);
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;

    if (w > 0 && h > 0) {
      const area = w * h;
      const needsResize = w > MAX_DIMENSION_PX || h > MAX_DIMENSION_PX || area > MAX_CANVAS_AREA_PX;
      const needsCompress = (file.size || 0) > 220 * 1024;

      if (!needsResize && !needsCompress) {
        const smallDataUrl = objectUrl ? await readFileAsDataUrl(file) : decodeSrc;
        const commaIdx = smallDataUrl.indexOf(',');
        const rawBase64 = commaIdx >= 0 ? smallDataUrl.slice(commaIdx + 1) : smallDataUrl;
        return {
          name: origName,
          mimeType: origMime,
          dataBase64: rawBase64,
          previewUrl: smallDataUrl,
          sizeBytes: file.size || Math.round((rawBase64.length * 3) / 4),
          width: w,
          height: h,
        };
      }

      const sideScale = MAX_DIMENSION_PX / Math.max(w, h);
      const areaScale = Math.sqrt(MAX_CANVAS_AREA_PX / area);
      const scale = Math.min(1, sideScale, areaScale);
      let targetW = Math.max(1, Math.round(w * scale));
      let targetH = Math.max(1, Math.round(h * scale));

      let outDataUrl = encodeCanvasJpeg(img, targetW, targetH, 0.8);
      if (outDataUrl && outDataUrl.length > 650_000) {
        outDataUrl = encodeCanvasJpeg(img, targetW, targetH, 0.62) || outDataUrl;
      }
      if (outDataUrl && outDataUrl.length > 900_000) {
        targetW = Math.max(1, Math.round(targetW * 0.75));
        targetH = Math.max(1, Math.round(targetH * 0.75));
        outDataUrl = encodeCanvasJpeg(img, targetW, targetH, 0.58) || outDataUrl;
      }

      if (outDataUrl) {
        const outComma = outDataUrl.indexOf(',');
        const outBase64 = outComma >= 0 ? outDataUrl.slice(outComma + 1) : outDataUrl;
        return {
          name: `${baseName}.jpg`,
          mimeType: 'image/jpeg',
          dataBase64: outBase64,
          previewUrl: outDataUrl,
          sizeBytes: Math.round((outBase64.length * 3) / 4),
          width: targetW,
          height: targetH,
        };
      }
    }
  } catch {
    // Fall through to bounded raw fallback check below
  } finally {
    if (objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // ignore
      }
    }
  }

  if ((file.size || 0) > MAX_RAW_FALLBACK_BYTES) {
    throw new Error('图片体积过大或格式暂不支持直接解码，请截图为 PNG/JPG 后重试');
  }

  const fallbackDataUrl = await readFileAsDataUrl(file);
  const commaIdx = fallbackDataUrl.indexOf(',');
  const rawBase64 = commaIdx >= 0 ? fallbackDataUrl.slice(commaIdx + 1) : fallbackDataUrl;
  return {
    name: origName,
    mimeType: origMime,
    dataBase64: rawBase64,
    previewUrl: fallbackDataUrl,
    sizeBytes: file.size || Math.round((rawBase64.length * 3) / 4),
  };
}
