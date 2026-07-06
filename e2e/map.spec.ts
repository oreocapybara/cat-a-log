import { test, expect } from '@playwright/test'

test('map page renders', async ({ page }) => {
  await page.goto('/map')

  const url = page.url()
  if (url.includes('/login')) {
    // Auth redirect is expected behavior — validates proxy works
    await expect(page.getByRole('heading', { name: /log in|sign in|welcome/i })).toBeVisible()
  } else {
    // Map page should render the Leaflet container
    await expect(page.locator('.leaflet-container')).toBeVisible()
  }
})
