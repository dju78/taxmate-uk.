import { create } from 'zustand';
import { storageService } from './storage';
import type { IncomeRecord, ExpenseRecord } from './types';

// A tax year is represented by its START calendar year (e.g. 2026 => 2026/27).
export const taxYearStartToLabel = (startYear: number): string =>
  `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`;

// The start year of the tax year containing today.
export const currentTaxYearStart = (): number =>
  storageService.getTaxYearStart().getFullYear();

// The tax years offered in the selector: the current year and the two prior
// (e.g. today in 2026/27 -> [2026, 2025, 2024] = 2026/27, 2025/26, 2024/25).
export const getAvailableTaxYears = (current: number = currentTaxYearStart()): number[] => [
  current,
  current - 1,
  current - 2,
];

// A reference Date that resolves to the given tax year for storageService calcs.
// For the CURRENT tax year we use "now" so completed-month / this-month figures
// reflect today; for past years we use a date inside that year.
export const taxYearReferenceDate = (startYear: number): Date => {
  if (startYear === currentTaxYearStart()) return new Date();
  return new Date(startYear, 5, 1); // 1 June of the start year — safely inside 6 Apr–5 Apr
};

const SELECTED_YEAR_KEY = 'taxmate_selected_tax_year';

const loadSelectedYear = (): number => {
  try {
    const v = Number(localStorage.getItem(SELECTED_YEAR_KEY));
    if (v && Number.isFinite(v)) return v;
  } catch {
    // ignore
  }
  return currentTaxYearStart();
};

export interface TaxStore {
  income: IncomeRecord[];
  expenses: ExpenseRecord[];
  selectedTaxYear: number; // start year
  refresh: () => void;
  setSelectedTaxYear: (year: number) => void;
  addIncome: (record: Partial<IncomeRecord>) => void;
  updateIncome: (id: string, record: Partial<IncomeRecord>) => void;
  deleteIncome: (id: string) => void;
  addExpense: (record: Partial<ExpenseRecord>) => void;
  updateExpense: (id: string, record: Partial<ExpenseRecord>) => void;
  deleteExpense: (id: string) => void;
}

export const useTaxStore = create<TaxStore>((set, get) => ({
  income: storageService.getIncomeRecords(),
  expenses: storageService.getExpenseRecords(),
  selectedTaxYear: loadSelectedYear(),
  refresh: () =>
    set({
      income: storageService.getIncomeRecords(),
      expenses: storageService.getExpenseRecords(),
    }),
  setSelectedTaxYear: (year) => {
    try {
      localStorage.setItem(SELECTED_YEAR_KEY, String(year));
    } catch {
      // ignore
    }
    set({ selectedTaxYear: year });
  },
  addIncome: (record) => {
    storageService.addIncomeRecord(record);
    get().refresh();
  },
  updateIncome: (id, record) => {
    storageService.updateIncomeRecord(id, record);
    get().refresh();
  },
  deleteIncome: (id) => {
    storageService.deleteIncomeRecord(id);
    get().refresh();
  },
  addExpense: (record) => {
    storageService.addExpenseRecord(record);
    get().refresh();
  },
  updateExpense: (id, record) => {
    storageService.updateExpenseRecord(id, record);
    get().refresh();
  },
  deleteExpense: (id) => {
    storageService.deleteExpenseRecord(id);
    get().refresh();
  },
}));
