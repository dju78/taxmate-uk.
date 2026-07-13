// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DeadlineTracker } from './DeadlineTracker';
import { IncomeForm } from './IncomeForm';
import { ExpenseForm } from './ExpenseForm';
import { ChartFigure } from './ChartFigure';

afterEach(cleanup);

// ─────────────────────────────────────────────────────────────────────────────
// DeadlineTracker
// ─────────────────────────────────────────────────────────────────────────────
describe('DeadlineTracker', () => {
  it('renders a region, heading, and general-guidance disclaimer', () => {
    render(<DeadlineTracker today={new Date(2026, 6, 13)} />);
    // aria-label and h3 both say the same thing now (no more singular/plural mismatch).
    const section = screen.getByRole('region', { name: /Key Self Assessment deadlines/i });
    expect(section).toBeTruthy();
    expect(screen.getByText('Key Self Assessment deadlines')).toBeTruthy();
    expect(screen.getByText(/not personal tax advice/i)).toBeTruthy();
  });

  it('marks the chronologically next deadline with a badge', () => {
    render(<DeadlineTracker today={new Date(2026, 6, 13)} />);
    // On 13 Jul 2026 the next deadline is the July POA — it is conditional,
    // so the badge reads "Possible next" not "Next".
    expect(screen.getByText('Possible next')).toBeTruthy();
  });

  it('shows conditionText for conditional deadlines', () => {
    render(<DeadlineTracker today={new Date(2026, 6, 13)} />);
    // The July 2026 POA should show its conditionText; use getAllByText since
    // more than one conditional POA may appear in the list.
    const condTexts = screen.getAllByText(/Only if HMRC requires payments on account/i);
    expect(condTexts.length).toBeGreaterThan(0);
  });

  it('surfaces the selected tax year label in the heading area', () => {
    render(<DeadlineTracker today={new Date(2026, 6, 13)} selectedTaxYearLabel="2025/26" />);
    // The chip showing which year is prioritised.
    expect(screen.getByText(/2025\/26 first/i)).toBeTruthy();
  });

  it('uses injected today for relative wording (not the live system clock)', () => {
    // 13 Jul 2026 → 31 Jul 2026 = 18 days away.
    render(<DeadlineTracker today={new Date(2026, 6, 13)} />);
    expect(screen.getByText('in 18 days')).toBeTruthy();
  });

  it('shows "due today" when deadline is on injected date', () => {
    // 31 Jul 2026 is the POA deadline; inject that as today.
    render(<DeadlineTracker today={new Date(2026, 6, 31)} />);
    expect(screen.getByText('due today')).toBeTruthy();
  });

  it('shows "due tomorrow" when deadline is one day away', () => {
    // 30 Jul 2026 → 31 Jul 2026 = tomorrow.
    render(<DeadlineTracker today={new Date(2026, 6, 30)} />);
    expect(screen.getByText('due tomorrow')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IncomeForm accessibility
// ─────────────────────────────────────────────────────────────────────────────
describe('IncomeForm accessibility (migrated to TSX)', () => {
  it('every field has a hard-linked label, including Description and Notes', () => {
    render(<IncomeForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText('Date *')).toBeTruthy();
    expect(screen.getByLabelText('Client or Income Source *')).toBeTruthy();
    expect(screen.getByLabelText('Description')).toBeTruthy();
    expect(screen.getByLabelText('Category *')).toBeTruthy();
    expect(screen.getByLabelText('Amount (£) *')).toBeTruthy();
    expect(screen.getByLabelText('Status *')).toBeTruthy();
    expect(screen.getByLabelText('Notes')).toBeTruthy();
  });

  it('shows connected error messages on invalid submit', () => {
    render(<IncomeForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.submit(screen.getByRole('button', { name: 'Add Income' }).closest('form')!);
    const source = screen.getByLabelText('Client or Income Source *');
    expect(source.getAttribute('aria-invalid')).toBe('true');
    const describedBy = source.getAttribute('aria-describedby');
    expect(describedBy).toBe('income-source-error');
    expect(document.getElementById(describedBy!)?.getAttribute('role')).toBe('alert');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ExpenseForm accessibility
// ─────────────────────────────────────────────────────────────────────────────
describe('ExpenseForm accessibility (Payment Method + Notes wired)', () => {
  it('links labels for Category, Payment Method and Notes', () => {
    render(<ExpenseForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText('Category *')).toBeTruthy();
    expect(screen.getByLabelText('Payment Method *')).toBeTruthy();
    expect(screen.getByLabelText('Notes')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ChartFigure accessibility
// ─────────────────────────────────────────────────────────────────────────────
describe('ChartFigure accessibility', () => {
  it('renders a figure with a caption and a screen-reader data table', () => {
    render(
      <ChartFigure
        title="Income vs expenses"
        subtitle="2026/27"
        axisLabel="Amount by month"
        columns={['Received', 'Expenses']}
        rows={[{ label: 'May', values: [100, 20] }]}
      >
        <div>bars</div>
      </ChartFigure>
    );
    const fig = screen.getByRole('figure', { name: /Income vs expenses/ });
    expect(fig).toBeTruthy();
    const table = fig.querySelector('table');
    expect(table).toBeTruthy();
    expect(table!.textContent).toContain('£100.00');
    expect(table!.textContent).toContain('£20.00');
    expect(fig.querySelector('th[scope="col"]')).toBeTruthy();
    expect(fig.querySelector('th[scope="row"]')).toBeTruthy();
  });

  it('uses "Period" as default row header label', () => {
    render(
      <ChartFigure
        title="Income trend"
        axisLabel="By month"
        columns={['Received']}
        rows={[{ label: 'Apr', values: [500] }]}
      >
        <div />
      </ChartFigure>
    );
    const fig = screen.getByRole('figure');
    expect(fig.querySelector('th[scope="col"]')?.textContent).toBe('Period');
  });

  it('uses a custom rowHeaderLabel when provided', () => {
    render(
      <ChartFigure
        title="Income by source"
        axisLabel="By source"
        rowHeaderLabel="Source"
        columns={['Received']}
        rows={[{ label: 'Acme Corp', values: [1200] }]}
      >
        <div />
      </ChartFigure>
    );
    const fig = screen.getByRole('figure');
    expect(fig.querySelector('th[scope="col"]')?.textContent).toBe('Source');
  });

  it('uses Category rowHeaderLabel for expense category charts', () => {
    render(
      <ChartFigure
        title="Expenses by category"
        axisLabel="By category"
        rowHeaderLabel="Category"
        columns={['Expenses']}
        rows={[{ label: 'Office costs', values: [300] }]}
      >
        <div />
      </ChartFigure>
    );
    const fig = screen.getByRole('figure');
    expect(fig.querySelector('th[scope="col"]')?.textContent).toBe('Category');
  });

  it('renders a concise accessible summary when the summary prop is provided', () => {
    render(
      <ChartFigure
        title="Income trend"
        axisLabel="By month"
        summary="June received income was £2,200. No expenses were recorded."
        columns={['Received']}
        rows={[{ label: 'Jun', values: [2200] }]}
      >
        <div />
      </ChartFigure>
    );
    const fig = screen.getByRole('figure');
    // The summary is inside the sr-only block — it must be in the DOM.
    expect(fig.textContent).toContain('June received income was £2,200');
  });
});
