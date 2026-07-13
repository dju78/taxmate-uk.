// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useTaxStore,
  getAvailableTaxYears,
  taxYearStartToLabel,
  currentTaxYearStart,
} from './store';
import { storageService } from './storage';

describe('Phase 2: tax-year store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('offers exactly three tax years (current + two prior)', () => {
    expect(getAvailableTaxYears(2026)).toEqual([2026, 2025, 2024]);
  });

  it('labels a start year as a UK tax year (6 Apr -> 5 Apr)', () => {
    expect(taxYearStartToLabel(2026)).toBe('2026/27');
    expect(taxYearStartToLabel(2025)).toBe('2025/26');
    expect(taxYearStartToLabel(2024)).toBe('2024/25');
  });

  it('defaults to the tax year containing today', () => {
    expect(useTaxStore.getState().selectedTaxYear).toBe(currentTaxYearStart());
  });

  it('persists the selected tax year to localStorage', () => {
    useTaxStore.getState().setSelectedTaxYear(2025);
    expect(useTaxStore.getState().selectedTaxYear).toBe(2025);
    expect(localStorage.getItem('taxmate_selected_tax_year')).toBe('2025');
  });

  it('does not reset a saved selection (persistence survives a re-read)', () => {
    useTaxStore.getState().setSelectedTaxYear(2024);
    // Simulate a fresh read of the persisted preference.
    expect(Number(localStorage.getItem('taxmate_selected_tax_year'))).toBe(2024);
  });
});

