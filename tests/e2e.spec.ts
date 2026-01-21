import { test, expect } from '@playwright/test';

test.describe('NomadOS E2E', () => {
    const email = 'itsswarnabha@gmail.com';
    const password = 'P@ssw0rd';
    const tripDestination = 'Test Trip ' + Date.now();

    test('should allow a user to login, create a trip, and view details', async ({ page }) => {
        // Capture logs and errors
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', exception => console.log(`PAGE ERROR: "${exception}"`));
        page.on('dialog', async dialog => {
            console.log(`PAGE ALERT: ${dialog.message()}`);
            await dialog.dismiss();
        });

        // 1. Login
        console.log('Navigating to login...');
        await page.goto('/login', { waitUntil: 'domcontentloaded' });
        console.log('Filling login form...');
        await page.fill('#email', email);
        await page.fill('#password', password);
        await page.click('button[type="submit"]');
        console.log('Submitted login form...');

        // Check for error message
        try {
            const errorMsg = await page.locator('.text-destructive').textContent({ timeout: 5000 });
            if (errorMsg) console.log(`LOGIN UI ERROR: ${errorMsg}`);
        } catch (e) {
            // No error message found, proceed
        }

        // Wait for redirect to dashboard
        await expect(page).toHaveURL('/dashboard');
        await expect(page.getByText('Your Adventures')).toBeVisible();

        // 2. Create Trip
        // 2. Create Trip
        console.log('Creating trip...');
        await page.getByText('New Trip').click();
        await page.fill('#tripName', tripDestination);

        // Handle Destination Autocomplete
        // Note: This relies on Google Maps API being active and returning suggestions.
        // If it fails, we might need to mock the API or the component.
        const destinationInput = page.getByPlaceholder('Search for a place...');
        await destinationInput.fill('Singapore');
        await page.waitForTimeout(2000); // Wait for suggestions
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        await page.fill('#startDate', '2024-01-01');
        await page.fill('#endDate', '2024-01-07');
        await page.click('button[type="submit"]');

        // Wait for trip to appear
        await expect(page.getByText(tripDestination)).toBeVisible();

        // 3. View Trip Details
        console.log('Viewing trip details...');
        await page.getByText(tripDestination).click();
        await expect(page).toHaveURL(/\/trip\/.+/);
        await expect(page.getByText(tripDestination)).toBeVisible();

        // Check Tabs
        await expect(page.getByRole('tab', { name: 'Itinerary' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Budget' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Docs' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Weather' })).toBeVisible();
    });
});
