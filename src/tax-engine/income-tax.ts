import { TaxRules, TaxBandResult } from './types';
import { floorPence } from './money';

export interface IncomeTaxResult {
  personalAllowanceUsed: number; // in pence
  taxableIncome: number; // in pence
  incomeTaxByBand: TaxBandResult[];
  totalIncomeTax: number; // in pence
}

export function calculateIncomeTax(
  taxableTradingProfit: number, // Total adjusted net income
  rules: TaxRules
): IncomeTaxResult {
  if (taxableTradingProfit <= 0) {
    return {
      personalAllowanceUsed: 0,
      taxableIncome: 0,
      incomeTaxByBand: rules.incomeTaxBands.map(b => ({
        name: b.name,
        rate: b.rate,
        taxableAmountInBand: 0,
        taxDue: 0
      })),
      totalIncomeTax: 0
    };
  }

  // 1. Calculate Personal Allowance (with taper)
  let adjustedPersonalAllowance = rules.personalAllowance;
  if (taxableTradingProfit > rules.personalAllowanceTaperThreshold) {
    const excess = taxableTradingProfit - rules.personalAllowanceTaperThreshold;
    // Taper is £1 for every £2 above threshold. So we divide the excess pence by 2.
    // HMRC normally floors this reduction (e.g. £100,001 excess is £1 => £0.50 reduction => actually they round down the reduction or round up?
    // Usually it's strictly divided by 2. Let's use floorPence for safety or strict division.
    const reduction = floorPence(excess / 2);
    adjustedPersonalAllowance = Math.max(0, rules.personalAllowance - reduction);
  }

  const personalAllowanceUsed = Math.min(taxableTradingProfit, adjustedPersonalAllowance);
  // Taxable income is rounded down to the nearest whole pound.
  const rawTaxableIncome = taxableTradingProfit - personalAllowanceUsed;
  const taxableIncome = Math.floor(rawTaxableIncome / 100) * 100;

  // 2. Calculate Tax by Band
  const remainingTaxableIncome = taxableIncome;
  let totalIncomeTax = 0;
  const incomeTaxByBand: TaxBandResult[] = [];

  // Assuming bands are ordered by min threshold ascending
  for (const band of rules.incomeTaxBands) {
    if (remainingTaxableIncome <= 0 || taxableIncome <= band.min) {
      incomeTaxByBand.push({
        name: band.name,
        rate: band.rate,
        taxableAmountInBand: 0,
        taxDue: 0
      });
      continue;
    }

    const maxInBand = band.max !== null ? (band.max - band.min) : Infinity;
    const incomeInThisBand = Math.min(Math.max(0, taxableIncome - band.min), maxInBand);
    
    // Calculate tax due for this band: round down to the nearest penny
    // Convert float rate (e.g., 0.20) to integer percentage (e.g., 20)
    const ratePercent = Math.round(band.rate * 100);
    const taxDue = Math.floor((incomeInThisBand * ratePercent) / 100);
    totalIncomeTax += taxDue;

    incomeTaxByBand.push({
      name: band.name,
      rate: band.rate,
      taxableAmountInBand: incomeInThisBand,
      taxDue: taxDue
    });
  }

  return {
    personalAllowanceUsed,
    taxableIncome,
    incomeTaxByBand,
    totalIncomeTax
  };
}
