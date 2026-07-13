import { describe, it, expect } from 'vitest';
import { calculateEstimate } from '../estimate';
import { EstimateInput } from '../types';
import { toPence } from '../money';
import { validateProfile } from '../validation';
import { getRulesForTaxYear } from '../rules/registry';

describe('Tax Engine Matrix Scenarios', () => {
  const defaultProfile = {
    taxRegion: "england" as const,
    hasEmploymentIncome: false,
    hasPensionIncome: false,
    hasPropertyIncome: false,
    hasDividends: false,
    hasSavingsInterest: false,
    hasCapitalGains: false,
    hasOtherTaxableIncome: false,
    accountingBasis: "cash" as const,
    singleBusiness: true,
  };

  const createInput = (
    incomePounds: number,
    expensesPounds: number = 0,
    treatment: "allowable" | "needs-review" | "not-allowable" = "allowable",
    deductionMethod: "actual-expenses" | "trading-allowance" = "trading-allowance",
    paymentStatus: "paid" | "unpaid" = "paid"
  ): EstimateInput => ({
    taxYear: "2024-25",
    profile: { ...defaultProfile },
    receivedTradingIncome: toPence(incomePounds),
    deductionMethod,
    tradingAllowanceEligible: true,
    giftAidOrPensionContributions: false,
    expenses: expensesPounds > 0 ? [{ amount: toPence(expensesPounds), treatment, paymentStatus }] : []
  });

  it('1. Zero income', () => {
    const res = calculateEstimate(createInput(0, 0));
    expect(res.taxableTradingProfit).toBe(0);
    expect(res.totalIncomeTax).toBe(0);
    expect(res.class4NICs).toBe(0);
    expect(res.estimatedTotal).toBe(0);
  });

  it('2. Income below £1,000', () => {
    const res = calculateEstimate(createInput(800, 0, "allowable", "trading-allowance"));
    expect(res.deductionMethodUsed).toBe("trading-allowance");
    expect(res.deductionAmount).toBe(toPence(800));
    expect(res.taxableTradingProfit).toBe(0);
    expect(res.totalIncomeTax).toBe(0);
  });

  it('3. Trading allowance vs Actual', () => {
    const res1 = calculateEstimate(createInput(5000, 200, "allowable", "trading-allowance"));
    expect(res1.deductionMethodUsed).toBe("trading-allowance");
    expect(res1.deductionAmount).toBe(toPence(1000));
    expect(res1.taxableTradingProfit).toBe(toPence(4000));

    const res2 = calculateEstimate(createInput(5000, 1200, "allowable", "actual-expenses"));
    expect(res2.deductionMethodUsed).toBe("actual-expenses");
    expect(res2.deductionAmount).toBe(toPence(1200));
    expect(res2.taxableTradingProfit).toBe(toPence(3800));
  });

  it('4. Profit below Personal Allowance (£10,000)', () => {
    const res = calculateEstimate(createInput(11000, 1000));
    expect(res.taxableTradingProfit).toBe(toPence(10000));
    expect(res.personalAllowanceUsed).toBe(toPence(10000));
    expect(res.taxableIncome).toBe(0);
    expect(res.totalIncomeTax).toBe(0);
    expect(res.class4NICs).toBe(0);
  });

  it('5. Profit exactly at band boundaries', () => {
    // Basic rate max is £37,700 taxable income -> £50,270 profit. Add £1000 trading allowance to input income.
    const resBasicMax = calculateEstimate(createInput(51270, 0));
    expect(resBasicMax.taxableTradingProfit).toBe(toPence(50270));
    expect(resBasicMax.taxableIncome).toBe(toPence(37700));
    expect(resBasicMax.totalIncomeTax).toBe(toPence(37700 * 0.20));
    expect(resBasicMax.incomeTaxByBand[1].taxDue).toBe(0);

    const class4Expected = toPence((50270 - 12570) * 0.06);
    expect(resBasicMax.class4NICs).toBe(class4Expected);

    // Higher rate max is £125,140 profit. Add £1000 trading allowance.
    const resHigherMax = calculateEstimate(createInput(126140, 0));
    expect(resHigherMax.personalAllowanceUsed).toBe(0);
    expect(resHigherMax.taxableIncome).toBe(toPence(125140));
    const basicTax = 37700 * 0.20;
    const higherTax = (125140 - 37700) * 0.40;
    expect(resHigherMax.totalIncomeTax).toBe(toPence(basicTax + higherTax));
    expect(resHigherMax.incomeTaxByBand[2].taxDue).toBe(0);
  });

  it('6. Profit above higher-rate threshold', () => {
    // Target profit £60,000. Income £61,000.
    const res = calculateEstimate(createInput(61000, 0));
    expect(res.taxableTradingProfit).toBe(toPence(60000));
    expect(res.taxableIncome).toBe(toPence(60000 - 12570));
    expect(res.incomeTaxByBand[1].taxableAmountInBand).toBe(toPence(47430 - 37700));
    expect(res.incomeTaxByBand[1].taxDue).toBe(toPence(9730 * 0.40));
  });

  it('7. Personal Allowance taper above £100,000', () => {
    // Target profit £110,000. Income £111,000.
    const res = calculateEstimate(createInput(111000, 0));
    expect(res.personalAllowanceUsed).toBe(toPence(7570));
    expect(res.taxableIncome).toBe(toPence(110000 - 7570));
  });

  it('8. Income where PA reaches zero', () => {
    // Target profit £125,140. Income £126,140.
    const res = calculateEstimate(createInput(126140, 0));
    expect(res.personalAllowanceUsed).toBe(0);
  });

  it('9. Negative profit (Loss)', () => {
    const res = calculateEstimate(createInput(5000, 8000, "allowable", "actual-expenses"));
    expect(res.taxableTradingProfit).toBe(toPence(-3000));
    expect(res.totalIncomeTax).toBe(0);
    expect(res.class4NICs).toBe(0);
  });

  it('10. Exclusions (non-allowable)', () => {
    // 5000 income, 2000 non-allowable expenses. 0 deduction -> 5000 profit.
    const input = createInput(5000, 2000, "not-allowable", "actual-expenses");
    const res = calculateEstimate(input);
    expect(res.taxableTradingProfit).toBe(toPence(5000));
  });

  it('11. Needs review', () => {
    const input = createInput(5000, 1500, "needs-review", "actual-expenses");
    const res = calculateEstimate(input);
    expect(res.taxableTradingProfit).toBe(toPence(5000));
    expect(res.expensesNeedingReview).toBe(1);
    expect(res.expensesNeedingReviewTotal).toBe(toPence(1500));
  });

  it('12. Tax-year boundaries (Registry)', () => {
    expect(() => getRulesForTaxYear("2024-25")).not.toThrow();
    expect(() => getRulesForTaxYear("2025-26")).not.toThrow();
    expect(() => getRulesForTaxYear("2026-27")).not.toThrow();
  });

  it('13. Penny-level rounding', () => {
    // Target profit 50270.01. Income 51270.01.
    const res = calculateEstimate(createInput(51270.01, 0));
    expect(res.class4NICs).toBe(226200);
  });

  it('14. Corrupted / Unsupported (registry lookup)', () => {
    const input = createInput(5000);
    input.taxYear = "2099-00";
    expect(() => calculateEstimate(input)).toThrow("Unsupported tax year");
  });

  it('15. Blocked States (Scotland / Other Income)', () => {
    const inputScot = createInput(5000);
    inputScot.profile.taxRegion = "scotland";
    expect(() => validateProfile(inputScot.profile)).toThrow("Scottish tax rules are not supported");

    const inputEmp = createInput(5000);
    inputEmp.profile.hasEmploymentIncome = true;
    expect(() => validateProfile(inputEmp.profile)).toThrow("The estimate engine does not currently support");
  });

  it('16. Gift Aid / pension warning appears only when the checkbox is set', () => {
    const withGiftAid = createInput(30000, 0);
    withGiftAid.giftAidOrPensionContributions = true;
    const resWith = calculateEstimate(withGiftAid);
    expect(resWith.warnings.some((w) => w.includes('Gift Aid'))).toBe(true);

    const withoutGiftAid = createInput(30000, 0);
    const resWithout = calculateEstimate(withoutGiftAid);
    expect(resWithout.warnings.some((w) => w.includes('Gift Aid'))).toBe(false);
  });

  describe('Golden Vectors from HMRC', () => {
    it('Vector 1: £30,000 profit (Basic Rate)', () => {
      // £31,000 income - £1,000 TA = £30,000 profit.
      const res = calculateEstimate(createInput(31000, 0));
      expect(res.taxableTradingProfit).toBe(toPence(30000));
      expect(res.class4NICs).toBe(toPence(1045.80));
      expect(res.totalIncomeTax).toBe(toPence(3486.00));
      expect(res.estimatedTotal).toBe(toPence(4531.80));
    });

    it('Vector 2: £60,000 profit (Higher Rate)', () => {
      // £61,000 income - £1,000 TA = £60,000 profit.
      const res = calculateEstimate(createInput(61000, 0));
      expect(res.taxableTradingProfit).toBe(toPence(60000));
      expect(res.class4NICs).toBe(toPence(2456.60));
      expect(res.totalIncomeTax).toBe(toPence(11432.00));
      expect(res.estimatedTotal).toBe(toPence(13888.60));
    });

    it('Vector 3: £110,000 profit (Tapered PA)', () => {
      // £111,000 income - £1,000 TA = £110,000 profit.
      const res = calculateEstimate(createInput(111000, 0));
      expect(res.taxableTradingProfit).toBe(toPence(110000));
      expect(res.personalAllowanceUsed).toBe(toPence(7570));
      expect(res.taxableIncome).toBe(toPence(102430));
      expect(res.class4NICs).toBe(toPence(3456.60));
      expect(res.totalIncomeTax).toBe(toPence(33432.00));
      expect(res.estimatedTotal).toBe(toPence(36888.60));
    });
  });
});
