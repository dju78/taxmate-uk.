import { useRef, useState, type ReactNode } from 'react';
import { storageService, type ImportValidationResult } from './storage';
import { useTaxStore, taxYearStartToLabel } from './store';
import { useDialog } from './hooks';
import { diagnosticsService } from './diagnostics';
import { Table } from './components';

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useDialog(open, onClose) as unknown as React.RefObject<HTMLDivElement>;
  if (!open) return null;
  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4"
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-dialog-title"
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="data-dialog-title" className="mb-3 text-lg font-bold text-neutral-900">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

const btnBase =
  'rounded-lg px-5 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1';
const btnSecondary = `${btnBase} border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 hover:border-neutral-400`;
const btnPrimary = `${btnBase} bg-green-600 text-white shadow-sm hover:bg-green-700 disabled:opacity-50`;
const btnDanger = `${btnBase} bg-red-600 text-white shadow-sm hover:bg-red-700`;
const btnGhost = `${btnBase} bg-transparent text-neutral-700 hover:bg-neutral-100`;

type ImportMode = 'restore' | 'merge';

export function DataAndBackup() {
  const income = useTaxStore((s) => s.income);
  const expenses = useTaxStore((s) => s.expenses);
  const selectedTaxYear = useTaxStore((s) => s.selectedTaxYear);
  const mergeImport = useTaxStore((s) => s.mergeImport);
  const restoreImport = useTaxStore((s) => s.restoreImport);
  const loadDemo = useTaxStore((s) => s.loadDemo);
  const removeDemo = useTaxStore((s) => s.removeDemo);
  const clearAll = useTaxStore((s) => s.clearAll);

  const [preview, setPreview] = useState<ImportValidationResult | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('restore');
  const [showClear, setShowClear] = useState(false);
  const [showRemoveDemo, setShowRemoveDemo] = useState(false);
  const [showClearDiagnostics, setShowClearDiagnostics] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Re-read directly from localStorage on every render (mount, and any
  // re-render triggered by our own export/import/clear actions via flash()) —
  // this is a debug view, not a live subscription.
  const diagnosticsEntries = diagnosticsService.getEntries();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasDemo = income.some((r) => r.isDemo) || expenses.some((r) => r.isDemo);
  const flash = (m: string) => {
    setMessage(m);
    window.setTimeout(() => setMessage(null), 5000);
  };

  const stamp = () => new Date().toISOString().slice(0, 10);
  // lastExportDate is only recorded AFTER the download call completes without
  // throwing — a failed export must never advance the backup-reminder clock.
  const handleExportJSON = () => {
    try {
      const bundle = storageService.getExportBundle({ selectedTaxYear });
      downloadFile(`taxmate-backup-${stamp()}.json`, JSON.stringify(bundle, null, 2), 'application/json');
      storageService.recordSuccessfulExport();
      diagnosticsService.logEvent('EXPORT_SUCCESS', 'export', 'info');
      flash('JSON backup exported successfully.');
    } catch {
      diagnosticsService.logEvent('EXPORT_FAILURE', 'export', 'error');
      flash('JSON export failed. Your existing data was not changed.');
    }
  };
  const handleExportCSV = () => {
    try {
      const taxRef = storageService.getTaxYearStartForYear(selectedTaxYear);
      const yearTag = taxYearStartToLabel(selectedTaxYear).replace('/', '-');
      const inc = storageService.recordsToCSV(storageService.getIncomeInTaxYear(income, taxRef));
      const exp = storageService.recordsToCSV(storageService.getExpensesInTaxYear(expenses, taxRef));
      downloadFile(`taxmate-income-${yearTag}-${stamp()}.csv`, inc || 'No income records', 'text/csv');
      downloadFile(`taxmate-expenses-${yearTag}-${stamp()}.csv`, exp || 'No expense records', 'text/csv');
      diagnosticsService.logEvent('EXPORT_SUCCESS', 'export', 'info');
      flash('CSV export completed successfully.');
    } catch {
      diagnosticsService.logEvent('EXPORT_FAILURE', 'export', 'error');
      flash('CSV export failed. Your existing data was not changed.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setImportMode('restore');
    try {
      const text = await file.text();
      const result = storageService.parseImportText(text);
      if (!result.ok) diagnosticsService.logEvent('IMPORT_FAILURE', 'import', 'warning');
      setPreview(result);
    } catch {
      diagnosticsService.logEvent('IMPORT_FAILURE', 'import', 'error');
      setPreview({
        ok: false,
        errors: ['The file could not be read. Please try again with a different file.'],
        income: [],
        expenses: [],
        preferences: {},
      });
    }
  };

  const confirmImport = () => {
    if (!preview || !preview.ok) return;
    try {
      const result =
        importMode === 'restore'
          ? restoreImport(preview.income, preview.expenses, preview.preferences)
          : mergeImport(preview.income, preview.expenses);
      const verb = importMode === 'restore' ? 'Restored' : 'Merged';
      diagnosticsService.logEvent('IMPORT_SUCCESS', 'import', 'info');
      setPreview(null);
      flash(`${verb} ${result.income} income and ${result.expenses} expense record(s).`);
    } catch {
      diagnosticsService.logEvent('IMPORT_FAILURE', 'import', 'error');
      setPreview(null);
      flash('Import failed. Your existing data was not changed.');
    }
  };

  const confirmClear = () => {
    clearAll();
    setShowClear(false);
    flash('All data was cleared from this browser.');
  };

  const confirmRemoveDemo = () => {
    const r = removeDemo();
    setShowRemoveDemo(false);
    flash(`Removed ${r.income} demo income and ${r.expenses} demo expense record(s). Your records were kept.`);
  };

  const handleExportDiagnostics = () => {
    downloadFile(`taxmate-diagnostic-log-${stamp()}.json`, diagnosticsService.exportAsJSON(), 'application/json');
    flash('Diagnostic log exported successfully.');
  };

  const confirmClearDiagnostics = () => {
    diagnosticsService.clearLog();
    setShowClearDiagnostics(false);
    flash('Diagnostic log cleared.');
  };

  const prefYear =
    preview && typeof preview.preferences.selectedTaxYear === 'number'
      ? taxYearStartToLabel(preview.preferences.selectedTaxYear)
      : null;

  // Derived (not state + effect): recomputed from the current preview and the
  // selected import mode on every render.
  const previewStats =
    preview && preview.ok
      ? storageService.previewImport(importMode, preview.income, preview.expenses)
      : null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-7">
      <h2 className="mb-2 text-lg font-bold text-neutral-900">Data &amp; backup</h2>
      <p className="mb-6 text-sm text-neutral-600">
        Your records are stored only in this browser (localStorage). They are not sent to any server
        and may be lost if you clear your browser data or switch device. Export a backup regularly.
      </p>

      <div role="status" aria-live="polite">
        {message && (
          <div className="mb-6 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800">
            {message}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-7">
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-500">Export</h3>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={btnSecondary} onClick={handleExportJSON}>
              Export JSON backup
            </button>
            <button type="button" className={btnSecondary} onClick={handleExportCSV}>
              Export CSV (selected tax year)
            </button>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-7">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-500">Import</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFileChange}
          />
          <button type="button" className={btnSecondary} onClick={() => fileInputRef.current?.click()}>
            Import JSON backup…
          </button>
          <p className="mt-2 text-xs text-neutral-500">
            You will choose Restore or Merge and confirm before anything changes.
          </p>
        </div>

        <div className="border-t border-neutral-200 pt-7">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-500">Demo data</h3>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={btnSecondary} onClick={() => flash(demoMsg(loadDemo()))} disabled={hasDemo}>
              Load demo data
            </button>
            {hasDemo && (
              <button type="button" className={btnSecondary} onClick={() => setShowRemoveDemo(true)}>
                Remove demo data
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Demo records are labelled “Demo”, dated in the selected tax year, and can be removed
            without affecting your own records.
          </p>
        </div>

        <div className="border-t border-neutral-200 pt-7">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-500">Diagnostics</h3>
          <p className="mb-3 text-xs text-neutral-500">
            A local, technical log of import/export outcomes and storage events — kept only in this
            browser, never included in your backup export, used purely to help debug problems.
          </p>
          {diagnosticsEntries.length === 0 ? (
            <p className="text-sm text-neutral-500">No diagnostic entries recorded yet.</p>
          ) : (
            <>
              <p className="mb-3 text-xs text-neutral-500">
                {diagnosticsEntries.length} entr{diagnosticsEntries.length === 1 ? 'y' : 'ies'} (most recent 100 kept)
              </p>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-neutral-200">
                <Table
                  columns={['Time', 'Code', 'Feature', 'Severity']}
                  rows={diagnosticsEntries
                    .slice()
                    .reverse()
                    .map((e) => [
                      new Date(e.timestamp).toLocaleString('en-GB'),
                      e.code,
                      e.feature,
                      e.severity,
                    ])}
                />
              </div>
            </>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className={btnSecondary}
              onClick={handleExportDiagnostics}
              disabled={diagnosticsEntries.length === 0}
            >
              Export log
            </button>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setShowClearDiagnostics(true)}
              disabled={diagnosticsEntries.length === 0}
            >
              Clear log
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-red-700">Danger zone</h3>
          <button type="button" className={btnDanger} onClick={() => setShowClear(true)}>
            Clear all data…
          </button>
          <p className="mt-3 text-xs text-red-700">
            Removes all records, the selected tax year and recovery state from this browser.
          </p>
        </div>
      </div>

      {/* Import preview / confirm */}
      <Dialog open={preview !== null} onClose={() => setPreview(null)} title="Import backup">
        {preview && preview.ok ? (
          <>
            <p className="text-sm text-neutral-700">
              This backup contains <strong>{preview.income.length}</strong> income and{' '}
              <strong>{preview.expenses.length}</strong> expense record(s)
              {prefYear ? <> (saved tax year {prefYear})</> : null}.
            </p>

            <fieldset className="mt-4">
              <legend className="text-sm font-semibold text-neutral-700">Import mode</legend>
              <label className="mt-2 flex items-start gap-2 text-sm text-neutral-800">
                <input
                  type="radio"
                  name="import-mode"
                  value="restore"
                  checked={importMode === 'restore'}
                  onChange={() => setImportMode('restore')}
                  className="mt-1"
                />
                <span>
                  <strong>Restore backup</strong> — replace <em>all</em> current records and
                  preferences with this backup. Anything not in the backup is removed.
                </span>
              </label>
              <label className="mt-2 flex items-start gap-2 text-sm text-neutral-800">
                <input
                  type="radio"
                  name="import-mode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="mt-1"
                />
                <span>
                  <strong>Merge backup</strong> — add records from the backup that you don’t already
                  have (matched by id). Existing records and preferences are kept.
                </span>
              </label>
            </fieldset>

            {previewStats && importMode === 'restore' && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Restore will replace your current {income.length} income and {expenses.length}{' '}
                expense record(s) ({previewStats.toReplace} total) with the {previewStats.toAddIncome}{' '}
                income and {previewStats.toAddExpenses} expense record(s) in this backup. Export a
                backup first if you might need what you have now.
              </p>
            )}

            {previewStats && importMode === 'merge' && (
              <ul className="mt-3 space-y-1 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                <li>
                  <strong>{previewStats.toAddIncome + previewStats.toAddExpenses}</strong> record(s)
                  will be added ({previewStats.toAddIncome} income, {previewStats.toAddExpenses}{' '}
                  expense).
                </li>
                {(previewStats.toSkipIncome > 0 || previewStats.toSkipExpenses > 0) && (
                  <li>
                    <strong>{previewStats.toSkipIncome + previewStats.toSkipExpenses}</strong> record(s)
                    will be skipped — same id already exists ({previewStats.toSkipIncome} income,{' '}
                    {previewStats.toSkipExpenses} expense).
                  </li>
                )}
                {(previewStats.probableDuplicateIncome > 0 || previewStats.probableDuplicateExpenses > 0) && (
                  <li className="text-amber-700">
                    ⚠ <strong>{previewStats.probableDuplicateIncome + previewStats.probableDuplicateExpenses}</strong>{' '}
                    record(s) look like probable duplicates of records you already have (same date,
                    amount and source/merchant, different id) — they will still be added under Merge.
                    Use Restore if you want to replace rather than merge.
                  </li>
                )}
              </ul>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-700">
              This file cannot be imported. Your existing data has not been changed.
            </p>
            <ul className="mt-3 max-h-56 list-disc overflow-y-auto rounded-lg bg-neutral-50 p-3 pl-8 text-sm text-red-700">
              {preview?.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className={btnGhost} onClick={() => setPreview(null)}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} onClick={confirmImport} disabled={!preview?.ok}>
            {importMode === 'restore' ? 'Restore' : 'Merge'}
          </button>
        </div>
      </Dialog>

      {/* Clear diagnostics confirm */}
      <Dialog open={showClearDiagnostics} onClose={() => setShowClearDiagnostics(false)} title="Clear diagnostic log">
        <p className="text-sm text-neutral-700">
          This removes the {diagnosticsEntries.length} local diagnostic entr{diagnosticsEntries.length === 1 ? 'y' : 'ies'} only.
          Your income, expense and preference records are not affected.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className={btnGhost} onClick={() => setShowClearDiagnostics(false)}>
            Cancel
          </button>
          <button type="button" className={btnDanger} onClick={confirmClearDiagnostics}>
            Clear log
          </button>
        </div>
      </Dialog>

      {/* Remove demo confirm */}
      <Dialog open={showRemoveDemo} onClose={() => setShowRemoveDemo(false)} title="Remove demo data">
        <p className="text-sm text-neutral-700">
          This removes the demo records only. Your own records are kept.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className={btnGhost} onClick={() => setShowRemoveDemo(false)}>
            Cancel
          </button>
          <button type="button" className={btnDanger} onClick={confirmRemoveDemo}>
            Remove demo data
          </button>
        </div>
      </Dialog>

      {/* Clear-all confirm */}
      <Dialog open={showClear} onClose={() => setShowClear(false)} title="Clear all data">
        <p className="text-sm text-neutral-700">
          This permanently deletes all <strong>{income.length}</strong> income and{' '}
          <strong>{expenses.length}</strong> expense record(s), and resets the selected tax year and
          recovery state in this browser. This cannot be undone. Export a backup first if you might
          need them.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className={btnGhost} onClick={() => setShowClear(false)}>
            Cancel
          </button>
          <button type="button" className={btnDanger} onClick={confirmClear}>
            Clear all data
          </button>
        </div>
      </Dialog>
    </div>
  );
}

function demoMsg(r: { income: number; expenses: number }): string {
  if (r.income === 0 && r.expenses === 0) return 'Demo data is already loaded.';
  return `Loaded ${r.income} demo income and ${r.expenses} demo expense record(s).`;
}
