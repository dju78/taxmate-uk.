import { useEffect, useRef, useState } from 'react';

interface AddTransactionButtonProps {
  onAddIncome: () => void;
  onAddExpense: () => void;
}

const MENU_ID = 'add-transaction-menu';

// Persistent global action available from every view. "+ Add transaction" opens
// an accessible menu offering "Add income" or "Add expense" with full keyboard
// support (arrow keys, Home/End, Escape returns focus to the trigger).
export function AddTransactionButton({ onAddIncome, onAddExpense }: AddTransactionButtonProps) {
  const items = [
    { label: 'Add income', onSelect: onAddIncome },
    { label: 'Add expense', onSelect: onAddExpense },
  ];

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Move DOM focus to the active menu item while the menu is open.
  useEffect(() => {
    if (open) itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const openMenu = (index = 0) => {
    setActiveIndex(index);
    setOpen(true);
  };
  const closeMenu = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };
  const choose = (fn: () => void) => {
    setOpen(false);
    buttonRef.current?.focus();
    fn();
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openMenu(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openMenu(items.length - 1);
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + items.length) % items.length);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(items.length - 1);
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu(true);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? MENU_ID : undefined}
        onClick={() => (open ? closeMenu(false) : openMenu(0))}
        onKeyDown={onTriggerKeyDown}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white outline-none hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1"
      >
        + Add transaction
      </button>
      {open && (
        <div
          id={MENU_ID}
          role="menu"
          aria-label="Add transaction"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
        >
          {items.map((item, i) => (
            <button
              key={item.label}
              ref={(el) => { itemRefs.current[i] = el; }}
              type="button"
              role="menuitem"
              tabIndex={activeIndex === i ? 0 : -1}
              onClick={() => choose(item.onSelect)}
              className="block w-full px-4 py-3 text-left text-sm font-medium text-neutral-900 outline-none hover:bg-neutral-100 focus-visible:bg-neutral-100 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-neutral-200"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
