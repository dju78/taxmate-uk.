import { describe, it, expect, beforeEach } from 'vitest';
import { storageService, INCOME_STATUS } from './storage';
import { isValidAmount, isValidDateString } from './validation';

// Helper: assert a Date matches given local calendar parts.
const expectDate = (date: Date, year: number, month1Indexed: number, day: number) => {
  expect(date.getFullYear()).toBe(year);
  expect(date.getMonth()).toBe(month1Indexed - 1);
  expect(date.getDate()).toBe(day);
};

describe('getTaxYearStart / getTaxYearEnd / getNextTaxYearStart', () => {
  it('5 April belongs to the tax year that started the previous 6 April', () => {
    const ref = new Date(2026, 3, 5); // 5 April 2026
    expectDate(storageService.getTaxYearStart(ref), 2025, 4, 6);
    expectDate(storageService.getTaxYearEnd(ref), 2026, 4, 5);
    expectDate(storageService.getNextTaxYearStart(ref), 2026, 4, 6);
  });

  it('6 April starts a new tax year', () => {
    const ref = new Date(2026, 3, 6); // 6 April 2026
    expectDate(storageService.getTaxYearStart(ref), 2026, 4, 6);
    expectDate(storageService.getTaxYearEnd(ref), 2027, 4, 5);
    expectDate(storageService.getNextTaxYearStart(ref), 2027, 4, 6);
  });

  it('January belongs to the tax year that started the previous 6 April', () => {
    const ref = new Date(2026, 0, 15); // 15 January 2026
    expectDate(storageService.getTaxYearStart(ref), 2025, 4, 6);
    expectDate(storageService.getTaxYearEnd(ref), 2026, 4, 5);
  });

  it('5 April of the following year still closes the same tax year', () => {
    const ref = new Date(2027, 3, 5); // 5 April 2027
    expectDate(storageService.getTaxYearStart(ref), 2026, 4, 6);
    expectDate(storageService.getTaxYearEnd(ref), 2027, 4, 5);
  });

  it('6 April of the following year opens the next tax year', () => {
    const ref = new Date(2027, 3, 6); // 6 April 2027
    expectDate(storageService.getTaxYearStart(ref), 2027, 4, 6);
    expectDate(storageService.getTaxYearEnd(ref), 2028, 4, 5);
  });

  it('handles leap years correctly', () => {
    // 29 February 2024 falls in the 2023/24 tax year.
    const leapRef = new Date(2024, 1, 29); // 29 February 2024
    expectDate(storageService.getTaxYearStart(leapRef), 2023, 4, 6);
    expectDate(storageService.getTaxYearEnd(leapRef), 2024, 4, 5);

    // The 2023/24 tax year contains the leap day, and the tax year that
    // starts on a leap-day year opens correctly on 6 April.
    const leapStartRef = new Date(2024, 3, 6); // 6 April 2024
    expectDate(storageService.getTaxYearStart(leapStartRef), 2024, 4, 6);
    expectDate(storageService.getTaxYearEnd(leapStartRef), 2025, 4, 5);
  });
});

describe('parseLocalDate', () => {
  it('parses YYYY-MM-DD as a local date without UTC day shifting', () => {
    const d = storageService.parseLocalDate('2026-07-12');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // July (0-indexed)
    expect(d.getDate()).toBe(12);
  });

  it('returns a Date unchanged when already a Date', () => {
    const original = new Date(2026, 6, 12);
    expect(storageService.parseLocalDate(original)).toBe(original);
  });
});

describe('isInActiveTaxYear (exclusive upper boundary)', () => {
  const ref = new Date(2027, 2, 15); // 15 March 2027 -> tax year 2026/27

  it('includes a transaction dated 5 April at the very end of the year', () => {
    expect(storageService.isInActiveTaxYear('2027-04-05', ref)).toBe(true);
  });

  it('excludes a transaction dated 6 April (start of the next year)', () => {
    expect(storageService.isInActiveTaxYear('2027-04-06', ref)).toBe(false);
  });

  it('includes the first day of the tax year (6 April)', () => {
    expect(storageService.isInActiveTaxYear('2026-04-06', ref)).toBe(true);
  });

  it('excludes the last day of the previous tax year (5 April)', () => {
    expect(storageService.isInActiveTaxYear('2026-04-05', ref)).toBe(false);
  });
});

