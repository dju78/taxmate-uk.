import { TaxRules } from './types';

export function calculateClass1NIC(
  grossSalary: number,
  rules: TaxRules
): number {
  if (grossSalary <= rules.class1NICs.primaryThreshold) {
    return 0;
  }

  let totalNICs = 0;

  // NICs are charged on earnings between the Primary Threshold and the Upper Earnings Limit.
  const mainRateEarnings = Math.min(
    grossSalary - rules.class1NICs.primaryThreshold,
    rules.class1NICs.upperEarningsLimit - rules.class1NICs.primaryThreshold
  );

  if (mainRateEarnings > 0) {
    const mainRatePercent = Math.round(rules.class1NICs.mainRate * 100);
    totalNICs += Math.floor((mainRateEarnings * mainRatePercent) / 100);
  }

  // NICs are charged on earnings above the Upper Earnings Limit.
  if (grossSalary > rules.class1NICs.upperEarningsLimit) {
    const upperRateEarnings = grossSalary - rules.class1NICs.upperEarningsLimit;
    const upperRatePercent = Math.round(rules.class1NICs.upperRate * 100);
    totalNICs += Math.floor((upperRateEarnings * upperRatePercent) / 100);
  }

  return totalNICs;
}
