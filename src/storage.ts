// Storage service - abstraction layer for income and expense data persistence
// Currently uses localStorage; can be replaced with backend API
import type { IncomeRecord, ExpenseRecord, ExpenseCategory, ExportBundle, ExportPreferences, AppPreferences, IncomeCalcRecord, ExpenseCalcRecord } from './types';
import { isExpenseCategory, LEGACY_EXPENSE_CATEGORY_MAP } from './types';
import { isValidAmount, isValidDateString } from './validation';
import { diagnosticsService } from './diagnostics';

// Validate the optional future-ready expense fields at runtime. Returns error
// strings (empty = valid). `label` prefixes messages, e.g. "expenseRecords[3]".
export const validateFutureExpenseFields = (r: Record<string, unknown>, label: string): string[] => {
  const errors: string[] = [];
  if (r.allowableType !== undefined && r.allowableType !== 'allowable' && r.allowableType !== 'non-allowable') {
    errors.push(`${label}: allowableType must be "allowable" or "non-allowable".`);
  }
  if (r.paymentStatus !== undefined && r.paymentStatus !== 'paid' && r.paymentStatus !== 'unpaid') {
    errors.push(`${label}: paymentStatus must be "paid" or "unpaid".`);
  }
  if (r.businessUsePercentage !== undefined) {
    const p = r.businessUsePercentage;
    if (typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > 100) {
      errors.push(`${label}: businessUsePercentage must be a number from 0 to 100.`);
    }
  }
  if (r.expenseType !== undefined && r.expenseType !== 'capital' && r.expenseType !== 'revenue') {
    errors.push(`${label}: expenseType must be "capital" or "revenue".`);
  }
  if (r.isReimbursed !== undefined && typeof r.isReimbursed !== 'boolean') {
    errors.push(`${label}: isReimbursed must be a boolean.`);
  }
  return errors;
};

// Copy only the valid optional future-ready fields onto a record.
const pickFutureExpenseFields = (r: Record<string, unknown>): Partial<ExpenseRecord> => {
  const out: Partial<ExpenseRecord> = {};
  if (r.allowableType === 'allowable' || r.allowableType === 'non-allowable') out.allowableType = r.allowableType;
  if (r.paymentStatus === 'paid' || r.paymentStatus === 'unpaid') out.paymentStatus = r.paymentStatus;
  if (typeof r.businessUsePercentage === 'number' && Number.isFinite(r.businessUsePercentage) && r.businessUsePercentage >= 0 && r.businessUsePercentage <= 100) {
    out.businessUsePercentage = r.businessUsePercentage;
  }
  if (r.expenseType === 'capital' || r.expenseType === 'revenue') out.expenseType = r.expenseType;
  if (typeof r.isReimbursed === 'boolean') out.isReimbursed = r.isReimbursed;
  if (typeof r.legacyCategory === 'string' && r.legacyCategory) out.legacyCategory = r.legacyCategory;
  return out;
};

// Map a legacy (pre-HMRC) category to the approved enum, preserving the
// original as legacyCategory. Unknown values map to "Other business expenses".
export const migrateLegacyExpenseCategory = (
  category: unknown
): { category: ExpenseCategory; legacyCategory?: string } => {
  if (isExpenseCategory(category)) return { category };
  const original = typeof category === 'string' ? category : '';
  const mapped = LEGACY_EXPENSE_CATEGORY_MAP[original] ?? 'Other business expenses';
  return { category: mapped, legacyCategory: original || 'Unknown' };
};

export interface ImportValidationResult {
  ok: boolean;
  errors: string[];
  income: IncomeRecord[];
  expenses: ExpenseRecord[];
  preferences: ExportPreferences;
}

const INCOME_STORAGE_KEY = 'taxmate_income_records';
const EXPENSE_STORAGE_KEY = 'taxmate_expense_records';
// Shared with the store; exported so a full reset can clear it too.
export const SELECTED_TAX_YEAR_KEY = 'taxmate_selected_tax_year';

// Backup envelope version. Version 2 is the approved schema
// (incomeRecords/expenseRecords/appPreferences/exportDate); version 1 is the
// legacy shape (income/expenses/preferences/exportedAt) and is migrated.
export const BACKUP_SCHEMA_VERSION = 2;

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
// v2: expense categories migrated from the generic set to the HMRC enum
//     (original value preserved as legacyCategory).
export const SCHEMA_VERSION = 2;
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
    diagnosticsService.logEvent('STORAGE_READ_ERROR', key, 'error');
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

