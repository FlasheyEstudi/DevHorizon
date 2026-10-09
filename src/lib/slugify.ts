// =============================================================================
// slugify.ts — Normalizacion de texto a slug URL-safe
// =============================================================================
// Convierte "Textil y Bordados" -> "textil-y-bordados". Lo usan los endpoints
// de admin (categorias, noticias) y las sugerencias de artesanos para derivar
// el slug a partir del nombre cuando el cliente no lo manda explicitamente.
//
// Misma logica que el helper local de ProductsSection.tsx: quita acentos,
// deja solo [a-z0-9-], colapsa separadores y recorta a 80 caracteres.
// =============================================================================

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
