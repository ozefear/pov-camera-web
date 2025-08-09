export async function loadImageFromFile(file) {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);
  return { img, dataUrl };
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Crop to 4:5 portrait and render with a simple retro effect and timestamp overlay
export function renderRetroWithTimestamp(image, options = {}) {
  const { timestamp = new Date(), outputWidth = 1200 } = options;
  // Dynamic aspect: portrait -> 4:5, landscape -> 5:4
  const srcW = image.naturalWidth || image.width;
  const srcH = image.naturalHeight || image.height;
  const isLandscape = srcW >= srcH;
  const aspectW = isLandscape ? 5 : 4;
  const aspectH = isLandscape ? 4 : 5;
  const targetRatio = aspectW / aspectH;
  const srcRatio = srcW / srcH;

  let cropW, cropH;
  if (srcRatio > targetRatio) {
    cropH = srcH;
    cropW = Math.floor(cropH * targetRatio);
  } else {
    cropW = srcW;
    cropH = Math.floor(cropW / targetRatio);
  }
  const sx = Math.floor((srcW - cropW) / 2);
  const sy = Math.floor((srcH - cropH) / 2);

  const outputHeight = Math.floor(outputWidth * (aspectH / aspectW));
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");

  // Draw cropped image
  ctx.drawImage(image, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);

  // Retro pipeline aligned to requested settings
  applyExposureContrast(ctx, canvas.width, canvas.height, { exposureEv: -0.64, contrast: 0.12 });
  applyTemperatureTint(ctx, canvas.width, canvas.height, { temp: 6, tint: -11 });
  applySaturationVibrance(ctx, canvas.width, canvas.height, { saturation: 0.15, vibrance: 0.16 });
  applyClarityTexture(ctx, canvas.width, canvas.height, { clarity: 0.19, texture: 0.20 });
  applyVignette(ctx, canvas.width, canvas.height, 1);
  applyNoise(ctx, canvas.width, canvas.height, 30, 0.5);
  applySepia(ctx, canvas.width, canvas.height, 0.05);
  applyDirectionalBlur(ctx, canvas.width, canvas.height, {
    angleDeg: 3,
    radius: 3,
    steps: 8,
    opacity: 0.04,
  });

  // Timestamp overlay (bottom-right) — yellowish orange with slight blur
  const ts = formatTimestamp(timestamp);
  ctx.save();
  ctx.font = `${isLandscape ? 28 : 36}px monospace`;
  const padding = 40;
  const metrics = ctx.measureText(ts);
  const x = canvas.width - metrics.width - padding;
  const y = canvas.height - padding;
  ctx.shadowColor = "rgba(0,0,0,1)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#f4a261"; // yellow-orange
  ctx.fillText(ts, x, y);
  ctx.restore();

  return canvas;
}

function applySepia(ctx, w, h, strength = 0.2) {
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Basic sepia transform
      const tr = 0.393 * r + 0.769 * g + 0.189 * b;
      const tg = 0.349 * r + 0.686 * g + 0.168 * b;
      const tb = 0.272 * r + 0.534 * g + 0.131 * b;
      data[i] = r + (tr - r) * strength;
      data[i + 1] = g + (tg - g) * strength;
      data[i + 2] = b + (tb - b) * strength;
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {}
}

function applyVignette(ctx, w, h, strength = 0.4) {
  const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) / 3, w / 2, h / 2, Math.max(w, h) / 1.2);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function applyNoise(ctx, w, h, amplitude = 10, blend = 0.1) {
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() * 2 - 1) * amplitude;
      data[i] = clamp(data[i] + n * blend, 0, 255);
      data[i + 1] = clamp(data[i + 1] + n * blend, 0, 255);
      data[i + 2] = clamp(data[i + 2] + n * blend, 0, 255);
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {}
}

function applyDirectionalBlur(ctx, w, h, { angleDeg = 3, radius = 3, steps = 5, opacity = 0.08 } = {}) {
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext("2d");
  tctx.drawImage(ctx.canvas, 0, 0);
  const angle = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(angle) * (radius / steps);
  const dy = Math.sin(angle) * (radius / steps);
  ctx.save();
  ctx.globalAlpha = opacity;
  for (let i = 1; i <= steps; i += 1) {
    ctx.drawImage(tmp, dx * i, dy * i);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

// Split tone: tint shadows and highlights differently
function applySplitTone(ctx, w, h, { shadows, highlights, balance = 0.5 } = {}) {
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      const t = lum < balance ? shadows : highlights;
      data[i] = clamp(data[i] + t.r, 0, 255);
      data[i + 1] = clamp(data[i + 1] + t.g, 0, 255);
      data[i + 2] = clamp(data[i + 2] + t.b, 0, 255);
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {}
}

// Simulated chromatic aberration by offsetting color channels
function applyChromaticAberration(ctx, w, h, { offset = 1 } = {}) {
  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const s = src.data;
  const d = dst.data;
  const off = offset | 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const rx = Math.min(w - 1, x + off);
      const bx = Math.max(0, x - off);
      const ri = (y * w + rx) * 4;
      const bi = (y * w + bx) * 4;
      d[i] = s[ri]; // R
      d[i + 1] = s[i + 1]; // G stays
      d[i + 2] = s[bi + 2]; // B
      d[i + 3] = s[i + 3];
    }
  }
  ctx.putImageData(dst, 0, 0);
}

