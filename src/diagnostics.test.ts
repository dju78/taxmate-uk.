import { describe, it, expect, beforeEach } from 'vitest';
import { diagnosticsService } from './diagnostics';
import { storageService } from './storage';

beforeEach(() => localStorage.clear());

describe('diagnosticsService', () => {
  it('starts empty', () => {
    expect(diagnosticsService.getEntries()).toEqual([]);
  });

  it('appends entries with timestamp, code, feature and severity', () => {
    diagnosticsService.logEvent('IMPORT_SUCCESS', 'import', 'info');
    const entries = diagnosticsService.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].code).toBe('IMPORT_SUCCESS');
    expect(entries[0].feature).toBe('import');
    expect(entries[0].severity).toBe('info');
    expect(typeof entries[0].timestamp).toBe('string');
  });

  it('defaults severity to info when not specified', () => {
    diagnosticsService.logEvent('SCHEMA_MIGRATION', 'storage');
    expect(diagnosticsService.getEntries()[0].severity).toBe('info');
  });

  it('caps at 100 entries, dropping the oldest first (FIFO)', () => {
    for (let i = 0; i < 105; i++) {
      diagnosticsService.logEvent(`EVENT_${i}`, 'test');
    }
    const entries = diagnosticsService.getEntries();
    expect(entries).toHaveLength(100);
    expect(entries[0].code).toBe('EVENT_5');
    expect(entries[99].code).toBe('EVENT_104');
  });

  it('clearLog empties all entries', () => {
    diagnosticsService.logEvent('IMPORT_SUCCESS', 'import');
    diagnosticsService.clearLog();
    expect(diagnosticsService.getEntries()).toEqual([]);
  });

  it('resets to an empty log instead of throwing on corrupted storage', () => {
    localStorage.setItem('taxmate_diagnostic_log', 'not valid json{{{');
    expect(diagnosticsService.getEntries()).toEqual([]);
    diagnosticsService.logEvent('IMPORT_SUCCESS', 'import');
    expect(diagnosticsService.getEntries()).toHaveLength(1);
  });

  it('exportAsJSON produces valid, readable JSON of the log', () => {
    diagnosticsService.logEvent('EXPORT_SUCCESS', 'export');
    const json = diagnosticsService.exportAsJSON();
    const parsed = JSON.parse(json);
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].code).toBe('EXPORT_SUCCESS');
  });

  it('migrateIfNeeded does not log SCHEMA_MIGRATION on a brand-new browser with nothing to migrate', () => {
    // No taxmate_schema_version key and no expense records at all — this is
    // the state of every genuinely fresh install, not an actual migration.
    storageService.migrateIfNeeded();
    expect(diagnosticsService.getEntries()).toEqual([]);
  });

  it('migrateIfNeeded logs SCHEMA_MIGRATION only when a legacy category is actually remapped', () => {
    localStorage.setItem(
      'taxmate_expense_records',
      JSON.stringify([{ id: 'l1', date: '2026-05-01', merchant: 'PaperCo', category: 'Supplies', amount: '5' }])
    );
    localStorage.setItem('taxmate_schema_version', '1');
    storageService.migrateIfNeeded();
    const entries = diagnosticsService.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ code: 'SCHEMA_MIGRATION', feature: 'storage', severity: 'info' });
  });

  it('is never included in the user-facing backup/export bundle', () => {
    diagnosticsService.logEvent('IMPORT_FAILURE', 'import', 'error');
    diagnosticsService.logEvent('EXPORT_SUCCESS', 'export');
    const bundle = storageService.getExportBundle({});
    const serialised = JSON.stringify(bundle);
    expect(serialised).not.toContain('taxmate_diagnostic_log');
    expect(serialised).not.toContain('IMPORT_FAILURE');
    expect(Object.keys(bundle)).not.toContain('diagnostics');
  });
});
