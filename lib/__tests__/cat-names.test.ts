import { describe, it, expect } from 'vitest'
import { generateCatName } from '@/lib/cat-names'

describe('generateCatName', () => {
  it('returns a string', () => {
    const name = generateCatName()
    expect(typeof name).toBe('string')
  })

  it('matches the expected format: Title Word####', () => {
    const name = generateCatName()
    // Format: "Title Word1234" — title + space + word + 4-digit number
    expect(name).toMatch(/^[A-Z][a-z.]+ [A-Z][a-z]+\d{4}$/)
  })

  it('generates different names on subsequent calls (probabilistic)', () => {
    const names = new Set(Array.from({ length: 20 }, () => generateCatName()))
    // With 10 titles × 18 words × 9000 numbers, collisions in 20 draws
    // are astronomically unlikely
    expect(names.size).toBeGreaterThan(1)
  })

  it('number portion is between 1000 and 9999', () => {
    for (let i = 0; i < 50; i++) {
      const name = generateCatName()
      const numMatch = name.match(/(\d+)$/)
      expect(numMatch).not.toBeNull()
      const num = parseInt(numMatch![1], 10)
      expect(num).toBeGreaterThanOrEqual(1000)
      expect(num).toBeLessThanOrEqual(9999)
    }
  })

  it('name is at most 30 characters (fits the cat name field limit)', () => {
    // Longest possible: "Professor" (9) + " " + "Fluffernutter" (13) + "9999" (4) = 27
    for (let i = 0; i < 100; i++) {
      const name = generateCatName()
      expect(name.length).toBeLessThanOrEqual(30)
    }
  })
})
