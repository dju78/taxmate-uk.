// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  useTaxStore,
  getAvailableTaxYears,
  taxYearStartToLabel,
  currentTaxYearStart,
} from './store';

describe('Phase 2: tax-year store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('offers exactly three tax years (current + two prior)', () => {
    expect(getAvailableTaxYears(2026)).toEqual([2026, 2025, 2024]);
  });

  it('labels a start year as a UK tax year (6 Apr -> 5 Apr)', () => {
    expect(taxYearStartToLabel(2026)).toBe('2026/27');
    expect(taxYearStartToLabel(2025)).toBe('2025/26');
    expect(taxYearStartToLabel(2024)).toBe('2024/25');
  });

  it('defaults to the tax year containing today', () => {
    expect(useTaxStore.getState().selectedTaxYear).toBe(currentTaxYearStart());
  });

  it('persists the selected tax year to localStorage', () => {
    useTaxStore.getState().setSelectedTaxYear(2025);
    expect(useTaxStore.getState().selectedTaxYear).toBe(2025);
    expect(localStorage.getItem('taxmate_selected_tax_year')).toBe('2025');
  });

  it('does not reset a saved selection (persistence survives a re-read)', () => {
    useTaxStore.getState().setSelectedTaxYear(2024);
    // Simulate a fresh read of the persisted preference.
    expect(Number(localStorage.getItem('taxmate_selected_tax_year'))).toBe(2024);
  });
});
