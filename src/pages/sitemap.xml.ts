import type { APIRoute } from 'astro';
import { getPocketBaseUrl, pb } from '../lib/pocketbase';

export const prerender = false;

interface SlugRecord {
  id: string;
  slug?: string;
  created_at?: string;
  updated_at?: string;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/** Primeros 10 caracteres de una fecha de PocketBase ("2026-10-07 09:22:17.123Z") -> "2026-10-07". */
function dateOnly(value?: string): string | null {
  return value ? value.slice(0, 10) : null;
}

export const GET: APIRoute = async () => {
  const siteUrl = 'https://artesanica.ni';
  await getPocketBaseUrl();

  const now = new Date().toISOString().split('T')[0];

  // 1. Rutas estáticas con equivalencias multilingües
  const staticRoutes = [
    { es: '/', en: '/en/', miq: '/miq/', priority: '1.0', changefreq: 'daily' },
    { es: '/productos', en: '/en/productos', miq: '/miq/productos', priority: '0.9', changefreq: 'daily' },
    { es: '/tiendas', en: '/en/tiendas', miq: '/miq/tiendas', priority: '0.8', changefreq: 'weekly' },
    { es: '/mapa', en: '/en/mapa', miq: '/miq/mapa', priority: '0.8', changefreq: 'weekly' },
    { es: '/noticias', en: '/en/noticias', miq: '/miq/noticias', priority: '0.7', changefreq: 'weekly' },
  ];

  // 2. Consultar productos publicados
  let products: SlugRecord[] = [];
  try {
    const res = await pb.collection('products').getFullList({
      filter: 'status = "published"',
      fields: 'id,slug,updated_at,created_at',
    });
    products = res as unknown as SlugRecord[];
  } catch (err) {
    console.error('[sitemap] error loading products:', err);
  }

  // 3. Consultar tiendas registradas
  let stores: SlugRecord[] = [];
  try {
    const res = await pb.collection('stores').getFullList({
      fields: 'id,slug,updated_at,created_at',
    });
    stores = res as unknown as SlugRecord[];
  } catch (err) {
    console.error('[sitemap] error loading stores:', err);
  }

  // 4. Consultar noticias publicadas
  let newsList: SlugRecord[] = [];
  try {
    const res = await pb.collection('news').getFullList({
      filter: 'status = "published"',
      fields: 'id,slug,updated_at,created_at',
    });
    newsList = res as unknown as SlugRecord[];
  } catch (err) {
    console.error('[sitemap] error loading news:', err);
  }

  const urlEntries: string[] = [];

  // Helper para generar bloque <url> con hreflang completo (es, en, miq)
  function createUrlEntry(
    locPath: string,
    alternates: { es: string; en: string; miq: string },
    lastmod: string | null,
    changefreq: string,
    priority: string
  ): string {
    const lastmodTag = lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '';
    return `  <url>
    <loc>${siteUrl}${escapeXml(locPath)}</loc>
${lastmodTag}    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="es" href="${siteUrl}${escapeXml(alternates.es)}" />
    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}${escapeXml(alternates.en)}" />
    <xhtml:link rel="alternate" hreflang="miq" href="${siteUrl}${escapeXml(alternates.miq)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}${escapeXml(alternates.es)}" />
  </url>`;
  }

  // Agregar páginas estáticas principales
  for (const route of staticRoutes) {
    urlEntries.push(createUrlEntry(route.es, route, now, route.changefreq, route.priority));
    urlEntries.push(createUrlEntry(route.en, route, now, route.changefreq, route.priority));
    urlEntries.push(createUrlEntry(route.miq, route, now, route.changefreq, route.priority));
  }

  // Agregar productos individuales
  for (const prod of products) {
    if (!prod.slug) continue;
    const lastmod = dateOnly(prod.updated_at || prod.created_at);
    const alternates = {
      es: `/productos/${prod.slug}`,
      en: `/en/productos/${prod.slug}`,
      miq: `/miq/productos/${prod.slug}`,
    };
    urlEntries.push(createUrlEntry(alternates.es, alternates, lastmod, 'weekly', '0.8'));
    urlEntries.push(createUrlEntry(alternates.en, alternates, lastmod, 'weekly', '0.8'));
    urlEntries.push(createUrlEntry(alternates.miq, alternates, lastmod, 'weekly', '0.8'));
  }

  // Agregar tiendas individuales
  for (const store of stores) {
    if (!store.slug) continue;
    const lastmod = dateOnly(store.updated_at || store.created_at);
    const alternates = {
      es: `/tiendas/${store.slug}`,
      en: `/en/tiendas/${store.slug}`,
      miq: `/miq/tiendas/${store.slug}`,
    };
    urlEntries.push(createUrlEntry(alternates.es, alternates, lastmod, 'weekly', '0.7'));
    urlEntries.push(createUrlEntry(alternates.en, alternates, lastmod, 'weekly', '0.7'));
    urlEntries.push(createUrlEntry(alternates.miq, alternates, lastmod, 'weekly', '0.7'));
  }

  // Agregar noticias individuales
  for (const n of newsList) {
    if (!n.slug) continue;
    const lastmod = dateOnly(n.updated_at || n.created_at);
    const alternates = {
      es: `/noticias/${n.slug}`,
      en: `/en/noticias/${n.slug}`,
      miq: `/miq/noticias/${n.slug}`,
    };
    urlEntries.push(createUrlEntry(alternates.es, alternates, lastmod, 'monthly', '0.6'));
    urlEntries.push(createUrlEntry(alternates.en, alternates, lastmod, 'monthly', '0.6'));
    urlEntries.push(createUrlEntry(alternates.miq, alternates, lastmod, 'monthly', '0.6'));
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join('\n')}
</urlset>`;

  return new Response(sitemapXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};
