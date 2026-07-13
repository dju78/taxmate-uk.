import { test, expect } from '@playwright/test';

test.describe('Phase 8: Playwright E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    // Reload to apply empty state
    await page.reload();
  });

  test('should add a new income record and persist across reloads', async ({ page }) => {
    // Navigate to Income tab
    await page.getByRole('button', { name: 'Income' }).click();
    
    // Add income
    await page.getByRole('button', { name: '+ Add income' }).click();
    await expect(page.getByRole('heading', { name: 'Add Income' })).toBeVisible();

    await page.locator('input[name="date"]').fill('2026-06-01');
    await page.locator('input[name="source"]').fill('Acme Corp');
    await page.locator('input[name="amount"]').fill('1200');
    await page.getByRole('button', { name: 'Add Income', exact: true }).click();

    // Wait for the modal to close and the table to update
    await expect(page.getByRole('heading', { name: 'Add Income' })).not.toBeVisible();

    // Verify UI reflects the change in the table specifically
    await expect(page.locator('td').filter({ hasText: 'Acme Corp' }).first()).toBeVisible();

    // Verify Persistence
    await page.reload();
    await page.getByRole('button', { name: 'Income' }).click();
    await expect(page.locator('td').filter({ hasText: 'Acme Corp' }).first()).toBeVisible();
  });

  test('should edit an existing income record', async ({ page }) => {
    await page.getByRole('button', { name: 'Income' }).click();
    await page.getByRole('button', { name: '+ Add income' }).click();
    await page.locator('input[name="date"]').fill('2026-06-01');
    await page.locator('input[name="source"]').fill('Acme Corp');
    await page.locator('input[name="amount"]').fill('1200');
    await page.getByRole('button', { name: 'Add Income', exact: true }).click();
    await expect(page.locator('td').filter({ hasText: 'Acme Corp' }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Edit income from Acme Corp' }).click();
    await page.locator('input[name="source"]').fill('Updated Co');
    await page.locator('input[name="amount"]').fill('999');
    await page.getByRole('button', { name: 'Update Income', exact: true }).click();

    await expect(page.locator('td').filter({ hasText: 'Updated Co' }).first()).toBeVisible();
    await expect(page.locator('td').filter({ hasText: '£999.00' }).first()).toBeVisible();
  });

  test('should delete an income record', async ({ page }) => {
    await page.getByRole('button', { name: 'Income' }).click();
    await page.getByRole('button', { name: '+ Add income' }).click();
    await page.locator('input[name="date"]').fill('2026-06-01');
    await page.locator('input[name="source"]').fill('Acme Corp');
    await page.locator('input[name="amount"]').fill('1200');
    await page.getByRole('button', { name: 'Add Income', exact: true }).click();
    await expect(page.locator('td').filter({ hasText: 'Acme Corp' }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Delete income from Acme Corp' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click(); // Confirmation dialog

    await expect(page.locator('td').filter({ hasText: 'Acme Corp' })).not.toBeVisible();
  });

  test('should add an expense record and persist', async ({ page }) => {
    await page.getByRole('button', { name: 'Expenses' }).click();
    
    await page.getByRole('button', { name: '+ Add expense' }).click();
    await expect(page.getByRole('heading', { name: 'Add Expense' })).toBeVisible();

    await page.locator('input[name="date"]').fill('2026-06-10');
    await page.locator('input[name="merchant"]').fill('TravelCo');
    await page.locator('input[name="amount"]').fill('75');
    await page.getByRole('button', { name: 'Add Expense', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Add Expense' })).not.toBeVisible();

    await expect(page.locator('td').filter({ hasText: 'TravelCo' }).first()).toBeVisible();

    // Verify Persistence
    await page.reload();
    await page.getByRole('button', { name: 'Expenses' }).click();
    await expect(page.locator('td').filter({ hasText: 'TravelCo' }).first()).toBeVisible();
  });

  test('load demo data successfully', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    
    await page.getByRole('button', { name: 'Load demo data' }).click();
    
    await page.getByRole('button', { name: 'Income' }).click();
    
    // Verify Demo records populate the Income table
    await expect(page.locator('td').filter({ hasText: 'Demo Client A' }).first()).toBeVisible();
  });

  test('clear data completely', async ({ page }) => {
    // Load demo data first
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Load demo data' }).click();
    
    // Now clear it
    await page.getByRole('button', { name: 'Clear all data' }).click();
    await page.getByRole('button', { name: 'Clear all data', exact: true }).click();
    
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page.getByText('No transactions recorded')).toBeVisible();
  });
});
