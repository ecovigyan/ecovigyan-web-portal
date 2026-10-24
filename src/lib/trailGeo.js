/**
 * Geometry helpers shared by the trail routes and the backfill script.
 *
 * Trail stops live in a Mixed array, so their coordinates were never validated
 * on the way in. Everything here is defensive about shape as a result.
 */

/**
 * Coerces a coordinate to { latitude, longitude }, or null if it isn't one.
 * Accepts the client shape ({latitude, longitude}) and the pre-fix schema
 * shape ({lat, lng}), since documents in both forms exist in the database.
 */
export const normalizePoint = (point) => {
  if (!point) return null;
  const latitude = point.latitude ?? point.lat;
  const longitude = point.longitude ?? point.lng;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
};

/** Great-circle distance between two points, in metres. */
export const haversineMeters = (a, b) => {
  const R = 6371e3;
  const p1 = (a.latitude * Math.PI) / 180;
  const p2 = (b.latitude * Math.PI) / 180;
  const dP = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dL = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h = Math.sin(dP / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dL / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

/**
 * Straight-line distance through a list of stops, in kilometres.
 * This UNDERSTATES a real walking route; it is only a fallback for when the
 * Routes API is unavailable.
 */
export const geodesicKm = (stops) => {
  if (stops.length < 2) return 0;
  const meters = stops
    .slice(1)
    .reduce((sum, stop, i) => sum + haversineMeters(stops[i], stop), 0);
  return meters / 1000;
};

/** Extracts every stop that carries a usable coordinate. */
export const usableStops = (mushrooms) =>
  (mushrooms || []).map((m) => normalizePoint(m?.location)).filter(Boolean);

/**
 * Builds the stored location block, falling back to the stops themselves so a
 * trail always has a usable trailhead and centre even if the client omits them.
 */
export const buildLocation = (location, mushrooms) => {
  const stops = usableStops(mushrooms);

  const currentLocation = normalizePoint(location?.currentLocation) || stops[0];

  let center = normalizePoint(location?.center);
  if (!center && stops.length) {
    const lats = stops.map((s) => s.latitude);
    const lngs = stops.map((s) => s.longitude);
    center = {
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    };
  }

  return {
    type: 'trail',
    ...(currentLocation ? { currentLocation } : {}),
    ...(center ? { center } : {}),
    ...(location?.boundary ? { boundary: location.boundary } : {}),
  };
};

/**
 * Adds the website's { lat, lng } keys alongside { latitude, longitude } so a
 * stored point reads correctly in both the web map and the mobile apps.
 */
export const withBothShapes = (location) => {
  const both = (p) => (p ? { ...p, lat: p.latitude, lng: p.longitude } : p);
  return {
    ...location,
    ...(location.currentLocation ? { currentLocation: both(location.currentLocation) } : {}),
    ...(location.center ? { center: both(location.center) } : {}),
  };
};

export const ALLOWED_DIFFICULTIES = ['Easy', 'Moderate', 'Hard'];
