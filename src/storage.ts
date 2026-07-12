// Storage service - abstraction layer for income and expense data persistence
// Currently uses localStorage; can be replaced with backend API
import type { IncomeRecord, ExpenseRecord, ExportBundle, ExportPreferences, IncomeCalcRecord, ExpenseCalcRecord } from './types';

const INCOME_STORAGE_KEY = 'taxmate_income_records';
const EXPENSE_STORAGE_KEY = 'taxmate_expense_records';

// UK tax year runs 6 April -> 5 April (inclusive).
const TAX_YEAR_START_MONTH = 3; // April (0-indexed)
const TAX_YEAR_START_DAY = 6;

// Canonical income statuses. Calculations MUST compare against these constants
// (via normaliseIncomeStatus) rather than raw display strings, so case or
// whitespace variations in stored data never silently change a total.
export const INCOME_STATUS = {
  RECEIVED: 'received',
  PENDING: 'pending',
  OVERDUE: 'overdue',
} as const;

// Display labels for the canonical statuses.
export const INCOME_STATUS_LABELS: Record<string, string> = {
  [INCOME_STATUS.RECEIVED]: 'Received',
  [INCOME_STATUS.PENDING]: 'Pending',
  [INCOME_STATUS.OVERDUE]: 'Overdue',
};

export const INCOME_STATUS_OPTIONS = [
  INCOME_STATUS.RECEIVED,
  INCOME_STATUS.PENDING,
  INCOME_STATUS.OVERDUE,
];

export const INCOME_STATUS_VALUES: string[] = Object.values(INCOME_STATUS);

// Persistence schema version. Bump when the stored record shape changes and add
// a migration step in migrateIfNeeded().
export const SCHEMA_VERSION = 1;
const SCHEMA_VERSION_KEY = 'taxmate_schema_version';
const STORAGE_ERROR_KEY = 'taxmate_storage_error';

// Generate a collision-resistant id. Prefer crypto.randomUUID; fall back for
// environments without it.
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

// Read a JSON array from storage. On corruption, preserve the raw value under a
// timestamped backup key and record a visible error rather than silently
// discarding the user's data.
const readCollection = <T>(key: string): T[] => {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Stored value is not an array');
    return parsed as T[];
  } catch (error) {
    console.error(`Corrupted data in ${key}:`, error);
    try {
      if (raw != null) localStorage.setItem(`${key}_backup_${Date.now()}`, raw);
      localStorage.setItem(
        STORAGE_ERROR_KEY,
        `Some saved data in "${key}" could not be read and was backed up. Export a backup and check your records.`
      );
    } catch {
      // ignore secondary storage failures
    }
    return [];
  }
};

type AmountRecord = { amount?: string | number };

