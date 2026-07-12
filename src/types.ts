// Shared domain types for TaxMate UK.

export type IncomeStatus = 'received' | 'pending' | 'overdue';

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
  category: string;
  amount: string;
  paymentMethod?: string;
  notes?: string;
  isDemo?: boolean;
  // Future-ready fields (populated from Phase 6 onwards; optional for now).
  allowableType?: string;
  paymentStatus?: string;
  businessUsePercentage?: number;
  expenseType?: string;
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

export interface ExportPreferences {
  selectedTaxYear?: number;
}

export interface ExportBundle {
  schemaVersion: number;
  exportedAt: string;
  preferences?: ExportPreferences;
  income: IncomeRecord[];
  expenses: ExpenseRecord[];
}
