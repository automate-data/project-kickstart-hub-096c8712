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

export async function processImageForWhatsApp(file: File): Promise<ProcessedImage> {
  const img = await createImageFromFile(file);

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

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let quality = INITIAL_QUALITY;
  let blob: Blob;

  do {
    blob = await canvasToJpegBlob(canvas, quality);
    if (blob.size <= MAX_SIZE_KB * 1024) break;
    quality -= 0.05;
  } while (quality >= MIN_QUALITY);

  if (blob.size > MAX_SIZE_KB * 1024) {
    const scale = 0.8;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    blob = await canvasToJpegBlob(canvas, MIN_QUALITY);
    width = canvas.width;
    height = canvas.height;
  }

  const timestamp = Date.now();
  const fileName = `encomenda_${timestamp}.jpg`;

  return { blob, fileName, width, height, sizeKB: Math.round(blob.size / 1024) };
}

export async function processImageBlurred(file: File): Promise<ProcessedImage> {
  const img = await createImageFromFile(file);

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

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.filter = 'blur(6px)';
  ctx.drawImage(img, 0, 0, width, height);
  ctx.filter = 'none';

  let quality = INITIAL_QUALITY;
  let blob: Blob;

  do {
    blob = await canvasToJpegBlob(canvas, quality);
    if (blob.size <= MAX_SIZE_KB * 1024) break;
    quality -= 0.05;
  } while (quality >= MIN_QUALITY);

  const timestamp = Date.now();
  const fileName = `blurred_encomenda_${timestamp}.jpg`;

  return { blob, fileName, width, height, sizeKB: Math.round(blob.size / 1024) };
}
