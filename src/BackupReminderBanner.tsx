import { useState } from 'react';
import { useTaxStore } from './store';
import { storageService } from './storage';
import { Button } from './components';

export function BackupReminderBanner() {
  const income = useTaxStore((s) => s.income);
  const expenses = useTaxStore((s) => s.expenses);
  // Only tracks "snoozed just now in this render session" so the banner can
  // disappear immediately on click; the persisted snooze/threshold check is
  // otherwise a pure derived value recomputed every render (no effect needed).
  const [dismissedNow, setDismissedNow] = useState(false);

  const reminderDue = !dismissedNow && storageService.shouldShowBackupReminder(income, expenses);

  const handleSnooze = () => {
    storageService.snoozeBackupReminder(7);
    setDismissedNow(true);
  };

  if (!reminderDue) return null;

  return (
    <div
      role="status"
      className="border-b border-blue-300 bg-blue-50 px-4 py-3 text-blue-900 sm:px-6 print:hidden"
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="mt-0.5 text-lg leading-none">💾</span>
          <div>
            <p className="text-sm font-bold">Backup recommended</p>
            <p className="text-sm">
              You have recorded several transactions but haven&apos;t exported a backup recently.
              Remember that data is only stored in this browser. Go to Settings to export a backup.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleSnooze}>
            Remind me in 7 days
          </Button>
        </div>
      </div>
    </div>
  );
}
