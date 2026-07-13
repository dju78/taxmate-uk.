// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { DataAndBackup } from './DataAndBackup';
import { useTaxStore, currentTaxYearStart } from './store';
import { storageService } from './storage';
import { diagnosticsService } from './diagnostics';

afterEach(cleanup);

beforeEach(() => {
  localStorage.clear();
  storageService.clearAllData();
  diagnosticsService.clearLog();
  useTaxStore.setState({ income: [], expenses: [], selectedTaxYear: currentTaxYearStart() });
});

describe('DataAndBackup diagnostics section', () => {
  it('shows an empty state and disabled buttons when no entries exist', () => {
    render(<DataAndBackup />);
    expect(screen.getByText('No diagnostic entries recorded yet.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Export log' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Clear log' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('lists logged entries with time/code/feature/severity columns', () => {
    diagnosticsService.logEvent('IMPORT_FAILURE', 'import', 'error');
    render(<DataAndBackup />);
    expect(screen.getByText('1 entry (most recent 100 kept)')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Code' })).toBeTruthy();
    expect(screen.getByText('IMPORT_FAILURE')).toBeTruthy();
    expect(screen.getByText('import')).toBeTruthy();
    expect(screen.getByText('error')).toBeTruthy();
  });

  it('"Clear log" removes all entries after confirming', () => {
    diagnosticsService.logEvent('IMPORT_FAILURE', 'import', 'error');
    render(<DataAndBackup />);

    fireEvent.click(screen.getByRole('button', { name: 'Clear log' }));
    const dialog = screen.getByRole('dialog', { name: 'Clear diagnostic log' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear log' }));

    expect(diagnosticsService.getEntries()).toEqual([]);
    expect(screen.getByText('No diagnostic entries recorded yet.')).toBeTruthy();
  });

  it('an import failure event is recorded and reflected after re-render', () => {
    const { unmount } = render(<DataAndBackup />);
    expect(screen.getByText('No diagnostic entries recorded yet.')).toBeTruthy();
    unmount();

    diagnosticsService.logEvent('IMPORT_FAILURE', 'import', 'error');
    render(<DataAndBackup />);
    expect(screen.getByText('IMPORT_FAILURE')).toBeTruthy();
  });
});
