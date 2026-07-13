import { EstimateInput, TaxRules } from './types';
import { TradingProfitResult } from './trading-profit';

export function generateExplanations(
  input: EstimateInput,
  profitResult: TradingProfitResult,
  rules: TaxRules
): string[] {
  const warnings: string[] = [];

  // Core assumption warning required by specifications
  warnings.push("Estimated Income Tax and Class 4 National Insurance based on the information entered.");

  if (profitResult.deductionMethodUsed === "trading-allowance") {
    warnings.push(`You are better off using the £${(rules.tradingAllowance / 100).toFixed(0)} Trading Allowance rather than your actual allowable expenses.`);
  }

  if (profitResult.expensesNeedingReviewCount > 0) {
    warnings.push(`You have ${profitResult.expensesNeedingReviewCount} expense(s) marked as 'needs review'. These have not been deducted from your profit.`);
  }

  if (profitResult.taxableTradingProfit > rules.personalAllowanceTaperThreshold) {
    warnings.push(`Your profit is above £100,000, so your Personal Allowance has been reduced.`);
  }

  if (input.giftAidOrPensionContributions) {
    warnings.push(
      "This estimate does not account for Gift Aid donations or pension contributions, which can extend your basic rate band. Your actual liability may be lower than shown."
    );
  }

  return warnings;
}
