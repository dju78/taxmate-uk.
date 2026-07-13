import { describe, it, expect } from 'vitest';
import {
  filterIncomeRecords,
  filterExpenseRecords,
  uniqueSorted,
  isIncomeFilterActive,
  isExpenseFilterActive,
  hasInvalidDateRange,
  defaultIncomeFilters,
  defaultExpenseFilters,
} from './filters';

const income = [
  { id: '1', date: '2026-05-10', source: 'Alpha', category: 'Client work', amount: '100', status: 'received' },
  { id: '2', date: '2026-06-15', source: 'Beta', category: 'Freelance', amount: '200', status: 'pending' },
  { id: '3', date: '2026-07-20', source: 'Alpha', category: 'Client work', amount: '300', status: 'overdue' },
];

const expenses = [
  { id: 'e1', date: '2026-05-01', category: 'Travel', amount: '10' },
  { id: 'e2', date: '2026-06-01', category: 'Supplies', amount: '20' },
  { id: 'e3', date: '2026-07-01', category: 'Travel', amount: '30' },
];

describe('Phase 5: income filters', () => {
  it('default filters return all records', () => {
    expect(filterIncomeRecords(income, defaultIncomeFilters)).toHaveLength(3);
    expect(isIncomeFilterActive(defaultIncomeFilters)).toBe(false);
  });

  it('filters by status (received/pending/overdue)', () => {
    expect(filterIncomeRecords(income, { ...defaultIncomeFilters, status: 'received' }).map((r) => r.id)).toEqual(['1']);
    expect(filterIncomeRecords(income, { ...defaultIncomeFilters, status: 'pending' }).map((r) => r.id)).toEqual(['2']);
    expect(filterIncomeRecords(income, { ...defaultIncomeFilters, status: 'overdue' }).map((r) => r.id)).toEqual(['3']);
  });

  it('filters by source', () => {
    expect(filterIncomeRecords(income, { ...defaultIncomeFilters, source: 'Alpha' }).map((r) => r.id)).toEqual(['1', '3']);
  });

  it('filters by category', () => {
    expect(filterIncomeRecords(income, { ...defaultIncomeFilters, category: 'Freelance' }).map((r) => r.id)).toEqual(['2']);
  });

  it('filters by date range (inclusive)', () => {
    const f = { ...defaultIncomeFilters, dateFrom: '2026-06-01', dateTo: '2026-06-30' };
    expect(filterIncomeRecords(income, f).map((r) => r.id)).toEqual(['2']);
    expect(filterIncomeRecords(income, { ...defaultIncomeFilters, dateFrom: '2026-06-15' }).map((r) => r.id)).toEqual(['2', '3']);
    expect(filterIncomeRecords(income, { ...defaultIncomeFilters, dateTo: '2026-06-15' }).map((r) => r.id)).toEqual(['1', '2']);
  });

  it('combines filters (AND)', () => {
    const f = { ...defaultIncomeFilters, source: 'Alpha', status: 'overdue' as const };
    expect(filterIncomeRecords(income, f).map((r) => r.id)).toEqual(['3']);
  });

  it('isIncomeFilterActive reflects any active filter', () => {
    expect(isIncomeFilterActive({ ...defaultIncomeFilters, category: 'Travel' })).toBe(true);
    expect(isIncomeFilterActive({ ...defaultIncomeFilters, dateFrom: '2026-01-01' })).toBe(true);
  });
});

describe('Phase 5: expense filters', () => {
  it('default filters return all', () => {
    expect(filterExpenseRecords(expenses, defaultExpenseFilters)).toHaveLength(3);
    expect(isExpenseFilterActive(defaultExpenseFilters)).toBe(false);
  });

  it('filters by category', () => {
    expect(filterExpenseRecords(expenses, { ...defaultExpenseFilters, category: 'Travel' }).map((r) => r.id)).toEqual(['e1', 'e3']);
  });

  it('filters by date range', () => {
    const f = { ...defaultExpenseFilters, dateFrom: '2026-06-01', dateTo: '2026-07-01' };
    expect(filterExpenseRecords(expenses, f).map((r) => r.id)).toEqual(['e2', 'e3']);
  });

  it('isExpenseFilterActive reflects active filters', () => {
    expect(isExpenseFilterActive({ ...defaultExpenseFilters, category: 'Travel' })).toBe(true);
  });
});

describe('hasInvalidDateRange', () => {
  it('returns false when either date is missing', () => {
    expect(hasInvalidDateRange(undefined, '2026-07-12')).toBe(false);
    expect(hasInvalidDateRange('2026-07-01', undefined)).toBe(false);
  });

  it('accepts an equal start and end date', () => {
    expect(hasInvalidDateRange('2026-07-12', '2026-07-12')).toBe(false);
  });

  it('detects when the start date is after the end date', () => {
    expect(hasInvalidDateRange('2026-07-13', '2026-07-12')).toBe(true);
  });
});

describe('invalid date range yields no records', () => {
  it('income filter returns [] for an invalid range', () => {
    expect(filterIncomeRecords(income, { ...defaultIncomeFilters, dateFrom: '2026-07-20', dateTo: '2026-07-10' })).toEqual([]);
  });

  it('expense filter returns [] for an invalid range', () => {
    expect(filterExpenseRecords(expenses, { ...defaultExpenseFilters, dateFrom: '2026-07-20', dateTo: '2026-07-10' })).toEqual([]);
  });
});

describe('uniqueSorted', () => {
  it('returns unique, sorted, non-empty values', () => {
    expect(uniqueSorted(['Beta', 'Alpha', 'Alpha', undefined, ''])).toEqual(['Alpha', 'Beta']);
  });
});
