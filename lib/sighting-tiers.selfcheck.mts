import assert from 'node:assert/strict'
import { getNextTierThreshold, getSightingTier } from './sighting-tiers.ts'

assert.equal(getNextTierThreshold(1), 2, 'a fresh catch (1) is due at tier-2 threshold')
assert.equal(getNextTierThreshold(2), 5, 'exactly at a threshold looks at the next one')
assert.equal(getNextTierThreshold(49), 50, 'just under the max threshold')
assert.equal(getNextTierThreshold(50), null, 'at the max threshold, no next tier')
assert.equal(getNextTierThreshold(1000), null, 'well past the max threshold, no next tier')

assert.equal(getSightingTier(1).name, 'Stray', 'sanity check against existing tier function')

console.log('sighting-tiers.selfcheck: OK')
