// Storage service - abstraction layer for income and expense data persistence
// Currently uses localStorage; can be replaced with backend API

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
};

// Display labels for the canonical statuses.
export const INCOME_STATUS_LABELS = {
  [INCOME_STATUS.RECEIVED]: 'Received',
  [INCOME_STATUS.PENDING]: 'Pending',
  [INCOME_STATUS.OVERDUE]: 'Overdue',
};

export const INCOME_STATUS_OPTIONS = [
  INCOME_STATUS.RECEIVED,
  INCOME_STATUS.PENDING,
  INCOME_STATUS.OVERDUE,
];

export const INCOME_STATUS_VALUES = Object.values(INCOME_STATUS);

export const storageService = {
  // ---------------------------------------------------------------------------
  // Normalisation / validation helpers
  // ---------------------------------------------------------------------------

  // Reduce any status value to its canonical lowercase form. Legacy records
  // stored as "Received"/"RECEIVED" all resolve to INCOME_STATUS.RECEIVED.
  normaliseIncomeStatus: (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim().toLowerCase();
  },

  // Whether a value maps to one of the three allowed income statuses.
  isValidIncomeStatus: (value) =>
    INCOME_STATUS_VALUES.includes(storageService.normaliseIncomeStatus(value)),

  // Convert a monetary pounds value to integer pence. Summing in integer pence
  // avoids floating-point accumulation error (e.g. 0.1 + 0.2 !== 0.3).
  toPence: (value) => Math.round((parseFloat(value) || 0) * 100),

  // Round a monetary pounds value to 2 decimal places (used for divisions).
  roundCurrency: (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100,

  // Sum a list of records' `amount` fields exactly, returning pounds.
  sumAmounts: (records) => {
    const pence = records.reduce((acc, r) => acc + storageService.toPence(r.amount), 0);
    return pence / 100;
  },

  // ---------------------------------------------------------------------------
  // Date helpers
  // ---------------------------------------------------------------------------

  // Parse a YYYY-MM-DD string as a LOCAL date (midnight local time).
  // Using `new Date('YYYY-MM-DD')` parses as UTC, which can shift the day
  // backwards for users west of UTC. This keeps the stored calendar date exact.
  parseLocalDate: (value) => {
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
      if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        return new Date(year, month - 1, day);
      }
    }
    return new Date(value);
  },

  // Start of the UK tax year (6 April, local midnight) containing referenceDate.
  getTaxYearStart: (referenceDate = new Date()) => {
    const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
    const isOnOrAfterStart =
      ref.getMonth() > TAX_YEAR_START_MONTH ||
      (ref.getMonth() === TAX_YEAR_START_MONTH && ref.getDate() >= TAX_YEAR_START_DAY);
    const startYear = isOnOrAfterStart ? ref.getFullYear() : ref.getFullYear() - 1;
    return new Date(startYear, TAX_YEAR_START_MONTH, TAX_YEAR_START_DAY);
  },

  // Start of the NEXT tax year (6 April, local midnight). Used as an EXCLUSIVE
  // upper bound so transactions dated 5 April are always included.
  getNextTaxYearStart: (referenceDate = new Date()) => {
    const start = storageService.getTaxYearStart(referenceDate);
    return new Date(start.getFullYear() + 1, TAX_YEAR_START_MONTH, TAX_YEAR_START_DAY);
  },

  // Last day of the tax year (5 April, local midnight). Used for display/labels.
  getTaxYearEnd: (referenceDate = new Date()) => {
    const start = storageService.getTaxYearStart(referenceDate);
    return new Date(start.getFullYear() + 1, TAX_YEAR_START_MONTH, TAX_YEAR_START_DAY - 1);
  },

  // Whether a stored date falls in the active tax year (exclusive upper bound).
  isInActiveTaxYear: (dateValue, referenceDate = new Date()) => {
    const date = storageService.parseLocalDate(dateValue);
    const start = storageService.getTaxYearStart(referenceDate);
    const nextStart = storageService.getNextTaxYearStart(referenceDate);
    return date >= start && date < nextStart;
  },

  // Number of COMPLETED tax months since the tax year start.
  // A tax month runs from the 6th to the 5th. Between 6 Apr and 5 May inclusive
  // ZERO tax months are complete; the first completes on 5 May (available 6 May).
  getCompletedTaxMonths: (referenceDate = new Date()) => {
    const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
    const start = storageService.getTaxYearStart(referenceDate);
    let months = (ref.getFullYear() - start.getFullYear()) * 12 + (ref.getMonth() - start.getMonth());
    if (ref.getDate() < start.getDate()) {
      months -= 1;
    }
    return Math.max(0, months);
  },

  // Start of the CURRENT (incomplete) tax month = the exclusive upper bound of
  // the completed-tax-month window. On 12 Jul 2026 (3 months complete) this is
  // 6 Jul 2026, so income received 6-12 Jul is excluded from the completed-month
  // average numerator (keeping numerator and denominator consistent).
  getCurrentTaxMonthStart: (referenceDate = new Date()) => {
    const start = storageService.getTaxYearStart(referenceDate);
    const months = storageService.getCompletedTaxMonths(referenceDate);
    return new Date(start.getFullYear(), start.getMonth() + months, start.getDate());
  },

  // The first date on which a "per completed tax month" average is meaningful
  // (i.e. the day after the first tax month closes: 6 May of the tax year).
  getFirstAverageAvailableDate: (referenceDate = new Date()) => {
    const start = storageService.getTaxYearStart(referenceDate);
    return new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
  },

  // ---------------------------------------------------------------------------
  // Income records
  // ---------------------------------------------------------------------------

  getIncomeRecords: () => {
    try {
      const data = localStorage.getItem(INCOME_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading income records:', error);
      return [];
    }
  },

  addIncomeRecord: (record) => {
    try {
      const status = storageService.normaliseIncomeStatus(record.status) || INCOME_STATUS.RECEIVED;
      if (!INCOME_STATUS_VALUES.includes(status)) {
        throw new Error(`Invalid income status: ${record.status}`);
      }
      const records = storageService.getIncomeRecords();
      const newRecord = {
        id: Date.now().toString(),
        ...record,
        status,
        createdAt: new Date().toISOString(),
      };
      records.push(newRecord);
      localStorage.setItem(INCOME_STORAGE_KEY, JSON.stringify(records));
      return newRecord;
    } catch (error) {
      console.error('Error adding income record:', error);
      throw new Error('Failed to save income record', { cause: error });
    }
  },

  updateIncomeRecord: (id, updates) => {
    try {
      const records = storageService.getIncomeRecords();
      const index = records.findIndex(r => r.id === id);
      if (index === -1) {
        throw new Error('Record not found');
      }
      const normalisedUpdates = { ...updates };
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

  deleteIncomeRecord: (id) => {
    try {
      const records = storageService.getIncomeRecords();
      const filtered = records.filter(r => r.id !== id);
      localStorage.setItem(INCOME_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting income record:', error);
      throw new Error('Failed to delete income record', { cause: error });
    }
  },

  getIncomeRecord: (id) => {
    const records = storageService.getIncomeRecords();
    return records.find(r => r.id === id);
  },

  // Income records within the active tax year.
  getIncomeInTaxYear: (records, referenceDate = new Date()) => {
    const source = records || storageService.getIncomeRecords();
    return source.filter(r => storageService.isInActiveTaxYear(r.date, referenceDate));
  },

  // Sum income in the active tax year, optionally restricted to a canonical status.
  sumIncome: (status, referenceDate = new Date(), records) => {
    const canonical = status ? storageService.normaliseIncomeStatus(status) : null;
    const inYear = storageService
      .getIncomeInTaxYear(records, referenceDate)
      .filter(r => (canonical ? storageService.normaliseIncomeStatus(r.status) === canonical : true));
    return storageService.sumAmounts(inYear);
  },

  // Sum received income within an explicit [startInclusive, endExclusive) window.
  sumIncomeInWindow: (status, startInclusive, endExclusive, records) => {
    const canonical = status ? storageService.normaliseIncomeStatus(status) : null;
    const source = records || storageService.getIncomeRecords();
    const matches = source.filter(r => {
      const d = storageService.parseLocalDate(r.date);
      return (
        d >= startInclusive &&
        d < endExclusive &&
        (canonical ? storageService.normaliseIncomeStatus(r.status) === canonical : true)
      );
    });
    return storageService.sumAmounts(matches);
  },

  // Total invoiced = every VALID-status income entry in the tax year. Restricting
  // to valid statuses guarantees invoiced === received + outstanding + overdue.
  calculateTotalInvoiced: (referenceDate = new Date(), records) => {
    const valid = storageService
      .getIncomeInTaxYear(records, referenceDate)
      .filter(r => storageService.isValidIncomeStatus(r.status));
    return storageService.sumAmounts(valid);
  },

  // Total received = money actually collected (status "received").
  calculateTotalReceived: (referenceDate = new Date(), records) =>
    storageService.sumIncome(INCOME_STATUS.RECEIVED, referenceDate, records),

  // Outstanding = invoiced but not yet due for chase (status "pending").
  calculateOutstanding: (referenceDate = new Date(), records) =>
    storageService.sumIncome(INCOME_STATUS.PENDING, referenceDate, records),

  // Overdue = past due and unpaid (status "overdue").
  calculateOverdue: (referenceDate = new Date(), records) =>
    storageService.sumIncome(INCOME_STATUS.OVERDUE, referenceDate, records),

  // Backwards-compatible alias: "Total income YTD" reflects money received.
  calculateTotalIncomeYTD: (referenceDate = new Date(), records) =>
    storageService.calculateTotalReceived(referenceDate, records),

  // Received income in the current calendar month.
  calculateIncomeThisMonth: (referenceDate = new Date(), records) => {
    const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
    const source = records || storageService.getIncomeRecords();
    const matches = source.filter(r => {
      const date = storageService.parseLocalDate(r.date);
      return (
        date.getFullYear() === ref.getFullYear() &&
        date.getMonth() === ref.getMonth() &&
        storageService.normaliseIncomeStatus(r.status) === INCOME_STATUS.RECEIVED
      );
    });
    return storageService.sumAmounts(matches);
  },

  // Average RECEIVED income per COMPLETED tax month in the active tax year.
  // Numerator counts ONLY income received within completed tax months
  // [taxYearStart, currentTaxMonthStart); the current incomplete month is
  // excluded from both numerator and denominator so the figure is consistent.
  // Returns null while no tax month has completed (before 6 May of the year).
  calculateAverageMonthlyIncome: (referenceDate = new Date(), records) => {
    const months = storageService.getCompletedTaxMonths(referenceDate);
    if (months < 1) return null;
    const start = storageService.getTaxYearStart(referenceDate);
    const cutoff = storageService.getCurrentTaxMonthStart(referenceDate);
    const received = storageService.sumIncomeInWindow(INCOME_STATUS.RECEIVED, start, cutoff, records);
    return storageService.roundCurrency(received / months);
  },

  // Received income grouped by month, RESTRICTED to the active tax year so the
  // chart reconciles with the KPI cards.
  getIncomeByMonth: (records, referenceDate = new Date()) => {
    const inYear = storageService.getIncomeInTaxYear(records, referenceDate);
    const pence = {};
    inYear
      .filter(r => storageService.normaliseIncomeStatus(r.status) === INCOME_STATUS.RECEIVED)
      .forEach(r => {
        const date = storageService.parseLocalDate(r.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        pence[key] = (pence[key] || 0) + storageService.toPence(r.amount);
      });
    return Object.fromEntries(Object.entries(pence).map(([k, v]) => [k, v / 100]));
  },

  // Received income grouped by source, RESTRICTED to the active tax year.
  getIncomeBySource: (records, referenceDate = new Date()) => {
    const inYear = storageService.getIncomeInTaxYear(records, referenceDate);
    const pence = {};
    inYear
      .filter(r => storageService.normaliseIncomeStatus(r.status) === INCOME_STATUS.RECEIVED)
      .forEach(r => {
        const key = r.source || 'Other';
        pence[key] = (pence[key] || 0) + storageService.toPence(r.amount);
      });
    return Object.fromEntries(Object.entries(pence).map(([k, v]) => [k, v / 100]));
  },

  // ---------------------------------------------------------------------------
  // Expense records
  //
  // NOTE ON EXPENSE METRICS: the current data model records every expense as an
  // incurred cost with a payment method, but does NOT yet distinguish "paid" vs
  // "unpaid" or "allowable" vs "disallowable". Therefore:
  //   - Total expenses YTD       = all recorded expenses in the active tax year
  //   - Average per tax month    = recorded expenses / completed tax months
  // "Paid expenses" and "allowable expenses" are not yet modelled; introducing
  // them requires new fields and is tracked as follow-up work.
  // ---------------------------------------------------------------------------

  getExpenseRecords: () => {
    try {
      const data = localStorage.getItem(EXPENSE_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading expense records:', error);
      return [];
    }
  },

  addExpenseRecord: (record) => {
    try {
      const records = storageService.getExpenseRecords();
      const newRecord = {
        id: Date.now().toString(),
        ...record,
        createdAt: new Date().toISOString(),
      };
      records.push(newRecord);
      localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(records));
      return newRecord;
    } catch (error) {
      console.error('Error adding expense record:', error);
      throw new Error('Failed to save expense record', { cause: error });
    }
  },

  updateExpenseRecord: (id, updates) => {
    try {
      const records = storageService.getExpenseRecords();
      const index = records.findIndex(r => r.id === id);
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

  deleteExpenseRecord: (id) => {
    try {
      const records = storageService.getExpenseRecords();
      const filtered = records.filter(r => r.id !== id);
      localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting expense record:', error);
      throw new Error('Failed to delete expense record', { cause: error });
    }
  },

  getExpenseRecord: (id) => {
    const records = storageService.getExpenseRecords();
    return records.find(r => r.id === id);
  },

  getExpensesInTaxYear: (records, referenceDate = new Date()) => {
    const source = records || storageService.getExpenseRecords();
    return source.filter(r => storageService.isInActiveTaxYear(r.date, referenceDate));
  },

  // Sum recorded expenses within an explicit [startInclusive, endExclusive) window.
  sumExpensesInWindow: (startInclusive, endExclusive, records) => {
    const source = records || storageService.getExpenseRecords();
    const matches = source.filter(r => {
      const d = storageService.parseLocalDate(r.date);
      return d >= startInclusive && d < endExclusive;
    });
    return storageService.sumAmounts(matches);
  },

  // Total recorded expenses in the active tax year.
  calculateTotalExpensesYTD: (referenceDate = new Date(), records) =>
    storageService.sumAmounts(storageService.getExpensesInTaxYear(records, referenceDate)),

  calculateExpensesThisMonth: (referenceDate = new Date(), records) => {
    const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
    const source = records || storageService.getExpenseRecords();
    const matches = source.filter(r => {
      const date = storageService.parseLocalDate(r.date);
      return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth();
    });
    return storageService.sumAmounts(matches);
  },

  // Average RECORDED expenses per COMPLETED tax month. Numerator counts only
  // expenses in completed tax months [taxYearStart, currentTaxMonthStart).
  // Returns null while no tax month has completed (see income average note).
  calculateAverageMonthlyExpenses: (referenceDate = new Date(), records) => {
    const months = storageService.getCompletedTaxMonths(referenceDate);
    if (months < 1) return null;
    const start = storageService.getTaxYearStart(referenceDate);
    const cutoff = storageService.getCurrentTaxMonthStart(referenceDate);
    const total = storageService.sumExpensesInWindow(start, cutoff, records);
    return storageService.roundCurrency(total / months);
  },

  // Expenses grouped by month, RESTRICTED to the active tax year.
  getExpensesByMonth: (records, referenceDate = new Date()) => {
    const inYear = storageService.getExpensesInTaxYear(records, referenceDate);
    const pence = {};
    inYear.forEach(r => {
      const date = storageService.parseLocalDate(r.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      pence[key] = (pence[key] || 0) + storageService.toPence(r.amount);
    });
    return Object.fromEntries(Object.entries(pence).map(([k, v]) => [k, v / 100]));
  },

  // Expenses grouped by category, RESTRICTED to the active tax year.
  getExpensesByCategory: (records, referenceDate = new Date()) => {
    const inYear = storageService.getExpensesInTaxYear(records, referenceDate);
    const pence = {};
    inYear.forEach(r => {
      const key = r.category || 'Other';
      pence[key] = (pence[key] || 0) + storageService.toPence(r.amount);
    });
    return Object.fromEntries(Object.entries(pence).map(([k, v]) => [k, v / 100]));
  },
};
