import { useState } from 'react';
import { TOKENS } from './tokens';
import { Alert } from './components';
import { useBreakpoint } from './hooks';
import { useTaxStore, taxYearStartToLabel, getAvailableTaxYears } from './store';
import { calculatePaye } from './tax-engine/paye';
import type { PayeInput, PayeResult, TaxRegion } from './tax-engine/types';
import { toPence, formatPounds } from './tax-engine/money';

type Period = 'yearly' | 'monthly' | 'weekly';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'yearly', label: 'Yearly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
];

const PERIOD_DIVISORS: Record<Period, number> = { yearly: 1, monthly: 12, weekly: 52 };

const OTHER_TAX_CODE = 'other';

const COMMON_TAX_CODES: { value: string; label: string }[] = [
  { value: '', label: 'Standard (uses default Personal Allowance)' },
  { value: '1257L', label: '1257L — standard allowance' },
  { value: 'BR', label: 'BR — basic rate on all income' },
  { value: 'D0', label: 'D0 — higher rate on all income' },
  { value: 'D1', label: 'D1 — additional rate on all income' },
  { value: '0T', label: '0T — no personal allowance' },
  { value: 'NT', label: 'NT — no tax' },
];

export function CalculatorsView() {
  const selectedTaxYear = useTaxStore((s) => s.selectedTaxYear);
  const { isMobile } = useBreakpoint();
  const pageHeadingSize = isMobile ? "26px" : "36px";

  const [taxYearStart, setTaxYearStart] = useState<number>(selectedTaxYear);
  const [taxRegion, setTaxRegion] = useState<TaxRegion>('england');
  const [grossSalary, setGrossSalary] = useState<string>('');
  const [taxCodeSelection, setTaxCodeSelection] = useState<string>('');
  const [customTaxCode, setCustomTaxCode] = useState<string>('');
  const [pensionPercent, setPensionPercent] = useState<number>(0);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [period, setPeriod] = useState<Period>('yearly');

  const updateAndInvalidate = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value);
    setIsConfirmed(false);
  };

  const handleClear = () => {
    setGrossSalary('');
    setTaxCodeSelection('');
    setCustomTaxCode('');
    setPensionPercent(0);
    setPeriod('yearly');
    setIsConfirmed(false);
  };

  const scale = (pence: number) => pence / PERIOD_DIVISORS[period];

  const resolvedTaxCode = (taxCodeSelection === OTHER_TAX_CODE ? customTaxCode : taxCodeSelection).trim();

  let payeResult: PayeResult | null = null;
  let payeError: string | null = null;
  if (isConfirmed) {
    try {
      const input: PayeInput = {
        taxYear: taxYearStartToLabel(taxYearStart).replace('/', '-'),
        taxRegion,
        grossSalary: toPence(parseFloat(grossSalary) || 0),
        taxCode: resolvedTaxCode ? resolvedTaxCode : undefined,
        pensionContributionPercent: pensionPercent,
      };
      payeResult = calculatePaye(input);
    } catch (err) {
      payeError = err instanceof Error ? err.message : 'Calculation failed.';
    }
  }

  return (
    <div className="calculators-view">
      <div className="mb-8">
        <h1 style={{ fontSize: pageHeadingSize, fontWeight: "800", color: TOKENS.colors.neutral[900], fontFamily: "Manrope, sans-serif" }}>
          Calculators
        </h1>
        <p style={{ color: TOKENS.colors.neutral[600], marginTop: "8px" }}>
          Standalone tools — not tied to your recorded income or expenses.
        </p>
      </div>

      <h2 className="text-xl font-bold mb-4">Net income (take-home pay) calculator</h2>

      <div className="mb-6 max-w-2xl">
        <Alert
          variant="warning"
          title="Prototype estimate only"
          description="This calculation uses the information and assumptions you provide and may not include all income, reliefs, adjustments or individual circumstances. It is not tax advice, is not HMRC-approved and must not be used by itself to complete or file a tax return. Check current GOV.UK guidance or consult a qualified tax professional."
        />
      </div>

      {!isConfirmed || payeError ? (
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm max-w-2xl">
          <h3 className="font-bold text-lg mb-4 text-neutral-900">Your details</h3>
          <p className="text-sm text-neutral-600 mb-6">
            For UK employees (PAYE). Enter your gross annual salary to estimate your take-home pay.
          </p>

          {payeError && (
            <div className="mb-6">
              <Alert variant="error" title="Estimate unavailable" description={payeError} />
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="paye-tax-year" className="block text-sm font-medium text-neutral-700 mb-1">Tax Year</label>
              <select
                id="paye-tax-year"
                value={taxYearStart}
                onChange={(e) => updateAndInvalidate(setTaxYearStart)(Number(e.target.value))}
                className="w-full p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              >
                {getAvailableTaxYears().map((year) => (
                  <option key={year} value={year}>{taxYearStartToLabel(year)}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="paye-tax-region" className="block text-sm font-medium text-neutral-700 mb-1">Tax Region</label>
              <select
                id="paye-tax-region"
                value={taxRegion}
                onChange={(e) => updateAndInvalidate(setTaxRegion)(e.target.value as TaxRegion)}
                className="w-full p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              >
                <option value="england">England</option>
                <option value="wales">Wales</option>
                <option value="ni">Northern Ireland</option>
                <option value="scotland">Scotland</option>
              </select>
            </div>

            <div>
              <label htmlFor="paye-gross-salary" className="block text-sm font-medium text-neutral-700 mb-1">Gross Annual Salary (£)</label>
              <input
                id="paye-gross-salary"
                type="number"
                min="0"
                step="0.01"
                value={grossSalary}
                onChange={(e) => updateAndInvalidate(setGrossSalary)(e.target.value)}
                placeholder="e.g. 35000"
                className="w-full p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label htmlFor="paye-tax-code" className="block text-sm font-medium text-neutral-700 mb-1">Tax Code</label>
              <select
                id="paye-tax-code"
                value={taxCodeSelection}
                onChange={(e) => updateAndInvalidate(setTaxCodeSelection)(e.target.value)}
                className="w-full p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              >
                {COMMON_TAX_CODES.map((c) => (
                  <option key={c.value || 'standard'} value={c.value}>{c.label}</option>
                ))}
                <option value={OTHER_TAX_CODE}>Other (enter manually)</option>
              </select>
              <p className="text-xs text-neutral-500 mt-1">Uses the standard Personal Allowance rules unless a different tax code is selected.</p>

              {taxCodeSelection === OTHER_TAX_CODE && (
                <div className="mt-2">
                  <label htmlFor="paye-tax-code-custom" className="block text-sm font-medium text-neutral-700 mb-1">Enter tax code</label>
                  <input
                    id="paye-tax-code-custom"
                    type="text"
                    value={customTaxCode}
                    onChange={(e) => updateAndInvalidate(setCustomTaxCode)(e.target.value)}
                    placeholder="e.g. K475"
                    className="w-full p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="paye-pension-percent" className="block text-sm font-medium text-neutral-700 mb-1">
                Pension Contribution: {pensionPercent > 0 ? `${pensionPercent}% of gross salary` : 'None'}
              </label>
              <input
                id="paye-pension-percent"
                type="range"
                min="0"
                max="10"
                step="1"
                value={pensionPercent}
                onChange={(e) => updateAndInvalidate(setPensionPercent)(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-neutral-500 mt-1">Set between 1% and 10% to assume a salary sacrifice pension contribution, reducing pay subject to Income Tax and National Insurance.</p>
            </div>

            <button
              type="button"
              onClick={() => setIsConfirmed(true)}
              className="mt-6 px-4 py-2 bg-neutral-900 text-white rounded font-medium hover:bg-black transition-colors"
            >
              Calculate
            </button>
          </div>
        </div>
      ) : payeResult ? (
        <div className="space-y-6 max-w-2xl">
          {payeResult.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 space-y-2">
              {payeResult.warnings.map((w, i) => <p key={i}>• {w}</p>)}
            </div>
          )}

          <div role="group" aria-label="View results as" className="flex flex-wrap gap-1">
            {PERIOD_OPTIONS.map((p) => {
              const active = period === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPeriod(p.value)}
                  className={
                    'rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-1 ' +
                    (active ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200')
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
            <h3 className="font-bold text-neutral-800 mb-4">
              Breakdown{payeResult.taxCode ? ` (Tax Code: ${payeResult.taxCode})` : ''}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Gross Salary</span>
                <span>£{formatPounds(scale(payeResult.grossSalary))}</span>
              </div>
              {payeResult.pensionContribution > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>Pension Contribution ({payeResult.pensionContributionPercent}%)</span>
                  <span className="text-green-600">− £{formatPounds(scale(payeResult.pensionContribution))}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <span>Personal Allowance</span>
                <span className="text-green-600">− £{formatPounds(scale(payeResult.personalAllowanceUsed))}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Taxable Income</span>
                <span>£{formatPounds(scale(payeResult.taxableIncome))}</span>
              </div>
              <div className="pt-2 border-t border-neutral-100 space-y-1">
                {payeResult.incomeTaxByBand.filter((b) => b.taxDue > 0).map((b) => (
                  <div key={b.name} className="flex justify-between text-neutral-600">
                    <span>{b.name} ({(b.rate * 100).toFixed(0)}%)</span>
                    <span>£{formatPounds(scale(b.taxDue))}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-neutral-900 pt-2 border-t border-neutral-100">
                <span>Income Tax Due</span>
                <span>£{formatPounds(scale(payeResult.totalIncomeTax))}</span>
              </div>
              <div className="flex justify-between font-bold text-neutral-900">
                <span>Class 1 National Insurance</span>
                <span>£{formatPounds(scale(payeResult.class1NICs))}</span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-6 rounded-xl border border-green-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-green-900">Estimated Net Income (Take-Home Pay)</h3>
              <p className="text-sm text-green-800 mt-1">Based on rules for {payeResult.taxYear} · Shown {period}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-green-900 font-['Manrope']">£{formatPounds(scale(payeResult.netIncome))}</div>
              <div className="text-sm text-green-800 font-medium mt-1">
                Effective rate: {payeResult.effectiveRate.toFixed(1)}%
                {period !== 'yearly' && ` · £${formatPounds(payeResult.netIncome)}/year`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 bg-white border border-neutral-300 rounded font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Clear and calculate again
          </button>
        </div>
      ) : null}
    </div>
  );
}
