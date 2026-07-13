import { PayeInput, PayeResult } from './types';
import { getRulesForTaxYear } from './rules/registry';
import { validatePayeProfile } from './paye-validation';
import { calculateIncomeTax } from './income-tax';
import { calculateClass1NIC } from './class1-nic';

export function calculatePaye(input: PayeInput): PayeResult {
  // 1. Validation
  validatePayeProfile({ taxRegion: input.taxRegion });

  // 2. Fetch Rules
  const rules = getRulesForTaxYear(input.taxYear);

  // 3. Income Tax — the band/taper logic is income-source-agnostic, so the
  // same calculator used for sole-trader trading profit applies directly to
  // gross salary.
  const incomeTaxResult = calculateIncomeTax(input.grossSalary, rules);

  // 4. Employee Class 1 National Insurance
  const class1NICs = calculateClass1NIC(input.grossSalary, rules);

  // 5. Totals
  const totalDeductions = incomeTaxResult.totalIncomeTax + class1NICs;
  const netIncome = Math.max(0, input.grossSalary - totalDeductions);
  const monthlyNetIncome = Math.round(netIncome / 12);
  const effectiveRate = input.grossSalary > 0 ? (totalDeductions / input.grossSalary) * 100 : 0;

  // 6. Warnings
  const warnings: string[] = [
    "This estimate does not account for pension contributions, student loan repayments, or benefits-in-kind. Your actual take-home pay may differ.",
  ];
  if (input.grossSalary > rules.personalAllowanceTaperThreshold) {
    warnings.push("Your salary is above £100,000, so your Personal Allowance has been reduced.");
  }

  return {
    taxYear: rules.taxYear,
    grossSalary: input.grossSalary,

    personalAllowanceUsed: incomeTaxResult.personalAllowanceUsed,
    taxableIncome: incomeTaxResult.taxableIncome,

    incomeTaxByBand: incomeTaxResult.incomeTaxByBand,
    totalIncomeTax: incomeTaxResult.totalIncomeTax,

    class1NICs,

    netIncome,
    monthlyNetIncome,

    effectiveRate,

    calculationDate: new Date().toISOString(),
    ruleVersion: rules.ruleVersion,
    warnings,
  };
}
