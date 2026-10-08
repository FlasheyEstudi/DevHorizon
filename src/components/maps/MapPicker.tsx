// =============================================================================
// MapPicker.tsx — Onboarding click-to-pin Leaflet island.
// =============================================================================
// Renders a Leaflet map centered on Nicaragua. Clicking the map fires
// `onChange(lat/lon)` if the point is inside the conservative Nicaragua bbox,
// or `onChange(null, 'errors.geoOutOfBounds')` otherwise.
//
// Per ADR-001 (design §2): client:only="react" — Leaflet touches `window`
// at module load, so SSR is impossible without a flicker. Mounted via the
// parent Astro component.
//
// i18n: this component receives a translated error string from the parent
// Astro component (which has access to useTranslations). The component itself
// is i18n-free — Astro handles the dictionary.
//
// Props:
//   - initialLocation: optional pre-existing geoPoint to render a marker for
//   - onChange(loc | null, errorKey | null): callback with the new state
//   - errorMessage: translated string for the out-of-bounds error
// =============================================================================

import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { NICARAGUA_BOUNDS, isWithinNicaragua } from '@/lib/geo';
import type { GeoPointRecord } from '@/lib/types/geo';

// Fix the well-known Leaflet default-marker icon path issue with bundlers.
// Vite rewrites asset URLs; force it to use the bundled PNGs.
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

interface Props {
  initialLocation?: GeoPointRecord | null;
  /**
   * Optional callback for React-side subscribers. The component also
   * dispatches a DOM CustomEvent `geo:location-change` (and writes to
   * `window.__geoLocation`) so vanilla-script parents can listen without
   * threading React state. Either or both can be used; both fire on every
   * successful or failed pick.
   */
  onChange?: (loc: GeoPointRecord | null, errorKey: string | null) => void;
  /** Translated error string rendered below the map on out-of-bounds click. */
  errorMessage?: string;
}

const CENTER: [number, number] = [12.865, -85.207]; // Nicaragua centroid.
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [NICARAGUA_BOUNDS.latMin - 0.5, NICARAGUA_BOUNDS.lonMin - 0.5],
  [NICARAGUA_BOUNDS.latMax + 0.5, NICARAGUA_BOUNDS.lonMax + 0.5],
];

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({
  initialLocation,
  onChange,
  errorMessage,
}: Props) {
  const [marker, setMarker] = useState<GeoPointRecord | null>(
    initialLocation ?? null
  );
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // Re-sync marker if parent provides a new initial (e.g., after save).
  useEffect(() => {
    setMarker(initialLocation ?? null);
    setErrorKey(null);
  }, [initialLocation]);

  const handlePick = (lat: number, lon: number) => {
    if (!isWithinNicaragua(lat, lon)) {
      setErrorKey('errors.geoOutOfBounds');
      setMarker(null);
      // Bridge to vanilla-script form listeners (OnboardingContent script).
      // The parent passes `onChange` for React-side subscribers; we ALSO
      // dispatch a DOM CustomEvent so non-React code can react without
      // having to thread React state out via props.
      (window as unknown as { __geoLocation: GeoPointRecord | null }).__geoLocation = null;
      window.dispatchEvent(
        new CustomEvent('geo:location-change', {
          detail: { loc: null, errorKey: 'errors.geoOutOfBounds' },
        })
      );
      onChange?.(null, 'errors.geoOutOfBounds');
      return;
    }
    setErrorKey(null);
    const loc: GeoPointRecord = { lat, lon };
    setMarker(loc);
    (window as unknown as { __geoLocation: GeoPointRecord | null }).__geoLocation = loc;
    window.dispatchEvent(
      new CustomEvent('geo:location-change', { detail: { loc, errorKey: null } })
    );
    onChange?.(loc, null);
  };

  return (
    <div className="w-full">
      <MapContainer
        center={CENTER}
        zoom={initialLocation ? 11 : 7}
        minZoom={6}
        maxZoom={18}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={0.8}
        scrollWheelZoom
        style={{ height: '400px', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ClickHandler onPick={handlePick} />
        {marker && <Marker position={[marker.lat, marker.lon]} />}
      </MapContainer>
      {errorKey && errorMessage && (
        <p
          className="mt-2 text-sm text-error flex items-center gap-1"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}