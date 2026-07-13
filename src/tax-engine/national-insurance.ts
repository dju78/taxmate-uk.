import { TaxRules } from './types';

export function calculateClass4NICs(
  taxableTradingProfit: number,
  rules: TaxRules
): number {
  if (taxableTradingProfit <= rules.class4NICs.lowerProfitsLimit) {
    return 0;
  }

  let totalNICs = 0;
  
  // NICs are charged on profit between Lower Profits Limit and Upper Profits Limit
  const mainRateProfit = Math.min(
    taxableTradingProfit - rules.class4NICs.lowerProfitsLimit,
    rules.class4NICs.upperProfitsLimit - rules.class4NICs.lowerProfitsLimit
  );

  if (mainRateProfit > 0) {
    const mainRatePercent = Math.round(rules.class4NICs.mainRate * 100);
    totalNICs += Math.floor((mainRateProfit * mainRatePercent) / 100);
  }

  // NICs are charged on profit above Upper Profits Limit
  if (taxableTradingProfit > rules.class4NICs.upperProfitsLimit) {
    const upperRateProfit = taxableTradingProfit - rules.class4NICs.upperProfitsLimit;
    const upperRatePercent = Math.round(rules.class4NICs.upperRate * 100);
    totalNICs += Math.floor((upperRateProfit * upperRatePercent) / 100);
  }

  return totalNICs;
}
