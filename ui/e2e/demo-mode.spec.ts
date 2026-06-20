import { test, expect } from '@playwright/test';

test.describe('Synod Smoke & Demo Mode Tests', () => {

  test('should load the homepage successfully and verify SEO metadata', async ({ page }) => {
    // 1. Visit homepage
    await page.goto('/');

    // 2. Check title
    await expect(page).toHaveTitle(/Synod War-Room Console/);

    // 3. Verify coordinator interface loads
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toContainText(/ATOMIC MULTI-AGENT/);

    // Verify logo is present
    await expect(page.getByText('SYNOD').first()).toBeVisible();

    // 4. Verify telemetry panel loads
    const telemetryPanel = page.getByText(/TEE LOG TELEMETRY STREAM/i);
    await expect(telemetryPanel).toBeVisible();

    // 5. Verify TEE secure boundary indicator is present
    await expect(page.getByText(/TEE Mode Active/i).first()).toBeVisible();
  });

  test('should have no crash screens or overlay errors', async ({ page }) => {
    // Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // Verify there are no critical react-error-overlay containers
    const errorOverlay = page.locator('nextjs-portal');
    await expect(errorOverlay).not.toBeVisible();

    // Verify general accessibility and visible UI
    const scenariosTitle = page.getByText(/Select Demo Scenario:/i);
    await expect(scenariosTitle).toBeVisible();
  });

});
