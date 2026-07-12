// Persistent, prominent app-shell notice about browser-only storage.
// Copy is fixed and approved — do not edit the wording.
export function StorageNoticeBanner() {
  return (
    <div
      role="note"
      aria-label="Storage notice"
      className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 sm:px-6"
    >
      <div className="mx-auto flex max-w-[1440px] items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 text-lg leading-none">📌</span>
        <div>
          <p className="text-sm font-bold">Stored on this device</p>
          <p className="text-sm">
            TaxMate currently stores your records only in this browser and does not provide cloud
            backup. Clearing browser data or using private browsing may remove your records. Export a
            backup regularly. Do not enter highly sensitive information.
          </p>
        </div>
      </div>
    </div>
  );
}