describe('getCompletedTaxMonths (first-month boundaries)', () => {
  it('returns 0 on 6 April (first day of the tax year)', () => {
    expect(storageService.getCompletedTaxMonths(new Date(2026, 3, 6))).toBe(0);
  });

  it('returns 0 on 30 April (still inside the first tax month)', () => {
    expect(storageService.getCompletedTaxMonths(new Date(2026, 3, 30))).toBe(0);
  });

  it('returns 0 on 5 May (last day before the first tax month closes)', () => {
    expect(storageService.getCompletedTaxMonths(new Date(2026, 4, 5))).toBe(0);
  });

  it('returns 1 on 6 May (first tax month complete)', () => {
    expect(storageService.getCompletedTaxMonths(new Date(2026, 4, 6))).toBe(1);
  });

  it('returns 2 mid-way through the third tax month', () => {
    expect(storageService.getCompletedTaxMonths(new Date(2026, 6, 3))).toBe(2);
  });

  it('returns 3 on 12 July 2026', () => {
    expect(storageService.getCompletedTaxMonths(new Date(2026, 6, 12))).toBe(3);
  });

  it('getFirstAverageAvailableDate is 6 May of the tax year', () => {
    expectDate(storageService.getFirstAverageAvailableDate(new Date(2026, 3, 20)), 2026, 5, 6);
  });
});

describe('average is unavailable (null) before the first tax month closes', () => {
  const incomeRecords = [{ id: '1', date: '2026-04-10', amount: '1000', status: 'received' }];
  const expenseRecords = [{ id: '1', date: '2026-04-10', amount: '89.99' }];

  it('income average is null on 6 April', () => {
    expect(storageService.calculateAverageMonthlyIncome(new Date(2026, 3, 6), incomeRecords)).toBeNull();
  });

  it('income average is null on 5 May', () => {
    expect(storageService.calculateAverageMonthlyIncome(new Date(2026, 4, 5), incomeRecords)).toBeNull();
  });

  it('income average becomes a number on 6 May', () => {
    expect(storageService.calculateAverageMonthlyIncome(new Date(2026, 4, 6), incomeRecords)).toBe(1000);
  });

  it('expense average is null on 30 April and a number on 6 May', () => {
    expect(storageService.calculateAverageMonthlyExpenses(new Date(2026, 3, 30), expenseRecords)).toBeNull();
    expect(storageService.calculateAverageMonthlyExpenses(new Date(2026, 4, 6), expenseRecords)).toBe(89.99);
  });
});

describe('income status normalisation', () => {
  const ref = new Date(2026, 6, 12); // 12 July 2026
  const records = [
    { id: '1', date: '2026-05-10', amount: '100', status: 'Received' },
    { id: '2', date: '2026-05-11', amount: '200', status: 'received' },
    { id: '3', date: '2026-05-12', amount: '400', status: 'RECEIVED' },
    { id: '4', date: '2026-05-13', amount: '50', status: ' Pending ' },
  ];

  it('treats Received / received / RECEIVED as the same status', () => {
    expect(storageService.calculateTotalReceived(ref, records)).toBe(700);
  });

  it('trims and lowercases surrounding whitespace/case for other statuses', () => {
    expect(storageService.calculateOutstanding(ref, records)).toBe(50);
  });

  it('normaliseIncomeStatus maps variants to canonical constants', () => {
    expect(storageService.normaliseIncomeStatus('  OverDUE ')).toBe(INCOME_STATUS.OVERDUE);
    expect(storageService.normaliseIncomeStatus(undefined)).toBe('');
  });
});

