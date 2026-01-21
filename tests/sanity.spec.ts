import { test, expect } from '@playwright/test';

test('sanity check', async ({ page }) => {
    await page.goto('https://google.com');
    await expect(page).toHaveTitle(/Google/);
});
