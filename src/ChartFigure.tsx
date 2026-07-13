import { useId, type ReactNode } from 'react';

interface ChartFigureProps {
  title: string;
  subtitle?: string;
  // Axis meaning, e.g. "Amount (£) by month" — surfaced to screen readers.
  axisLabel: string;
  // Series/column headers for the data table, e.g. ["Received", "Expenses"].
  columns: string[];
  // One row per period/category with a value per column.
  rows: { label: string; values: number[] }[];
  // Visible key swatches (decorative; the table carries the same info).
  legend?: { label: string; color: string }[];
  // Label for the row header column of the SR table. Defaults to "Period" which
  // is correct for monthly charts, but charts grouped by source or category
  // should pass "Source" or "Category" respectively.
  rowHeaderLabel?: string;
  // A short plain-text summary of the key insight, e.g.
  // "June received income was £2,200. No expenses were recorded."
  // Surfaced above the data table for screen reader users who want the
  // headline without navigating the full table.
  summary?: string;
  children: ReactNode; // the decorative visual bars
}

const money = (n: number) => `£${n.toFixed(2)}`;

// Wraps a decorative bar chart with an accessible structure: a <figure> with a
// visible caption, a visible legend + axis label, the decorative visual (hidden
// from assistive tech), and a screen-reader-only data table carrying the exact
// numbers. An optional `summary` gives a concise prose headline.
export function ChartFigure({
  title,
  subtitle,
  axisLabel,
  columns,
  rows,
  legend,
  rowHeaderLabel = 'Period',
  summary,
  children,
}: ChartFigureProps) {
  const captionId = useId();
  const tableId = useId();
  return (
    <figure aria-labelledby={captionId} style={{ margin: 0 }}>
      <figcaption
        id={captionId}
        style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px', fontFamily: 'Manrope, sans-serif' }}
      >
        {title}
        {subtitle ? <span style={{ fontSize: '13px', fontWeight: 500, color: '#75808A' }}> · {subtitle}</span> : null}
      </figcaption>
      <p style={{ fontSize: '12px', color: '#75808A', marginBottom: '12px' }}>{axisLabel}</p>

      {legend && legend.length > 0 && (
        <ul aria-hidden="true" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', listStyle: 'none', margin: '0 0 12px', padding: 0 }}>
          {legend.map((l) => (
            <li key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#565F68' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: l.color, display: 'inline-block' }} />
              {l.label}
            </li>
          ))}
        </ul>
      )}

      {/* Decorative visual — hidden from assistive tech; the table below is the
          accessible equivalent. */}
      <div aria-hidden="true">{children}</div>

      {/* Screen-reader content: concise summary first, then full data table. */}
      <div className="sr-only">
        {summary && <p>{summary}</p>}
        <table id={tableId}>
          <caption>{`${title}${subtitle ? ` (${subtitle})` : ''} — ${axisLabel}`}</caption>
          <thead>
            <tr>
              <th scope="col">{rowHeaderLabel}</th>
              {columns.map((c) => (
                <th key={c} scope="col">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                {r.values.map((v, i) => (
                  <td key={i}>{money(v)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
