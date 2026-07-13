// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddTransactionButton } from './AddTransactionButton';

afterEach(cleanup);

const setup = () => {
  const onAddIncome = vi.fn();
  const onAddExpense = vi.fn();
  render(<AddTransactionButton onAddIncome={onAddIncome} onAddExpense={onAddExpense} />);
  const trigger = screen.getByRole('button', { name: '+ Add transaction' });
  return { onAddIncome, onAddExpense, trigger };
};

describe('AddTransactionButton', () => {
  it('exposes menu semantics and toggles aria-expanded / aria-controls', () => {
    const { trigger } = setup();
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const menu = screen.getByRole('menu', { name: 'Add transaction' });
    expect(trigger.getAttribute('aria-controls')).toBe(menu.id);
  });

  it('labels the items "Add income" and "Add expense"', () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    const items = screen.getAllByRole('menuitem').map((i) => i.textContent);
    expect(items).toEqual(['Add income', 'Add expense']);
  });

  it('choosing an item calls the handler and closes the menu', () => {
    const { trigger, onAddExpense } = setup();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add expense' }));
    expect(onAddExpense).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('moves focus into the menu and supports arrow-key navigation', async () => {
    const { trigger } = setup();
    await userEvent.click(trigger);
    const items = screen.getAllByRole('menuitem');
    expect(document.activeElement).toBe(items[0]); // focus moved to first item
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(items[1]);
    await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(items[0]);
  });

  it('Escape closes the menu and returns focus to the trigger', async () => {
    const { trigger } = setup();
    await userEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
