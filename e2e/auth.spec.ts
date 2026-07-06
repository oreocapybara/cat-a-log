import { test, expect } from '@playwright/test'

// These tests run without pre-authenticated state
test.use({ storageState: { cookies: [], origins: [] } })

test('unauthenticated user accessing protected route is redirected to login', async ({ page }) => {
  // /profile/me is a protected route (not in PUBLIC_ROUTES)
  await page.goto('/profile/me')
  await expect(page).toHaveURL(/\/login/)
})

test('login page renders correctly', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByLabel(/email/i)).toBeVisible()
  await expect(page.getByLabel(/password/i)).toBeVisible()
})
