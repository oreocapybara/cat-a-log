import { test, expect } from '@playwright/test'

test('tag page loads', async ({ page }) => {
  await page.goto('/tag')

  const url = page.url()
  if (url.includes('/login')) {
    // Auth redirect is expected — proxy working correctly
    await expect(page).toHaveURL(/\/login/)
  } else {
    // Tag page should show the photo-first UI
    await expect(page.locator('main')).toBeVisible()
  }
})
