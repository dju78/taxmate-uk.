import { TaxRules } from '../types';

export const rules2024_25: TaxRules = {
  taxYear: "2024-25",
  sourceUrl: "https://www.gov.uk/government/publications/rates-and-allowances-income-tax",
  sourceTitle: "Rates and allowances: Income Tax",
  sourceCheckedAt: "2024-04-06T00:00:00.000Z",
  ruleVersion: "confirmed",
  personalAllowance: 1257000,
  personalAllowanceTaperThreshold: 10000000,
  tradingAllowance: 100000,
  incomeTaxBands: [
    {
      name: "Basic rate",
      rate: 0.20,
      min: 0,
      max: 3770000,
    },
    {
      name: "Higher rate",
      rate: 0.40,
      min: 3770000,
      max: 12514000,
    },
    {
      name: "Additional rate",
      rate: 0.45,
      min: 12514000,
      max: null,
    }
  ],
  class4NICs: {
    lowerProfitsLimit: 1257000,
    upperProfitsLimit: 5027000,
    mainRate: 0.06,
    upperRate: 0.02,
  },
  class1NICs: {
    // Source: https://www.gov.uk/national-insurance-rates-letters
    // Employee Class 1 main rate cut from 10% to 8% effective 6 April 2024.
    primaryThreshold: 1257000,
    upperEarningsLimit: 5027000,
    mainRate: 0.08,
    upperRate: 0.02,
  }
};
