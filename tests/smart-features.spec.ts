import { test, expect } from '@playwright/test';

test.describe('Smart Features Verification', () => {
    const email = 'itsswarnabha@gmail.com';
    const password = 'P@ssw0rd';
    const tripDestination = 'Smart Features Test ' + Date.now();

    test.beforeEach(async ({ page }) => {
        // Capture logs
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', exception => console.log(`PAGE ERROR: "${exception}"`));

        // Login
        await page.goto('/login');
        await page.fill('#email', email);
        await page.fill('#password', password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/dashboard');
        await expect(page.getByText('Your Trips')).toBeVisible();
    });

    test('should load details with Map and Weather', async ({ page }) => {
        // Check if we have trips
        const tripCards = page.locator('.group > .overflow-hidden');
        const count = await tripCards.count();

        if (count > 0) {
            console.log('Found existing trips, clicking the first one...');
            await tripCards.first().click();
        } else {
            console.log('No trips found, creating a new one...');
            // Try generic selector for Create Trip button
            await page.locator('button:has-text("Create Trip")').first().click();

            await page.fill('#destination', tripDestination);
            await page.fill('#startDate', '2024-05-01');
            await page.fill('#endDate', '2024-05-07');
            await page.locator('button:has-text("Create Trip")').last().click();

            // Wait for trip to appear and click it
            await expect(page.getByText(tripDestination)).toBeVisible();
            await page.getByText(tripDestination).click();
        }

        await expect(page).toHaveURL(/\/trip\/.+/);

        // 2. Verify Map
        // Check that the API key missing error is NOT present
        await expect(page.getByText('Google Maps API Key is missing')).not.toBeVisible();

        // 3. Verify Weather
        await page.getByRole('tab', { name: 'Weather' }).click();
        // Verify forecast header is visible
        await expect(page.getByText('5-Day Forecast')).toBeVisible();
        // Verify at least one weather card is present
        await expect(page.locator('.rounded-xl.border.bg-card').first()).toBeVisible();
    });
});
