import assert from 'node:assert/strict'
import { distanceKm, offsetLatLng } from './geo.ts'

// Due north by 1000m should land ~1km away per distanceKm's own math, with no longitude change.
const [northLat, northLng] = offsetLatLng(0, 0, 0, 1000)
assert.ok(
  Math.abs(distanceKm(0, 0, northLat, northLng) - 1) < 0.0001,
  'offsetLatLng north bearing should move ~1km'
)
assert.ok(Math.abs(northLng - 0) < 1e-9, 'due-north offset should not change longitude')

// Due east by 1000m should also land ~1km away, this time via longitude only.
const [eastLat, eastLng] = offsetLatLng(0, 0, Math.PI / 2, 1000)
assert.ok(
  Math.abs(distanceKm(0, 0, eastLat, eastLng) - 1) < 0.0001,
  'offsetLatLng east bearing should move ~1km'
)
assert.ok(Math.abs(eastLat - 0) < 1e-9, 'due-east offset should not change latitude')

// A small 2m nudge (the real production radius) should round-trip through distanceKm too.
const [nearLat, nearLng] = offsetLatLng(40.0, -73.0, Math.PI / 4, 2)
assert.ok(
  Math.abs(distanceKm(40.0, -73.0, nearLat, nearLng) - 0.002) < 1e-6,
  '2m offset should measure back as 0.002km'
)

console.log('geo.selfcheck: OK')
