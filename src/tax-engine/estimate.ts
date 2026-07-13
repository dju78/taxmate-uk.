import { EstimateInput, EstimateResult } from './types';
import { getRulesForTaxYear } from './rules/registry';
import { validateProfile } from './validation';
import { calculateTradingProfit } from './trading-profit';
import { calculateIncomeTax } from './income-tax';
import { calculateClass4NICs } from './national-insurance';
import { generateExplanations } from './explanations';

export function calculateEstimate(input: EstimateInput): EstimateResult {
  // 1. Validation
  validateProfile(input.profile);
  
  // 2. Fetch Rules
  const rules = getRulesForTaxYear(input.taxYear);

  // 3. Trading Profit
  const profitResult = calculateTradingProfit(
    input,
    rules
  );

  // 4. Income Tax
  const incomeTaxResult = calculateIncomeTax(
    profitResult.taxableTradingProfit,
    rules
  );

  // 5. National Insurance
  const class4NICs = calculateClass4NICs(
    profitResult.taxableTradingProfit,
    rules
  );

  // 6. Totals & Effective Rate
  const estimatedTotal = incomeTaxResult.totalIncomeTax + class4NICs;
  const effectiveRate = input.receivedTradingIncome > 0 
    ? (estimatedTotal / input.receivedTradingIncome) * 100 
    : 0;

  // 7. Explanations & Warnings
  const warnings = generateExplanations(input, profitResult, rules);

  return {
    taxYear: rules.taxYear,
    receivedTradingIncome: input.receivedTradingIncome,
    allowableExpenses: profitResult.allowableExpenses,
    expensesNeedingReview: profitResult.expensesNeedingReviewCount,
    expensesNeedingReviewTotal: profitResult.expensesNeedingReviewTotal,
    expensesExcludedUnpaid: profitResult.expensesExcludedUnpaidCount,
    expensesExcludedUnpaidTotal: profitResult.expensesExcludedUnpaidTotal,
    deductionMethodUsed: profitResult.deductionMethodUsed,
    deductionAmount: profitResult.deductionAmount,
    taxableTradingProfit: profitResult.taxableTradingProfit,
    
    personalAllowanceUsed: incomeTaxResult.personalAllowanceUsed,
    taxableIncome: incomeTaxResult.taxableIncome,
    
    incomeTaxByBand: incomeTaxResult.incomeTaxByBand,
    totalIncomeTax: incomeTaxResult.totalIncomeTax,
    
    class4NICs,
    
    estimatedTotal,
    effectiveRate,
    
    calculationDate: new Date().toISOString(),
    ruleVersion: rules.ruleVersion,
    warnings
  };
}
