import { TaxRules } from '../types';

export const rules2025_26: TaxRules = {
  taxYear: "2025-26",
  sourceUrl: "https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions",
  sourceTitle: "Rates and allowances: National Insurance contributions",
  sourceCheckedAt: "2025-04-06T00:00:00.000Z",
  ruleVersion: "assumed",
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
  }
};