describe('Phase 4 rework: backup schema / versioning / import modes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const incRec = { id: 'a1', date: '2026-05-01', amount: '100', status: 'received', source: 'Acme', category: 'Client work' };
  const expRec = { id: 'e1', date: '2026-05-02', amount: '20', merchant: 'Shop', category: 'Travel' };
  const v2 = (income: unknown[] = [], expenses: unknown[] = [], appPreferences: Record<string, unknown> = {}) => ({
    schemaVersion: 2,
    exportDate: '2026-01-01T00:00:00.000Z',
    appPreferences,
    incomeRecords: income,
    expenseRecords: expenses,
  });

  it('exports the exact approved schema shape', () => {
    const b = storageService.getExportBundle({ selectedTaxYear: 2026 });
    expect(Object.keys(b).sort()).toEqual(['appPreferences', 'expenseRecords', 'exportDate', 'incomeRecords', 'schemaVersion']);
    expect(b.schemaVersion).toBe(2);
    expect(b.appPreferences).toEqual({ selectedTaxYear: 2026 });
    expect(Array.isArray(b.incomeRecords)).toBe(true);
    expect(Array.isArray(b.expenseRecords)).toBe(true);
  });

  it('rejects a missing schema version', () => {
    const r = storageService.validateImportData({ incomeRecords: [incRec], expenseRecords: [] });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/schemaVersion/i);
  });

  it('rejects a non-numeric schema version', () => {
    const r = storageService.validateImportData({ schemaVersion: 'two', incomeRecords: [incRec] });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/schemaVersion/i);
  });

  it('rejects an unsupported newer version', () => {
    const r = storageService.validateImportData({ ...v2([incRec]), schemaVersion: 99 });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/Unsupported backup version 99/i);
  });

  it('migrates a supported older (v1 legacy) backup', () => {
    const legacy = {
      schemaVersion: 1,
      exportedAt: '2026-01-01',
      preferences: { selectedTaxYear: 2025 },
      income: [{ date: '2026-05-01', amount: '100', status: 'Received', source: 'Legacy Co' }], // no id
      expenses: [{ date: '2026-05-02', amount: '20', merchant: 'Old Shop', category: 'Travel' }],
    };
    const r = storageService.validateImportData(legacy);
    expect(r.ok).toBe(true);
    expect(r.income).toHaveLength(1);
    expect(r.income[0].id).toBeTruthy(); // generated for legacy
    expect(r.income[0].status).toBe('received');
    expect(r.preferences.selectedTaxYear).toBe(2025);
  });

  it('accepts a well-formed v2 backup and normalises records', () => {
    const r = storageService.validateImportData(v2([incRec], [expRec], { selectedTaxYear: 2026 }));
    expect(r.ok).toBe(true);
    expect(r.income).toHaveLength(1);
    expect(r.expenses).toHaveLength(1);
    expect(r.preferences.selectedTaxYear).toBe(2026);
  });

  it('rejects duplicate ids within the backup', () => {
    const dup = { ...incRec };
    const r = storageService.validateImportData(v2([incRec, dup]));
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /duplicate id/i.test(e))).toBe(true);
  });

  it('rejects a v2 record with a missing id', () => {
    const noId = { date: '2026-05-01', amount: '100', status: 'received', source: 'A', category: 'Client work' };
    const r = storageService.validateImportData(v2([noId]));
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /missing id/i.test(e))).toBe(true);
  });

  it('rejects invalid appPreferences.selectedTaxYear', () => {
    const r = storageService.validateImportData(v2([incRec], [], { selectedTaxYear: 'nope' }));
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /selectedTaxYear/i.test(e))).toBe(true);
  });

  it('parseImportText reports invalid JSON without throwing', () => {
    const r = storageService.parseImportText('{ not json');
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/not valid JSON/i);
  });

  it('a FAILED validation never writes (existing data preserved)', () => {
    storageService.addIncomeRecord({ date: '2026-05-01', amount: '500', status: 'received', source: 'Mine' });
    const before = storageService.getIncomeRecords();
    storageService.parseImportText('{ broken');
    storageService.validateImportData({ schemaVersion: 2, incomeRecords: [{ date: 'bad' }] });
    expect(storageService.getIncomeRecords()).toEqual(before);
  });

  it('merge adds non-conflicting records and skips existing ids', () => {
    const income = [{ id: 'imp1', date: '2026-05-01', source: 'A', category: 'Client work', amount: '100', status: 'received' as const }];
    expect(storageService.applyMerge(income, []).income).toBe(1);
    expect(storageService.applyMerge(income, []).income).toBe(0); // duplicate id skipped
    expect(storageService.getIncomeRecords()).toHaveLength(1);
  });

  it('restore REPLACES all records', () => {
    storageService.addIncomeRecord({ date: '2026-05-01', amount: '1', status: 'received', source: 'Old' });
    const restored = [{ id: 'new', date: '2026-05-01', source: 'Fresh', category: 'Client work', amount: '9', status: 'received' as const }];
    storageService.applyRestore(restored, []);
    const left = storageService.getIncomeRecords();
    expect(left).toHaveLength(1);
    expect(left[0].source).toBe('Fresh');
  });

  it('restoreImport (store) applies preferences (selected tax year)', () => {
    useTaxStore.getState().restoreImport([], [], { selectedTaxYear: 2024 });
    expect(useTaxStore.getState().selectedTaxYear).toBe(2024);
    expect(localStorage.getItem('taxmate_selected_tax_year')).toBe('2024');
  });

  it('import is atomic: a mid-write failure rolls back (no half state)', () => {
    storageService.addIncomeRecord({ id: 'keep', date: '2026-05-01', amount: '1', status: 'received', source: 'Keep' });
    const before = storageService.getIncomeRecords();
    // jsdom localStorage is a Proxy, so spy on the prototype method that the
    // proxy delegates to. Fail the second write (expenses) to simulate a quota
    // error part-way through a restore.
    const original = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === 'taxmate_expense_records') throw new Error('QuotaExceeded');
      return original.call(this, key, value);
    });
    try {
      expect(() =>
        storageService.applyRestore(
          [{ id: 'x', date: '2026-05-01', source: 'X', category: 'Client work', amount: '5', status: 'received' as const }],
          [{ id: 'y', date: '2026-05-01', merchant: 'Y', category: 'Travel', amount: '2' }]
        )
      ).toThrow();
    } finally {
      spy.mockRestore();
    }
    // income key rolled back to the previous value (not the half-written import)
    expect(storageService.getIncomeRecords()).toEqual(before);
  });

  it('demo data is generated for the requested tax year', () => {
    const demo = storageService.getDemoData(2025);
    expect(demo.income.every((r) => r.date.startsWith('2025-'))).toBe(true);
    expect(demo.income.every((r) => r.isDemo)).toBe(true);
  });

  it('store loadDemo uses the selected tax year', () => {
    useTaxStore.getState().setSelectedTaxYear(2024);
    useTaxStore.getState().loadDemo();
    expect(storageService.getIncomeRecords().every((r) => r.date.startsWith('2024-'))).toBe(true);
  });

  it('loadDemoData is idempotent and removeDemoData preserves user records', () => {
    storageService.addIncomeRecord({ date: '2026-05-01', amount: '999', status: 'received', source: 'Real User' });
    expect(storageService.loadDemoData(2026).income).toBeGreaterThan(0);
    expect(storageService.loadDemoData(2026).income).toBe(0); // idempotent
    storageService.removeDemoData();
    const left = storageService.getIncomeRecords();
    expect(left.some((r) => r.isDemo)).toBe(false);
    expect(left.some((r) => r.source === 'Real User')).toBe(true);
  });

  it('clearAllData clears records, selected year and recovery state', () => {
    storageService.addIncomeRecord({ date: '2026-05-01', amount: '10', status: 'received', source: 'X' });
    localStorage.setItem('taxmate_selected_tax_year', '2024');
    localStorage.setItem('taxmate_storage_error', 'boom');
    storageService.clearAllData();
    expect(storageService.getIncomeRecords()).toEqual([]);
    expect(storageService.getExpenseRecords()).toEqual([]);
    expect(localStorage.getItem('taxmate_selected_tax_year')).toBeNull();
    expect(localStorage.getItem('taxmate_storage_error')).toBeNull();
  });

  it('store clearAll resets the selected tax year to the current default', () => {
    useTaxStore.getState().setSelectedTaxYear(2024);
    useTaxStore.getState().clearAll();
    expect(useTaxStore.getState().selectedTaxYear).toBe(currentTaxYearStart());
  });
});

