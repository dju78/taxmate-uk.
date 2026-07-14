import { test, expect } from '@playwright/test';

test.describe('Phase 8: Comprehensive Playwright E2E Tests', () => {
  let testErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    testErrors = [];
    page.on('pageerror', (err) => testErrors.push(`Page error: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') testErrors.push(`Console error: ${msg.text()}`);
    });
    page.on('requestfailed', (req) => testErrors.push(`Request failed: ${req.url()}`));

    // Clear localStorage before each test to ensure a clean state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      // Onboarding opens whenever the saved onboardingVersion is behind
      // CURRENT_ONBOARDING_VERSION (see OnboardingModal.tsx) — completed/
      // skipped flags alone no longer suppress it, so set a version high
      // enough to bypass the modal for every test in this suite.
      localStorage.setItem(
        'taxmate_app_preferences',
        JSON.stringify({ onboardingCompleted: true, onboardingVersion: 999 })
      );
    });
    await page.reload();
  });

  test.afterEach(() => {
    // Some external fonts or icons might cause a network failure that we don't control, but we enforce no errors from our bundle.
    // Ensure there are no application errors.
    const appErrors = testErrors.filter(e => !e.includes('favicon.ico') && !e.includes('fonts.googleapis.com'));
    expect(appErrors).toEqual([]);
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

      // Edit and Layout Check
      const editBtn = page.getByRole('button', { name: 'Edit income from Test Client' });
      const deleteBtn = page.getByRole('button', { name: 'Delete income from Test Client' });
      await expect(editBtn).toBeVisible();
      await expect(deleteBtn).toBeVisible();
      
      // Prove that the Edit and Delete controls are not obscured by mobile navigation
      const nav = page.locator('nav[aria-label="Primary"]');
      if (await nav.isVisible()) {
        await editBtn.scrollIntoViewIfNeeded();
        await deleteBtn.scrollIntoViewIfNeeded();
        const navBox = await nav.boundingBox();
        const editBox = await editBtn.boundingBox();
        const deleteBox = await deleteBtn.boundingBox();
        expect(editBox!.y + editBox!.height).toBeLessThanOrEqual(navBox!.y);
        expect(deleteBox!.y + deleteBox!.height).toBeLessThanOrEqual(navBox!.y);
      }

      await editBtn.click();
      await page.locator('input[name="source"]').fill('Updated Client');
      await page.locator('input[name="amount"]').fill('2000.00');
      await page.getByRole('button', { name: 'Update Income', exact: true }).click();

      await expect(page.locator('span', { hasText: 'Updated Client' }).first()).toBeVisible();
      await expect(page.getByText('£2000.00').first()).toBeVisible();

      // Delete
      await page.getByRole('button', { name: 'Delete income from Updated Client' }).click();
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
      await page.getByRole('button', { name: 'Edit expense from Office Supplies Co' }).click();
      await page.locator('input[name="merchant"]').fill('Tech Store');
      await page.getByRole('button', { name: 'Update Expense', exact: true }).click();
      await expect(page.locator('span', { hasText: 'Tech Store' }).first()).toBeVisible();

      // Delete
      await page.getByRole('button', { name: 'Delete expense from Tech Store' }).click();
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

      // Invalid date ranges: shown as an error, but NOT applied — the last
      // valid ledger results are preserved rather than emptied.
      await page.locator('input[type="date"]').nth(0).fill('2026-10-01'); // From
      await page.locator('input[type="date"]').nth(1).fill('2026-09-01'); // To
      await expect(page.getByText('The From date cannot be later than the To date.')).toBeVisible();
      await expect(page.locator('input[aria-invalid="true"]')).toHaveCount(2);
      await expect(page.getByRole('button', { name: 'Edit income from Alpha' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Edit income from Beta' })).toBeVisible();
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

    test('diagnostics log records a failed import and can be cleared', async ({ page }) => {
      await page.getByRole('button', { name: 'Settings' }).click();
      await expect(page.getByText('No diagnostic entries recorded yet.')).toBeVisible();

      // Trigger a failed import (unreadable file -> IMPORT_FAILURE entry).
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Import JSON backup…' }).click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles({
        name: 'invalid.json',
        mimeType: 'application/json',
        buffer: Buffer.from('this is not json'),
      });
      await expect(page.getByText('This file cannot be imported. Your existing data has not been changed.')).toBeVisible();
      await page.getByRole('button', { name: 'Cancel' }).click();

      // The entry now appears in Settings' Diagnostics section.
      await expect(page.getByText('IMPORT_FAILURE')).toBeVisible();
      await expect(page.getByText(/1 entry/)).toBeVisible();

      // Clear it.
      await page.getByRole('button', { name: 'Clear log' }).click();
      await page.getByRole('dialog', { name: 'Clear diagnostic log' }).getByRole('button', { name: 'Clear log' }).click();
      await expect(page.getByText('No diagnostic entries recorded yet.')).toBeVisible();
      await expect(page.getByText('IMPORT_FAILURE')).not.toBeVisible();
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

  test.describe('Report printing', () => {
    test('print media hides interactive chrome and reveals every report section', async ({ page }) => {
      // Seed a record so the summary/income/expenses tabs have content.
      await page.getByRole('button', { name: 'Income' }).click();
      await page.getByRole('button', { name: '+ Add income' }).click();
      await page.getByLabel('Client or Income Source').fill('Print Test Client');
      await page.getByLabel('Amount (£)').fill('123.45');
      await page.getByRole('button', { name: 'Add Income', exact: true }).click();

      await page.getByRole('button', { name: 'Reports' }).click();
      await expect(page.getByRole('heading', { name: 'Tax Year Reports' })).toBeVisible();

      // Only the Summary tab is active on screen; Income/Expenses/Tax/Past
      // are switched out via a plain "hidden" class until print media hits.
      await expect(page.getByRole('heading', { name: 'Income status' })).toBeHidden();

      await page.emulateMedia({ media: 'print' });

      // Nav, tab bar and the "Print Report" button itself must not print.
      await expect(page.getByRole('button', { name: 'Print Report' })).toBeHidden();
      await expect(page.getByRole('button', { name: 'Reports' })).toBeHidden();

      // Every report section becomes visible for print, not just the active tab.
      await expect(page.getByRole('heading', { name: 'Tax-year summary' }).last()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Income status' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Expense breakdown' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Tax estimate preview' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Past Tax Years Summary' })).toBeVisible();

      // Print header carries the selected tax year, a generation date, and
      // the data-quality/prototype disclaimer.
      await expect(page.getByText(/TaxMate Report: \d{4}\/\d{2}/)).toBeVisible();
      await expect(page.getByText('Generation Date:').first()).toBeVisible();
      await expect(page.getByText('Data quality notes:').first()).toBeVisible();

      await page.emulateMedia({ media: 'screen' });
    });
  });

  test.describe('Phase 10A: Tax Estimate Preview', () => {
    test('requires mandatory confirmations before showing estimate', async ({ page }) => {
      await page.getByRole('button', { name: 'Reports' }).click();
      await page.getByRole('tab', { name: 'Tax Preview' }).click();
      
      // The estimate should be hidden initially
      await expect(page.getByRole('heading', { name: 'Profit Calculation' })).toBeHidden();
      await expect(page.getByText('Tax Profile Details')).toBeVisible();

      // Click calculate
      await page.getByRole('button', { name: 'Calculate Estimate' }).click();

      // The estimate should now be visible
      await expect(page.getByRole('heading', { name: 'Profit Calculation' })).toBeVisible();
      await expect(page.getByText('Tax Profile Details')).toBeHidden();
    });

    test('blocks Scotland with the correct message', async ({ page }) => {
      await page.getByRole('button', { name: 'Reports' }).click();
      await page.getByRole('tab', { name: 'Tax Preview' }).click();

      await page.locator('label:has-text("Tax Region") + select').selectOption('scotland');
      await page.getByRole('button', { name: 'Calculate Estimate' }).click();

      await expect(page.getByText(/Scottish tax rules are not supported/)).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Profit Calculation' })).toBeHidden();
    });

    test('blocks other taxable income with the correct message', async ({ page }) => {
      await page.getByRole('button', { name: 'Reports' }).click();
      await page.getByRole('tab', { name: 'Tax Preview' }).click();

      await page.getByLabel('I have other sources of taxable income (e.g. employment, property, dividends).').check();
      await page.getByRole('button', { name: 'Calculate Estimate' }).click();

      await expect(page.getByText(/does not currently support: Employment income/)).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Profit Calculation' })).toBeHidden();
    });

    test('Gift Aid / pension checkbox now has a real, visible effect', async ({ page }) => {
      const giftAidWarning = /does not account for Gift Aid donations or pension contributions/;

      // Unchecked by default -> no Gift Aid warning.
      await page.getByRole('button', { name: 'Reports' }).click();
      await page.getByRole('tab', { name: 'Tax Preview' }).click();
      await page.getByRole('button', { name: 'Calculate Estimate' }).click();
      await expect(page.getByRole('heading', { name: 'Profit Calculation' })).toBeVisible();
      await expect(page.getByText(giftAidWarning)).toBeHidden();

      // The profile form is replaced by the results panel with no way back to
      // it in this view, so re-enter Reports fresh (remounts the component,
      // resetting local state) to exercise the checked path.
      await page.getByRole('button', { name: 'Dashboard' }).click();
      await page.getByRole('button', { name: 'Reports' }).click();
      await page.getByRole('tab', { name: 'Tax Preview' }).click();
      await page.getByLabel('I have made Gift Aid donations or personal pension contributions (not accounted for here).').check();
      await page.getByRole('button', { name: 'Calculate Estimate' }).click();
      await expect(page.getByText(giftAidWarning)).toBeVisible();
    });
  });

  test.describe('Net Income Calculator', () => {
    test('calculates take-home pay for a gross salary', async ({ page }) => {
      await page.getByRole('button', { name: 'Calculators' }).click();
      await expect(page.getByRole('heading', { name: 'Calculators' })).toBeVisible();
      await expect(page.getByText('Prototype estimate only')).toBeVisible();

      await page.getByLabel('Gross Annual Salary (£)').fill('35000');
      await page.getByRole('button', { name: 'Calculate' }).click();

      await expect(page.getByRole('heading', { name: 'Breakdown' })).toBeVisible();
      // Basic rate tax happens to equal total Income Tax Due here (only one
      // band applies), so this figure legitimately appears twice.
      await expect(page.getByText('£4486.00').first()).toBeVisible();
      await expect(page.getByText('£1794.40')).toBeVisible(); // Class 1 NIC
      await expect(page.getByText('£28719.60')).toBeVisible(); // Net income
    });

    test('blocks Scotland with the correct message', async ({ page }) => {
      await page.getByRole('button', { name: 'Calculators' }).click();
      await page.getByLabel('Tax Region').selectOption('scotland');
      await page.getByLabel('Gross Annual Salary (£)').fill('35000');
      await page.getByRole('button', { name: 'Calculate' }).click();

      await expect(page.getByText(/Scottish tax rules are not supported/)).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Breakdown' })).toBeHidden();
    });

    test('always discloses that student loans and benefits-in-kind are not modelled', async ({ page }) => {
      await page.getByRole('button', { name: 'Calculators' }).click();
      await page.getByLabel('Gross Annual Salary (£)').fill('35000');
      await page.getByRole('button', { name: 'Calculate' }).click();

      await expect(page.getByText(/does not account for student loan repayments/)).toBeVisible();
    });

    test('applies a pension contribution percentage before tax and NIC', async ({ page }) => {
      await page.getByRole('button', { name: 'Calculators' }).click();
      await page.getByLabel('Gross Annual Salary (£)').fill('35000');

      // Range inputs don't support fill(); use keyboard to jump to the max (10%).
      const pensionSlider = page.getByLabel(/Pension Contribution/);
      await pensionSlider.focus();
      await pensionSlider.press('End');

      await page.getByRole('button', { name: 'Calculate' }).click();

      await expect(page.getByRole('heading', { name: /Breakdown/ })).toBeVisible();
      await expect(page.getByText('Pension Contribution (10%)')).toBeVisible();
      await expect(page.getByText(/salary sacrifice pension contribution of 10%/)).toBeVisible();
    });

    test('applies an explicit tax code and overrides the standard Personal Allowance', async ({ page }) => {
      await page.getByRole('button', { name: 'Calculators' }).click();
      await page.getByLabel('Gross Annual Salary (£)').fill('20000');
      await page.getByLabel('Tax Code').selectOption('BR');
      await page.getByRole('button', { name: 'Calculate' }).click();

      await expect(page.getByRole('heading', { name: /Tax Code: BR/ })).toBeVisible();
      await expect(page.getByText(/Tax calculated using tax code BR/)).toBeVisible();
    });

    test('rejects an unrecognised tax code entered via Other', async ({ page }) => {
      await page.getByRole('button', { name: 'Calculators' }).click();
      await page.getByLabel('Gross Annual Salary (£)').fill('20000');
      await page.getByLabel('Tax Code').selectOption('other');
      await page.getByLabel('Enter tax code').fill('ZZ99');
      await page.getByRole('button', { name: 'Calculate' }).click();

      await expect(page.getByText(/not a recognised tax code/)).toBeVisible();
    });

    test('accepts a K code entered via Other', async ({ page }) => {
      await page.getByRole('button', { name: 'Calculators' }).click();
      await page.getByLabel('Gross Annual Salary (£)').fill('30000');
      await page.getByLabel('Tax Code').selectOption('other');
      await page.getByLabel('Enter tax code').fill('K475');
      await page.getByRole('button', { name: 'Calculate' }).click();

      await expect(page.getByRole('heading', { name: /Tax Code: K475/ })).toBeVisible();
    });

    test('switches between yearly, monthly, and weekly views', async ({ page }) => {
      await page.getByRole('button', { name: 'Calculators' }).click();
      await page.getByLabel('Gross Annual Salary (£)').fill('35000');
      await page.getByRole('button', { name: 'Calculate' }).click();

      await expect(page.getByText('£28719.60')).toBeVisible(); // yearly net income

      await page.getByRole('button', { name: 'Monthly' }).click();
      await expect(page.getByText('£2393.30')).toBeVisible();
      await expect(page.getByText(/£28719.60\/year/)).toBeVisible();

      await page.getByRole('button', { name: 'Weekly' }).click();
      await expect(page.getByText('£552.30')).toBeVisible();
    });

    test('clears the form and returns to it after a calculation', async ({ page }) => {
      await page.getByRole('button', { name: 'Calculators' }).click();
      await page.getByLabel('Gross Annual Salary (£)').fill('35000');
      await page.getByLabel('Tax Code').selectOption('BR');
      await page.getByRole('button', { name: 'Calculate' }).click();

      await expect(page.getByRole('heading', { name: /Breakdown/ })).toBeVisible();

      await page.getByRole('button', { name: 'Clear and calculate again' }).click();

      await expect(page.getByRole('heading', { name: /Breakdown/ })).toBeHidden();
      await expect(page.getByLabel('Gross Annual Salary (£)')).toHaveValue('');
      await expect(page.getByLabel('Tax Code')).toHaveValue('');
    });
  });
});
