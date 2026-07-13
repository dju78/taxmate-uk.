// UK Self Assessment key deadlines. General guidance only — dates can vary by
// circumstance (e.g. HMRC-issued notice to file), so this is not tax advice.

export type DeadlineKind =
  | 'registration'
  | 'filing'
  | 'payment'
  | 'payment-on-account';

export interface Deadline {
  id: string;
  kind: DeadlineKind;
  title: string;
  date: string; // YYYY-MM-DD (local)
  // The tax year this deadline relates to, e.g. "2025/26". For the second
  // payment on account (31 July) this is the year being PAID TOWARD — not the
  // filing year from which the payment was generated. This is the key
  // attribution fix: the 31 July 2026 second POA relates to 2025/26, not 2024/25.
  relatesToTaxYearLabel: string;
  // True when this deadline applies only to some taxpayers. Display conditional
  // wording so users are not misled into thinking they definitely owe the amount.
  conditional: boolean;
  conditionText?: string; // e.g. "Only if HMRC requires payments on account"
  description: string;
}

const iso = (year: number, month1: number, day: number): string =>
  `${year}-${String(month1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Build a "YYYY/YY" tax year label from the year in which the tax year STARTS.
// e.g. startYear=2025 → "2025/26"
const labelFromStart = (startYear: number): string =>
  `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`;

// All Self Assessment deadlines associated with the tax year that ENDS on
// 5 April `endYear`. The four deadlines span two calendar years, and — crucially
// — the second payment on account (31 July) relates to the FOLLOWING tax year
// (the one that just started on 6 April `endYear`), not the one being filed for.
export function deadlinesForTaxYearEnding(endYear: number): Deadline[] {
  // The tax year being filed: e.g. endYear=2026 → "2025/26"
  const filingLabel = labelFromStart(endYear - 1);
  // The tax year the payments on account are paid TOWARD: e.g. endYear=2026 → "2026/27"
  const nextLabel = labelFromStart(endYear);

  return [
    {
      id: `registration-${endYear}`,
      kind: 'registration',
      title: 'Register for Self Assessment',
      date: iso(endYear, 10, 5), // 5 October after the tax year ends
      relatesToTaxYearLabel: filingLabel,
      conditional: true,
      conditionText: 'Only if you need to register or reactivate Self Assessment',
      description: `If ${filingLabel} is your first year needing a tax return, register with HMRC by 5 October ${endYear}.`,
    },
    {
      id: `filing-${endYear}`,
      kind: 'filing',
      title: 'File online tax return',
      date: iso(endYear + 1, 1, 31), // 31 January after the tax year ends
      relatesToTaxYearLabel: filingLabel,
      conditional: false,
      description: `Submit your ${filingLabel} Self Assessment return online by 31 January ${endYear + 1}.`,
    },
    {
      id: `payment-${endYear}`,
      kind: 'payment',
      title: 'Pay tax owed',
      date: iso(endYear + 1, 1, 31),
      relatesToTaxYearLabel: filingLabel,
      conditional: false,
      // The January balance can include two distinct obligations — the balancing
      // payment for the completed year and, if applicable, the first payment on
      // account toward the next year. HMRC includes both in the January bill.
      description: `Pay the ${filingLabel} balancing payment by 31 January ${endYear + 1}. If HMRC has calculated payments on account, the same date is also the deadline for the first payment on account toward ${nextLabel}.`,
    },
    {
      id: `poa-${endYear}`,
      kind: 'payment-on-account',
      title: 'Second payment on account',
      date: iso(endYear + 1, 7, 31), // 31 July
      // Attribution fix: the July POA is the second instalment TOWARD the tax
      // year that started on 6 April `endYear` — i.e. the `nextLabel` year.
      relatesToTaxYearLabel: nextLabel,
      conditional: true,
      conditionText: 'Only if HMRC requires payments on account',
      description: `If you make payments on account, the second instalment toward ${nextLabel} is due by 31 July ${endYear + 1}.`,
    },
  ];
}

// Every deadline on or after `today`, sorted soonest-first.
export function getUpcomingDeadlines(today: Date = new Date()): Deadline[] {
  const y = today.getFullYear();
  const all: Deadline[] = [];
  for (let endYear = y - 1; endYear <= y + 2; endYear++) {
    all.push(...deadlinesForTaxYearEnding(endYear));
  }
  const cutoff = startOfDay(today).getTime();
  return all
    .filter((d) => new Date(d.date + 'T00:00:00').getTime() >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getNextDeadline(today: Date = new Date()): Deadline | null {
  return getUpcomingDeadlines(today)[0] ?? null;
}

// Whole days from `today` until the deadline (0 = due today, negative = past).
export function daysUntil(deadline: Deadline, today: Date = new Date()): number {
  const target = new Date(deadline.date + 'T00:00:00').getTime();
  const from = startOfDay(today).getTime();
  return Math.round((target - from) / 86_400_000);
}

// Return the upcoming deadlines that relate to a specific tax year label,
// sorted soonest-first. Useful for highlighting year-specific obligations.
export function getDeadlinesForLabel(
  label: string,
  today: Date = new Date()
): Deadline[] {
  return getUpcomingDeadlines(today).filter((d) => d.relatesToTaxYearLabel === label);
}
