import { useEffect, useRef, useState } from 'react';

interface AddTransactionButtonProps {
  onAddIncome: () => void;
  onAddExpense: () => void;
}

// Persistent global action available from every view: "+ Add transaction"
// opens a menu offering Income or Expense.
export function AddTransactionButton({ onAddIncome, onAddExpense }: AddTransactionButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white outline-none hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1"
      >
        + Add transaction
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Add transaction"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onAddIncome)}
            className="block w-full px-4 py-3 text-left text-sm font-medium text-neutral-900 outline-none hover:bg-neutral-100 focus-visible:bg-neutral-100"
          >
            Income
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onAddExpense)}
            className="block w-full border-t border-neutral-200 px-4 py-3 text-left text-sm font-medium text-neutral-900 outline-none hover:bg-neutral-100 focus-visible:bg-neutral-100"
          >
            Expense
          </button>
        </div>
      )}
    </div>
  );
}
