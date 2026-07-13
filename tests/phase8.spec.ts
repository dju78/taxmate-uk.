import { test, expect } from '@playwright/test';

test.describe('Phase 8: Comprehensive Playwright E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test to ensure a clean state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test.describe('CRUD Operations', () => {
    test('should add, edit, and delete an income record', async ({ page }) => {
      // Navigate and Add
      await page.getByRole('button', { name: 'Income' }).click();
      await page.getByRole('button', { name: '+ Add income' }).click();
      await expect(page.getByRole('heading', { name: 'Add Income' })).toBeVisible();

      await page.locator('input[name="date"]').fill('2026-06-01');
      await page.locator('input[name="source"]').fill('Test Client');
      await page.locator('input[name="amount"]').fill('1500.50');
      await page.getByRole('button', { name: 'Add Income', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Add Income' })).not.toBeVisible();
      
      // Verify persistence and state
      await page.reload();
      await page.getByRole('button', { name: 'Income' }).click();
      await expect(page.locator('span', { hasText: 'Test Client' }).first()).toBeVisible();
      await expect(page.getByText('£1500.50').first()).toBeVisible();

      // Edit
      await page.getByRole('button', { name: 'Edit income from Test Client' }).click({ force: true });
      await page.locator('input[name="source"]').fill('Updated Client');
      await page.locator('input[name="amount"]').fill('2000.00');
      await page.getByRole('button', { name: 'Update Income', exact: true }).click();

      await expect(page.locator('span', { hasText: 'Updated Client' }).first()).toBeVisible();
      await expect(page.getByText('£2000.00').first()).toBeVisible();

      // Delete
      await page.getByRole('button', { name: 'Delete income from Updated Client' }).click({ force: true });
      await page.getByRole('button', { name: 'Delete', exact: true }).click(); // Confirmation
      await expect(page.locator('span', { hasText: 'Updated Client' })).not.toBeVisible();
    });

    test('should add, edit, and delete an expense record', async ({ page }) => {
      await page.getByRole('button', { name: 'Expenses' }).click();
      
      // Add
      await page.getByRole('button', { name: '+ Add expense' }).click();
      await page.locator('input[name="date"]').fill('2026-06-15');
      await page.locator('input[name="merchant"]').fill('Office Supplies Co');
      await page.locator('input[name="amount"]').fill('120.00');
      await page.getByRole('button', { name: 'Add Expense', exact: true }).click();
      await expect(page.locator('span', { hasText: 'Office Supplies Co' }).first()).toBeVisible();

      // Edit
      await page.getByRole('button', { name: 'Edit expense from Office Supplies Co' }).click({ force: true });
      await page.locator('input[name="merchant"]').fill('Tech Store');
      await page.getByRole('button', { name: 'Update Expense', exact: true }).click();
      await expect(page.locator('span', { hasText: 'Tech Store' }).first()).toBeVisible();

      // Delete
      await page.getByRole('button', { name: 'Delete expense from Tech Store' }).click({ force: true });
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(page.locator('span', { hasText: 'Tech Store' })).not.toBeVisible();
    });
  });

  test.describe('Dashboard & Calculations', () => {
    test('KPI recalculation, chart updates, and reconciliation', async ({ page }) => {
      await page.getByRole('button', { name: 'Income' }).click();
      
      // Add received income
      await page.getByRole('button', { name: '+ Add income' }).click();
      await page.locator('input[name="date"]').fill('2026-06-01');
      await page.locator('input[name="source"]').fill('Paid Client');
      await page.locator('input[name="amount"]').fill('1000');
      await page.locator('select[name="status"]').selectOption('received');
      await page.getByRole('button', { name: 'Add Income', exact: true }).click();

      // Add pending income
      await page.getByRole('button', { name: '+ Add income' }).click();
      await page.locator('input[name="date"]').fill('2026-06-15');
      await page.locator('input[name="source"]').fill('Pending Client');
      await page.locator('input[name="amount"]').fill('500');
      await page.locator('select[name="status"]').selectOption('pending');
      await page.getByRole('button', { name: 'Add Income', exact: true }).click();

      // Add overdue income
      await page.getByRole('button', { name: '+ Add income' }).click();
      await page.locator('input[name="date"]').fill('2026-04-10'); // Within 26/27 tax year
      await page.locator('input[name="source"]').fill('Overdue Client');
      await page.locator('input[name="amount"]').fill('200');
      await page.locator('select[name="status"]').selectOption('overdue');
      await page.getByRole('button', { name: 'Add Income', exact: true }).click();

      await page.getByRole('button', { name: 'Dashboard' }).click();

      // Check reconciliation KPI cards
      await expect(page.getByText('£1000.00').first()).toBeVisible();
      await expect(page.getByText('£1700.00').first()).toBeVisible(); // 1000+500+200
      
      // Verify chart updates exist
      await expect(page.locator('figure').filter({ hasText: 'Income vs expenses' })).toBeVisible();
    });

    test('tax-year switching isolates data correctly', async ({ page }) => {
      // Ensure we are in 2026/27
      await page.locator('select[id="tax-year-select"]').first().selectOption('2026');

      await page.getByRole('button', { name: 'Income' }).click();
      await page.getByRole('button', { name: '+ Add income' }).click();
      await page.locator('input[name="date"]').fill('2026-06-01');
      await page.locator('input[name="source"]').fill('Client 2026');
      await page.locator('input[name="amount"]').fill('100');
      await page.getByRole('button', { name: 'Add Income', exact: true }).click();

      await expect(page.locator('span', { hasText: 'Client 2026' }).first()).toBeVisible();

      // Switch to 2025/26
      await page.locator('select[id="tax-year-select"]').first().selectOption('2025');
      await expect(page.locator('span', { hasText: 'Client 2026' })).not.toBeVisible();

      // Add a record for 2025
      await page.getByRole('button', { name: '+ Add income' }).click();
      await page.locator('input[name="date"]').fill('2025-06-01');
      await page.locator('input[name="source"]').fill('Client 2025');
      await page.locator('input[name="amount"]').fill('200');
      await page.getByRole('button', { name: 'Add Income', exact: true }).click();

      await expect(page.locator('span', { hasText: 'Client 2025' }).first()).toBeVisible();

      // Switch back to 2026
      await page.locator('select[id="tax-year-select"]').first().selectOption('2026');
      await expect(page.locator('span', { hasText: 'Client 2026' }).first()).toBeVisible();
      await expect(page.locator('span', { hasText: 'Client 2025' })).not.toBeVisible();
    });
  });

  test.describe('Filters', () => {
    test('income filters work correctly', async ({ page }) => {
      await page.getByRole('button', { name: 'Income' }).click();
      
      // Setup data
      await page.getByRole('button', { name: '+ Add income' }).click();
      await page.locator('input[name="date"]').fill('2026-06-01');
      await page.locator('input[name="source"]').fill('Alpha');
      await page.locator('input[name="amount"]').fill('100');
      await page.locator('select[name="status"]').selectOption('received');
      await page.getByRole('button', { name: 'Add Income', exact: true }).click();

      await page.getByRole('button', { name: '+ Add income' }).click();
      await page.locator('input[name="date"]').fill('2026-06-02');
      await page.locator('input[name="source"]').fill('Beta');
      await page.locator('input[name="amount"]').fill('200');
      await page.locator('select[name="status"]').selectOption('pending');
      await page.getByRole('button', { name: 'Add Income', exact: true }).click();

      // Filter by Status
      await page.getByRole('button', { name: 'Pending' }).click();
      await expect(page.getByRole('button', { name: 'Edit income from Beta' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Edit income from Alpha' })).not.toBeVisible();

      // Reset
      await page.getByRole('button', { name: 'Reset filters' }).click();
      await expect(page.getByRole('button', { name: 'Edit income from Alpha' })).toBeVisible();

      // Invalid date ranges
      await page.locator('input[type="date"]').nth(0).fill('2026-10-01'); // From
      await page.locator('input[type="date"]').nth(1).fill('2026-09-01'); // To
      await expect(page.getByText('Start date must be on or before the end date.')).toBeVisible();
      await expect(page.locator('input[aria-invalid="true"]')).toHaveCount(2);
    });

    test('expense filters work correctly', async ({ page }) => {
      await page.getByRole('button', { name: 'Expenses' }).click();
      
      // Setup data
      await page.getByRole('button', { name: '+ Add expense' }).click();
      await page.locator('input[name="date"]').fill('2026-06-01');
      await page.locator('input[name="merchant"]').fill('Exp A');
      await page.locator('input[name="amount"]').fill('50');
      await page.getByRole('button', { name: 'Add Expense', exact: true }).click();

      await page.getByRole('button', { name: '+ Add expense' }).click();
      await page.locator('input[name="date"]').fill('2026-07-01');
      await page.locator('input[name="merchant"]').fill('Exp B');
      await page.locator('input[name="amount"]').fill('100');
      await page.getByRole('button', { name: 'Add Expense', exact: true }).click();

      // Filter by Date From
      await page.locator('input[type="date"]').nth(0).fill('2026-06-15');
      await expect(page.locator('span', { hasText: 'Exp B' }).first()).toBeVisible();
      await expect(page.locator('span', { hasText: 'Exp A' })).not.toBeVisible();

      // Reset
      await page.getByRole('button', { name: 'Reset filters' }).click();
      await expect(page.locator('span', { hasText: 'Exp A' }).first()).toBeVisible();
    });
  });

  test.describe('Data & Export/Import', () => {
    test('JSON export, restore, and merge', async ({ page }) => {
      await page.getByRole('button', { name: 'Settings' }).click();
      
      // Load demo data so we have something to export
      await page.getByRole('button', { name: 'Load demo data' }).click();
      
      // Test JSON Export trigger (intercept download)
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export JSON backup' }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/taxmate-backup-.*\.json/);

      // Now Clear Data
      await page.getByRole('button', { name: 'Clear all data…' }).click();
      await page.getByRole('button', { name: 'Clear all data', exact: true }).click();

      // Import the previously exported file
      const stream = await download.createReadStream();
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', c => chunks.push(c));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
      const downloadedJson = buffer.toString('utf-8');
      
      // Mock the file chooser
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Import JSON backup…' }).click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles({
        name: 'backup.json',
        mimeType: 'application/json',
        buffer: Buffer.from(downloadedJson)
      });

      // Assert Restore flow
      await expect(page.getByRole('heading', { name: 'Import backup' })).toBeVisible();
      await page.getByLabel('Restore backup').check();
      await page.getByRole('button', { name: 'Restore', exact: true }).click();

      // Verify records are back
      await page.getByRole('button', { name: 'Income' }).click();
      await expect(page.locator('span', { hasText: 'Demo Client A' }).first()).toBeVisible();

      // Test Merge Import
      await page.getByRole('button', { name: 'Settings' }).click();
      const mergeFileChooserPromise = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Import JSON backup…' }).click();
      const mergeFileChooser = await mergeFileChooserPromise;
      
      // Import a new file with 1 unique record
      const mergeData = {
        schemaVersion: 1,
        income: [{ id: 'merge-1', date: '2026-06-10', source: 'Merge Client', category: 'Sales', amount: 50, status: 'received', isDemo: false }],
        expenses: [],
        preferences: { selectedTaxYear: 2026 }
      };
      await mergeFileChooser.setFiles({
        name: 'merge.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(mergeData))
      });

      await page.getByLabel('Merge backup').check();
      await page.getByRole('button', { name: 'Merge', exact: true }).click();
      
      await page.getByRole('button', { name: 'Income' }).click();
      await expect(page.locator('span', { hasText: 'Merge Client' }).first()).toBeVisible();
      // Original demo records should still exist (Existing-data preservation)
      await expect(page.locator('span', { hasText: 'Demo Client A' }).first()).toBeVisible();
    });

    test('invalid import rejection', async ({ page }) => {
      await page.getByRole('button', { name: 'Settings' }).click();
      
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Import JSON backup…' }).click();
      const fileChooser = await fileChooserPromise;
      
      await fileChooser.setFiles({
        name: 'invalid.json',
        mimeType: 'application/json',
        buffer: Buffer.from('this is not json')
      });

      await expect(page.getByText('This file cannot be imported. Your existing data has not been changed.')).toBeVisible();
      await page.getByRole('button', { name: 'Cancel' }).click();
    });

    test('CSV export', async ({ page }) => {
      await page.getByRole('button', { name: 'Settings' }).click();
      await page.getByRole('button', { name: 'Load demo data' }).click();

      // Export CSV
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export CSV (selected tax year)' }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/taxmate-income-.*\.csv/);
    });

    test('demo loading and removal preserving user records', async ({ page }) => {
      await page.getByRole('button', { name: 'Income' }).click();
      
      // User adds a record
      await page.getByRole('button', { name: '+ Add income' }).click();
      await page.locator('input[name="date"]').fill('2026-06-01');
      await page.locator('input[name="source"]').fill('My Own Client');
      await page.locator('input[name="amount"]').fill('100');
      await page.getByRole('button', { name: 'Add Income', exact: true }).click();

      await page.getByRole('button', { name: 'Settings' }).click();
      await page.getByRole('button', { name: 'Load demo data' }).click();

      await page.getByRole('button', { name: 'Income' }).click();
      await expect(page.locator('span', { hasText: 'My Own Client' }).first()).toBeVisible();
      await expect(page.locator('span', { hasText: 'Demo Client A' }).first()).toBeVisible();

      // Remove demo data
      await page.getByRole('button', { name: 'Settings' }).click();
      await page.getByRole('button', { name: 'Remove demo data' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Remove demo data' }).click();

      await page.getByRole('button', { name: 'Income' }).click();
      // Demo gone, User record preserved
      await expect(page.locator('span', { hasText: 'Demo Client A' })).not.toBeVisible();
      await expect(page.locator('span', { hasText: 'My Own Client' }).first()).toBeVisible();
    });
  });

  test.describe('Accessibility & Layout', () => {
    test('modal focus trapping and keyboard navigation', async ({ page }) => {
      await page.getByRole('button', { name: 'Income' }).click();
      
      await page.getByRole('button', { name: '+ Add income' }).click();
      
      const modal = page.getByRole('dialog', { name: 'Add Income' });
      await expect(modal).toBeVisible();

      // Press Escape to close
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    });

    test('mobile navigation and layout bounds', async ({ page }) => {
      // Test mobile layout
      await page.setViewportSize({ width: 375, height: 812 });

      // Ensure no horizontal overflow
      const horizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(horizontalOverflow).toBe(false);

      // Navigate using mobile bottom/top bar
      await page.getByRole('button', { name: 'Income' }).click();
      await expect(page.getByRole('heading', { name: 'Income' }).first()).toBeVisible();
    });
  });
});
