import { describe, it, expect } from 'vitest';
import {
  deadlinesForTaxYearEnding,
  getUpcomingDeadlines,
  getNextDeadline,
  getDeadlinesForLabel,
  daysUntil,
} from './deadlines';

describe('Phase 7: Self Assessment deadlines — basic structure', () => {
  it('produces the four key deadlines for a tax year ending 5 April', () => {
    const ds = deadlinesForTaxYearEnding(2026); // 2025/26 tax year
    const byKind = Object.fromEntries(ds.map((d) => [d.kind, d]));
    expect(ds).toHaveLength(4);
    expect(byKind.registration.date).toBe('2026-10-05');
    expect(byKind.filing.date).toBe('2027-01-31');
    expect(byKind.payment.date).toBe('2027-01-31');
    expect(byKind['payment-on-account'].date).toBe('2027-07-31');
  });

  it('getUpcomingDeadlines returns only future deadlines, soonest first', () => {
    const today = new Date(2026, 6, 13); // 13 July 2026
    const up = getUpcomingDeadlines(today);
    expect(up.length).toBeGreaterThan(0);
    // sorted ascending
    for (let i = 1; i < up.length; i++) {
      expect(up[i].date >= up[i - 1].date).toBe(true);
    }
    // none in the past
    expect(up.every((d) => d.date >= '2026-07-13')).toBe(true);
  });

  it('getNextDeadline on 13 July 2026 is the second payment on account (31 July)', () => {
    const next = getNextDeadline(new Date(2026, 6, 13));
    expect(next?.date).toBe('2026-07-31');
    expect(next?.kind).toBe('payment-on-account');
  });

  it('after 31 July the next deadline is the 5 October registration', () => {
    const next = getNextDeadline(new Date(2026, 7, 1)); // 1 Aug 2026
    expect(next?.date).toBe('2026-10-05');
    expect(next?.kind).toBe('registration');
  });

  it('a deadline on today counts as upcoming (due today)', () => {
    const today = new Date(2026, 9, 5); // 5 Oct 2026 = a registration deadline
    const next = getNextDeadline(today);
    expect(next?.date).toBe('2026-10-05');
    expect(daysUntil(next!, today)).toBe(0);
  });

  it('daysUntil computes whole days correctly', () => {
    const today = new Date(2026, 6, 13);
    const next = getNextDeadline(today)!;
    expect(daysUntil(next, today)).toBe(18); // 13 → 31 July
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ATTRIBUTION FIX: the second payment on account (July) must relate to the
// year being paid TOWARD, not the year being filed for.
// ─────────────────────────────────────────────────────────────────────────────
describe('Phase 7: payment-on-account tax year attribution', () => {
  it('the 31 July 2026 second POA is attributed to 2025/26, not 2024/25', () => {
    // deadlinesForTaxYearEnding(2025) produces the July 2026 POA.
    const ds = deadlinesForTaxYearEnding(2025);
    const poa = ds.find((d) => d.kind === 'payment-on-account')!;
    expect(poa.date).toBe('2026-07-31');
    // KEY: must say 2025/26 (the year being paid toward) NOT 2024/25.
    expect(poa.relatesToTaxYearLabel).toBe('2025/26');
    expect(poa.relatesToTaxYearLabel).not.toBe('2024/25');
  });

  it('filing and payment deadlines for endYear=2025 relate to 2024/25 (the year being filed)', () => {
    const ds = deadlinesForTaxYearEnding(2025);
    const byKind = Object.fromEntries(ds.map((d) => [d.kind, d]));
    expect(byKind.filing.relatesToTaxYearLabel).toBe('2024/25');
    expect(byKind.payment.relatesToTaxYearLabel).toBe('2024/25');
    expect(byKind.registration.relatesToTaxYearLabel).toBe('2024/25');
  });

  it('the Jan balancing-payment description mentions the first POA toward the next year', () => {
    const ds = deadlinesForTaxYearEnding(2025);
    const payment = ds.find((d) => d.kind === 'payment')!;
    // Description should acknowledge the first POA toward 2025/26 in the Jan bill.
    expect(payment.description).toMatch(/2025\/26/);
    expect(payment.description.toLowerCase()).toMatch(/payment on account/);
  });

  it('POA for endYear=2026 (filing 2025/26) is attributed to 2026/27', () => {
    const ds = deadlinesForTaxYearEnding(2026);
    const poa = ds.find((d) => d.kind === 'payment-on-account')!;
    expect(poa.date).toBe('2027-07-31');
    expect(poa.relatesToTaxYearLabel).toBe('2026/27');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONDITIONAL DEADLINES: registration and POA must be flagged conditional.
// ─────────────────────────────────────────────────────────────────────────────
describe('Phase 7: conditional deadline flags', () => {
  it('registration is conditional with appropriate conditionText', () => {
    const reg = deadlinesForTaxYearEnding(2026).find((d) => d.kind === 'registration')!;
    expect(reg.conditional).toBe(true);
    expect(reg.conditionText).toBeTruthy();
    expect(reg.conditionText!.toLowerCase()).toMatch(/register|reactivate/);
  });

  it('second payment on account is conditional', () => {
    const poa = deadlinesForTaxYearEnding(2026).find((d) => d.kind === 'payment-on-account')!;
    expect(poa.conditional).toBe(true);
    expect(poa.conditionText!.toLowerCase()).toMatch(/payments on account/);
  });

  it('filing and balancing payment are NOT conditional', () => {
    const ds = deadlinesForTaxYearEnding(2026);
    expect(ds.find((d) => d.kind === 'filing')!.conditional).toBe(false);
    expect(ds.find((d) => d.kind === 'payment')!.conditional).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC DATE INJECTION: injected `today` must control daysUntil, not
// the system clock.
// ─────────────────────────────────────────────────────────────────────────────
describe('Phase 7: deterministic injected-date behaviour', () => {
  it('daysUntil(deadline, today) uses the injected date, not the system clock', () => {
    const deadline = deadlinesForTaxYearEnding(2025).find((d) => d.kind === 'payment-on-account')!;
    // deadline.date = '2026-07-31'
    const injected = new Date(2026, 6, 13); // 13 Jul 2026 → 18 days away
    expect(daysUntil(deadline, injected)).toBe(18);
    // From a different injected date the result changes — proving we're not
    // using the real system clock.
    const earlier = new Date(2026, 6, 1); // 1 Jul 2026 → 30 days away
    expect(daysUntil(deadline, earlier)).toBe(30);
  });

  it('daysUntil returns 0 when injected date equals deadline date', () => {
    const deadline = deadlinesForTaxYearEnding(2025).find((d) => d.kind === 'payment-on-account')!;
    const sameDay = new Date(2026, 6, 31); // 31 Jul 2026
    expect(daysUntil(deadline, sameDay)).toBe(0);
  });

  it('daysUntil returns 1 when deadline is tomorrow', () => {
    const deadline = deadlinesForTaxYearEnding(2025).find((d) => d.kind === 'payment-on-account')!;
    const yesterday = new Date(2026, 6, 30); // 30 Jul 2026
    expect(daysUntil(deadline, yesterday)).toBe(1);
  });

  it('getUpcomingDeadlines uses the injected today, not the system clock', () => {
    // On 30 July 2026, the 31 July POA is still upcoming.
    const before = getUpcomingDeadlines(new Date(2026, 6, 30));
    expect(before.some((d) => d.date === '2026-07-31')).toBe(true);
    // On 1 August 2026 it is past and must not appear.
    const after = getUpcomingDeadlines(new Date(2026, 7, 1));
    expect(after.some((d) => d.date === '2026-07-31')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getDeadlinesForLabel: filter by tax year label
// ─────────────────────────────────────────────────────────────────────────────
describe('Phase 7: getDeadlinesForLabel', () => {
  it('returns only upcoming deadlines relating to the requested label', () => {
    const today = new Date(2026, 6, 13); // 13 Jul 2026
    const forYear = getDeadlinesForLabel('2025/26', today);
    // Every returned deadline must relate to 2025/26.
    expect(forYear.every((d) => d.relatesToTaxYearLabel === '2025/26')).toBe(true);
    // The July 2026 POA (relates to 2025/26) must be included.
    expect(forYear.some((d) => d.date === '2026-07-31')).toBe(true);
  });

  it('returns an empty array when no upcoming deadlines match the label', () => {
    // Tax year 2020/21 is entirely in the past.
    const today = new Date(2026, 6, 13);
    expect(getDeadlinesForLabel('2020/21', today)).toHaveLength(0);
  });
});
