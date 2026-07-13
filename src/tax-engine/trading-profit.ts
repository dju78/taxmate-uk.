import { TaxRules, EstimateInput, DeductionMethod } from './types';

export interface TradingProfitResult {
  allowableExpenses: number; // in pence
  expensesNeedingReviewCount: number;
  expensesNeedingReviewTotal: number; // in pence
  expensesExcludedUnpaidCount: number;
  expensesExcludedUnpaidTotal: number; // in pence
  deductionMethodUsed: DeductionMethod;
  deductionAmount: number; // in pence
  taxableTradingProfit: number; // in pence
}

export function calculateTradingProfit(
  input: EstimateInput,
  rules: TaxRules
): TradingProfitResult {
  let allowableExpenses = 0;
  let expensesNeedingReviewCount = 0;
  let expensesNeedingReviewTotal = 0;
  let expensesExcludedUnpaidCount = 0;
  let expensesExcludedUnpaidTotal = 0;

  for (const expense of input.expenses) {
    if (input.profile.accountingBasis === 'cash') {
      if (expense.paymentStatus === 'unpaid') {
        expensesExcludedUnpaidCount++;
        expensesExcludedUnpaidTotal += expense.amount;
        continue; // exclude entirely
      } else if (!expense.paymentStatus) {
        // missing payment status means it needs review
        expensesNeedingReviewCount++;
        expensesNeedingReviewTotal += expense.amount;
        continue;
      }
    }

    if (expense.treatment === "allowable") {
      allowableExpenses += expense.amount;
    } else if (expense.treatment === "needs-review") {
      expensesNeedingReviewCount++;
      expensesNeedingReviewTotal += expense.amount;
    }
  }

  // The trading allowance can only be used up to the amount of income if income is less than the allowance.
  // Wait, no. The trading allowance is up to £1000. If your income is less than £1000, your profit is £0.
  // Actually, standard rule: deduction is the greater of actual allowable expenses or the trading allowance.
  // If trading allowance is used, the deduction cannot exceed the total income (profit cannot be negative from trading allowance).
  // Wait, HMRC rules: "If your income is £1,000 or less, you do not have to tell HMRC or pay tax."
  // "If your income is more than £1,000, you can deduct the £1,000 allowance instead of your actual expenses."
  // Even if income is < £1,000, you can use the allowance to reduce profit to 0. It cannot create a loss.
  // So deduction from allowance = min(receivedTradingIncome, tradingAllowance).
  // Wait, actual expenses CAN create a loss.
  // So if allowableExpenses > receivedTradingIncome, profit is negative (loss).
  
  let deductionAmount: number;
  const deductionMethodUsed = input.deductionMethod;

  if (input.deductionMethod === 'trading-allowance') {
    if (!input.tradingAllowanceEligible) {
      throw new Error("Trading allowance selected but user is ineligible.");
    }
    // Cannot create a loss with trading allowance
    deductionAmount = Math.min(input.receivedTradingIncome, rules.tradingAllowance);
  } else {
    deductionAmount = allowableExpenses;
  }

  const taxableTradingProfit = input.receivedTradingIncome - deductionAmount;

  return {
    allowableExpenses,
    expensesNeedingReviewCount,
    expensesNeedingReviewTotal,
    expensesExcludedUnpaidCount,
    expensesExcludedUnpaidTotal,
    deductionMethodUsed,
    deductionAmount,
    taxableTradingProfit
  };
}
