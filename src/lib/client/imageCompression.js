// src/lib/client/imageCompression.js

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

const getExtFromMime = (mime) => MIME_TO_EXT[mime] || 'webp';

export const formatBytes = (bytes) => {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const isCanvasMimeSupported = (mime) => {
  try {
    const c = document.createElement('canvas');
    const data = c.toDataURL(mime);
    return data.startsWith(`data:${mime}`);
  } catch {
    return false;
  }
};

const canvasToBlob = (canvas, mimeType, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Failed to encode image'));
        resolve(blob);
      },
      mimeType,
      quality
    );
  });

const loadBitmap = async (file) => {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // fallback below
    }
  }

  const img = await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => {
      URL.revokeObjectURL(url);
      resolve(i);
    };
    i.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    i.src = url;
  });

  return img;
};

export const compressImageFile = async (file, options = {}) => {
  if (!file) throw new Error('No file provided');
  if (!String(file.type || '').startsWith('image/')) {
    throw new Error('Only image files can be compressed');
  }

  const {
    targetSizeKB = 70,
    maxWidth = 1920,
    maxHeight = 1920,
    mimeType = 'image/webp',

    initialQuality = 0.92,
    minQuality = 0.65,
    qualityStep = 0.07,

    resizeStep = 0.85,
    minScale = 0.35,

    maxIterations = 12,
  } = options;

  const targetBytes = Math.max(1, Number(targetSizeKB) * 1024);

  let outputMime = mimeType;
  if (!isCanvasMimeSupported(outputMime)) outputMime = 'image/jpeg';

  if (file.size <= targetBytes && file.type === outputMime) {
    return {
      file,
      originalBytes: file.size,
      compressedBytes: file.size,
      width: null,
      height: null,
      quality: null,
      mimeType: file.type,
      skipped: true,
    };
  }

  const bitmap = await loadBitmap(file);
  const srcW = bitmap.width;
  const srcH = bitmap.height;

  const scaleW = maxWidth ? maxWidth / srcW : 1;
  const scaleH = maxHeight ? maxHeight / srcH : 1;
  let scale = Math.min(1, scaleW, scaleH);

  let width = Math.max(1, Math.round(srcW * scale));
  let height = Math.max(1, Math.round(srcH * scale));

  let best = null;
  let quality = initialQuality;

  for (let i = 0; i < maxIterations; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas not supported');

    ctx.imageSmoothingEnabled = true;
    try {
      ctx.imageSmoothingQuality = 'high';
    } catch {}

    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, outputMime, quality);

    if (!best || blob.size < best.blob.size) best = { blob, width, height, quality };

    if (blob.size <= targetBytes) {
      best = { blob, width, height, quality };
      break;
    }

    if (quality - qualityStep >= minQuality) {
      quality = Math.max(minQuality, quality - qualityStep);
      continue;
    }

    const nextScale = scale * resizeStep;
    if (nextScale < minScale) break;

    scale = nextScale;
    width = Math.max(1, Math.round(srcW * scale));
    height = Math.max(1, Math.round(srcH * scale));
    quality = initialQuality;
  }

  if (bitmap && typeof bitmap.close === 'function') {
    try {
      bitmap.close();
    } catch {}
  }

  if (!best) throw new Error('Compression failed');

  const ext = getExtFromMime(outputMime);
  const baseName = String(file.name || 'upload')
    .replace(/\.[^.]+$/, '')
    .replace(/[^\w\-]+/g, '_')
    .slice(0, 80);

  const outName = `${baseName}.${ext}`;

  const outFile = new File([best.blob], outName, {
    type: outputMime,
    lastModified: Date.now(),
  });

  return {
    file: outFile,
    originalBytes: file.size,
    compressedBytes: outFile.size,
    width: best.width,
    height: best.height,
    quality: best.quality,
    mimeType: outputMime,
    skipped: false,
  };
};
