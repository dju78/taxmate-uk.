import { storageService } from './storage';

export type IncomeStatusFilter = 'all' | 'received' | 'pending' | 'overdue';

export interface IncomeFilterState {
  status: IncomeStatusFilter;
  dateFrom: string; // YYYY-MM-DD or ''
  dateTo: string; // YYYY-MM-DD or ''
  source: string; // 'all' or an exact source
  category: string; // 'all' or an exact category
}

export interface ExpenseFilterState {
  dateFrom: string;
  dateTo: string;
  category: string;
}

export const defaultIncomeFilters: IncomeFilterState = {
  status: 'all',
  dateFrom: '',
  dateTo: '',
  source: 'all',
  category: 'all',
};

export const defaultExpenseFilters: ExpenseFilterState = {
  dateFrom: '',
  dateTo: '',
  category: 'all',
};

// Shared guard: a From date later than the To date is invalid. YYYY-MM-DD
// compares lexicographically = chronologically, so a string comparison is safe.
export function hasInvalidDateRange(dateFrom?: string, dateTo?: string): boolean {
  if (!dateFrom || !dateTo) return false;
  return dateFrom > dateTo;
}

const inDateRange = (date: string, from: string, to: string): boolean => {
  const d = date.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
};

export function filterIncomeRecords<T extends { date: string; status?: string; source?: string; category?: string }>(
  records: T[],
  f: IncomeFilterState
): T[] {
  if (hasInvalidDateRange(f.dateFrom, f.dateTo)) return [];
  return records.filter((r) => {
    if (f.status !== 'all' && storageService.normaliseIncomeStatus(r.status) !== f.status) return false;
    if (f.source !== 'all' && (r.source ?? '') !== f.source) return false;
    if (f.category !== 'all' && (r.category ?? '') !== f.category) return false;
    if (!inDateRange(r.date, f.dateFrom, f.dateTo)) return false;
    return true;
  });
}

export function filterExpenseRecords<T extends { date: string; category?: string }>(
  records: T[],
  f: ExpenseFilterState
): T[] {
  if (hasInvalidDateRange(f.dateFrom, f.dateTo)) return [];
  return records.filter((r) => {
    if (f.category !== 'all' && (r.category ?? '') !== f.category) return false;
    if (!inDateRange(r.date, f.dateFrom, f.dateTo)) return false;
    return true;
  });
}

// SEARCH
const normalizeForSearch = (str?: string): string => {
  if (!str) return '';
  return str.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

export const searchIncomeRecords = (records: any[], query: string) => {
  if (!query.trim()) return records;
  const q = normalizeForSearch(query);
  return records.filter(r => {
    return normalizeForSearch(r.source).includes(q) ||
           normalizeForSearch(r.description).includes(q) ||
           normalizeForSearch(r.category).includes(q) ||
           normalizeForSearch(r.notes).includes(q) ||
           normalizeForSearch(storageService.normaliseIncomeStatus(r.status)).includes(q);
  });
};

export const searchExpenseRecords = (records: any[], query: string) => {
  if (!query.trim()) return records;
  const q = normalizeForSearch(query);
  return records.filter(r => {
    return normalizeForSearch(r.merchant).includes(q) ||
           normalizeForSearch(r.description).includes(q) ||
           normalizeForSearch(r.category).includes(q) ||
           normalizeForSearch(r.notes).includes(q) ||
           normalizeForSearch(r.paymentMethod).includes(q);
  });
};

// SORTING
const parseAmount = (a: string) => parseFloat(a) || 0;
const parseDate = (d: string) => storageService.parseLocalDate(d).getTime();

// Tie-breaker: date descending, then ID
const tieBreaker = (a: {date: string; id: string}, b: {date: string; id: string}) => {
  const dateDiff = parseDate(b.date) - parseDate(a.date);
  if (dateDiff !== 0) return dateDiff;
  return a.id.localeCompare(b.id);
};

export const sortIncomeRecords = (records: any[], sortOption: import('./types').IncomeSortOption) => {
  return [...records].sort((a, b) => {
    let diff = 0;
    switch (sortOption) {
      case 'date-desc': diff = parseDate(b.date) - parseDate(a.date); break;
      case 'date-asc': diff = parseDate(a.date) - parseDate(b.date); break;
      case 'amount-desc': diff = parseAmount(b.amount) - parseAmount(a.amount); break;
      case 'amount-asc': diff = parseAmount(a.amount) - parseAmount(b.amount); break;
      case 'source-asc': diff = (a.source || '').localeCompare(b.source || ''); break;
      case 'source-desc': diff = (b.source || '').localeCompare(a.source || ''); break;
      case 'status-overdue': {
        const order = { overdue: 0, pending: 1, received: 2 };
        const sA = storageService.normaliseIncomeStatus(a.status);
        const sB = storageService.normaliseIncomeStatus(b.status);
        const rankA = order[sA as keyof typeof order] ?? 99;
        const rankB = order[sB as keyof typeof order] ?? 99;
        diff = rankA - rankB;
        break;
      }
    }
    return diff !== 0 ? diff : tieBreaker(a, b);
  });
};

export const sortExpenseRecords = (records: any[], sortOption: import('./types').ExpenseSortOption) => {
  return [...records].sort((a, b) => {
    let diff = 0;
    switch (sortOption) {
      case 'date-desc': diff = parseDate(b.date) - parseDate(a.date); break;
      case 'date-asc': diff = parseDate(a.date) - parseDate(b.date); break;
      case 'amount-desc': diff = parseAmount(b.amount) - parseAmount(a.amount); break;
      case 'amount-asc': diff = parseAmount(a.amount) - parseAmount(b.amount); break;
      case 'merchant-asc': diff = (a.merchant || '').localeCompare(b.merchant || ''); break;
      case 'merchant-desc': diff = (b.merchant || '').localeCompare(a.merchant || ''); break;
      case 'category-asc': diff = (a.category || '').localeCompare(b.category || ''); break;
    }
    return diff !== 0 ? diff : tieBreaker(a, b);
  });
};

// Unique, sorted, non-empty values (for populating filter dropdowns).
export const uniqueSorted = (values: (string | undefined)[]): string[] =>
  Array.from(new Set(values.filter((v): v is string => !!v))).sort();

export const isIncomeFilterActive = (f: IncomeFilterState): boolean =>
  f.status !== 'all' || !!f.dateFrom || !!f.dateTo || f.source !== 'all' || f.category !== 'all';

export const isExpenseFilterActive = (f: ExpenseFilterState): boolean =>
  !!f.dateFrom || !!f.dateTo || f.category !== 'all';
