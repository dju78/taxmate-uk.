// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncomeFilters, ExpenseFilters } from './FilterBar';
import { defaultIncomeFilters, defaultExpenseFilters } from './filters';

afterEach(cleanup);

describe('IncomeFilters component', () => {
  const baseProps = {
    filters: defaultIncomeFilters,
    onChange: vi.fn(),
    onReset: vi.fn(),
    sources: ['Alpha', 'Beta'],
    categories: ['Client work', 'Freelance'],
    search: '',
    onSearchChange: vi.fn(),
    sort: 'date-desc' as any,
    onSortChange: vi.fn(),
  };

  it('renders a labelled status group with segmented buttons (aria-pressed)', () => {
    render(<IncomeFilters {...baseProps} onChange={vi.fn()} />);
    const group = screen.getByRole('group', { name: 'Filter by status' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['All', 'Received', 'Pending', 'Overdue']);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true'); // "All" active by default
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('selecting each status calls onChange with the status', () => {
    const onChange = vi.fn();
    render(<IncomeFilters {...baseProps} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Received' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pending' }));
    fireEvent.click(screen.getByRole('button', { name: 'Overdue' }));
    expect(onChange).toHaveBeenNthCalledWith(1, { status: 'received' });
    expect(onChange).toHaveBeenNthCalledWith(2, { status: 'pending' });
    expect(onChange).toHaveBeenNthCalledWith(3, { status: 'overdue' });
  });

  it('keyboard activation of a status button works', async () => {
    const onChange = vi.fn();
    render(<IncomeFilters {...baseProps} onChange={onChange} />);
    const received = screen.getByRole('button', { name: 'Received' });
    received.focus();
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith({ status: 'received' });
  });

  it('changing source and category calls onChange', () => {
    const onChange = vi.fn();
    render(<IncomeFilters {...baseProps} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'Alpha' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Freelance' } });
    expect(onChange).toHaveBeenCalledWith({ source: 'Alpha' });
    expect(onChange).toHaveBeenCalledWith({ category: 'Freelance' });
  });

  it('shows the reset button only when a filter is active and calls onReset', () => {
    const onReset = vi.fn();
    const { rerender } = render(<IncomeFilters {...baseProps} onReset={onReset} />);
    expect(screen.queryByRole('button', { name: 'Reset filters' })).toBeNull();
    rerender(<IncomeFilters {...baseProps} onReset={onReset} filters={{ ...defaultIncomeFilters, category: 'Freelance' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(onReset).toHaveBeenCalled();
  });

  it('shows an accessible error for an invalid date range and marks the inputs', () => {
    render(
      <IncomeFilters
        {...baseProps}
        filters={{ ...defaultIncomeFilters, dateFrom: '2026-07-20', dateTo: '2026-07-10' }}
      />
    );
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Start date must be on or before the end date.');
    const from = screen.getByLabelText('From');
    expect(from.getAttribute('aria-invalid')).toBe('true');
    expect(from.getAttribute('aria-describedby')).toBe(alert.id);
  });
});

describe('ExpenseFilters component', () => {
  it('changing category calls onChange and invalid range shows an error', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ExpenseFilters filters={defaultExpenseFilters} onChange={onChange} onReset={vi.fn()} categories={['Travel', 'Supplies']} search="" onSearchChange={vi.fn()} sort="date-desc" onSortChange={vi.fn()} />
    );
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Travel' } });
    expect(onChange).toHaveBeenCalledWith({ category: 'Travel' });

    rerender(
      <ExpenseFilters
        filters={{ ...defaultExpenseFilters, dateFrom: '2026-08-01', dateTo: '2026-07-01' }}
        onChange={onChange}
        onReset={vi.fn()}
        categories={['Travel']}
        search=""
        onSearchChange={vi.fn()}
        sort="date-desc"
        onSortChange={vi.fn()}
      />
    );
    expect(screen.getByRole('alert').textContent).toContain('Start date must be on or before the end date.');
  });
});
