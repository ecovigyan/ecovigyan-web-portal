import assert from 'node:assert/strict';
import {
  normalizePoint,
  haversineMeters,
  geodesicKm,
  usableStops,
  buildLocation,
} from './trailGeo.js';

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
};

console.log('\nnormalizePoint');
check('accepts the client shape', () => {
  assert.deepEqual(normalizePoint({ latitude: 31.1, longitude: 77.2 }), {
    latitude: 31.1,
    longitude: 77.2,
  });
});
check('accepts the legacy {lat,lng} shape', () => {
  assert.deepEqual(normalizePoint({ lat: 31.1, lng: 77.2 }), {
    latitude: 31.1,
    longitude: 77.2,
  });
});
check('rejects an empty subdocument (the pre-fix stored value)', () => {
  assert.equal(normalizePoint({}), null);
});
check('rejects null/undefined', () => {
  assert.equal(normalizePoint(null), null);
  assert.equal(normalizePoint(undefined), null);
});
check('rejects string coordinates', () => {
  assert.equal(normalizePoint({ latitude: '31.1', longitude: '77.2' }), null);
});
check('rejects NaN', () => {
  assert.equal(normalizePoint({ latitude: NaN, longitude: 77.2 }), null);
});
check('treats 0,0 as a real point, not falsy', () => {
  assert.deepEqual(normalizePoint({ latitude: 0, longitude: 0 }), {
    latitude: 0,
    longitude: 0,
  });
});

console.log('\nhaversineMeters');
check('one degree of latitude is ~111.19 km', () => {
  const d = haversineMeters({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
  assert.ok(Math.abs(d - 111195) < 50, `got ${d}`);
});
check('identical points are 0 m apart', () => {
  const p = { latitude: 31.1048, longitude: 77.1734 };
  assert.equal(haversineMeters(p, p), 0);
});
check('matches a known Shimla-area pair within 1%', () => {
  // Shimla Ridge -> Jakhoo Temple, ~2.1 km straight line.
  const d = haversineMeters(
    { latitude: 31.1048, longitude: 77.1734 },
    { latitude: 31.1233, longitude: 77.1802 }
  );
  assert.ok(d > 2000 && d < 2200, `got ${d}`);
});

console.log('\ngeodesicKm');
check('is 0 for a single stop', () => {
  assert.equal(geodesicKm([{ latitude: 31, longitude: 77 }]), 0);
});
check('is 0 for no stops', () => {
  assert.equal(geodesicKm([]), 0);
});
check('sums every leg, not just endpoints', () => {
  const stops = [
    { latitude: 31.0, longitude: 77.0 },
    { latitude: 31.01, longitude: 77.0 },
    { latitude: 31.02, longitude: 77.0 },
  ];
  const total = geodesicKm(stops);
  const endToEnd = haversineMeters(stops[0], stops[2]) / 1000;
  assert.ok(Math.abs(total - endToEnd) < 0.001, `${total} vs ${endToEnd}`);
  assert.ok(total > 2.2 && total < 2.3, `got ${total}`);
});
check('a dogleg is longer than its straight line', () => {
  const stops = [
    { latitude: 31.0, longitude: 77.0 },
    { latitude: 31.01, longitude: 77.01 },
    { latitude: 31.02, longitude: 77.0 },
  ];
  assert.ok(geodesicKm(stops) > haversineMeters(stops[0], stops[2]) / 1000);
});

console.log('\nusableStops');
check('drops stops with no coordinate', () => {
  const stops = usableStops([
    { location: { latitude: 31, longitude: 77 } },
    { location: {} },
    { location: null },
    {},
    { location: { latitude: 32, longitude: 78 } },
  ]);
  assert.equal(stops.length, 2);
});
check('handles a missing mushrooms array', () => {
  assert.deepEqual(usableStops(undefined), []);
});

console.log('\nbuildLocation');
check('derives trailhead and centre from the stops', () => {
  const loc = buildLocation(undefined, [
    { location: { latitude: 31.0, longitude: 77.0 } },
    { location: { latitude: 31.2, longitude: 77.4 } },
  ]);
  assert.equal(loc.type, 'trail');
  assert.deepEqual(loc.currentLocation, { latitude: 31.0, longitude: 77.0 });
  assert.ok(Math.abs(loc.center.latitude - 31.1) < 1e-9);
  assert.ok(Math.abs(loc.center.longitude - 77.2) < 1e-9);
});
check('an empty stored currentLocation falls back to stop 1', () => {
  const loc = buildLocation({ currentLocation: {}, center: {} }, [
    { location: { latitude: 31.0, longitude: 77.0 } },
    { location: { latitude: 31.2, longitude: 77.4 } },
  ]);
  assert.deepEqual(loc.currentLocation, { latitude: 31.0, longitude: 77.0 });
  assert.ok(loc.center);
});
check('an explicit trailhead is preserved', () => {
  const loc = buildLocation({ currentLocation: { latitude: 30.5, longitude: 76.5 } }, [
    { location: { latitude: 31.0, longitude: 77.0 } },
    { location: { latitude: 31.2, longitude: 77.4 } },
  ]);
  assert.deepEqual(loc.currentLocation, { latitude: 30.5, longitude: 76.5 });
});
check('centre ignores stops that have no coordinates', () => {
  const loc = buildLocation(undefined, [
    { location: { latitude: 31.0, longitude: 77.0 } },
    { location: {} },
    { location: { latitude: 31.2, longitude: 77.4 } },
  ]);
  assert.ok(Math.abs(loc.center.latitude - 31.1) < 1e-9);
});
check('omits fields entirely when there are no usable stops', () => {
  const loc = buildLocation(undefined, [{ location: {} }]);
  assert.equal(loc.currentLocation, undefined);
  assert.equal(loc.center, undefined);
  assert.equal(loc.type, 'trail');
});
check('boundary is carried through when present', () => {
  const loc = buildLocation({ boundary: [[1, 2]] }, [
    { location: { latitude: 31, longitude: 77 } },
  ]);
  assert.deepEqual(loc.boundary, [[1, 2]]);
});

console.log(`\n${passed} assertions passed.\n`);
