import { test, expect } from '@playwright/test';

test('Demo: Login Flow', async ({ page }) => {
    console.log('Starting Demo Test...');

    // 1. Go to Login
    console.log('Navigating to /login...');
    await page.goto('/login');

    // 2. Fill Credentials
    console.log('Filling credentials...');
    await page.fill('input[type="email"]', 'itsswarnabha@gmail.com');
    await page.fill('input[type="password"]', 'P@ssw0rd');

    // 3. Submit
    console.log('Submitting form...');
    await page.click('button[type="submit"]');

    // 4. Verify Redirect
    console.log('Waiting for dashboard...');
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
    console.log('Successfully redirected to Dashboard!');

    // 5. Verify Content
    await expect(page.getByText('Your Adventures')).toBeVisible();
    console.log('Dashboard content verified.');
});
