// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingModal, CURRENT_ONBOARDING_VERSION } from './OnboardingModal';
import { storageService } from './storage';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

describe('OnboardingModal lifecycle', () => {
  it('opens on first run when no onboarding preference has been saved', () => {
    render(<OnboardingModal />);
    expect(screen.getByRole('dialog', { name: /Welcome to TaxMate UK/ })).toBeTruthy();
  });

  it('does not reopen for a user who already completed the current version', () => {
    storageService.setAppPreferences({ onboardingCompleted: true, onboardingVersion: CURRENT_ONBOARDING_VERSION });
    render(<OnboardingModal />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not reopen for a user who already skipped the current version', () => {
    storageService.setAppPreferences({ onboardingSkipped: true, onboardingVersion: CURRENT_ONBOARDING_VERSION });
    render(<OnboardingModal />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('reopens when the saved version is older than the current onboarding version', () => {
    storageService.setAppPreferences({ onboardingCompleted: true, onboardingVersion: CURRENT_ONBOARDING_VERSION - 1 });
    render(<OnboardingModal />);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('uses the required "Stored on this device" heading, not a privacy claim', () => {
    render(<OnboardingModal />);
    expect(screen.getByText('Stored on this device')).toBeTruthy();
    expect(screen.queryByText(/100% Private/i)).toBeNull();
  });

  it('Skip records onboardingSkipped, onboardingVersion and completedAt, and closes the modal', () => {
    render(<OnboardingModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip onboarding' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    const prefs = storageService.getAppPreferences();
    expect(prefs.onboardingSkipped).toBe(true);
    expect(prefs.onboardingVersion).toBe(CURRENT_ONBOARDING_VERSION);
    expect(typeof prefs.completedAt).toBe('string');
  });

  it('completing all three steps records onboardingCompleted, onboardingVersion and completedAt', () => {
    render(<OnboardingModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' })); // step 1 -> 2
    fireEvent.click(screen.getByRole('button', { name: 'Next' })); // step 2 -> 3
    fireEvent.click(screen.getByRole('button', { name: 'Start empty' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    const prefs = storageService.getAppPreferences();
    expect(prefs.onboardingCompleted).toBe(true);
    expect(prefs.onboardingVersion).toBe(CURRENT_ONBOARDING_VERSION);
    expect(typeof prefs.completedAt).toBe('string');
  });

  it('"Back" returns to the previous step without closing the modal', () => {
    render(<OnboardingModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' })); // -> step 2
    expect(screen.getByText('Select your tax year')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back' })); // -> step 1
    expect(screen.getByText('Stored on this device')).toBeTruthy();
  });

  it('announces the current step to screen readers via sr-only text, updated per step', () => {
    render(<OnboardingModal />);
    expect(screen.getByText('Step 1 of 3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' })); // -> step 2
    expect(screen.getByText('Step 2 of 3')).toBeTruthy();
    expect(screen.queryByText('Step 1 of 3')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next' })); // -> step 3
    expect(screen.getByText('Step 3 of 3')).toBeTruthy();
  });

  it('supports keyboard navigation: focus starts inside the dialog and Escape closes it (treated as skip)', async () => {
    render(<OnboardingModal />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(storageService.getAppPreferences().onboardingSkipped).toBe(true);
  });

  it('returns focus to the previously-focused element after closing', async () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Restart onboarding';
    document.body.appendChild(trigger);
    trigger.focus();
    render(<OnboardingModal />);
    await userEvent.keyboard('{Escape}');
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
