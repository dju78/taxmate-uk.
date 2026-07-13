import {
  getUpcomingDeadlines,
  getDeadlinesForLabel,
  daysUntil,
  type Deadline,
} from './deadlines';

const formatDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

// Returns a human-readable relative label for a deadline that is today or
// in the future. Negative values (shouldn't happen in practice — the upstream
// filter removes past deadlines) are shown as "overdue" rather than "in -N days".
const relative = (n: number) => {
  if (n < 0) return 'overdue';
  if (n === 0) return 'due today';
  if (n === 1) return 'due tomorrow';
  return `in ${n} days`;
};

// The badge text for the chronologically next deadline, distinguishing
// unconditional obligations from ones that apply only to some taxpayers.
const nextBadgeText = (conditional: boolean) =>
  conditional ? 'Possible next' : 'Next';

function DeadlineRow({
  deadline,
  next,
  today,
}: {
  deadline: Deadline;
  next: boolean;
  today: Date;
}) {
  // Pass the same injected date so relative wording is deterministic in tests.
  const n = daysUntil(deadline, today);
  const soon = n >= 0 && n <= 30;

  return (
    <li className="border-t border-neutral-200 py-3 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-900">
            {deadline.title}
            {next && (
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                {nextBadgeText(deadline.conditional)}
              </span>
            )}
          </p>
          <p className="text-xs text-neutral-500">
            {deadline.relatesToTaxYearLabel} · {deadline.description}
          </p>
          {deadline.conditional && deadline.conditionText && (
            <p className="mt-0.5 text-[11px] font-medium text-neutral-400 italic">
              {deadline.conditionText}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-neutral-900">{formatDate(deadline.date)}</p>
          <p className={'text-xs font-medium ' + (soon ? 'text-amber-700' : 'text-neutral-500')}>
            {relative(n)}
          </p>
        </div>
      </div>
    </li>
  );
}

export function DeadlineTracker({
  today = new Date(),
  selectedTaxYearLabel,
}: {
  today?: Date;
  // When provided the component surfaces deadlines relating to this tax year
  // first, then any remaining upcoming deadlines.
  selectedTaxYearLabel?: string;
}) {
  const allUpcoming = getUpcomingDeadlines(today);

  // Build the display list: relevant deadlines for the selected year first,
  // then the remaining upcoming ones, de-duplicated, capped at 5.
  let displayList: Deadline[];
  if (selectedTaxYearLabel) {
    const forSelectedYear = getDeadlinesForLabel(selectedTaxYearLabel, today);
    const forSelectedYearIds = new Set(forSelectedYear.map((d) => d.id));
    const others = allUpcoming.filter((d) => !forSelectedYearIds.has(d.id));
    displayList = [...forSelectedYear, ...others].slice(0, 5);
  } else {
    displayList = allUpcoming.slice(0, 5);
  }

  // The chronologically next deadline across ALL upcoming deadlines (not just
  // the selected year), so the "Next" / "Possible next" badge always reflects
  // the real next obligation.
  const nextId = allUpcoming[0]?.id;

  return (
    <section
      aria-label="Key Self Assessment deadlines"
      className="rounded-2xl border border-neutral-200 bg-white p-6"
    >
      <div className="mb-3 flex items-center gap-2">
        <h3
          className="text-lg font-bold text-neutral-900"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Key Self Assessment deadlines
        </h3>
        {selectedTaxYearLabel && (
          <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] font-semibold text-neutral-500">
            {selectedTaxYearLabel} first
          </span>
        )}
      </div>

      {displayList.length === 0 ? (
        <p className="text-sm text-neutral-600">No upcoming Self Assessment deadlines found.</p>
      ) : (
        <ul>
          {displayList.map((d) => (
            <DeadlineRow key={d.id} deadline={d} next={d.id === nextId} today={today} />
          ))}
        </ul>
      )}

      <p className="mt-4 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
        General guidance for UK Self Assessment — not personal tax advice. Conditional
        deadlines (marked &ldquo;may apply&rdquo;) do not apply to every taxpayer. Your
        dates may differ if HMRC issued a notice to file late or has not required payments
        on account. Always verify on GOV.UK.
      </p>
    </section>
  );
}
