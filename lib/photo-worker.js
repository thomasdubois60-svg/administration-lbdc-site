const MAX_BYTES = 3 * 1024 * 1024;

self.onmessage = async ({ data: file }) => {
  let bitmap;
  try {
    const header = new Uint8Array(await file.slice(0, 128).arrayBuffer());
    const ascii = String.fromCharCode(...header);
    // Detect actual bytes: iOS MIME types and extensions are not reliable.
    const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255;
    const png = header[0] === 137 && ascii.slice(1, 4) === 'PNG';
    const heif = ascii.slice(4, 8) === 'ftyp' && /heic|heix|hevc|hevx|mif1|msf1/.test(ascii.slice(8)) && !/avif|avis/.test(ascii.slice(8));
    if (heif) {
      const { heicTo } = await import('heic-to/next');
      bitmap = await heicTo({ blob: file, type: 'bitmap' });
    } else {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    }
    if (!bitmap.width || !bitmap.height) throw new Error('empty');
    // Keep small JPEG/PNG unchanged, including transparent PNG logos.
    if ((jpeg || png) && file.size <= MAX_BYTES && Math.max(bitmap.width, bitmap.height) <= 2400) {
      self.postMessage({ blob: new Blob([file], { type: png ? 'image/png' : 'image/jpeg' }), extension: png ? 'png' : 'jpg' });
      bitmap.close();
    } else {
      // HTML canvas on the UI thread supports Safari without OffscreenCanvas.
      // Only decoded pixels are transferred; HEIF decoding stays interruptible.
      self.postMessage({ bitmap, extension: png ? 'png' : 'jpg' }, [bitmap]);
    }
  } catch {
    bitmap?.close();
    self.postMessage({ error: 'Photo illisible ou format non pris en charge. Choisissez un JPEG, PNG ou HEIC/HEIF original, ou exportez-la en JPEG depuis Photos.' });
  }
};
