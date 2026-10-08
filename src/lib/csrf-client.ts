// =============================================================================
// csrf-client.ts — Client-side CSRF token helper
// =============================================================================
// Reads the double-submit `csrf-token` cookie (set by middleware on every safe
// GET) and returns it ready to merge into fetch headers as `x-csrf-token`.
// Safe to import in both client-side React components and server/islands.
// =============================================================================

export function csrfHeaders(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  const match = document.cookie.split('; ').find((c) => c.startsWith('csrf-token='));
  if (!match) return {};
  const value = decodeURIComponent(match.split('=').slice(1).join('='));
  return { 'x-csrf-token': value };
}
