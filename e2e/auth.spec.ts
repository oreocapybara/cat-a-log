import { test, expect } from '@playwright/test'

// These tests run without pre-authenticated state
test.use({ storageState: { cookies: [], origins: [] } })

test('unauthenticated user is redirected to login', async ({ page }) => {
  await page.goto('/map')
  await expect(page).toHaveURL(/\/login/)
})

test('login page renders correctly', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /log in|sign in|welcome/i })).toBeVisible()
})
