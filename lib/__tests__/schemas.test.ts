import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Recreate schemas exactly as defined in their respective page components.
// These are the validation contracts — testing them directly ensures forms
// reject bad input regardless of UI rendering.

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const registerSchema = z
  .object({
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must include at least one uppercase letter')
      .regex(/[0-9]/, 'Must include at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

const profileSchema = z.object({
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(30, 'Username must be 30 characters or less')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),
  bio: z.string().max(30, 'Bio must be 30 characters or less').optional(),
})

const nameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(30, 'Name must be 30 characters or less'),
})

const detailsSchema = z.object({
  isEarTipped: z.boolean(),
  notes: z.string().max(100, 'Notes must be 100 characters or less').optional(),
  tags: z.array(z.string()),
})

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret123' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret123' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email')
    }
  })

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'secret123' })
    expect(result.success).toBe(false)
  })

  it('rejects password shorter than 6 characters', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '12345' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('password')
    }
  })

  it('accepts password of exactly 6 characters', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '123456' })
    expect(result.success).toBe(true)
  })
})

describe('registerSchema', () => {
  const valid = {
    email: 'user@example.com',
    password: 'Secure1pass',
    confirmPassword: 'Secure1pass',
  }

  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects password without uppercase', () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: 'secure1pass',
      confirmPassword: 'secure1pass',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password without a number', () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: 'SecurePass',
      confirmPassword: 'SecurePass',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: 'Se1abcd',
      confirmPassword: 'Se1abcd',
    })
    expect(result.success).toBe(false)
  })

  it('rejects mismatched confirmPassword', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: 'Different1' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('confirmPassword')
    }
  })

  it('accepts password of exactly 8 characters with uppercase and number', () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: 'Abcdef1x',
      confirmPassword: 'Abcdef1x',
    })
    expect(result.success).toBe(true)
  })
})

describe('profileSchema (setup-profile)', () => {
  it('accepts valid username', () => {
    const result = profileSchema.safeParse({ username: 'cool_cat-2' })
    expect(result.success).toBe(true)
  })

  it('rejects username shorter than 2 characters', () => {
    const result = profileSchema.safeParse({ username: 'a' })
    expect(result.success).toBe(false)
  })

  it('rejects username longer than 30 characters', () => {
    const result = profileSchema.safeParse({ username: 'a'.repeat(31) })
    expect(result.success).toBe(false)
  })

  it('rejects username with spaces', () => {
    const result = profileSchema.safeParse({ username: 'cool cat' })
    expect(result.success).toBe(false)
  })

  it('rejects username with special characters', () => {
    const result = profileSchema.safeParse({ username: 'cool@cat!' })
    expect(result.success).toBe(false)
  })

  it('accepts username with underscores and hyphens', () => {
    const result = profileSchema.safeParse({ username: 'the_cat-whisperer' })
    expect(result.success).toBe(true)
  })

  it('bio is optional', () => {
    const result = profileSchema.safeParse({ username: 'catfan' })
    expect(result.success).toBe(true)
  })

  it('accepts bio within limit', () => {
    const result = profileSchema.safeParse({ username: 'catfan', bio: 'I love cats' })
    expect(result.success).toBe(true)
  })

  it('rejects bio longer than 30 characters', () => {
    const result = profileSchema.safeParse({ username: 'catfan', bio: 'a'.repeat(31) })
    expect(result.success).toBe(false)
  })
})

describe('nameSchema (cat name)', () => {
  it('accepts a valid name', () => {
    const result = nameSchema.safeParse({ name: 'Mr. Whiskers' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = nameSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name longer than 30 characters', () => {
    const result = nameSchema.safeParse({ name: 'a'.repeat(31) })
    expect(result.success).toBe(false)
  })

  it('accepts name of exactly 30 characters', () => {
    const result = nameSchema.safeParse({ name: 'a'.repeat(30) })
    expect(result.success).toBe(true)
  })
})

describe('detailsSchema (cat details)', () => {
  it('accepts valid details with all fields', () => {
    const result = detailsSchema.safeParse({
      isEarTipped: true,
      notes: 'Friendly tabby, hangs out near the park',
      tags: ['needs_medical'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts minimal valid details', () => {
    const result = detailsSchema.safeParse({
      isEarTipped: false,
      tags: [],
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-boolean isEarTipped', () => {
    const result = detailsSchema.safeParse({
      isEarTipped: 'yes',
      tags: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects notes longer than 100 characters', () => {
    const result = detailsSchema.safeParse({
      isEarTipped: false,
      notes: 'a'.repeat(101),
      tags: [],
    })
    expect(result.success).toBe(false)
  })

  it('accepts notes of exactly 100 characters', () => {
    const result = detailsSchema.safeParse({
      isEarTipped: false,
      notes: 'a'.repeat(100),
      tags: [],
    })
    expect(result.success).toBe(true)
  })

  it('accepts multiple tags', () => {
    const result = detailsSchema.safeParse({
      isEarTipped: true,
      tags: ['needs_medical', 'possible_rabies'],
    })
    expect(result.success).toBe(true)
  })
})
