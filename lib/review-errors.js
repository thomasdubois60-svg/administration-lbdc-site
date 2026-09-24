const fallback = 'Le service des avis est momentanément indisponible. Veuillez réessayer.';
const messages = new Set([
  fallback,
  'Accès refusé',
  'Statut invalide',
  'Avis invalide',
  'Avis introuvable',
  'Photos invalides',
  'Prénom, note et commentaire valides requis.',
]);

// Shared only by review moderation and its API; never expose raw exceptions.
export function reviewErrorMessage(error) {
  return error instanceof Error && messages.has(error.message) ? error.message : fallback;
}
