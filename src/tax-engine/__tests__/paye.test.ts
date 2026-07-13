import { describe, it, expect } from 'vitest';
import { calculatePaye } from '../paye';
import { PayeInput } from '../types';
import { toPence } from '../money';

describe('PAYE Net Income Calculator', () => {
  const createInput = (grossSalaryPounds: number, taxRegion: PayeInput['taxRegion'] = 'england'): PayeInput => ({
    taxYear: '2024-25',
    taxRegion,
    grossSalary: toPence(grossSalaryPounds),
  });

  it('1. Salary below the Primary Threshold pays no Income Tax or NIC', () => {
    const res = calculatePaye(createInput(8000));
    expect(res.taxableIncome).toBe(0);
    expect(res.totalIncomeTax).toBe(0);
    expect(res.class1NICs).toBe(0);
    expect(res.netIncome).toBe(toPence(8000));
  });

  it('2. £30,000 salary (Basic Rate)', () => {
    const res = calculatePaye(createInput(30000));
    expect(res.taxableIncome).toBe(toPence(17430));
    expect(res.totalIncomeTax).toBe(toPence(3486.00));
    expect(res.class1NICs).toBe(toPence(1394.40));
    expect(res.netIncome).toBe(toPence(25119.60));
  });

  it('3. £60,000 salary (Higher Rate)', () => {
    const res = calculatePaye(createInput(60000));
    expect(res.taxableIncome).toBe(toPence(47430));
    expect(res.totalIncomeTax).toBe(toPence(11432.00));
    expect(res.class1NICs).toBe(toPence(3210.60));
    expect(res.netIncome).toBe(toPence(45357.40));
  });

  it('4. £110,000 salary (tapered Personal Allowance) — shares the same PA/band logic as the sole-trader engine', () => {
    const res = calculatePaye(createInput(110000));
    expect(res.personalAllowanceUsed).toBe(toPence(7570));
    expect(res.taxableIncome).toBe(toPence(102430));
    expect(res.totalIncomeTax).toBe(toPence(33432.00));
    expect(res.class1NICs).toBe(toPence(4210.60));
    expect(res.netIncome).toBe(toPence(72357.40));
  });

  it('5. monthlyNetIncome is annual net income divided by 12', () => {
    const res = calculatePaye(createInput(30000));
    expect(res.monthlyNetIncome).toBe(Math.round(res.netIncome / 12));
  });

  it('6. blocks Scotland with the correct message', () => {
    expect(() => calculatePaye(createInput(30000, 'scotland'))).toThrow('Scottish tax rules are not supported');
  });

  it('7. always discloses that pension/student loan are not modelled', () => {
    const res = calculatePaye(createInput(30000));
    expect(res.warnings.some((w) => w.includes('pension contributions'))).toBe(true);
  });

  it('8. adds a Personal Allowance taper warning only above £100,000', () => {
    const below = calculatePaye(createInput(90000));
    expect(below.warnings.some((w) => w.includes('Personal Allowance has been reduced'))).toBe(false);

    const above = calculatePaye(createInput(110000));
    expect(above.warnings.some((w) => w.includes('Personal Allowance has been reduced'))).toBe(true);
  });

  it('9. rejects an unsupported tax year', () => {
    const input = createInput(30000);
    input.taxYear = '2099-00';
    expect(() => calculatePaye(input)).toThrow('Unsupported tax year');
  });
});
