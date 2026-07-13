export type TaxTreatment = "allowable" | "not-allowable" | "needs-review";

export type TaxRegion = "england" | "wales" | "ni" | "scotland";

export interface IncomeTaxBand {
  name: string;
  rate: number; // e.g. 0.20 for 20%
  min: number;  // in pence
  max: number | null; // in pence, null means unlimited
}

export interface Class4NICBand {
  rate: number; // e.g. 0.06 for 6%
  min: number;  // in pence
  max: number | null; // in pence
}

export interface TaxRules {
  taxYear: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceCheckedAt: string;
  ruleVersion: string;
  personalAllowance: number; // in pence
  personalAllowanceTaperThreshold: number; // in pence
  incomeTaxBands: IncomeTaxBand[];
  class4NICs: {
    lowerProfitsLimit: number; // in pence
    upperProfitsLimit: number; // in pence
    mainRate: number;
    upperRate: number;
  };
  class1NICs: {
    primaryThreshold: number;   // in pence
    upperEarningsLimit: number; // in pence
    mainRate: number;
    upperRate: number;
  };
  tradingAllowance: number; // in pence
}

export interface UserProfile {
  taxRegion: TaxRegion;
  hasEmploymentIncome: boolean;
  hasPensionIncome: boolean;
  hasPropertyIncome: boolean;
  hasDividends: boolean;
  hasSavingsInterest: boolean;
  hasCapitalGains: boolean;
  hasOtherTaxableIncome: boolean;
  accountingBasis: "cash" | "traditional";
  singleBusiness: boolean;
}

export type DeductionMethod = "actual-expenses" | "trading-allowance";

export interface EstimateInput {
  taxYear: string;
  profile: UserProfile;
  receivedTradingIncome: number; // in pence
  deductionMethod: DeductionMethod;
  tradingAllowanceEligible: boolean;
  giftAidOrPensionContributions: boolean;
  expenses: {
    amount: number; // in pence
    treatment: TaxTreatment;
    paymentStatus?: "paid" | "unpaid";
  }[];
}

export interface TaxBandResult {
  name: string;
  rate: number;
  taxableAmountInBand: number; // in pence
  taxDue: number; // in pence
}

export interface EstimateResult {
  taxYear: string;
  receivedTradingIncome: number; // in pence
  allowableExpenses: number; // in pence
  expensesNeedingReview: number; // count
  expensesNeedingReviewTotal: number; // in pence
  expensesExcludedUnpaid: number; // count
  expensesExcludedUnpaidTotal: number; // in pence
  deductionMethodUsed: DeductionMethod;
  deductionAmount: number; // in pence
  taxableTradingProfit: number; // in pence

  personalAllowanceUsed: number; // in pence
  taxableIncome: number; // in pence
  
  incomeTaxByBand: TaxBandResult[];
  totalIncomeTax: number; // in pence

  class4NICs: number; // in pence
  
  estimatedTotal: number; // in pence
  effectiveRate: number; // percentage (0-100)
  
  calculationDate: string;
  ruleVersion: string;
  warnings: string[];
}

export interface PayeInput {
  taxYear: string;
  taxRegion: TaxRegion;
  grossSalary: number; // in pence, annual
}

export interface PayeResult {
  taxYear: string;
  grossSalary: number; // in pence

  personalAllowanceUsed: number; // in pence
  taxableIncome: number; // in pence

  incomeTaxByBand: TaxBandResult[];
  totalIncomeTax: number; // in pence

  class1NICs: number; // in pence

  netIncome: number; // in pence, annual
  monthlyNetIncome: number; // in pence

  effectiveRate: number; // percentage (0-100)

  calculationDate: string;
  ruleVersion: string;
  warnings: string[];
}
