// Shared domain types for TaxMate UK.

export type IncomeStatus = 'received' | 'pending' | 'overdue';

// HMRC-style self-employment expense categories (approved enum). The constant
// array is the single source of truth; the union type is derived from it so
// the two can never drift apart.
export const EXPENSE_CATEGORIES = [
  'Office costs',
  'Travel',
  'Car and van expenses',
  'Rent, rates, power and insurance',
  'Phone, internet and postage',
  'Financial costs',
  'Staff costs',
  'Goods for resale',
  'Advertising and marketing',
  'Professional fees',
  'Other business expenses',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// Runtime guard (TypeScript types disappear at runtime).
export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === 'string' && (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

// Mapping from the pre-Phase-6 generic categories to the HMRC enum, used by the
// versioned storage migration and legacy (v1) backup imports. The original
// value is preserved on the record as legacyCategory so nothing is silently
// misclassified.
export const LEGACY_EXPENSE_CATEGORY_MAP: Record<string, ExpenseCategory> = {
  Supplies: 'Office costs',
  Equipment: 'Office costs',
  Software: 'Phone, internet and postage',
  Travel: 'Travel',
  Utilities: 'Rent, rates, power and insurance',
  Other: 'Other business expenses',
};

export interface IncomeRecord {
  id: string;
  date: string; // YYYY-MM-DD (local)
  source: string;
  description?: string;
  category: string;
  amount: string; // kept as a string as entered; summed in integer pence
  status: IncomeStatus | string;
  notes?: string;
  isDemo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseRecord {
  id: string;
  date: string; // YYYY-MM-DD (local)
  merchant: string;
  description?: string;
  category: ExpenseCategory;
  // Original pre-migration category (set by the versioned migration / legacy
  // import so no record is silently misclassified).
  legacyCategory?: string;
  amount: string;
  paymentMethod?: string;
  notes?: string;
  isDemo?: boolean;
  // Future-ready fields (in the data model but hidden from the UI this
  // milestone). No calculation treats recorded expenses as tax-deductible.
  allowableType?: 'allowable' | 'non-allowable';
  paymentStatus?: 'paid' | 'unpaid';
  businessUsePercentage?: number;
  expenseType?: 'capital' | 'revenue';
  isReimbursed?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type TransactionRecord = IncomeRecord | ExpenseRecord;

// Minimal shapes the pure calculators read from (so tests and callers can pass
// partial records without needing every display field).
export interface IncomeCalcRecord {
  id?: string;
  date: string;
  amount?: string | number;
  status?: string;
  source?: string;
}

export interface ExpenseCalcRecord {
  id?: string;
  date: string;
  amount?: string | number;
  category?: string;
}

export type IncomeSortOption = 
  | 'date-desc' | 'date-asc' 
  | 'amount-desc' | 'amount-asc' 
  | 'source-asc' | 'source-desc' 
  | 'status-overdue';

export type ExpenseSortOption = 
  | 'date-desc' | 'date-asc' 
  | 'amount-desc' | 'amount-asc' 
  | 'merchant-asc' | 'merchant-desc' 
  | 'category-asc';

export interface AppPreferences {
  selectedTaxYear?: number;
  incomeSort?: IncomeSortOption;
  expenseSort?: ExpenseSortOption;
  onboardingVersion?: number;
  onboardingCompleted?: boolean;
  onboardingSkipped?: boolean;
  completedAt?: string;
  lastExportDate?: string;
  backupReminderSnoozedUntil?: string;
  [key: string]: unknown;
}

export type ExportPreferences = AppPreferences;

// Approved backup schema.
export interface ExportBundle {
  schemaVersion: number;
  exportDate: string;
  appPreferences: ExportPreferences;
  incomeRecords: IncomeRecord[];
  expenseRecords: ExpenseRecord[];
}
