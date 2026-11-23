/** File types accepted by the avatar picker (mirrors the auth-service allow-list; SVG is never accepted). */
export const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp';
/** Largest decoded image the server stores. */
export const AVATAR_MAX_UPLOAD_BYTES = 200 * 1024;
/** Largest original file we are willing to read and resize in the browser. */
export const AVATAR_MAX_SOURCE_BYTES = 10 * 1024 * 1024;
/** Output edge length in px; small enough to stay well under the upload limit. */
export const AVATAR_SIZE = 256;

export class AvatarImageError extends Error {}

export interface AvatarImageOptions {
  /** 'cover' crops to fill the square (photos); 'contain' fits the whole image (logos). */
  fit?: 'cover' | 'contain';
  size?: number;
}

/** Throws {@link AvatarImageError} if the picked file cannot be used. */
export function validateAvatarFile(file: File): void {
  if (!AVATAR_ACCEPT.split(',').includes(file.type)) {
    throw new AvatarImageError('Please choose a PNG, JPG or WebP image.');
  }
  if (file.size > AVATAR_MAX_SOURCE_BYTES) {
    throw new AvatarImageError('That image is too large. Please choose one under 10 MB.');
  }
}

/** Decoded byte size of a base64 data URL. */
export function dataUrlByteSize(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * Validates, squares and downsizes a picked image in the browser, returning a data URL
 * ready for PUT /api/v1/auth/me/avatar. Transparent PNG/WebP logos stay PNG when they fit;
 * otherwise the image is flattened onto white and re-encoded as JPEG.
 */
export async function prepareAvatarImage(file: File, options: AvatarImageOptions = {}): Promise<string> {
  validateAvatarFile(file);
  const size = options.size ?? AVATAR_SIZE;
  const fit = options.fit ?? 'cover';
  const image = await loadImage(file);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new AvatarImageError('Your browser could not process this image.');

  const draw = (background: string | null) => {
    ctx.clearRect(0, 0, size, size);
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, size, size);
    }
    const scale = fit === 'cover'
      ? Math.max(size / image.width, size / image.height)
      : Math.min(size / image.width, size / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image.source, (size - w) / 2, (size - h) / 2, w, h);
  };

  if (file.type !== 'image/jpeg') {
    draw(null);
    const png = canvas.toDataURL('image/png');
    if (dataUrlByteSize(png) <= AVATAR_MAX_UPLOAD_BYTES) return png;
  }

  draw('#ffffff');
  for (const quality of [0.85, 0.7, 0.5]) {
    const jpeg = canvas.toDataURL('image/jpeg', quality);
    if (dataUrlByteSize(jpeg) <= AVATAR_MAX_UPLOAD_BYTES) return jpeg;
  }
  throw new AvatarImageError('Could not make this image small enough. Please try a different one.');
}

async function loadImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new AvatarImageError('That file could not be read as an image.'));
      img.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight) {
      throw new AvatarImageError('That file could not be read as an image.');
    }
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}
