import type { APIRoute } from 'astro';
import type PocketBase from 'pocketbase';
import { pocketbaseFor, getPocketBaseUrl } from '../../../lib/pocketbase';

export const prerender = false;

interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parent?: string;
}

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    await getPocketBaseUrl();
    const pb: PocketBase = (locals as { pb?: PocketBase })?.pb ?? pocketbaseFor(request);

    const categories = (await pb.collection('categories').getFullList<CategoryRecord>({
      sort: 'name',
    })) as CategoryRecord[];

    return new Response(
      JSON.stringify({
        items: categories,
        totalItems: categories.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err: any) {
    console.error('[/api/categories] Error fetching categories:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch categories', items: [] }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
