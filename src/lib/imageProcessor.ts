import { SensitiveRegion } from '@/types';

export interface ProcessedImage {
  blob: Blob;
  fileName: string;
  width: number;
  height: number;
  sizeKB: number;
}

const MAX_DIMENSION = 1600;
const MAX_SIZE_KB = 1000;
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.5;

function createImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/jpeg',
      quality
    );
  });
}

function resizeImage(img: HTMLImageElement): { width: number; height: number } {
  let width = img.naturalWidth;
  let height = img.naturalHeight;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_DIMENSION) / width);
      width = MAX_DIMENSION;
    } else {
      width = Math.round((width * MAX_DIMENSION) / height);
      height = MAX_DIMENSION;
    }
  }

  return { width, height };
}

async function compressToTarget(canvas: HTMLCanvasElement, img: HTMLImageElement, width: number, height: number): Promise<{ blob: Blob; finalWidth: number; finalHeight: number }> {
  let quality = INITIAL_QUALITY;
  let blob: Blob;

  do {
    blob = await canvasToJpegBlob(canvas, quality);
    if (blob.size <= MAX_SIZE_KB * 1024) break;
    quality -= 0.05;
  } while (quality >= MIN_QUALITY);

  if (blob.size > MAX_SIZE_KB * 1024) {
    const ctx = canvas.getContext('2d')!;
    const scale = 0.8;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    blob = await canvasToJpegBlob(canvas, MIN_QUALITY);
    return { blob, finalWidth: canvas.width, finalHeight: canvas.height };
  }

  return { blob, finalWidth: width, finalHeight: height };
}

export async function processImageForWhatsApp(file: File): Promise<ProcessedImage> {
  const img = await createImageFromFile(file);
  const { width, height } = resizeImage(img);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const { blob, finalWidth, finalHeight } = await compressToTarget(canvas, img, width, height);

  const timestamp = Date.now();
  const fileName = `encomenda_${timestamp}.jpg`;

  return { blob, fileName, width: finalWidth, height: finalHeight, sizeKB: Math.round(blob.size / 1024) };
}

export async function processImageRedacted(file: File, regions: SensitiveRegion[]): Promise<ProcessedImage> {
  const img = await createImageFromFile(file);
  const { width, height } = resizeImage(img);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  if (regions && regions.length > 0) {
    // Draw black redaction bars over sensitive regions
    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    const margin = 4; // small safety margin in pixels

    for (const region of regions) {
      const rx = Math.max(0, (region.x / 1000) * width - margin);
      const ry = Math.max(0, (region.y / 1000) * height - margin);
      const rw = Math.min(width - rx, (region.width / 1000) * width + margin * 2);
      const rh = Math.min(height - ry, (region.height / 1000) * height + margin * 2);
      const radius = 4;

      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(rx, ry, rw, rh, radius);
        ctx.fill();
      } else {
        ctx.fillRect(rx, ry, rw, rh);
      }
    }

    console.log(`[ImageProcessor] Redacted ${regions.length} sensitive region(s)`);
  } else {
    // Fallback: apply blur if no regions provided
    console.log('[ImageProcessor] No regions provided, applying blur fallback');
    const blurFactor = 0.08;
    const smallW = Math.max(1, Math.round(width * blurFactor));
    const smallH = Math.max(1, Math.round(height * blurFactor));

    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = smallW;
    tmpCanvas.height = smallH;
    const tmpCtx = tmpCanvas.getContext('2d');
    if (tmpCtx) {
      tmpCtx.drawImage(img, 0, 0, smallW, smallH);
      ctx.drawImage(tmpCanvas, 0, 0, width, height);
    }

    try {
      ctx.filter = 'blur(4px)';
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';
    } catch {
      // filter not supported
    }
  }

  const { blob, finalWidth, finalHeight } = await compressToTarget(canvas, img, width, height);

  const timestamp = Date.now();
  const fileName = `redacted_encomenda_${timestamp}.jpg`;

  console.log(`[ImageProcessor] Redacted image created: ${fileName} (${Math.round(blob.size / 1024)}KB)`);

  return { blob, fileName, width: finalWidth, height: finalHeight, sizeKB: Math.round(blob.size / 1024) };
}
