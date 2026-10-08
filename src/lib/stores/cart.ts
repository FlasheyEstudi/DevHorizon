// =============================================================================
// cart.ts — Cart store global con nanostores + persistent
// =============================================================================
// Mantiene los IDs y cantidades de productos en el carrito. Se sincroniza con
// el backend via /api/cart cuando el usuario esta autenticado, y persiste
// en localStorage cuando no.
// =============================================================================

import { computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import { pbFileUrl } from '@lib/pb-url';
import { toast } from '@lib/stores/toast';
import { authUser } from './auth';
import { csrfHeaders } from '@lib/csrf-client';

export interface CartItem {
  productId: string;
  quantity: number;
  name?: string;
  price?: number;
  image?: string | null;
}

const ANON_KEY = 'cart_anon';

export const cartItems = persistentAtom<CartItem[]>(ANON_KEY, [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});

/** Cantidad total de items (suma de quantities). */
export const cartCount = computed(cartItems, (items) =>
  items.reduce((sum, i) => sum + i.quantity, 0)
);

/** Total estimado basado en precios cacheados (puede quedar desactualizado). */
export const cartTotal = computed(cartItems, (items) =>
  items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0)
);

// =============================================================================
// Sincronización con backend: Debounce + Queue serial para prevenir Race Conditions
// =============================================================================
let syncTimer: ReturnType<typeof setTimeout> | null = null;
const pendingDeltas = new Map<string, number>();
let isSyncing = false;

/** Comprueba si el usuario está autenticado en cliente (mediante authUser store o cookie pb_has_session). */
function isUserAuthenticated(): boolean {
  if (authUser.get() !== null) return true;
  if (typeof document !== 'undefined') {
    return document.cookie.includes('pb_has_session=1');
  }
  return false;
}

/** Procesa la cola de cambios pendientes hacia el backend. */
async function processPendingSync(): Promise<void> {
  if (isSyncing || pendingDeltas.size === 0 || !isUserAuthenticated()) {
    return;
  }

  isSyncing = true;
  const entries = Array.from(pendingDeltas.entries());
  pendingDeltas.clear();

  for (const [productId, quantity] of entries) {
    if (quantity === 0) continue;
    try {
      await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify({ productId, quantity }),
      });
    } catch {
      // Re-encolar si falla la red para no perder cambios
      pendingDeltas.set(productId, (pendingDeltas.get(productId) ?? 0) + quantity);
    }
  }

  isSyncing = false;

  // Si ingresaron nuevas peticiones durante el fetch, procesar lote restante
  if (pendingDeltas.size > 0) {
    scheduleSync();
  }
}

/** Programa la sincronización con un debounce de 400ms. */
function scheduleSync(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    processPendingSync();
  }, 400);
}

/** Agrega un producto al carrito. */
export function addToCart(productId: string, quantity = 1, meta?: Partial<CartItem>): void {
  const current = cartItems.get();
  const existingIndex = current.findIndex((i) => i.productId === productId);

  if (existingIndex >= 0) {
    const updated = current.map((item, idx) =>
      idx === existingIndex
        ? { ...item, ...meta, quantity: item.quantity + quantity }
        : item
    );
    cartItems.set(updated);
  } else {
    cartItems.set([...current, { productId, quantity, ...meta }]);
  }

  // Notificar al usuario mediante un Toast flotante
  const itemName = meta?.name ? `"${meta.name}"` : 'Producto';
  toast.success(`${itemName} agregado al carrito`, '¡Carrito actualizado!');

  // Acumular delta y programar sincronización debounced con el backend si hay sesión
  if (isUserAuthenticated()) {
    const currentDelta = pendingDeltas.get(productId) ?? 0;
    pendingDeltas.set(productId, currentDelta + quantity);
    scheduleSync();
  }
}

/** Elimina un producto del carrito. */
export function removeFromCart(productId: string): void {
  cartItems.set(cartItems.get().filter((i) => i.productId !== productId));
  pendingDeltas.delete(productId);

  if (isUserAuthenticated()) {
    fetch(`/api/cart/${productId}`, {
      method: 'DELETE',
      headers: { ...csrfHeaders() },
    }).catch(() => {});
  }
}

/** Limpia el carrito completo. */
export function clearCart(): void {
  cartItems.set([]);
}

/** Sincroniza el store local con el backend (llamar al cargar la pagina). */
export async function syncCartFromBackend(): Promise<void> {
  if (!isUserAuthenticated()) return;
  try {
    const res = await fetch('/api/cart');
    if (!res.ok) return;
    const data = await res.json();
    const items: CartItem[] = (data.items ?? []).map((it: { product: string; quantity: number; expand?: { product?: { name?: string; price?: number; images?: string[]; collectionId?: string; id?: string } } }) => ({
      productId: it.product,
      quantity: it.quantity,
      name: it.expand?.product?.name,
      price: it.expand?.product?.price,
      image: (it.expand?.product?.images?.[0] && it.expand?.product?.collectionId && it.expand?.product?.id)
        ? pbFileUrl(it.expand.product.collectionId, it.expand.product.id, it.expand.product.images[0])
        : null,
    }));
    cartItems.set(items);
  } catch {
    // Sin red, mantener estado local.
  }
}