describe('income metric separation', () => {
  const ref = new Date(2026, 6, 12); // 12 July 2026 -> tax year 2026/27
  const records = [
    { id: '1', date: '2026-05-10', amount: '2000', status: 'Received' },
    { id: '2', date: '2026-06-15', amount: '1000', status: 'Received' },
    { id: '3', date: '2026-07-01', amount: '500', status: 'Pending' },
    { id: '4', date: '2026-06-20', amount: '300', status: 'Overdue' },
    { id: '5', date: '2025-03-01', amount: '9999', status: 'Received' }, // prior tax year
  ];

  it('total received counts only Received in the active tax year', () => {
    expect(storageService.calculateTotalReceived(ref, records)).toBe(3000);
  });

  it('total invoiced counts every status in the active tax year', () => {
    expect(storageService.calculateTotalInvoiced(ref, records)).toBe(3800);
  });

  it('outstanding counts only Pending', () => {
    expect(storageService.calculateOutstanding(ref, records)).toBe(500);
  });

  it('overdue counts only Overdue', () => {
    expect(storageService.calculateOverdue(ref, records)).toBe(300);
  });

  it('does not treat pending or overdue entries as received', () => {
    const received = storageService.calculateTotalReceived(ref, records);
    const invoiced = storageService.calculateTotalInvoiced(ref, records);
    expect(received).toBeLessThan(invoiced);
    expect(invoiced - received).toBe(800); // 500 pending + 300 overdue
  });

  it('excludes prior-tax-year records', () => {
    // The £9999 prior-year record must not leak into the active tax year.
    expect(storageService.calculateTotalInvoiced(ref, records)).toBe(3800);
    expect(storageService.getIncomeInTaxYear(records, ref)).toHaveLength(4);
  });

  it('income this month excludes non-received entries', () => {
    // The only July entry is Pending, so received-this-month is 0.
    expect(storageService.calculateIncomeThisMonth(ref, records)).toBe(0);
  });

  it('average income = received / completed tax months', () => {
    // received 3000 / 3 completed tax months = 1000
    expect(storageService.calculateAverageMonthlyIncome(ref, records)).toBe(1000);
  });
});

describe('expense metrics', () => {
  const ref = new Date(2026, 6, 12); // 12 July 2026
  const records = [
    { id: '1', date: '2026-06-10', amount: '89.99', category: 'Supplies' },
    { id: '2', date: '2025-03-01', amount: '500', category: 'Travel' }, // prior tax year
  ];

  it('total expenses YTD excludes prior tax years', () => {
    expect(storageService.calculateTotalExpensesYTD(ref, records)).toBe(89.99);
  });

  it('average expenses = total / completed tax months, rounded to 2dp', () => {
    // 89.99 / 3 = 29.9966... -> 30.00
    expect(storageService.calculateAverageMonthlyExpenses(ref, records)).toBe(30);
  });
});

describe('currency rounding', () => {
  it('sums 0.10 + 0.20 exactly as 0.30 (integer-pence accumulation)', () => {
    const ref = new Date(2026, 6, 12);
    const records = [
      { id: '1', date: '2026-05-01', amount: '0.10', status: 'Received' },
      { id: '2', date: '2026-05-02', amount: '0.20', status: 'Received' },
    ];
    // 0.1 + 0.2 = 0.30000000000000004 with naive float addition
    expect(storageService.calculateTotalReceived(ref, records)).toBe(0.3);
  });

  it('accumulates many 1p amounts without float drift', () => {
    const ref = new Date(2026, 6, 12);
    // 1001 records of £0.01 each = £10.01 exactly.
    const records = Array.from({ length: 1001 }, (_, i) => ({
      id: String(i),
      date: '2026-05-01',
      amount: '0.01',
      status: 'Received',
    }));
    expect(storageService.calculateTotalReceived(ref, records)).toBe(10.01);
  });

  it('toPence converts pounds to integer pence', () => {
    expect(storageService.toPence('89.99')).toBe(8999);
    expect(storageService.toPence('0.1')).toBe(10);
    expect(storageService.toPence('')).toBe(0);
  });

  it('roundCurrency collapses long decimals to 2dp', () => {
    expect(storageService.roundCurrency(89.99 / 3)).toBe(30);
    expect(storageService.roundCurrency(10 / 3)).toBe(3.33);
    expect(storageService.roundCurrency(2 / 3)).toBe(0.67);
  });
});