describe('Phase 5: filter state in the store', () => {
  beforeEach(() => {
    localStorage.clear();
    useTaxStore.getState().resetIncomeFilters();
    useTaxStore.getState().resetExpenseFilters();
  });

  it('setIncomeFilters / setExpenseFilters patch the store filter state', () => {
    useTaxStore.getState().setIncomeFilters({ status: 'overdue', source: 'Alpha' });
    expect(useTaxStore.getState().incomeFilters.status).toBe('overdue');
    expect(useTaxStore.getState().incomeFilters.source).toBe('Alpha');
    useTaxStore.getState().setExpenseFilters({ category: 'Travel' });
    expect(useTaxStore.getState().expenseFilters.category).toBe('Travel');
  });

  it('reset actions restore the defaults', () => {
    useTaxStore.getState().setIncomeFilters({ status: 'pending' });
    useTaxStore.getState().resetIncomeFilters();
    expect(useTaxStore.getState().incomeFilters.status).toBe('all');
  });

  it('changing the tax year resets ledger filters (avoids a stale empty ledger)', () => {
    useTaxStore.getState().setIncomeFilters({ status: 'overdue', source: 'Alpha' });
    useTaxStore.getState().setExpenseFilters({ category: 'Travel' });
    useTaxStore.getState().setSelectedTaxYear(2024);
    expect(useTaxStore.getState().incomeFilters).toEqual({ status: 'all', dateFrom: '', dateTo: '', source: 'all', category: 'all' });
    expect(useTaxStore.getState().expenseFilters).toEqual({ dateFrom: '', dateTo: '', category: 'all' });
  });
});
