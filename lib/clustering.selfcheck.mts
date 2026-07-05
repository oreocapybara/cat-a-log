import assert from 'node:assert/strict'
import { separateOverlappingCats, type MapPoint } from './clustering.ts'
import { distanceKm, offsetLatLng } from './geo.ts'
import type { NearbyCat } from './supabase/types.ts'

function makeCat(id: string, lat: number, lng: number): NearbyCat {
  return {
    id,
    name: id,
    primary_photo_url: 'https://example.com/x.jpg',
    lat,
    lng,
    is_ear_tipped: false,
    notes: null,
    tagged_by: null,
    confidence_score: 1,
    created_at: new Date().toISOString(),
    distance_km: 0,
    times_spotted: 1,
  }
}

function single(cat: NearbyCat): MapPoint {
  return { type: 'single', cat, lat: cat.lat, lng: cat.lng }
}

// Two identical-coordinate cats: first stays put, second moves ~24m away.
{
  const a = makeCat('a', 40.7, -74.0)
  const b = makeCat('b', 40.7, -74.0)
  const [pointA, pointB] = separateOverlappingCats([single(a), single(b)]) as Extract<
    MapPoint,
    { type: 'single' }
  >[]
  assert.equal(pointA.lat, 40.7, 'anchor latitude unchanged')
  assert.equal(pointA.lng, -74.0, 'anchor longitude unchanged')
  const movedKm = distanceKm(pointA.lat, pointA.lng, pointB.lat, pointB.lng)
  assert.ok(Math.abs(movedKm - 0.024) < 1e-6, `expected ~24m separation, got ${movedKm * 1000}m`)
}

// Three cats stacked at the same spot: two satellites fan 120 degrees apart, both ~24m from anchor.
{
  const cats = [makeCat('a', 10, 10), makeCat('b', 10, 10), makeCat('c', 10, 10)]
  const [pointA, pointB, pointC] = separateOverlappingCats(cats.map(single)) as Extract<
    MapPoint,
    { type: 'single' }
  >[]
  assert.equal(pointA.lat, 10, 'anchor unmoved')
  assert.equal(pointA.lng, 10, 'anchor unmoved')
  const bKm = distanceKm(pointA.lat, pointA.lng, pointB.lat, pointB.lng)
  const cKm = distanceKm(pointA.lat, pointA.lng, pointC.lat, pointC.lng)
  assert.ok(Math.abs(bKm - 0.024) < 1e-6, 'second point ~24m from anchor')
  assert.ok(Math.abs(cKm - 0.024) < 1e-6, 'third point ~24m from anchor')
  const betweenSatellites = distanceKm(pointB.lat, pointB.lng, pointC.lat, pointC.lng)
  // Two points each 24m from a shared center, 120 degrees apart, are 24*sqrt(3) ~= 41.57m apart.
  assert.ok(
    Math.abs(betweenSatellites - 0.041569) < 0.0001,
    `expected satellites ~41.57m apart (120deg fan), got ${betweenSatellites * 1000}m`
  )
}

// Two taps ~15m apart (a realistic "same spot" mobile tap, not identical
// coordinates): should still merge into one fanned group, not render as two
// independent (and potentially colliding) fans.
{
  const a = makeCat('a', 40.7, -74.0)
  const [nearLat, nearLng] = offsetLatLng(a.lat, a.lng, 0, 15)
  const b = makeCat('b', nearLat, nearLng)
  const [pointA, pointB] = separateOverlappingCats([single(a), single(b)]) as Extract<
    MapPoint,
    { type: 'single' }
  >[]
  assert.equal(pointA.lat, a.lat, 'anchor unmoved')
  assert.equal(pointA.lng, a.lng, 'anchor unmoved')
  const movedKm = distanceKm(pointA.lat, pointA.lng, pointB.lat, pointB.lng)
  assert.ok(
    Math.abs(movedKm - 0.024) < 1e-6,
    `expected the ~15m-apart pair to merge and fan to ~24m, got ${movedKm * 1000}m`
  )
}

// Two cats far apart (>20m): both pass through untouched.
{
  const a = makeCat('a', 40.7, -74.0)
  const b = makeCat('b', 40.71, -74.0)
  const [pointA, pointB] = separateOverlappingCats([single(a), single(b)]) as Extract<
    MapPoint,
    { type: 'single' }
  >[]
  assert.equal(pointA.lat, a.lat)
  assert.equal(pointB.lat, b.lat)
  assert.equal(pointB.lng, b.lng)
}

console.log('clustering.selfcheck: OK')
