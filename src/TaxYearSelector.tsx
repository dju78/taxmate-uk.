import { useTaxStore, getAvailableTaxYears, taxYearStartToLabel } from './store';

interface TaxYearSelectorProps {
  // Render a compact variant for the dark sidebar / top bar.
  variant?: 'light' | 'dark';
}

// Global UK tax-year selector. A tax year runs 6 April of the start year to
// 5 April of the following year. Backed by Zustand (persisted).
export function TaxYearSelector({ variant = 'light' }: TaxYearSelectorProps) {
  const selectedTaxYear = useTaxStore((s) => s.selectedTaxYear);
  const setSelectedTaxYear = useTaxStore((s) => s.setSelectedTaxYear);
  const years = getAvailableTaxYears();

  const dark = variant === 'dark';

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="tax-year-select"
        className={
          dark
            ? 'text-xs font-semibold text-neutral-300 whitespace-nowrap'
            : 'text-xs font-semibold text-neutral-500 whitespace-nowrap'
        }
      >
        Tax year
      </label>
      <select
        id="tax-year-select"
        value={selectedTaxYear}
        onChange={(e) => setSelectedTaxYear(Number(e.target.value))}
        className={
          'rounded-lg border px-3 py-1.5 text-sm font-semibold outline-none ' +
          'focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 ' +
          (dark
            ? 'border-neutral-700 bg-neutral-800 text-white'
            : 'border-neutral-200 bg-white text-neutral-900')
        }
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {taxYearStartToLabel(year)}
          </option>
        ))}
      </select>
    </div>
  );
}
