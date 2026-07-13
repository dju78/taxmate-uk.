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
  searchIncomeRecords,
  searchExpenseRecords,
  sortIncomeRecords,
  sortExpenseRecords,
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

describe('invalid date range does not empty the ledger', () => {
  // Corrected behaviour: an invalid range (From > To) must not be applied and
  // must not produce a misleading empty state. The date constraint is simply
  // ignored until corrected; every other active filter still applies.
  it('income filter ignores the date constraint but keeps other filters active', () => {
    const invalidRange = { ...defaultIncomeFilters, dateFrom: '2026-07-20', dateTo: '2026-07-10' };
    expect(filterIncomeRecords(income, invalidRange)).toHaveLength(3); // all records preserved
    expect(filterIncomeRecords(income, { ...invalidRange, source: 'Alpha' }).map((r) => r.id)).toEqual(['1', '3']);
  });

  it('expense filter ignores the date constraint but keeps other filters active', () => {
    const invalidRange = { ...defaultExpenseFilters, dateFrom: '2026-07-20', dateTo: '2026-07-10' };
    expect(filterExpenseRecords(expenses, invalidRange)).toHaveLength(3); // all records preserved
    expect(filterExpenseRecords(expenses, { ...invalidRange, category: 'Travel' }).map((r) => r.id)).toEqual(['e1', 'e3']);
  });
});

describe('uniqueSorted', () => {
  it('returns unique, sorted, non-empty values', () => {
    expect(uniqueSorted(['Beta', 'Alpha', 'Alpha', undefined, ''])).toEqual(['Alpha', 'Beta']);
  });
});

describe('search: normalisation and field coverage', () => {
  const incomeRecords = [
    { id: '1', date: '2026-05-01', source: 'Café Roma', description: 'Consulting', category: 'Client work', notes: 'VIP client', status: 'received' },
    { id: '2', date: '2026-05-02', source: 'Acme Ltd', description: 'Website build', category: 'Freelance', notes: '', status: 'pending' },
    { id: '3', date: '2026-05-03', source: 'Beta Co', description: '', category: 'Other', notes: 'urgent overdue chase', status: 'overdue' },
  ];

  it('is case-insensitive', () => {
    expect(searchIncomeRecords(incomeRecords, 'ACME').map((r) => r.id)).toEqual(['2']);
  });

  it('trims surrounding whitespace from the query', () => {
    expect(searchIncomeRecords(incomeRecords, '  acme  ').map((r) => r.id)).toEqual(['2']);
  });

  it('is accent-tolerant (matches "cafe" against "Café")', () => {
    expect(searchIncomeRecords(incomeRecords, 'cafe').map((r) => r.id)).toEqual(['1']);
  });

  it('matches income by source, description, category, notes and status', () => {
    expect(searchIncomeRecords(incomeRecords, 'Consulting').map((r) => r.id)).toEqual(['1']);
    expect(searchIncomeRecords(incomeRecords, 'Website build').map((r) => r.id)).toEqual(['2']);
    expect(searchIncomeRecords(incomeRecords, 'Freelance').map((r) => r.id)).toEqual(['2']);
    expect(searchIncomeRecords(incomeRecords, 'urgent').map((r) => r.id)).toEqual(['3']);
    expect(searchIncomeRecords(incomeRecords, 'overdue').map((r) => r.id)).toEqual(['3']);
  });

  it('an empty/blank query returns every record unfiltered', () => {
    expect(searchIncomeRecords(incomeRecords, '')).toHaveLength(3);
    expect(searchIncomeRecords(incomeRecords, '   ')).toHaveLength(3);
  });

  const expenseRecords = [
    { id: 'e1', date: '2026-05-01', merchant: 'Amazôn', description: 'Office chair', category: 'Office costs', notes: '', paymentMethod: 'Card' },
    { id: 'e2', date: '2026-05-02', merchant: 'Rail Co', description: '', category: 'Travel', notes: 'client visit', paymentMethod: 'Bank Transfer' },
  ];

  it('matches expenses by merchant, description, category, notes and payment method', () => {
    expect(searchExpenseRecords(expenseRecords, 'amazon').map((r) => r.id)).toEqual(['e1']);
    expect(searchExpenseRecords(expenseRecords, 'chair').map((r) => r.id)).toEqual(['e1']);
    expect(searchExpenseRecords(expenseRecords, 'travel').map((r) => r.id)).toEqual(['e2']);
    expect(searchExpenseRecords(expenseRecords, 'client visit').map((r) => r.id)).toEqual(['e2']);
    expect(searchExpenseRecords(expenseRecords, 'bank transfer').map((r) => r.id)).toEqual(['e2']);
  });
});

describe('sort: stability and correctness', () => {
  const incomeRecords = [
    { id: 'b', date: '2026-05-10', amount: '100', source: 'Beta', status: 'pending' },
    { id: 'a', date: '2026-05-10', amount: '100', source: 'Alpha', status: 'overdue' }, // same date+amount as 'b'
    { id: 'c', date: '2026-06-01', amount: '300', source: 'Gamma', status: 'received' },
  ];

  it('sorts by date descending, newest first', () => {
    // 'a' and 'b' share the same date and amount, so the stable tie-breaker
    // (ascending id) resolves the order between them: 'a' before 'b'.
    expect(sortIncomeRecords(incomeRecords, 'date-desc').map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('sorts by date ascending', () => {
    expect(sortIncomeRecords(incomeRecords, 'date-asc').map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts by amount descending/ascending', () => {
    expect(sortIncomeRecords(incomeRecords, 'amount-desc').map((r) => r.id)).toEqual(['c', 'a', 'b']);
    expect(sortIncomeRecords(incomeRecords, 'amount-asc').map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts by source alphabetically (asc/desc)', () => {
    expect(sortIncomeRecords(incomeRecords, 'source-asc').map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(sortIncomeRecords(incomeRecords, 'source-desc').map((r) => r.id)).toEqual(['c', 'b', 'a']);
  });

  it('sorts overdue-first by status priority', () => {
    expect(sortIncomeRecords(incomeRecords, 'status-overdue').map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('is a STABLE tie-break (same date+amount resolves by id, not input order)', () => {
    // 'a' and 'b' share date+amount; the tie-breaker must resolve deterministically
    // by id regardless of which order they appear in the input array.
    const reversedInput = [incomeRecords[2], incomeRecords[0], incomeRecords[1]];
    const r1 = sortIncomeRecords(incomeRecords, 'date-desc').map((r) => r.id);
    const r2 = sortIncomeRecords(reversedInput, 'date-desc').map((r) => r.id);
    expect(r1).toEqual(r2);
  });

  it('does not mutate the input array', () => {
    const copy = [...incomeRecords];
    sortIncomeRecords(incomeRecords, 'date-asc');
    expect(incomeRecords).toEqual(copy);
  });

  const expenseRecords = [
    { id: 'x', date: '2026-05-01', amount: '50', merchant: 'Zeta', category: 'Travel' },
    { id: 'y', date: '2026-06-01', amount: '20', merchant: 'Alpha', category: 'Office costs' },
  ];

  it('sorts expenses by merchant and category', () => {
    expect(sortExpenseRecords(expenseRecords, 'merchant-asc').map((r) => r.id)).toEqual(['y', 'x']);
    expect(sortExpenseRecords(expenseRecords, 'merchant-desc').map((r) => r.id)).toEqual(['x', 'y']);
    expect(sortExpenseRecords(expenseRecords, 'category-asc').map((r) => r.id)).toEqual(['y', 'x']);
  });
});
