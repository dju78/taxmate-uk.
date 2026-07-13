import { useState } from 'react';
import { useTaxStore, taxYearStartToLabel, getAvailableTaxYears } from './store';
import { storageService } from './storage';
import { Button } from './components';
import { useDialog } from './hooks';

export const CURRENT_ONBOARDING_VERSION = 1;

// Whether onboarding should open on mount: reads the saved preference once,
// synchronously, as a lazy initializer rather than an effect (avoids the
// setState-in-effect anti-pattern and one wasted extra render).
const shouldOpenOnboarding = (): boolean => {
  const prefs = storageService.getAppPreferences();
  const savedVersion = prefs.onboardingVersion || 0;
  return savedVersion < CURRENT_ONBOARDING_VERSION;
};

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState<boolean>(shouldOpenOnboarding);
  const [step, setStep] = useState(1);
  const selectedTaxYear = useTaxStore((s) => s.selectedTaxYear);
  const setSelectedTaxYear = useTaxStore((s) => s.setSelectedTaxYear);
  const loadDemo = useTaxStore((s) => s.loadDemo);

  const handleFinish = (withDemo: boolean) => {
    if (withDemo) {
      loadDemo();
    }
    storageService.setAppPreferences({ 
      onboardingCompleted: true, 
      onboardingVersion: CURRENT_ONBOARDING_VERSION,
      completedAt: new Date().toISOString()
    });
    setIsOpen(false);
  };

  const handleSkip = () => {
    storageService.setAppPreferences({
      onboardingSkipped: true,
      onboardingVersion: CURRENT_ONBOARDING_VERSION,
      completedAt: new Date().toISOString()
    });
    setIsOpen(false);
  };

  const dialogRef = useDialog(isOpen, handleSkip);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        tabIndex={-1}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-6 flex justify-between items-center">
          <h2 id="onboarding-title" className="text-xl font-bold text-neutral-900">
            Welcome to TaxMate UK 👋
          </h2>
          <button
            type="button"
            className="text-neutral-500 hover:text-neutral-800"
            onClick={handleSkip}
            aria-label="Skip onboarding"
          >
            Skip
          </button>
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <h3 className="font-semibold text-green-900">Stored on this device</h3>
              <p className="mt-2 text-sm text-green-800">
                TaxMate does not send your financial data to any cloud servers. 
                Everything is stored right here in your browser. 
                Because of this, you should <strong>export a backup regularly</strong> to ensure you don't lose your data if you clear your browser history.
              </p>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="primary" onClick={() => setStep(2)}>
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <h3 className="font-semibold text-neutral-900">Select your tax year</h3>
              <p className="mt-2 text-sm text-neutral-600 mb-4">
                You can change this later at any time from the top right corner.
              </p>
              <select
                value={selectedTaxYear}
                onChange={(e) => setSelectedTaxYear(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                {getAvailableTaxYears().map((year) => (
                  <option key={year} value={year}>
                    {taxYearStartToLabel(year)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-between mt-4">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button variant="primary" onClick={() => setStep(3)}>Next</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <h3 className="font-semibold text-blue-900">How would you like to start?</h3>
              <p className="mt-2 text-sm text-blue-800">
                You can start with a clean slate, or load some demo data to see how TaxMate calculates your income, expenses, and tax estimates.
              </p>
            </div>
            <div className="flex flex-col gap-3 mt-4 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="secondary" onClick={() => handleFinish(false)}>
                  Start empty
                </Button>
                <Button variant="primary" onClick={() => handleFinish(true)}>
                  Load demo data
                </Button>
              </div>
            </div>
          </div>
        )}

        <p className="sr-only" aria-live="polite">Step {step} of 3</p>
        <div className="mt-6 flex justify-center gap-1">
          <div aria-hidden="true" className={`h-1.5 w-8 rounded-full ${step >= 1 ? 'bg-green-600' : 'bg-neutral-200'}`} />
          <div aria-hidden="true" className={`h-1.5 w-8 rounded-full ${step >= 2 ? 'bg-green-600' : 'bg-neutral-200'}`} />
          <div aria-hidden="true" className={`h-1.5 w-8 rounded-full ${step >= 3 ? 'bg-green-600' : 'bg-neutral-200'}`} />
        </div>
      </div>
    </div>
  );
}
