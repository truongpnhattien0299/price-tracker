import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  address?: string;
  storeName?: string;
}

interface LocationState {
  loading: boolean;
  denied: boolean;
  location: ResolvedLocation | null;
}

function composeAddress(place: Location.LocationGeocodedAddress): string {
  // Build a readable VN-style address from the most specific parts available.
  const parts = [place.name, place.street, place.district ?? place.subregion, place.city]
    .filter((p): p is string => !!p)
    // name and street are often the same token — drop the dupe.
    .filter((p, i, arr) => arr.indexOf(p) === i);
  return parts.join(', ');
}

// Resolves the device's current location once on mount. The camera fires this in the
// background at capture time so coords are ready by the time the user finishes typing (DESIGN §9.2).
export function useLocation(enabled: boolean): LocationState {
  const [state, setState] = useState<LocationState>({
    loading: enabled,
    denied: false,
    location: null,
  });

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!active) return;
      if (status !== 'granted') {
        setState({ loading: false, denied: true, location: null });
        return;
      }

      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!active) return;

        const resolved: ResolvedLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };

        // Reverse-geocode for a human-readable place + store hint (best-effort).
        try {
          const places = await Location.reverseGeocodeAsync(pos.coords);
          if (places[0]) {
            resolved.address = composeAddress(places[0]);
            resolved.storeName = places[0].name ?? undefined;
          }
        } catch {
          // geocoding is optional — keep the raw coords
        }

        if (active) setState({ loading: false, denied: false, location: resolved });
      } catch {
        if (active) setState({ loading: false, denied: false, location: null });
      }
    })();

    return () => {
      active = false;
    };
  }, [enabled]);

  return state;
}
