import { test, expect } from '@playwright/test';

test.describe('Synod Multi-Agent TEE Orchestration E2E Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should execute Happy Path ($5k) successfully and verify receipt signature', async ({ page }) => {
    // 1. Select Happy Path scenario
    const happyButton = page.getByRole('button', { name: '[2] Happy Path ($5k)' });
    await expect(happyButton).toBeVisible();
    await happyButton.click();

    // 2. Click Deploy
    const deployButton = page.getByRole('button', { name: 'DEPLOY MULTI-AGENT TX' });
    await expect(deployButton).toBeVisible();
    await deployButton.click();

    // 3. Wait for committed state and VC receipt
    const committedStatus = page.locator('span').filter({ hasText: /^committed$/ }).first();
    await expect(committedStatus).toBeVisible({ timeout: 10000 });

    // 4. Verify step 3 (executor) approved
    const step3Approved = page.getByText('approved').nth(2);
    await expect(step3Approved).toBeVisible();

    // 5. Verify VC receipt displays
    await expect(page.getByText('COMPOSITE VC RECEIPT')).toBeVisible();

    // 6. Verify signature click
    const verifySignatureButton = page.getByRole('button', { name: 'Verify Receipt Signature' });
    await expect(verifySignatureButton).toBeVisible();
    await verifySignatureButton.click();

    // 7. Verify green badge (exact match → only the badge, not the "…signature verified" telemetry log line)
    await expect(page.getByText('Signature Verified', { exact: true })).toBeVisible();
  });

  test('should trigger atomic rollback on Boundary Veto ($15k)', async ({ page }) => {
    // 1. Select Boundary Veto scenario
    const vetoButton = page.getByRole('button', { name: '[1] Boundary Veto ($15k)' });
    await expect(vetoButton).toBeVisible();
    await vetoButton.click();

    // 2. Click Deploy
    const deployButton = page.getByRole('button', { name: 'DEPLOY MULTI-AGENT TX' });
    await expect(deployButton).toBeVisible();
    await deployButton.click();

    // 3. Wait for aborted status
    const abortedStatus = page.locator('span').filter({ hasText: /^aborted$/ }).first();
    await expect(abortedStatus).toBeVisible({ timeout: 10000 });

    // 4. Verify step 2 (compliance) vetoed
    const step2Vetoed = page.getByText('vetoed').first();
    await expect(step2Vetoed).toBeVisible();

    // 5. Verify zero side-effects rollback warning is visible
    await expect(page.getByText('ZERO side-effects: Webhook never reached, database untouched.')).toBeVisible();
  });

  test('should abort execution on ZK pairing check failure', async ({ page }) => {
    // 1. Select ZK Abort scenario
    const abortButton = page.getByRole('button', { name: '[3] ZK Abort (Pairing Fail)' });
    await expect(abortButton).toBeVisible();
    await abortButton.click();

    // 2. Click Deploy
    const deployButton = page.getByRole('button', { name: 'DEPLOY MULTI-AGENT TX' });
    await expect(deployButton).toBeVisible();
    await deployButton.click();

    // 3. Wait for aborted status
    const abortedStatus = page.locator('span').filter({ hasText: /^aborted$/ }).first();
    await expect(abortedStatus).toBeVisible({ timeout: 10000 });

    // 4. Verify step 2 (compliance) failed
    const step2Failed = page.getByText('failed').first();
    await expect(step2Failed).toBeVisible();
  });

  test('should trigger atomic rollback on webhook HTTP 503 outage', async ({ page }) => {
    // 1. Select Webhook Outage scenario
    const outageButton = page.getByRole('button', { name: '[4] Webhook Outage (503)' });
    await expect(outageButton).toBeVisible();
    await outageButton.click();

    // 2. Click Deploy
    const deployButton = page.getByRole('button', { name: 'DEPLOY MULTI-AGENT TX' });
    await expect(deployButton).toBeVisible();
    await deployButton.click();

    // 3. Wait for aborted status
    const abortedStatus = page.locator('span').filter({ hasText: /^aborted$/ }).first();
    await expect(abortedStatus).toBeVisible({ timeout: 10000 });

    // 4. Verify step 3 (executor) failed
    const step3Failed = page.getByText('failed').first();
    await expect(step3Failed).toBeVisible();

    // 5. Verify zero side-effects rollback warning is visible
    await expect(page.getByText('ZERO side-effects: Webhook never reached, database untouched.')).toBeVisible();
  });

});
