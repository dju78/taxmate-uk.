import { create } from 'zustand';
import { storageService, SELECTED_TAX_YEAR_KEY } from './storage';
import type { IncomeRecord, ExpenseRecord, ExportPreferences } from './types';
import {
  defaultIncomeFilters,
  defaultExpenseFilters,
  type IncomeFilterState,
  type ExpenseFilterState,
} from './filters';

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

const loadSelectedYear = (): number => {
  try {
    const v = Number(localStorage.getItem(SELECTED_TAX_YEAR_KEY));
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
  incomeFilters: IncomeFilterState;
  expenseFilters: ExpenseFilterState;
  setIncomeFilters: (patch: Partial<IncomeFilterState>) => void;
  setExpenseFilters: (patch: Partial<ExpenseFilterState>) => void;
  resetIncomeFilters: () => void;
  resetExpenseFilters: () => void;
  loadDemo: () => { income: number; expenses: number };
  removeDemo: () => { income: number; expenses: number };
  clearAll: () => void;
  mergeImport: (income: IncomeRecord[], expenses: ExpenseRecord[]) => { income: number; expenses: number };
  restoreImport: (
    income: IncomeRecord[],
    expenses: ExpenseRecord[],
    preferences: ExportPreferences
  ) => { income: number; expenses: number };
}

export const useTaxStore = create<TaxStore>((set, get) => ({
  income: storageService.getIncomeRecords(),
  expenses: storageService.getExpenseRecords(),
  selectedTaxYear: loadSelectedYear(),
  incomeFilters: defaultIncomeFilters,
  expenseFilters: defaultExpenseFilters,
  refresh: () =>
    set({
      income: storageService.getIncomeRecords(),
      expenses: storageService.getExpenseRecords(),
    }),
  setSelectedTaxYear: (year) => {
    try {
      localStorage.setItem(SELECTED_TAX_YEAR_KEY, String(year));
    } catch {
      // ignore
    }
    // Reset ledger filters so a source/category from another year can't leave
    // the ledger unexpectedly empty.
    set({ selectedTaxYear: year, incomeFilters: defaultIncomeFilters, expenseFilters: defaultExpenseFilters });
  },
  setIncomeFilters: (patch) => set((s) => ({ incomeFilters: { ...s.incomeFilters, ...patch } })),
  setExpenseFilters: (patch) => set((s) => ({ expenseFilters: { ...s.expenseFilters, ...patch } })),
  resetIncomeFilters: () => set({ incomeFilters: defaultIncomeFilters }),
  resetExpenseFilters: () => set({ expenseFilters: defaultExpenseFilters }),
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
  loadDemo: () => {
    // Demo records are dated in the SELECTED tax year so they appear in view.
    const result = storageService.loadDemoData(get().selectedTaxYear);
    get().refresh();
    return result;
  },
  removeDemo: () => {
    const result = storageService.removeDemoData();
    get().refresh();
    return result;
  },
  clearAll: () => {
    storageService.clearAllData();
    // A full reset also clears the persisted selected year -> back to default.
    set({ selectedTaxYear: currentTaxYearStart() });
    get().refresh();
  },
  mergeImport: (income, expenses) => {
    const result = storageService.applyMerge(income, expenses);
    get().refresh();
    return result;
  },
  restoreImport: (income, expenses, preferences) => {
    const result = storageService.applyRestore(income, expenses);
    // Restore preferences too (e.g. the selected tax year).
    const pref = preferences?.selectedTaxYear;
    if (typeof pref === 'number' && Number.isFinite(pref)) {
      get().setSelectedTaxYear(pref);
    }
    get().refresh();
    return result;
  },
}));