export const storageService = {
  // ---------------------------------------------------------------------------
  // Schema / storage health
  // ---------------------------------------------------------------------------

  migrateIfNeeded: (): void => {
    try {
      const stored = Number(localStorage.getItem(SCHEMA_VERSION_KEY));
      if (!stored) {
        localStorage.setItem(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION));
      }
      // Future migrations: if (stored < 2) { ...transform...; set version }
    } catch {
      // ignore
    }
  },

  getStorageError: (): string | null => {
    try {
      return localStorage.getItem(STORAGE_ERROR_KEY);
    } catch {
      return null;
    }
  },

  clearStorageError: (): void => {
    try {
      localStorage.removeItem(STORAGE_ERROR_KEY);
    } catch {
      // ignore
    }
  },

  // ---------------------------------------------------------------------------
  // Export / backup
  // ---------------------------------------------------------------------------

  getExportBundle: (preferences?: ExportPreferences): ExportBundle => ({
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    preferences,
    income: storageService.getIncomeRecords(),
    expenses: storageService.getExpenseRecords(),
  }),

  recordsToCSV: <T extends object>(records: readonly T[]): string => {
    if (!records || records.length === 0) return '';
    const rows = records as readonly Record<string, unknown>[];
    const keys = Array.from(
      rows.reduce((set: Set<string>, r) => {
        Object.keys(r).forEach((k) => set.add(k));
        return set;
      }, new Set<string>())
    );
    const escape = (v: unknown): string => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = keys.join(',');
    const lines = rows.map((r) => keys.map((k) => escape(r[k])).join(','));
    return [header, ...lines].join('\n');
  },

  // ---------------------------------------------------------------------------
  // Normalisation / validation helpers
  // ---------------------------------------------------------------------------

  normaliseIncomeStatus: (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim().toLowerCase();
  },

  isValidIncomeStatus: (value: unknown): boolean =>
    INCOME_STATUS_VALUES.includes(storageService.normaliseIncomeStatus(value)),

  // Convert a monetary pounds value to integer pence. Summing in integer pence
  // avoids floating-point accumulation error (e.g. 0.1 + 0.2 !== 0.3).
  toPence: (value: string | number | undefined): number =>
    Math.round((parseFloat(String(value ?? '')) || 0) * 100),

  // Round a monetary pounds value to 2 decimal places (used for divisions).
  roundCurrency: (value: number): number =>
    Math.round((Number(value) + Number.EPSILON) * 100) / 100,

  // Sum a list of records' `amount` fields exactly, returning pounds.
  sumAmounts: (records: AmountRecord[]): number => {
    const pence = records.reduce((acc, r) => acc + storageService.toPence(r.amount), 0);
    return pence / 100;
  },

  // ---------------------------------------------------------------------------
  // Date helpers
  // ---------------------------------------------------------------------------

  parseLocalDate: (value: string | Date): Date => {
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
      if (match) {
        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      }
    }
    return new Date(value);
  },

  getTaxYearStart: (referenceDate: Date = new Date()): Date => {
    const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
    const isOnOrAfterStart =
      ref.getMonth() > TAX_YEAR_START_MONTH ||
      (ref.getMonth() === TAX_YEAR_START_MONTH && ref.getDate() >= TAX_YEAR_START_DAY);
    const startYear = isOnOrAfterStart ? ref.getFullYear() : ref.getFullYear() - 1;
    return new Date(startYear, TAX_YEAR_START_MONTH, TAX_YEAR_START_DAY);
  },

  getNextTaxYearStart: (referenceDate: Date = new Date()): Date => {
    const start = storageService.getTaxYearStart(referenceDate);
    return new Date(start.getFullYear() + 1, TAX_YEAR_START_MONTH, TAX_YEAR_START_DAY);
  },

  getTaxYearEnd: (referenceDate: Date = new Date()): Date => {
    const start = storageService.getTaxYearStart(referenceDate);
    return new Date(start.getFullYear() + 1, TAX_YEAR_START_MONTH, TAX_YEAR_START_DAY - 1);
  },

  isInActiveTaxYear: (dateValue: string | Date, referenceDate: Date = new Date()): boolean => {
    const date = storageService.parseLocalDate(dateValue);
    const start = storageService.getTaxYearStart(referenceDate);
    const nextStart = storageService.getNextTaxYearStart(referenceDate);
    return date >= start && date < nextStart;
  },

  getCompletedTaxMonths: (referenceDate: Date = new Date()): number => {
    const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
    const start = storageService.getTaxYearStart(referenceDate);
    let months = (ref.getFullYear() - start.getFullYear()) * 12 + (ref.getMonth() - start.getMonth());
    if (ref.getDate() < start.getDate()) {
      months -= 1;
    }
    return Math.max(0, months);
  },

  getCurrentTaxMonthStart: (referenceDate: Date = new Date()): Date => {
    const start = storageService.getTaxYearStart(referenceDate);
    const months = storageService.getCompletedTaxMonths(referenceDate);
    return new Date(start.getFullYear(), start.getMonth() + months, start.getDate());
  },

  getFirstAverageAvailableDate: (referenceDate: Date = new Date()): Date => {
    const start = storageService.getTaxYearStart(referenceDate);
    return new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
  },

  // ---------------------------------------------------------------------------
  // Selected-tax-year helpers (a tax year is identified by its START year)
  // ---------------------------------------------------------------------------

  // A DETERMINISTIC reference date (6 April of the start year) that selects the
  // given tax year regardless of "today". Pass this into the window-based
  // calculators (totals, tables, charts, breakdowns) so a chosen year controls
  // them instead of the current date.
  getTaxYearStartForYear: (startYear: number): Date =>
    new Date(startYear, TAX_YEAR_START_MONTH, TAX_YEAR_START_DAY),

  // Start year of the tax year containing `today`.
  getCurrentTaxYearStartYear: (today: Date = new Date()): number =>
    storageService.getTaxYearStart(today).getFullYear(),

  // Whether the given start year is the current tax year.
  isCurrentTaxYear: (startYear: number, today: Date = new Date()): boolean =>
    startYear === storageService.getCurrentTaxYearStartYear(today),

  // Completed tax months for a selected year: a past year is fully complete
  // (12); a future year is 0; the current year counts completed months to today.
  getCompletedTaxMonthsForYear: (startYear: number, today: Date = new Date()): number => {
    const current = storageService.getCurrentTaxYearStartYear(today);
    if (startYear < current) return 12;
    if (startYear > current) return 0;
    return storageService.getCompletedTaxMonths(today);
  },

  // Exclusive upper bound of the completed-tax-month window for a selected year.
  // Past year -> whole year (next tax year start); current year -> current tax
  // month start; future -> the year start (empty window).
  getAverageWindowEndForYear: (startYear: number, today: Date = new Date()): Date => {
    const current = storageService.getCurrentTaxYearStartYear(today);
    if (startYear < current) return new Date(startYear + 1, TAX_YEAR_START_MONTH, TAX_YEAR_START_DAY);
    if (startYear > current) return storageService.getTaxYearStartForYear(startYear);
    return storageService.getCurrentTaxMonthStart(today);
  },

  // Average RECEIVED income per completed tax month for a selected year.
  calculateAverageMonthlyIncomeForYear: (
    startYear: number,
    records?: IncomeCalcRecord[],
    today: Date = new Date()
  ): number | null => {
    const months = storageService.getCompletedTaxMonthsForYear(startYear, today);
    if (months < 1) return null;
    const start = storageService.getTaxYearStartForYear(startYear);
    const end = storageService.getAverageWindowEndForYear(startYear, today);
    const received = storageService.sumIncomeInWindow(INCOME_STATUS.RECEIVED, start, end, records);
    return storageService.roundCurrency(received / months);
  },

  // Average RECORDED expenses per completed tax month for a selected year.
  calculateAverageMonthlyExpensesForYear: (
    startYear: number,
    records?: ExpenseCalcRecord[],
    today: Date = new Date()
  ): number | null => {
    const months = storageService.getCompletedTaxMonthsForYear(startYear, today);
    if (months < 1) return null;
    const start = storageService.getTaxYearStartForYear(startYear);
    const end = storageService.getAverageWindowEndForYear(startYear, today);
    const total = storageService.sumExpensesInWindow(start, end, records);
    return storageService.roundCurrency(total / months);
  },

  // Received income in the current calendar month, but ONLY for the current tax
  // year (returns null for past/future years, where "this month" is undefined).
  calculateIncomeThisMonthForYear: (
    startYear: number,
    records?: IncomeCalcRecord[],
    today: Date = new Date()
  ): number | null => {
    if (!storageService.isCurrentTaxYear(startYear, today)) return null;
    return storageService.calculateIncomeThisMonth(today, records);
  },

  // ---------------------------------------------------------------------------
  // Income records
  // ---------------------------------------------------------------------------

  getIncomeRecords: (): IncomeRecord[] => readCollection<IncomeRecord>(INCOME_STORAGE_KEY),

  addIncomeRecord: (record: Partial<IncomeRecord>): IncomeRecord => {
    try {
      const status = storageService.normaliseIncomeStatus(record.status) || INCOME_STATUS.RECEIVED;
      if (!INCOME_STATUS_VALUES.includes(status)) {
        throw new Error(`Invalid income status: ${record.status}`);
      }
      const records = storageService.getIncomeRecords();
      const newRecord = {
        id: generateId(),
        ...record,
        status,
        createdAt: new Date().toISOString(),
      } as IncomeRecord;
      records.push(newRecord);
      localStorage.setItem(INCOME_STORAGE_KEY, JSON.stringify(records));
      return newRecord;
    } catch (error) {
      console.error('Error adding income record:', error);
      throw new Error('Failed to save income record', { cause: error });
    }
  },

  updateIncomeRecord: (id: string, updates: Partial<IncomeRecord>): IncomeRecord => {
    try {
      const records = storageService.getIncomeRecords();
      const index = records.findIndex((r) => r.id === id);
      if (index === -1) {
        throw new Error('Record not found');
      }
      const normalisedUpdates: Partial<IncomeRecord> = { ...updates };
      if (updates.status !== undefined) {
        const status = storageService.normaliseIncomeStatus(updates.status);
        if (!INCOME_STATUS_VALUES.includes(status)) {
          throw new Error(`Invalid income status: ${updates.status}`);
        }
        normalisedUpdates.status = status;
      }
      records[index] = {
        ...records[index],
        ...normalisedUpdates,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(INCOME_STORAGE_KEY, JSON.stringify(records));
      return records[index];
    } catch (error) {
      console.error('Error updating income record:', error);
      throw new Error('Failed to update income record', { cause: error });
    }
  },

  deleteIncomeRecord: (id: string): boolean => {
    try {
      const records = storageService.getIncomeRecords();
      const filtered = records.filter((r) => r.id !== id);
      localStorage.setItem(INCOME_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting income record:', error);
      throw new Error('Failed to delete income record', { cause: error });
    }
  },

  getIncomeRecord: (id: string): IncomeRecord | undefined => {
    return storageService.getIncomeRecords().find((r) => r.id === id);
  },

  getIncomeInTaxYear: (records?: IncomeCalcRecord[], referenceDate: Date = new Date()): IncomeCalcRecord[] => {
    const source = records || storageService.getIncomeRecords();
    return source.filter((r) => storageService.isInActiveTaxYear(r.date, referenceDate));
  },

  sumIncome: (status: string | null, referenceDate: Date = new Date(), records?: IncomeCalcRecord[]): number => {
    const canonical = status ? storageService.normaliseIncomeStatus(status) : null;
    const inYear = storageService
      .getIncomeInTaxYear(records, referenceDate)
      .filter((r) => (canonical ? storageService.normaliseIncomeStatus(r.status) === canonical : true));
    return storageService.sumAmounts(inYear);
  },

  sumIncomeInWindow: (
    status: string | null,
    startInclusive: Date,
    endExclusive: Date,
    records?: IncomeCalcRecord[]
  ): number => {
    const canonical = status ? storageService.normaliseIncomeStatus(status) : null;
    const source = records || storageService.getIncomeRecords();
    const matches = source.filter((r) => {
      const d = storageService.parseLocalDate(r.date);
      return (
        d >= startInclusive &&
        d < endExclusive &&
        (canonical ? storageService.normaliseIncomeStatus(r.status) === canonical : true)
      );
    });
    return storageService.sumAmounts(matches);
  },

  calculateTotalInvoiced: (referenceDate: Date = new Date(), records?: IncomeCalcRecord[]): number => {
    const valid = storageService
      .getIncomeInTaxYear(records, referenceDate)
      .filter((r) => storageService.isValidIncomeStatus(r.status));
    return storageService.sumAmounts(valid);
  },

  calculateTotalReceived: (referenceDate: Date = new Date(), records?: IncomeCalcRecord[]): number =>
    storageService.sumIncome(INCOME_STATUS.RECEIVED, referenceDate, records),

  calculateOutstanding: (referenceDate: Date = new Date(), records?: IncomeCalcRecord[]): number =>
    storageService.sumIncome(INCOME_STATUS.PENDING, referenceDate, records),

  calculateOverdue: (referenceDate: Date = new Date(), records?: IncomeCalcRecord[]): number =>
    storageService.sumIncome(INCOME_STATUS.OVERDUE, referenceDate, records),

  calculateTotalIncomeYTD: (referenceDate: Date = new Date(), records?: IncomeCalcRecord[]): number =>
    storageService.calculateTotalReceived(referenceDate, records),

  calculateIncomeThisMonth: (referenceDate: Date = new Date(), records?: IncomeCalcRecord[]): number => {
    const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
    const source = records || storageService.getIncomeRecords();
    const matches = source.filter((r) => {
      const date = storageService.parseLocalDate(r.date);
      return (
        date.getFullYear() === ref.getFullYear() &&
        date.getMonth() === ref.getMonth() &&
        storageService.normaliseIncomeStatus(r.status) === INCOME_STATUS.RECEIVED
      );
    });
    return storageService.sumAmounts(matches);
  },

  calculateAverageMonthlyIncome: (referenceDate: Date = new Date(), records?: IncomeCalcRecord[]): number | null => {
    const months = storageService.getCompletedTaxMonths(referenceDate);
    if (months < 1) return null;
    const start = storageService.getTaxYearStart(referenceDate);
    const cutoff = storageService.getCurrentTaxMonthStart(referenceDate);
    const received = storageService.sumIncomeInWindow(INCOME_STATUS.RECEIVED, start, cutoff, records);
    return storageService.roundCurrency(received / months);
  },

  getIncomeByMonth: (records?: IncomeCalcRecord[], referenceDate: Date = new Date()): Record<string, number> => {
    const inYear = storageService.getIncomeInTaxYear(records, referenceDate);
    const pence: Record<string, number> = {};
    inYear
      .filter((r) => storageService.normaliseIncomeStatus(r.status) === INCOME_STATUS.RECEIVED)
      .forEach((r) => {
        const date = storageService.parseLocalDate(r.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        pence[key] = (pence[key] || 0) + storageService.toPence(r.amount);
      });
    return Object.fromEntries(Object.entries(pence).map(([k, v]) => [k, v / 100]));
  },

  getIncomeBySource: (records?: IncomeCalcRecord[], referenceDate: Date = new Date()): Record<string, number> => {
    const inYear = storageService.getIncomeInTaxYear(records, referenceDate);
    const pence: Record<string, number> = {};
    inYear
      .filter((r) => storageService.normaliseIncomeStatus(r.status) === INCOME_STATUS.RECEIVED)
      .forEach((r) => {
        const key = r.source || 'Other';
        pence[key] = (pence[key] || 0) + storageService.toPence(r.amount);
      });
    return Object.fromEntries(Object.entries(pence).map(([k, v]) => [k, v / 100]));
  },

  // ---------------------------------------------------------------------------
  // Expense records
  // ---------------------------------------------------------------------------

  getExpenseRecords: (): ExpenseRecord[] => readCollection<ExpenseRecord>(EXPENSE_STORAGE_KEY),

  addExpenseRecord: (record: Partial<ExpenseRecord>): ExpenseRecord => {
    try {
      const records = storageService.getExpenseRecords();
      const newRecord = {
        id: generateId(),
        ...record,
        createdAt: new Date().toISOString(),
      } as ExpenseRecord;
      records.push(newRecord);
      localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(records));
      return newRecord;
    } catch (error) {
      console.error('Error adding expense record:', error);
      throw new Error('Failed to save expense record', { cause: error });
    }
  },

  updateExpenseRecord: (id: string, updates: Partial<ExpenseRecord>): ExpenseRecord => {
    try {
      const records = storageService.getExpenseRecords();
      const index = records.findIndex((r) => r.id === id);
      if (index === -1) {
        throw new Error('Record not found');
      }
      records[index] = {
        ...records[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(records));
      return records[index];
    } catch (error) {
      console.error('Error updating expense record:', error);
      throw new Error('Failed to update expense record', { cause: error });
    }
  },

  deleteExpenseRecord: (id: string): boolean => {
    try {
      const records = storageService.getExpenseRecords();
      const filtered = records.filter((r) => r.id !== id);
      localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting expense record:', error);
      throw new Error('Failed to delete expense record', { cause: error });
    }
  },

  getExpenseRecord: (id: string): ExpenseRecord | undefined => {
    return storageService.getExpenseRecords().find((r) => r.id === id);
  },

  getExpensesInTaxYear: (records?: ExpenseCalcRecord[], referenceDate: Date = new Date()): ExpenseCalcRecord[] => {
    const source = records || storageService.getExpenseRecords();
    return source.filter((r) => storageService.isInActiveTaxYear(r.date, referenceDate));
  },

  sumExpensesInWindow: (startInclusive: Date, endExclusive: Date, records?: ExpenseCalcRecord[]): number => {
    const source = records || storageService.getExpenseRecords();
    const matches = source.filter((r) => {
      const d = storageService.parseLocalDate(r.date);
      return d >= startInclusive && d < endExclusive;
    });
    return storageService.sumAmounts(matches);
  },

  calculateTotalExpensesYTD: (referenceDate: Date = new Date(), records?: ExpenseCalcRecord[]): number =>
    storageService.sumAmounts(storageService.getExpensesInTaxYear(records, referenceDate)),

  calculateExpensesThisMonth: (referenceDate: Date = new Date(), records?: ExpenseCalcRecord[]): number => {
    const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
    const source = records || storageService.getExpenseRecords();
    const matches = source.filter((r) => {
      const date = storageService.parseLocalDate(r.date);
      return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth();
    });
    return storageService.sumAmounts(matches);
  },

  calculateAverageMonthlyExpenses: (referenceDate: Date = new Date(), records?: ExpenseCalcRecord[]): number | null => {
    const months = storageService.getCompletedTaxMonths(referenceDate);
    if (months < 1) return null;
    const start = storageService.getTaxYearStart(referenceDate);
    const cutoff = storageService.getCurrentTaxMonthStart(referenceDate);
    const total = storageService.sumExpensesInWindow(start, cutoff, records);
    return storageService.roundCurrency(total / months);
  },

  getExpensesByMonth: (records?: ExpenseCalcRecord[], referenceDate: Date = new Date()): Record<string, number> => {
    const inYear = storageService.getExpensesInTaxYear(records, referenceDate);
    const pence: Record<string, number> = {};
    inYear.forEach((r) => {
      const date = storageService.parseLocalDate(r.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      pence[key] = (pence[key] || 0) + storageService.toPence(r.amount);
    });
    return Object.fromEntries(Object.entries(pence).map(([k, v]) => [k, v / 100]));
  },

  getExpensesByCategory: (records?: ExpenseCalcRecord[], referenceDate: Date = new Date()): Record<string, number> => {
    const inYear = storageService.getExpensesInTaxYear(records, referenceDate);
    const pence: Record<string, number> = {};
    inYear.forEach((r) => {
      const key = r.category || 'Other';
      pence[key] = (pence[key] || 0) + storageService.toPence(r.amount);
    });
    return Object.fromEntries(Object.entries(pence).map(([k, v]) => [k, v / 100]));
  },
};
