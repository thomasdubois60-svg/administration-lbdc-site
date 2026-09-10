const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

// Keep the deadline active until the response body has also been read.
export async function photoRequest(url, options = {}, timeoutMs = 55000) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, { ...options, signal: controller.signal });
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch {
          throw new Error(response.status === 413
            ? 'La photo dépasse la taille autorisée par le serveur. Réessayez avec une photo réduite.'
            : `Le serveur photo a renvoyé une réponse invalide (${response.status}). Réessayez.`);
        }
        if (!response.ok) throw new Error(data.error || `Envoi refusé (${response.status}). Réessayez.`);
        return data;
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Le délai de réponse est dépassé. Vérifiez votre connexion puis réessayez.'));
          controller.abort();
        }, timeoutMs);
      })
    ]);
  } catch (error) {
    if (error instanceof TypeError) throw new Error('Connexion au service photo impossible. Vérifiez votre connexion puis réessayez.');
    throw error;
  } finally { clearTimeout(timer); }
}

export async function preparePhoto(file) {
  if (!file.size) throw new Error('Cette photo est vide. Sélectionnez son original dans Photos.');
  if (file.size > 60 * 1024 * 1024) throw new Error('Cette photo dépasse 60 Mo. Exportez une version plus petite depuis Photos.');
  // A dedicated worker keeps conversion off the UI thread and can be terminated.
  return new Promise((resolve, reject) => {
    let worker;
    let timer;
    let settled = false;
    let bitmap;
    const finish = (error, photo) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker?.terminate();
      bitmap?.close();
      if (error) reject(error); else resolve(photo);
    };
    try {
      worker = new Worker(new URL('./photo-worker.js', import.meta.url));
      timer = setTimeout(() => finish(new Error('La préparation de cette photo prend trop de temps. Réessayez ou exportez-la en JPEG depuis Photos.')), 45000);
      worker.onerror = () => finish(new Error('Impossible de préparer cette photo. Réessayez ou exportez-la en JPEG depuis Photos.'));
      worker.onmessage = async ({ data }) => {
        if (settled) { data.bitmap?.close(); return; }
        if (data.error) return finish(new Error(data.error));
        bitmap = data.bitmap;
        try {
          const blob = data.blob || await encodePhoto(bitmap, data.extension, () => settled);
          if (settled) return;
          if (!blob?.size || blob.size > MAX_UPLOAD_BYTES) return finish(new Error('Impossible de réduire suffisamment cette photo. Exportez une version plus petite depuis Photos.'));
          const stem = (file.name || 'photo').replace(/\.[^.]+$/, '');
          finish(null, new File([blob], `${stem}.${data.extension}`, { type: blob.type }));
        } catch { finish(new Error('Impossible de réduire cette photo. Réessayez ou exportez-la en JPEG depuis Photos.')); }
      };
      worker.postMessage(file);
    } catch { finish(new Error('Ce navigateur ne peut pas préparer la photo. Mettez Safari à jour puis réessayez.')); }
  });
}

async function encodePhoto(bitmap, extension, isCancelled) {
  const canvas = document.createElement('canvas');
  const png = extension === 'png';
  let edge = 2400;
  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (isCancelled()) throw new Error('cancelled');
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('canvas');
      if (!png) { context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, png ? 'image/png' : 'image/jpeg', Math.max(0.65, 0.86 - attempt * 0.05)));
      if (blob?.size && blob.size <= MAX_UPLOAD_BYTES) return blob;
      edge = Math.round(edge * 0.75);
    }
    throw new Error('size');
  } finally { canvas.width = canvas.height = 1; }
}
