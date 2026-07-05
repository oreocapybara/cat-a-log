import assert from 'node:assert/strict'
import { getCatchCardFoil } from './catch-card-seed.ts'

const idA = '11111111-1111-1111-1111-111111111111'
const idB = '22222222-2222-2222-2222-222222222222'

const a1 = getCatchCardFoil(idA)
const a2 = getCatchCardFoil(idA)
assert.equal(a1.angleDeg, a2.angleDeg, 'same id yields same angle')
assert.equal(a1.offsetPercent, a2.offsetPercent, 'same id yields same offset')

const b = getCatchCardFoil(idB)
assert.ok(
  a1.angleDeg !== b.angleDeg || a1.offsetPercent !== b.offsetPercent,
  'different ids produce different foil'
)

assert.ok(a1.angleDeg >= 100 && a1.angleDeg <= 130, 'angle within [100, 130]')
assert.ok(a1.offsetPercent >= 25 && a1.offsetPercent <= 75, 'offset within [25, 75]')

console.log('catch-card-seed.selfcheck: OK')
