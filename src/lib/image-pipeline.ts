// Client-side image pipeline: resize uploads to multiple WebP renditions.
// Runs entirely in the browser (Canvas API).

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_PHOTOS = 15;

export type Rendition = {
  blob: Blob;
  width: number;
  height: number;
};

export type ProcessedPhoto = {
  hero: Rendition; // 1920w
  gallery: Rendition; // 800w
  thumb: Rendition; // 1200x900 cover-cropped
  originalWidth: number;
  originalHeight: number;
};

function fitWithin(srcW: number, srcH: number, maxW: number): { w: number; h: number } {
  if (srcW <= maxW) return { w: srcW, h: srcH };
  const ratio = maxW / srcW;
  return { w: maxW, h: Math.round(srcH * ratio) };
}

async function encodeCanvas(canvas: HTMLCanvasElement, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("WebP encode failed"))),
      "image/webp",
      quality,
    );
  });
}

async function renderScaled(
  bmp: ImageBitmap,
  targetW: number,
  targetH: number,
): Promise<Rendition> {
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, targetW, targetH);
  const blob = await encodeCanvas(canvas);
  return { blob, width: targetW, height: targetH };
}

async function renderCropped(
  bmp: ImageBitmap,
  targetW: number,
  targetH: number,
): Promise<Rendition> {
  const srcW = bmp.width;
  const srcH = bmp.height;
  const srcRatio = srcW / srcH;
  const tgtRatio = targetW / targetH;

  let sx = 0,
    sy = 0,
    sw = srcW,
    sh = srcH;
  if (srcRatio > tgtRatio) {
    // source is wider — crop sides
    sw = Math.round(srcH * tgtRatio);
    sx = Math.round((srcW - sw) / 2);
  } else {
    sh = Math.round(srcW / tgtRatio);
    sy = Math.round((srcH - sh) / 2);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, targetW, targetH);
  const blob = await encodeCanvas(canvas);
  return { blob, width: targetW, height: targetH };
}

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Not an image file";
  if (file.size > MAX_FILE_BYTES) return "File exceeds 5MB limit";
  return null;
}

export async function processImage(file: File): Promise<ProcessedPhoto> {
  const err = validateImageFile(file);
  if (err) throw new Error(err);

  const bmp = await createImageBitmap(file);
  try {
    const heroSize = fitWithin(bmp.width, bmp.height, 1920);
    const gallerySize = fitWithin(bmp.width, bmp.height, 800);

    const [hero, gallery, thumb] = await Promise.all([
      renderScaled(bmp, heroSize.w, heroSize.h),
      renderScaled(bmp, gallerySize.w, gallerySize.h),
      renderCropped(bmp, 1200, 900),
    ]);

    return {
      hero,
      gallery,
      thumb,
      originalWidth: bmp.width,
      originalHeight: bmp.height,
    };
  } finally {
    bmp.close();
  }
}
