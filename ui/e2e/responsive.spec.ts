import { test, expect } from '@playwright/test';

test.describe('Synod Responsive Layout Tests', () => {

  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1440, height: 900 }
  ];

  for (const vp of viewports) {
    test(`should render correctly on ${vp.name} viewport (${vp.width}x${vp.height})`, async ({ page }) => {
      // Set viewport size
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Navigate
      await page.goto('/');

      // Check header fits viewport (is visible and not clipped)
      const title = page.locator('h1');
      await expect(title).toBeVisible();

      // Ensure no horizontal scrollbar is active (which indicates overflow)
      const overflowX = await page.evaluate(() => {
        return window.innerWidth < document.documentElement.scrollWidth;
      });
      expect(overflowX).toBe(false);

      // Verify transaction console container or scenario lists are visible
      const scenarios = page.getByText(/Select Demo Scenario:/i);
      await expect(scenarios).toBeVisible();
    });
  }

});
