// Image validation + canvas-based crop/downscale/compress for avatar uploads.

export const MAX_BYTES = 5 * 1024 * 1024;
export const OUTPUT_SIZE = 400;
export const QUALITY = 0.8;
export const OVERSIZE_MESSAGE =
  "That's a bit too much pulp! Please upload a photo under 5MB.";

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function validateUpload(file: File): void {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error(OVERSIZE_MESSAGE);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

export async function getCroppedImage(
  file: File,
  area: CropArea,
): Promise<{ blob: Blob; ext: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      img,
      area.x,
      area.y,
      area.width,
      area.height,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE,
    );

    let blob = await canvasToBlob(canvas, "image/webp", QUALITY);
    let ext = "webp";
    // Fallback for browsers/canvas implementations that ignore webp
    if (!blob || blob.type !== "image/webp") {
      blob = await canvasToBlob(canvas, "image/jpeg", QUALITY);
      ext = "jpg";
    }
    if (!blob) throw new Error("Could not encode image");
    return { blob, ext };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// 16:9 cover image crop, output ~1280x720
export async function getCroppedCoverImage(
  file: File,
  area: CropArea,
): Promise<{ blob: Blob; ext: string }> {
  const OUT_W = 1280;
  const OUT_H = 720;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, OUT_W, OUT_H);

    let blob = await canvasToBlob(canvas, "image/webp", QUALITY);
    let ext = "webp";
    if (!blob || blob.type !== "image/webp") {
      blob = await canvasToBlob(canvas, "image/jpeg", QUALITY);
      ext = "jpg";
    }
    if (!blob) throw new Error("Could not encode image");
    return { blob, ext };
  } finally {
    URL.revokeObjectURL(url);
  }
}
