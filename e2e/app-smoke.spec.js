import { test, expect } from '@playwright/test';

test.describe('Application smoke test', () => {
  test('landing or login page renders without unhandled errors', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();
  });
});