// Atomically write several localStorage keys: snapshot current values, attempt
// all writes, and roll back to the snapshot if any write throws (e.g. quota).
const transactionalWrite = (entries: { key: string; value: string }[]): void => {
  const snapshot = entries.map((e) => ({ key: e.key, prev: localStorage.getItem(e.key) }));
  try {
    entries.forEach((e) => localStorage.setItem(e.key, e.value));
  } catch (error) {
    snapshot.forEach((s) => {
      if (s.prev === null) localStorage.removeItem(s.key);
      else localStorage.setItem(s.key, s.prev);
    });
    throw error;
  }
};

export const storageService = {
  // ---------------------------------------------------------------------------
  // Schema / storage health
  // ---------------------------------------------------------------------------

  migrateIfNeeded: (): void => {
    try {
      const stored = Number(localStorage.getItem(SCHEMA_VERSION_KEY)) || 1;
      if (stored < 2) {
        // v1 -> v2: map legacy generic expense categories to the HMRC enum,
        // preserving the original value as legacyCategory (never silently
        // misclassify: unmapped values go to "Other business expenses" WITH
        // the original kept for review).
        const expenses = storageService.getExpenseRecords();
        let changed = false;
        const migrated = expenses.map((r) => {
          if (isExpenseCategory(r.category)) return r;
          changed = true;
          const { category, legacyCategory } = migrateLegacyExpenseCategory(r.category);
          return { ...r, category, legacyCategory };
        });
        if (changed) {
          localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(migrated));
          diagnosticsService.logEvent('SCHEMA_MIGRATION', 'storage', 'info');
        }
      }
      localStorage.setItem(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION));
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

  getExportBundle: (preferences: ExportPreferences = {}): ExportBundle => ({
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportDate: new Date().toISOString(),
    appPreferences: preferences,
    incomeRecords: storageService.getIncomeRecords(),
    expenseRecords: storageService.getExpenseRecords(),
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

  findDuplicateIncome: (record: Partial<IncomeRecord>, excludeId?: string): IncomeRecord | undefined => {
    const records = storageService.getIncomeRecords();
    const qPence = storageService.toPence(record.amount as string || '0');
    const qSource = (record.source || '').trim().toLowerCase();
    const qDate = record.date;
    const qFallbackDesc = (record.description || record.category || '').trim().toLowerCase();
    
    return records.find(r => {
      const rFallbackDesc = (r.description || r.category || '').trim().toLowerCase();
      return r.id !== excludeId &&
        r.date === qDate &&
        storageService.toPence(r.amount) === qPence &&
        (r.source || '').trim().toLowerCase() === qSource &&
        rFallbackDesc === qFallbackDesc;
    });
  },

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

  findDuplicateExpense: (record: Partial<ExpenseRecord>, excludeId?: string): ExpenseRecord | undefined => {
    const records = storageService.getExpenseRecords();
    const qPence = storageService.toPence(record.amount as string || '0');
    const qMerchant = (record.merchant || '').trim().toLowerCase();
    const qDate = record.date;
    const qFallbackDesc = (record.description || record.category || '').trim().toLowerCase();
    
    return records.find(r => {
      const rFallbackDesc = (r.description || r.category || '').trim().toLowerCase();
      return r.id !== excludeId &&
        r.date === qDate &&
        storageService.toPence(r.amount) === qPence &&
        (r.merchant || '').trim().toLowerCase() === qMerchant &&
        rFallbackDesc === qFallbackDesc;
    });
  },

  addExpenseRecord: (record: Partial<ExpenseRecord>): ExpenseRecord => {
    try {
      if (!isExpenseCategory(record.category)) {
        throw new Error(`Invalid expense category: ${String(record.category)}`);
      }
      const fieldErrors = validateFutureExpenseFields(record as Record<string, unknown>, 'expense');
      if (fieldErrors.length > 0) {
        throw new Error(fieldErrors.join(' '));
      }
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
      if (updates.category !== undefined && !isExpenseCategory(updates.category)) {
        throw new Error(`Invalid expense category: ${String(updates.category)}`);
      }
      const fieldErrors = validateFutureExpenseFields(updates as Record<string, unknown>, 'expense');
      if (fieldErrors.length > 0) {
        throw new Error(fieldErrors.join(' '));
      }
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

  // ---------------------------------------------------------------------------
  // Clear all data (full reset: records + preferences + recovery metadata)
  // ---------------------------------------------------------------------------

  clearAllData: (): void => {
    // Records first, atomically.
    transactionalWrite([
      { key: INCOME_STORAGE_KEY, value: JSON.stringify([]) },
      { key: EXPENSE_STORAGE_KEY, value: JSON.stringify([]) },
    ]);
    // Then preferences, recovery state and schema metadata.
    try {
      localStorage.removeItem(SELECTED_TAX_YEAR_KEY);
      localStorage.removeItem(STORAGE_ERROR_KEY);
      localStorage.removeItem(SCHEMA_VERSION_KEY);
      Object.keys(localStorage)
        .filter((k) => k.includes('_backup_'))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore metadata cleanup failures
    }
  },

  // ---------------------------------------------------------------------------
  // Demo data (isolated from user records via isDemo:true)
  // ---------------------------------------------------------------------------

  // Generate demo records dated inside the SELECTED tax year so they appear in
  // the active view. startYear is the tax-year start year (e.g. 2025 => 2025/26).
  getDemoData: (startYear: number): { income: IncomeRecord[]; expenses: ExpenseRecord[] } => {
    const y = startYear;
    const iso = (year: number, month1: number, day: number) =>
      `${year}-${String(month1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const income: IncomeRecord[] = [
      { id: generateId(), date: iso(y, 5, 15), source: 'Demo Client A', category: 'Client work', amount: '2400.00', status: 'received', description: 'Website build', notes: '', isDemo: true },
      { id: generateId(), date: iso(y, 6, 3), source: 'Demo Client B', category: 'Freelance', amount: '1500.00', status: 'received', description: 'Design sprint', notes: '', isDemo: true },
      { id: generateId(), date: iso(y, 6, 20), source: 'Demo Client C', category: 'Client work', amount: '800.00', status: 'pending', description: 'Retainer', notes: '', isDemo: true },
      { id: generateId(), date: iso(y, 5, 28), source: 'Demo Client D', category: 'Freelance', amount: '650.00', status: 'overdue', description: 'Audit', notes: '', isDemo: true },
    ];
    const expenses: ExpenseRecord[] = [
      { id: generateId(), date: iso(y, 5, 10), merchant: 'Demo Stationers', category: 'Office costs', amount: '45.99', paymentMethod: 'Card', description: 'Printer paper', notes: '', isDemo: true },
      { id: generateId(), date: iso(y, 6, 12), merchant: 'Demo Rail', category: 'Travel', amount: '78.50', paymentMethod: 'Card', description: 'Client visit', notes: '', isDemo: true },
      { id: generateId(), date: iso(y, 6, 1), merchant: 'Demo Software Co', category: 'Phone, internet and postage', amount: '120.00', paymentMethod: 'Card', description: 'Annual licence', notes: '', isDemo: true },
    ];
    return { income, expenses };
  },

  hasDemoData: (): boolean => {
    const income = storageService.getIncomeRecords();
    const expenses = storageService.getExpenseRecords();
    return income.some((r) => r.isDemo === true) || expenses.some((r) => r.isDemo === true);
  },

  // Add demo records for the given tax year (idempotent per demo presence).
  loadDemoData: (startYear: number = storageService.getCurrentTaxYearStartYear()): { income: number; expenses: number } => {
    if (storageService.hasDemoData()) return { income: 0, expenses: 0 };
    const demo = storageService.getDemoData(startYear);
    const income = [...storageService.getIncomeRecords(), ...demo.income];
    const expenses = [...storageService.getExpenseRecords(), ...demo.expenses];
    transactionalWrite([
      { key: INCOME_STORAGE_KEY, value: JSON.stringify(income) },
      { key: EXPENSE_STORAGE_KEY, value: JSON.stringify(expenses) },
    ]);
    return { income: demo.income.length, expenses: demo.expenses.length };
  },

  // Remove ONLY demo records, preserving user-created records.
  removeDemoData: (): { income: number; expenses: number } => {
    const income = storageService.getIncomeRecords();
    const expenses = storageService.getExpenseRecords();
    const keptIncome = income.filter((r) => r.isDemo !== true);
    const keptExpenses = expenses.filter((r) => r.isDemo !== true);
    transactionalWrite([
      { key: INCOME_STORAGE_KEY, value: JSON.stringify(keptIncome) },
      { key: EXPENSE_STORAGE_KEY, value: JSON.stringify(keptExpenses) },
    ]);
    return { income: income.length - keptIncome.length, expenses: expenses.length - keptExpenses.length };
  },

  // ---------------------------------------------------------------------------
  // Import (version check -> structural validation -> preview -> apply)
  // ---------------------------------------------------------------------------

  // Validate a parsed backup: schema version, structure, records, duplicate ids
  // and preferences. Returns normalised records + preferences plus any errors;
  // when errors exist, ok is false and callers MUST NOT import.
  validateImportData: (data: unknown): ImportValidationResult => {
    const empty: ImportValidationResult = { ok: false, errors: [], income: [], expenses: [], preferences: {} };
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return { ...empty, errors: ['File is not a valid TaxMate backup (expected a JSON object).'] };
    }
    const d = data as Record<string, unknown>;

    // --- schema version ---
    const version = d.schemaVersion;
    if (typeof version !== 'number' || !Number.isFinite(version)) {
      return { ...empty, errors: ['Missing or non-numeric "schemaVersion".'] };
    }
    if (version > BACKUP_SCHEMA_VERSION) {
      return { ...empty, errors: [`Unsupported backup version ${version}. This app supports up to version ${BACKUP_SCHEMA_VERSION}.`] };
    }
    if (version < 1) {
      return { ...empty, errors: [`Unsupported backup version ${version} (no migration path).`] };
    }

    // --- migrate older versions to the current field layout ---
    // v1 (legacy): income / expenses / preferences. v2: incomeRecords /
    // expenseRecords / appPreferences.
    const legacy = version < BACKUP_SCHEMA_VERSION;
    const rawIncome = legacy ? d.income : d.incomeRecords;
    const rawExpenses = legacy ? d.expenses : d.expenseRecords;
    const rawPrefs = legacy ? d.preferences : d.appPreferences;

    const errors: string[] = [];
    if (rawIncome !== undefined && !Array.isArray(rawIncome)) errors.push('"incomeRecords" must be an array.');
    if (rawExpenses !== undefined && !Array.isArray(rawExpenses)) errors.push('"expenseRecords" must be an array.');
    if (rawIncome === undefined && rawExpenses === undefined) {
      errors.push('Backup must contain an "incomeRecords" and/or "expenseRecords" array.');
    }

    const income: IncomeRecord[] = [];
    const expenses: ExpenseRecord[] = [];
    const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
    const seenIncomeIds = new Set<string>();
    const seenExpenseIds = new Set<string>();

    const resolveId = (raw: unknown, seen: Set<string>, label: string) => {
      const id = str(raw).trim();
      if (!id) {
        // Missing ids are tolerated for legacy backups (auto-generated), but
        // rejected for the current schema which always writes ids.
        if (legacy) return generateId();
        errors.push(`${label}: missing id.`);
        return '';
      }
      if (seen.has(id)) {
        errors.push(`${label}: duplicate id "${id}" inside the backup.`);
      }
      seen.add(id);
      return id;
    };

    if (Array.isArray(rawIncome)) {
      rawIncome.forEach((item, i) => {
        if (typeof item !== 'object' || item === null) {
          errors.push(`incomeRecords[${i}] is not an object.`);
          return;
        }
        const r = item as Record<string, unknown>;
        const id = resolveId(r.id, seenIncomeIds, `incomeRecords[${i}]`);
        if (!isValidDateString(r.date)) errors.push(`incomeRecords[${i}]: invalid or missing date (expected YYYY-MM-DD).`);
        if (!isValidAmount(r.amount)) errors.push(`incomeRecords[${i}]: invalid or missing amount.`);
        const status = storageService.normaliseIncomeStatus(r.status);
        if (!INCOME_STATUS_VALUES.includes(status)) errors.push(`incomeRecords[${i}]: invalid status "${String(r.status)}".`);
        if (!str(r.source).trim()) errors.push(`incomeRecords[${i}]: missing source.`);
        income.push({
          id: id || generateId(),
          date: str(r.date),
          source: str(r.source),
          category: str(r.category, 'Other'),
          amount: str(r.amount),
          status,
          description: str(r.description),
          notes: str(r.notes),
          isDemo: r.isDemo === true,
        });
      });
    }

    if (Array.isArray(rawExpenses)) {
      rawExpenses.forEach((item, i) => {
        if (typeof item !== 'object' || item === null) {
          errors.push(`expenseRecords[${i}] is not an object.`);
          return;
        }
        const r = item as Record<string, unknown>;
        const label = `expenseRecords[${i}]`;
        const id = resolveId(r.id, seenExpenseIds, label);
        if (!isValidDateString(r.date)) errors.push(`${label}: invalid or missing date (expected YYYY-MM-DD).`);
        if (!isValidAmount(r.amount)) errors.push(`${label}: invalid or missing amount.`);
        if (!str(r.merchant).trim()) errors.push(`${label}: missing merchant.`);
        if (!str(r.category).trim()) errors.push(`${label}: missing category.`);
        // Category enforcement: current-schema backups must use the HMRC enum;
        // legacy (v1) backups are migrated with the original preserved.
        let category: ExpenseCategory = 'Other business expenses';
        let legacyCategory: string | undefined;
        if (isExpenseCategory(r.category)) {
          category = r.category;
        } else if (legacy) {
          const migrated = migrateLegacyExpenseCategory(r.category);
          category = migrated.category;
          legacyCategory = migrated.legacyCategory;
        } else if (str(r.category).trim()) {
          errors.push(`${label}: unsupported category "${str(r.category)}".`);
        }
        // Future-ready field validation (types disappear at runtime).
        errors.push(...validateFutureExpenseFields(r, label));
        expenses.push({
          id: id || generateId(),
          date: str(r.date),
          merchant: str(r.merchant),
          category,
          ...(legacyCategory ? { legacyCategory } : {}),
          amount: str(r.amount),
          paymentMethod: str(r.paymentMethod, 'Card'),
          description: str(r.description),
          notes: str(r.notes),
          isDemo: r.isDemo === true,
          // Preserve valid future-ready fields through export/import.
          ...pickFutureExpenseFields(r),
        });
      });
    }

    // --- preferences ---
    const preferences: ExportPreferences = {};
    if (rawPrefs !== undefined) {
      if (typeof rawPrefs !== 'object' || rawPrefs === null || Array.isArray(rawPrefs)) {
        errors.push('"appPreferences" must be an object.');
      } else {
        const p = rawPrefs as Record<string, unknown>;
        Object.assign(preferences, p);
        if (p.selectedTaxYear !== undefined && (typeof p.selectedTaxYear !== 'number' || !Number.isFinite(p.selectedTaxYear))) {
          errors.push('"appPreferences.selectedTaxYear" must be a number.');
        }
      }
    }

    return { ok: errors.length === 0, errors, income, expenses, preferences };
  },

  // Parse raw text then validate (JSON parse errors become validation errors).
  parseImportText: (text: string): ImportValidationResult => {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, errors: ['File is not valid JSON.'], income: [], expenses: [], preferences: {} };
    }
    return storageService.validateImportData(data);
  },

  // MERGE: add validated records whose id does not already exist (non-conflicting
  // additions). Atomic across both record keys.
  applyMerge: (income: IncomeRecord[], expenses: ExpenseRecord[]): { income: number; expenses: number } => {
    const existingIncome = storageService.getIncomeRecords();
    const existingExpenses = storageService.getExpenseRecords();
    const incomeIds = new Set(existingIncome.map((r) => r.id));
    const expenseIds = new Set(existingExpenses.map((r) => r.id));
    const newIncome = income.filter((r) => !incomeIds.has(r.id));
    const newExpenses = expenses.filter((r) => !expenseIds.has(r.id));
    transactionalWrite([
      { key: INCOME_STORAGE_KEY, value: JSON.stringify([...existingIncome, ...newIncome]) },
      { key: EXPENSE_STORAGE_KEY, value: JSON.stringify([...existingExpenses, ...newExpenses]) },
    ]);
    return { income: newIncome.length, expenses: newExpenses.length };
  },

  // RESTORE: replace all records with the backup's records. Atomic across both
  // record keys (rolls back on write failure). Preferences are applied by the
  // caller (store) so the in-memory state updates too.
  applyRestore: (income: IncomeRecord[], expenses: ExpenseRecord[]): { income: number; expenses: number } => {
    transactionalWrite([
      { key: INCOME_STORAGE_KEY, value: JSON.stringify(income) },
      { key: EXPENSE_STORAGE_KEY, value: JSON.stringify(expenses) },
    ]);
    return { income: income.length, expenses: expenses.length };
  },

  // Pure preview of what an import will do, computed against current storage.
  // Duplicate-ID matches are exact (hard) — a merge always skips them.
  // "Probable duplicates" are CONTENT matches (via findDuplicateIncome/Expense)
  // on incoming records with an id NOT already present — these are warnings
  // only; merge still adds them (never silently, the user sees the count).
  previewImport: (
    mode: 'restore' | 'merge',
    income: IncomeRecord[],
    expenses: ExpenseRecord[]
  ): {
    toAddIncome: number;
    toSkipIncome: number; // duplicate id, merge only
    probableDuplicateIncome: number; // content match, different id
    toAddExpenses: number;
    toSkipExpenses: number;
    probableDuplicateExpenses: number;
    toReplace: number; // restore only: existing records that will be discarded
  } => {
    const existingIncome = storageService.getIncomeRecords();
    const existingExpenses = storageService.getExpenseRecords();

    if (mode === 'restore') {
      return {
        toAddIncome: income.length,
        toSkipIncome: 0,
        probableDuplicateIncome: 0,
        toAddExpenses: expenses.length,
        toSkipExpenses: 0,
        probableDuplicateExpenses: 0,
        toReplace: existingIncome.length + existingExpenses.length,
      };
    }

    const incomeIds = new Set(existingIncome.map((r) => r.id));
    const expenseIds = new Set(existingExpenses.map((r) => r.id));
    const newIncome = income.filter((r) => !incomeIds.has(r.id));
    const newExpenses = expenses.filter((r) => !expenseIds.has(r.id));
    const probableDuplicateIncome = newIncome.filter(
      (r) => storageService.findDuplicateIncome(r, r.id) !== undefined
    ).length;
    const probableDuplicateExpenses = newExpenses.filter(
      (r) => storageService.findDuplicateExpense(r, r.id) !== undefined
    ).length;

    return {
      toAddIncome: newIncome.length,
      toSkipIncome: income.length - newIncome.length,
      probableDuplicateIncome,
      toAddExpenses: newExpenses.length,
      toSkipExpenses: expenses.length - newExpenses.length,
      probableDuplicateExpenses,
      toReplace: 0,
    };
  },

  // PREFERENCES
  getAppPreferences: (): AppPreferences => {
    try {
      const raw = localStorage.getItem('taxmate_app_preferences');
      if (raw) return JSON.parse(raw) as AppPreferences;
    } catch {
      // ignore
    }
    return {};
  },
  
  setAppPreferences: (prefs: Partial<AppPreferences>): void => {
    try {
      const current = storageService.getAppPreferences();
      localStorage.setItem('taxmate_app_preferences', JSON.stringify({ ...current, ...prefs }));
    } catch {
      // ignore
    }
  },

  // BACKUP REMINDER
  // Pure predicate (no state, no effect) so it can be computed directly during
  // render and unit-tested in isolation. Trigger only when:
  //   (a) at least 10 non-demo records exist and no successful JSON backup
  //       has ever been recorded, OR
  //   (b) more than 30 days have passed since the last successful backup.
  // Demo-only data never counts toward the threshold.
  shouldShowBackupReminder: (
    income: { isDemo?: boolean }[],
    expenses: { isDemo?: boolean }[],
    now: Date = new Date()
  ): boolean => {
    const prefs = storageService.getAppPreferences();
    if (prefs.backupReminderSnoozedUntil) {
      const snoozedUntil = new Date(prefs.backupReminderSnoozedUntil);
      if (now < snoozedUntil) return false;
    }
    const totalNonDemo =
      income.filter((r) => !r.isDemo).length + expenses.filter((r) => !r.isDemo).length;
    if (!prefs.lastExportDate) {
      return totalNonDemo >= 10;
    }
    const daysSinceExport = (now.getTime() - new Date(prefs.lastExportDate).getTime()) / 86_400_000;
    return daysSinceExport > 30;
  },

  snoozeBackupReminder: (days = 7, now: Date = new Date()): void => {
    const until = new Date(now);
    until.setDate(until.getDate() + days);
    storageService.setAppPreferences({ backupReminderSnoozedUntil: until.toISOString() });
  },

  // Record a SUCCESSFUL JSON export. Callers must only invoke this after the
  // download has actually been produced (never on a thrown/failed export).
  recordSuccessfulExport: (now: Date = new Date()): void => {
    storageService.setAppPreferences({ lastExportDate: now.toISOString() });
  },
};