// Simple bloom by extracting bright areas and blurring them additively
function applyBloom(ctx, w, h, strength = 0.1) {
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext("2d");
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    const factor = lum > 220 ? 1 : 0;
    data[i] *= factor;
    data[i + 1] *= factor;
    data[i + 2] *= factor;
  }
  tctx.putImageData(img, 0, 0);
  // Gaussian-like blur by multiple box passes
  tctx.globalAlpha = strength;
  for (let r = 1; r <= 6; r += 2) {
    tctx.drawImage(tmp, 0, 0);
    tctx.filter = `blur(${r}px)`;
  }
  tctx.filter = "none";
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(tmp, 0, 0);
  ctx.globalCompositeOperation = "source-over";
}

// Exposure/contrast adjustment. exposureEv is in stops (~log2 multiplier)
function applyExposureContrast(ctx, w, h, { exposureEv = 0, contrast = 0 } = {}) {
  try {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const expMul = Math.pow(2, exposureEv);
    const c = contrast; // 0.12 → +12%
    for (let i = 0; i < d.length; i += 4) {
      // apply exposure
      let r = d[i] * expMul;
      let g = d[i + 1] * expMul;
      let b = d[i + 2] * expMul;
      // apply contrast around mid gray (128)
      r = (r - 128) * (1 + c) + 128;
      g = (g - 128) * (1 + c) + 128;
      b = (b - 128) * (1 + c) + 128;
      d[i] = clamp(r, 0, 255);
      d[i + 1] = clamp(g, 0, 255);
      d[i + 2] = clamp(b, 0, 255);
    }
    ctx.putImageData(img, 0, 0);
  } catch {}
}

// Temperature (blue-yellow) and Tint (green-magenta)
function applyTemperatureTint(ctx, w, h, { temp = 0, tint = 0 } = {}) {
  try {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    // temp +6 (slightly warm): increase R, decrease B
    const tr = temp * 1.2;
    const tb = -temp * 1.0;
    // tint -11 (toward green): increase G, decrease magenta (R+B)
    const tg = -tint * 1.0;
    const tm = tint * 0.6;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = clamp(d[i] + tr - tm, 0, 255);
      d[i + 1] = clamp(d[i + 1] + tg, 0, 255);
      d[i + 2] = clamp(d[i + 2] + tb - tm, 0, 255);
    }
    ctx.putImageData(img, 0, 0);
  } catch {}
}

// Saturation and vibrance (vibrance affects low-sat colors more)
function applySaturationVibrance(ctx, w, h, { saturation = 0, vibrance = 0 } = {}) {
  try {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const vibFactor = 1 + vibrance * (1 - sat); // boost low-sat more
      const satFactor = 1 + saturation;
      const avg = (r + g + b) / 3;
      d[i] = clamp(avg + (r - avg) * satFactor * vibFactor, 0, 255);
      d[i + 1] = clamp(avg + (g - avg) * satFactor * vibFactor, 0, 255);
      d[i + 2] = clamp(avg + (b - avg) * satFactor * vibFactor, 0, 255);
    }
    ctx.putImageData(img, 0, 0);
  } catch {}
}

// Clarity (local contrast) and texture (mid-frequency sharpening)
function applyClarityTexture(ctx, w, h, { clarity = 0, texture = 0 } = {}) {
  // Use unsharp-mask-like approach
  const base = document.createElement("canvas");
  base.width = w;
  base.height = h;
  const bctx = base.getContext("2d");
  bctx.drawImage(ctx.canvas, 0, 0);
  bctx.filter = "blur(3px)";
  bctx.drawImage(base, 0, 0);
  const sharp = ctx.getImageData(0, 0, w, h);
  const blur = bctx.getImageData(0, 0, w, h);
  const s = sharp.data;
  const bl = blur.data;
  for (let i = 0; i < s.length; i += 4) {
    const detail = (s[i] - bl[i]) * (clarity * 1.5 + texture * 1.2);
    s[i] = clamp(s[i] + detail, 0, 255);
    s[i + 1] = clamp(s[i + 1] + detail, 0, 255);
    s[i + 2] = clamp(s[i + 2] + detail, 0, 255);
  }
  ctx.putImageData(sharp, 0, 0);
}

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  const yy = String(date.getFullYear()).slice(-2);
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

export function canvasToBlob(canvas, type = "image/jpeg", quality = 0.9) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}