describe('input validation', () => {
  it('isValidAmount accepts well-formed positive amounts', () => {
    expect(isValidAmount('100')).toBe(true);
    expect(isValidAmount('89.99')).toBe(true);
    expect(isValidAmount('0.01')).toBe(true);
  });

  it('isValidAmount rejects malformed or non-positive amounts', () => {
    expect(isValidAmount('100abc')).toBe(false); // must not be parsed as 100
    expect(isValidAmount('1.999')).toBe(false);   // more than 2dp
    expect(isValidAmount('-5')).toBe(false);
    expect(isValidAmount('0')).toBe(false);
    expect(isValidAmount('')).toBe(false);
    expect(isValidAmount('  ')).toBe(false);
    expect(isValidAmount('1e3')).toBe(false);
  });

  it('isValidDateString accepts real calendar dates', () => {
    expect(isValidDateString('2026-07-12')).toBe(true);
    expect(isValidDateString('2024-02-29')).toBe(true); // leap day
  });

  it('isValidDateString rejects impossible or malformed dates', () => {
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('2026-13-01')).toBe(false);
    expect(isValidDateString('2025-02-29')).toBe(false); // not a leap year
    expect(isValidDateString('not-a-date')).toBe(false);
    expect(isValidDateString('2026-7-12')).toBe(false); // needs zero-padding
  });
});

