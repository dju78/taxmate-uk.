import { useState } from 'react';
import { Button, Alert } from './components';
import { INCOME_STATUS, INCOME_STATUS_LABELS, INCOME_STATUS_OPTIONS } from './storage';
import { isValidAmount, isValidDateString, formatLocalDate } from './validation';
import type { IncomeRecord, IncomeStatus } from './types';

const INCOME_CATEGORIES = ['Client work', 'Freelance', 'Passive income', 'Other'] as const;
type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

interface IncomeFormData {
  date: string;
  source: string;
  description: string;
  // Tightened to the approved enum rather than plain string.
  category: IncomeCategory;
  amount: string;
  // Tightened to the IncomeStatus union rather than plain string.
  status: IncomeStatus;
  notes: string;
}

type IncomeFormErrors = Partial<Record<keyof IncomeFormData, string>>;

interface IncomeFormProps {
  initialData?: IncomeRecord | null;
  onSubmit: (data: IncomeFormData) => void;
  onCancel: () => void;
}

const labelCls = 'mb-1 block text-[13px] font-semibold text-neutral-700';
const fieldCls =
  'box-border w-full rounded-lg border-2 border-neutral-200 px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-green-500';
const fieldErrCls =
  'box-border w-full rounded-lg border-2 border-red-600 px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-red-500';
const errCls = 'mt-1 text-[13px] text-red-600';

export const IncomeForm = ({ initialData = null, onSubmit, onCancel }: IncomeFormProps) => {
  const [formData, setFormData] = useState<IncomeFormData>(() =>
    initialData
      ? {
          date: initialData.date,
          source: initialData.source,
          description: initialData.description ?? '',
          category: (INCOME_CATEGORIES as readonly string[]).includes(initialData.category ?? '')
            ? (initialData.category as IncomeCategory)
            : 'Client work',
          amount: initialData.amount,
          status: (INCOME_STATUS_OPTIONS as readonly string[]).includes(initialData.status ?? '')
            ? (initialData.status as IncomeStatus)
            : INCOME_STATUS.RECEIVED,
          notes: initialData.notes ?? '',
        }
      : {
          // Use local wall-clock date to avoid BST UTC midnight off-by-one.
          date: formatLocalDate(new Date()),
          source: '',
          description: '',
          category: 'Client work',
          amount: '',
          status: INCOME_STATUS.RECEIVED,
          notes: '',
        }
  );

  const [errors, setErrors] = useState<IncomeFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: IncomeFormErrors = {};
    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else if (!isValidDateString(formData.date)) {
      newErrors.date = 'Enter a valid calendar date';
    }
    if (!formData.source.trim()) {
      newErrors.source = 'Client or income source is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (!isValidAmount(formData.amount)) {
      newErrors.amount = 'Enter an amount greater than zero (up to 2 decimal places)';
    }
    if (!formData.status) {
      newErrors.status = 'Status is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof IncomeFormData]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateForm()) return;
    try {
      onSubmit(formData);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save income record');
    }
  };

  const err = (key: keyof IncomeFormData, id: string) =>
    errors[key] ? (
      <div id={`${id}-error`} role="alert" className={errCls}>
        {errors[key]}
      </div>
    ) : null;

  // Returns aria-invalid and aria-describedby for any field (required or optional).
  // Optional fields with no current error still get the helper applied so
  // that if validation rules are added later the wiring is already in place.
  const aria = (key: keyof IncomeFormData, id: string) => ({
    'aria-invalid': errors[key] ? (true as const) : undefined,
    'aria-describedby': errors[key] ? `${id}-error` : undefined,
  });

  return (
    <div className="w-full max-w-[500px]">
      {submitError && <Alert variant="error" title="Error" description={submitError} />}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="income-date" className={labelCls}>
            Date *
          </label>
          <input
            id="income-date"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className={errors.date ? fieldErrCls : fieldCls}
            {...aria('date', 'income-date')}
          />
          {err('date', 'income-date')}
        </div>

        <div>
          <label htmlFor="income-source" className={labelCls}>
            Client or Income Source *
          </label>
          <input
            id="income-source"
            type="text"
            name="source"
            placeholder="e.g., Acme Corp, Freelance Project"
            value={formData.source}
            onChange={handleChange}
            className={errors.source ? fieldErrCls : fieldCls}
            {...aria('source', 'income-source')}
          />
          {err('source', 'income-source')}
        </div>

        <div>
          <label htmlFor="income-description" className={labelCls}>
            Description
          </label>
          <textarea
            id="income-description"
            name="description"
            placeholder="Brief description of the work or service"
            value={formData.description}
            onChange={handleChange}
            className={`${fieldCls} min-h-20`}
            {...aria('description', 'income-description')}
          />
          {err('description', 'income-description')}
        </div>

        <div>
          <label htmlFor="income-category" className={labelCls}>
            Category *
          </label>
          <select
            id="income-category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={errors.category ? fieldErrCls : fieldCls}
            {...aria('category', 'income-category')}
          >
            {INCOME_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {err('category', 'income-category')}
        </div>

        <div>
          <label htmlFor="income-amount" className={labelCls}>
            Amount (£) *
          </label>
          <input
            id="income-amount"
            type="number"
            name="amount"
            placeholder="0.00"
            value={formData.amount}
            onChange={handleChange}
            step="0.01"
            min="0"
            className={errors.amount ? fieldErrCls : fieldCls}
            {...aria('amount', 'income-amount')}
          />
          {err('amount', 'income-amount')}
        </div>

        <div>
          <label htmlFor="income-status" className={labelCls}>
            Status *
          </label>
          <select
            id="income-status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className={errors.status ? fieldErrCls : fieldCls}
            {...aria('status', 'income-status')}
          >
            {INCOME_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {INCOME_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {err('status', 'income-status')}
        </div>

        <div>
          <label htmlFor="income-notes" className={labelCls}>
            Notes
          </label>
          <textarea
            id="income-notes"
            name="notes"
            placeholder="Any additional notes (optional)"
            value={formData.notes}
            onChange={handleChange}
            className={`${fieldCls} min-h-16`}
            {...aria('notes', 'income-notes')}
          />
          {err('notes', 'income-notes')}
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            {initialData ? 'Update Income' : 'Add Income'}
          </Button>
        </div>
      </form>
    </div>
  );
};