describe('export helpers', () => {
  it('recordsToCSV produces a header and escapes commas/quotes', () => {
    const csv = storageService.recordsToCSV([
      { id: '1', source: 'Acme, Inc', amount: '100' },
      { id: '2', source: 'Say "hi"', amount: '50' },
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('id,source,amount');
    expect(lines[1]).toBe('1,"Acme, Inc",100');
    expect(lines[2]).toBe('2,"Say ""hi""",50');
  });

  it('recordsToCSV returns empty string for no records', () => {
    expect(storageService.recordsToCSV([])).toBe('');
  });
});

describe('getCurrentTaxMonthStart (completed-month window boundary)', () => {
  it('is 6 July 2026 on 12 July 2026 (3 months complete)', () => {
    expectDate(storageService.getCurrentTaxMonthStart(new Date(2026, 6, 12)), 2026, 7, 6);
  });

  it('equals the tax year start on 6 April (0 months complete)', () => {
    expectDate(storageService.getCurrentTaxMonthStart(new Date(2026, 3, 6)), 2026, 4, 6);
  });

  it('is 6 March 2027 in the final tax month of 2026/27', () => {
    expectDate(storageService.getCurrentTaxMonthStart(new Date(2027, 2, 20)), 2027, 3, 6);
  });

  it('getCompletedTaxMonths respects the 5th/6th day within a mid-year month', () => {
    expect(storageService.getCompletedTaxMonths(new Date(2026, 6, 5))).toBe(2); // 5 Jul
    expect(storageService.getCompletedTaxMonths(new Date(2026, 6, 6))).toBe(3); // 6 Jul
  });
});

describe('average excludes income from the current incomplete tax month', () => {
  it('income received 6-12 July is in the YTD total but NOT the average numerator', () => {
    const ref = new Date(2026, 6, 12); // 12 July 2026, 3 months complete, cutoff 6 Jul
    const records = [
      { id: 'a', date: '2026-05-10', amount: '3000', status: 'received' }, // completed month
      { id: 'b', date: '2026-07-10', amount: '900', status: 'received' },  // current incomplete month
    ];
    // YTD received includes both; the average numerator excludes the 10 July £900.
    expect(storageService.calculateTotalReceived(ref, records)).toBe(3900);
    expect(storageService.calculateAverageMonthlyIncome(ref, records)).toBe(1000); // 3000 / 3
  });

  it('pending income in the current incomplete month is excluded from the average', () => {
    const ref = new Date(2026, 6, 12);
    const records = [
      { id: 'a', date: '2026-05-10', amount: '3000', status: 'received' },
      { id: 'b', date: '2026-07-08', amount: '500', status: 'pending' },
    ];
    expect(storageService.calculateAverageMonthlyIncome(ref, records)).toBe(1000);
  });

  it('works in the final tax month of the year', () => {
    const ref = new Date(2027, 2, 20); // 20 March 2027, 11 months complete, cutoff 6 Mar 2027
    const records = [
      { id: 'a', date: '2026-06-01', amount: '1100', status: 'received' }, // completed month
      { id: 'b', date: '2027-03-10', amount: '500', status: 'received' },  // current incomplete month
    ];
    expect(storageService.calculateTotalReceived(ref, records)).toBe(1600);
    expect(storageService.calculateAverageMonthlyIncome(ref, records)).toBe(100); // 1100 / 11
  });

  it('expense average likewise excludes the current incomplete tax month', () => {
    const ref = new Date(2026, 6, 12);
    const records = [
      { id: 'a', date: '2026-05-10', amount: '300', category: 'Supplies' },
      { id: 'b', date: '2026-07-09', amount: '999', category: 'Travel' }, // current incomplete month
    ];
    expect(storageService.calculateTotalExpensesYTD(ref, records)).toBe(1299);
    expect(storageService.calculateAverageMonthlyExpenses(ref, records)).toBe(100); // 300 / 3
  });
});

describe('status validation and reconciliation', () => {
  const ref = new Date(2026, 6, 12);
  const records = [
    { id: '1', date: '2026-05-10', amount: '100', status: 'received' },
    { id: '2', date: '2026-05-11', amount: '50', status: 'pending' },
    { id: '3', date: '2026-05-12', amount: '30', status: 'overdue' },
    { id: '4', date: '2026-05-13', amount: '999', status: 'archived' }, // unknown/invalid status
  ];

  it('isValidIncomeStatus accepts only the three canonical statuses', () => {
    expect(storageService.isValidIncomeStatus('Received')).toBe(true);
    expect(storageService.isValidIncomeStatus('  pending ')).toBe(true);
    expect(storageService.isValidIncomeStatus('OVERDUE')).toBe(true);
    expect(storageService.isValidIncomeStatus('archived')).toBe(false);
    expect(storageService.isValidIncomeStatus(undefined)).toBe(false);
  });

  it('an unknown status is NOT silently counted in total invoiced', () => {
    // Invoiced counts only valid statuses: 100 + 50 + 30 = 180 (excludes 999).
    expect(storageService.calculateTotalInvoiced(ref, records)).toBe(180);
  });

  it('reconciles: total invoiced === received + outstanding + overdue', () => {
    const invoiced = storageService.calculateTotalInvoiced(ref, records);
    const received = storageService.calculateTotalReceived(ref, records);
    const outstanding = storageService.calculateOutstanding(ref, records);
    const overdue = storageService.calculateOverdue(ref, records);
    expect(invoiced).toBe(storageService.roundCurrency(received + outstanding + overdue));
  });
});

describe('charts are restricted to the active tax year', () => {
  const ref = new Date(2026, 6, 12); // tax year 2026/27
  const incomeRecords = [
    { id: '1', date: '2026-05-10', amount: '1000', source: 'Alpha', status: 'received' },
    { id: '2', date: '2025-02-01', amount: '5000', source: 'Beta', status: 'received' }, // prior tax year
  ];
  const expenseRecords = [
    { id: '1', date: '2026-05-10', amount: '200', category: 'Supplies' },
    { id: '2', date: '2025-02-01', amount: '800', category: 'Travel' }, // prior tax year
  ];

  it('getIncomeByMonth omits prior-tax-year months', () => {
    const byMonth = storageService.getIncomeByMonth(incomeRecords, ref);
    expect(Object.keys(byMonth)).toEqual(['2026-05']);
    expect(byMonth['2026-05']).toBe(1000);
  });

  it('getIncomeBySource omits prior-tax-year sources', () => {
    const bySource = storageService.getIncomeBySource(incomeRecords, ref);
    expect(bySource).toEqual({ Alpha: 1000 });
  });

  it('getExpensesByMonth and getExpensesByCategory omit prior tax years', () => {
    expect(storageService.getExpensesByMonth(expenseRecords, ref)).toEqual({ '2026-05': 200 });
    expect(storageService.getExpensesByCategory(expenseRecords, ref)).toEqual({ Supplies: 200 });
  });
});

describe('Phase 2: selected tax year controls calculations', () => {
  const ref = (year: number) => storageService.getTaxYearStartForYear(year);
  const income = [
    { id: 'a', date: '2024-06-01', amount: '1000', status: 'received', source: 'Alpha' }, // 2024/25
    { id: 'b', date: '2025-06-01', amount: '2000', status: 'received', source: 'Beta' },  // 2025/26
    { id: 'c', date: '2026-06-01', amount: '3000', status: 'received', source: 'Gamma' }, // 2026/27
    { id: 'd', date: '2026-06-15', amount: '500', status: 'pending', source: 'Gamma' },   // 2026/27
    { id: 'e', date: '2026-06-20', amount: '300', status: 'overdue', source: 'Gamma' },   // 2026/27
  ];
  const expenses = [
    { id: 'x', date: '2024-06-01', amount: '100', category: 'Office costs' }, // 2024/25
    { id: 'y', date: '2026-06-01', amount: '200', category: 'Travel' },       // 2026/27
  ];

  it('default tax-year detection: 5 April belongs to the previous start year', () => {
    expect(storageService.getCurrentTaxYearStartYear(new Date(2026, 3, 5))).toBe(2025);
  });

  it('default tax-year detection: 6 April opens the new tax year', () => {
    expect(storageService.getCurrentTaxYearStartYear(new Date(2026, 3, 6))).toBe(2026);
  });

  it('total received is scoped to the selected year (2024/25, 2025/26, 2026/27)', () => {
    expect(storageService.calculateTotalReceived(ref(2024), income)).toBe(1000);
    expect(storageService.calculateTotalReceived(ref(2025), income)).toBe(2000);
    expect(storageService.calculateTotalReceived(ref(2026), income)).toBe(3000);
  });

  it('dashboard reconciliation holds within the selected year', () => {
    // 2026/27: invoiced 3800 = received 3000 + outstanding 500 + overdue 300
    expect(storageService.calculateTotalInvoiced(ref(2026), income)).toBe(3800);
    expect(storageService.calculateOutstanding(ref(2026), income)).toBe(500);
    expect(storageService.calculateOverdue(ref(2026), income)).toBe(300);
    // 2025/26 has no pending/overdue
    expect(storageService.calculateOutstanding(ref(2025), income)).toBe(0);
    expect(storageService.calculateOverdue(ref(2025), income)).toBe(0);
  });

  it('income table filtering returns only the selected year', () => {
    expect(storageService.getIncomeInTaxYear(income, ref(2025)).map((r) => r.id)).toEqual(['b']);
    expect(storageService.getIncomeInTaxYear(income, ref(2026)).map((r) => r.id)).toEqual(['c', 'd', 'e']);
  });

  it('expense table filtering returns only the selected year', () => {
    expect(storageService.getExpensesInTaxYear(expenses, ref(2024)).map((r) => r.id)).toEqual(['x']);
    expect(storageService.getExpensesInTaxYear(expenses, ref(2026)).map((r) => r.id)).toEqual(['y']);
  });

  it('trend chart and source/category breakdowns are scoped to the selected year', () => {
    expect(storageService.getIncomeByMonth(income, ref(2025))).toEqual({ '2025-06': 2000 });
    expect(storageService.getIncomeBySource(income, ref(2024))).toEqual({ Alpha: 1000 });
    expect(storageService.getExpensesByMonth(expenses, ref(2026))).toEqual({ '2026-06': 200 });
    expect(storageService.getExpensesByCategory(expenses, ref(2026))).toEqual({ Travel: 200 });
  });

  it('CSV export scope follows the selected tax year', () => {
    const csv2024 = storageService.recordsToCSV(storageService.getIncomeInTaxYear(income, ref(2024)));
    expect(csv2024).toContain('Alpha');
    expect(csv2024).not.toContain('Beta');
    expect(csv2024).not.toContain('Gamma');
  });

  it('records dated 5 April and 6 April fall in the correct tax years', () => {
    const boundary = [
      { id: '5apr', date: '2026-04-05', amount: '10', status: 'received', source: 'S' },
      { id: '6apr', date: '2026-04-06', amount: '20', status: 'received', source: 'S' },
    ];
    expect(storageService.getIncomeInTaxYear(boundary, ref(2025)).map((r) => r.id)).toEqual(['5apr']);
    expect(storageService.getIncomeInTaxYear(boundary, ref(2026)).map((r) => r.id)).toEqual(['6apr']);
  });

  it('a past selected year is treated as fully complete (12 tax months)', () => {
    const today = new Date(2026, 6, 12); // 12 July 2026
    expect(storageService.getCompletedTaxMonthsForYear(2025, today)).toBe(12);
    expect(storageService.getCompletedTaxMonthsForYear(2026, today)).toBe(3);
    expect(storageService.getCompletedTaxMonthsForYear(2027, today)).toBe(0);
  });

  it('year-aware average uses 12 months for a complete past year', () => {
    const today = new Date(2026, 6, 12);
    // 2024/25 received 1000 over a complete year -> 1000 / 12
    expect(storageService.calculateAverageMonthlyIncomeForYear(2024, income, today)).toBe(
      storageService.roundCurrency(1000 / 12)
    );
    // current year 2026/27: received in completed months [6 Apr, 6 Jul) = 3000 / 3
    expect(storageService.calculateAverageMonthlyIncomeForYear(2026, income, today)).toBe(1000);
  });

  it('this-month figure is only defined for the current tax year', () => {
    const today = new Date(2026, 6, 12);
    expect(storageService.calculateIncomeThisMonthForYear(2024, income, today)).toBeNull();
    // no received income dated in July 2026 -> 0 for the current year
    expect(storageService.calculateIncomeThisMonthForYear(2026, income, today)).toBe(0);
  });
});

describe('findDuplicateIncome / findDuplicateExpense', () => {
  beforeEach(() => localStorage.clear());

  it('flags a duplicate matching date, amount, source and description', () => {
    const existing = storageService.addIncomeRecord({
      date: '2026-05-01',
      source: 'Acme Ltd',
      description: 'Invoice 1',
      category: 'Freelance',
      amount: '250.00',
      status: 'received',
    });
    const match = storageService.findDuplicateIncome({
      date: '2026-05-01',
      source: '  acme ltd  ',
      description: 'invoice 1',
      category: 'Freelance',
      amount: '250.00',
    });
    expect(match?.id).toBe(existing.id);
  });

  it('does not flag records differing in date, amount or source', () => {
    storageService.addIncomeRecord({
      date: '2026-05-01',
      source: 'Acme Ltd',
      description: 'Invoice 1',
      category: 'Freelance',
      amount: '250.00',
      status: 'received',
    });
    expect(
      storageService.findDuplicateIncome({ date: '2026-05-02', source: 'Acme Ltd', description: 'Invoice 1', amount: '250.00' })
    ).toBeUndefined();
    expect(
      storageService.findDuplicateIncome({ date: '2026-05-01', source: 'Acme Ltd', description: 'Invoice 1', amount: '99.00' })
    ).toBeUndefined();
    expect(
      storageService.findDuplicateIncome({ date: '2026-05-01', source: 'Other Ltd', description: 'Invoice 1', amount: '250.00' })
    ).toBeUndefined();
  });

  it('excludes the record itself when editing (excludeId)', () => {
    const existing = storageService.addIncomeRecord({
      date: '2026-05-01',
      source: 'Acme Ltd',
      description: 'Invoice 1',
      category: 'Freelance',
      amount: '250.00',
      status: 'received',
    });
    const match = storageService.findDuplicateIncome(
      { date: '2026-05-01', source: 'Acme Ltd', description: 'Invoice 1', amount: '250.00' },
      existing.id
    );
    expect(match).toBeUndefined();
  });

  it('flags a duplicate expense matching date, amount, merchant and description', () => {
    const existing = storageService.addExpenseRecord({
      date: '2026-05-03',
      merchant: 'Amazon',
      description: 'Office chair',
      category: 'Office costs',
      amount: '89.99',
    });
    const match = storageService.findDuplicateExpense({
      date: '2026-05-03',
      merchant: 'amazon',
      description: 'Office Chair',
      category: 'Office costs',
      amount: '89.99',
    });
    expect(match?.id).toBe(existing.id);
  });

  it('excludes the expense itself when editing (excludeId)', () => {
    const existing = storageService.addExpenseRecord({
      date: '2026-05-03',
      merchant: 'Amazon',
      description: 'Office chair',
      category: 'Office costs',
      amount: '89.99',
    });
    expect(
      storageService.findDuplicateExpense(
        { date: '2026-05-03', merchant: 'Amazon', description: 'Office chair', amount: '89.99' },
        existing.id
      )
    ).toBeUndefined();
  });
});

describe('shouldShowBackupReminder / snoozeBackupReminder / recordSuccessfulExport', () => {
  beforeEach(() => localStorage.clear());

  it('does not trigger below the 10-record threshold with no prior export', () => {
    const income = Array.from({ length: 5 }, () => ({ isDemo: false }));
    const expenses = Array.from({ length: 4 }, () => ({ isDemo: false }));
    expect(storageService.shouldShowBackupReminder(income, expenses)).toBe(false);
  });

  it('triggers at 10+ non-demo records with no prior export', () => {
    const income = Array.from({ length: 6 }, () => ({ isDemo: false }));
    const expenses = Array.from({ length: 4 }, () => ({ isDemo: false }));
    expect(storageService.shouldShowBackupReminder(income, expenses)).toBe(true);
  });

  it('excludes demo records from the threshold count', () => {
    const income = Array.from({ length: 8 }, () => ({ isDemo: true }));
    const expenses = Array.from({ length: 8 }, () => ({ isDemo: true }));
    expect(storageService.shouldShowBackupReminder(income, expenses)).toBe(false);
  });

  it('does not trigger again within 30 days of a successful export', () => {
    const income = Array.from({ length: 20 }, () => ({ isDemo: false }));
    const now = new Date(2026, 5, 1);
    storageService.recordSuccessfulExport(new Date(2026, 4, 15));
    expect(storageService.shouldShowBackupReminder(income, [], now)).toBe(false);
  });

  it('triggers again more than 30 days after the last successful export', () => {
    const income = Array.from({ length: 20 }, () => ({ isDemo: false }));
    const now = new Date(2026, 6, 1);
    storageService.recordSuccessfulExport(new Date(2026, 4, 1));
    expect(storageService.shouldShowBackupReminder(income, [], now)).toBe(true);
  });

  it('snoozing suppresses the reminder until the snooze period elapses', () => {
    const income = Array.from({ length: 20 }, () => ({ isDemo: false }));
    const snoozedAt = new Date(2026, 5, 1);
    storageService.snoozeBackupReminder(7, snoozedAt);
    expect(storageService.shouldShowBackupReminder(income, [], new Date(2026, 5, 3))).toBe(false);
    expect(storageService.shouldShowBackupReminder(income, [], new Date(2026, 5, 9))).toBe(true);
  });
});

describe('previewImport', () => {
  beforeEach(() => localStorage.clear());

  it('restore mode reports full add counts and existing records to replace', () => {
    storageService.addIncomeRecord({ date: '2026-05-01', source: 'A', category: 'Freelance', amount: '10', status: 'received' });
    storageService.addExpenseRecord({ date: '2026-05-01', merchant: 'B', category: 'Office costs', amount: '5' });
    const preview = storageService.previewImport(
      'restore',
      [{ id: '1', date: '2026-05-01', source: 'X', category: 'Freelance', amount: '1', status: 'received' }],
      [{ id: '2', date: '2026-05-01', merchant: 'Y', category: 'Office costs', amount: '2' }]
    );
    expect(preview).toEqual({
      toAddIncome: 1,
      toSkipIncome: 0,
      probableDuplicateIncome: 0,
      toAddExpenses: 1,
      toSkipExpenses: 0,
      probableDuplicateExpenses: 0,
      toReplace: 2,
    });
  });

  it('merge mode skips exact-id matches and flags content-matching records as probable duplicates', () => {
    const existingIncome = storageService.addIncomeRecord({
      date: '2026-05-01',
      source: 'Acme Ltd',
      description: 'Invoice 1',
      category: 'Freelance',
      amount: '250.00',
      status: 'received',
    });
    const preview = storageService.previewImport(
      'merge',
      [
        // exact id match -> skipped
        { ...existingIncome },
        // different id, same content -> probable duplicate (still added)
        { id: 'new-id', date: '2026-05-01', source: 'Acme Ltd', description: 'Invoice 1', category: 'Freelance', amount: '250.00', status: 'received' },
        // genuinely new record
        { id: 'brand-new', date: '2026-06-01', source: 'Other', category: 'Freelance', amount: '75', status: 'received' },
      ],
      []
    );
    expect(preview.toSkipIncome).toBe(1);
    expect(preview.toAddIncome).toBe(2);
    expect(preview.probableDuplicateIncome).toBe(1);
    expect(preview.toReplace).toBe(0);
  });
});
