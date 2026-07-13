/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, ReactNode } from "react";
import { TOKENS } from "./tokens";
import { Alert, Switch, Button, Badge, EmptyState, TransactionList } from "./components";
import { IncomeForm } from "./IncomeForm";
import { ExpenseForm } from "./ExpenseForm";
import { storageService, INCOME_STATUS, INCOME_STATUS_LABELS } from "./storage";
import { useBreakpoint, useDialog } from "./hooks";
import { useTaxStore, taxYearStartToLabel } from "./store";
import { TaxYearSelector } from "./TaxYearSelector";
import { AddTransactionButton } from "./AddTransactionButton";
import { StorageNoticeBanner } from "./StorageNoticeBanner";
import { BackupReminderBanner } from "./BackupReminderBanner";
import { OnboardingModal } from "./OnboardingModal";
import { DataAndBackup } from "./DataAndBackup";
import { IncomeFilters, ExpenseFilters } from "./FilterBar";
import { filterIncomeRecords, filterExpenseRecords, searchIncomeRecords, searchExpenseRecords, sortIncomeRecords, sortExpenseRecords, uniqueSorted } from "./filters";
import { ChartFigure } from "./ChartFigure";
import { DeadlineTracker } from "./DeadlineTracker";

// SVG Icons
const Icons = {
  Dashboard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  // Wallet
  Income: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-6" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </svg>
  ),
  // Receipt
  Expenses: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  ),
  // Calculator
  Tax: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <rect x="8" y="6" width="8" height="3" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  ),
  // Cog
  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  // "TM" wordmark
  Logo: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="TaxMate">
      <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="800" fill="white" fontFamily="Manrope, Inter, sans-serif" letterSpacing="0.5">TM</text>
    </svg>
  ),
};

// Modal component (accessible dialog)
interface ModalProps { isOpen: boolean; onClose: () => void; children: ReactNode; title: string; }
const Modal = ({ isOpen, onClose, children, title }: ModalProps) => {
  const dialogRef = useDialog(isOpen, onClose);
  if (!isOpen) return null;
  const titleId = 'modal-title';
  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{
          backgroundColor: 'white',
          borderRadius: '14px',
          padding: '32px',
          maxHeight: '90vh',
          overflowY: 'auto',
          maxWidth: '600px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 id={titleId} style={{ fontSize: '22px', fontWeight: '700', color: TOKENS.colors.neutral[900], fontFamily: 'Manrope, sans-serif' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: TOKENS.colors.neutral[500],
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Confirmation Dialog component (accessible alertdialog)
interface ConfirmDialogProps { isOpen: boolean; onConfirm: () => void; onCancel: () => void; title: string; message: string; confirmText?: string; cancelText?: string; }
const ConfirmDialog = ({ isOpen, onConfirm, onCancel, title, message, confirmText = 'Delete', cancelText = 'Cancel' }: ConfirmDialogProps) => {
  const dialogRef = useDialog(isOpen, onCancel);
  if (!isOpen) return null;
  const titleId = 'confirm-title';
  const msgId = 'confirm-message';
  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
        padding: '16px',
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={msgId}
        tabIndex={-1}
        style={{
          backgroundColor: 'white',
          borderRadius: '14px',
          padding: '32px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        }}
      >
        <h3 id={titleId} style={{ fontSize: '18px', fontWeight: '700', color: TOKENS.colors.neutral[900], marginBottom: '12px', fontFamily: 'Manrope, sans-serif' }}>
          {title}
        </h3>
        <p id={msgId} style={{ fontSize: '14px', color: TOKENS.colors.neutral[600], marginBottom: '24px' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: TOKENS.colors.neutral[100],
              color: TOKENS.colors.neutral[700],
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: TOKENS.colors.semantic.danger,
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Inline edit/delete actions for a transaction row
interface ActionMenuProps { onEdit?: () => void; onDelete?: () => void; label: string; }
const ActionLinks = ({ onEdit, onDelete, label }: ActionMenuProps) => (
  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
    <button
      onClick={onEdit}
      aria-label={`Edit ${label}`}
      style={{ background: 'none', border: 'none', color: TOKENS.colors.green[500], cursor: 'pointer', fontSize: '14px', fontWeight: '600', padding: 0 }}
    >
      Edit
    </button>
    <button
      onClick={onDelete}
      aria-label={`Delete ${label}`}
      style={{ background: 'none', border: 'none', color: TOKENS.colors.semantic.danger, cursor: 'pointer', fontSize: '14px', fontWeight: '600', padding: 0 }}
    >
      Delete
    </button>
  </div>
);

// Main App
function Dashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [monthlyReportsEnabled, setMonthlyReportsEnabled] = useState(true);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; type: string | null; id: string | null }>({ isOpen: false, type: null, id: null });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [storageError] = useState(() => storageService.getStorageError());

  // Records + selected tax year live in the Zustand store (single source of truth).
  const incomeRecords = useTaxStore((s) => s.income) as any[];
  const expenseRecords = useTaxStore((s) => s.expenses) as any[];
  const selectedTaxYear = useTaxStore((s) => s.selectedTaxYear);
  const storeAddIncome = useTaxStore((s) => s.addIncome);
  const storeUpdateIncome = useTaxStore((s) => s.updateIncome);
  const storeDeleteIncome = useTaxStore((s) => s.deleteIncome);
  const storeAddExpense = useTaxStore((s) => s.addExpense);
  const storeUpdateExpense = useTaxStore((s) => s.updateExpense);
  const storeDeleteExpense = useTaxStore((s) => s.deleteExpense);
  const incomeFilters = useTaxStore((s) => s.incomeFilters);
  const expenseFilters = useTaxStore((s) => s.expenseFilters);
  const setIncomeFilters = useTaxStore((s) => s.setIncomeFilters);
  const setExpenseFilters = useTaxStore((s) => s.setExpenseFilters);
  const resetIncomeFilters = useTaxStore((s) => s.resetIncomeFilters);
  const resetExpenseFilters = useTaxStore((s) => s.resetExpenseFilters);
  const incomeSearch = useTaxStore((s) => s.incomeSearch);
  const expenseSearch = useTaxStore((s) => s.expenseSearch);
  const incomeSort = useTaxStore((s) => s.incomeSort);
  const expenseSort = useTaxStore((s) => s.expenseSort);
  const setIncomeSearch = useTaxStore((s) => s.setIncomeSearch);
  const setExpenseSearch = useTaxStore((s) => s.setExpenseSearch);
  const setIncomeSort = useTaxStore((s) => s.setIncomeSort);
  const setExpenseSort = useTaxStore((s) => s.setExpenseSort);

  // Deterministic reference date that selects the chosen tax year for all
  // window-based calculations (totals, tables, charts, breakdowns, counts).
  const taxRef = storageService.getTaxYearStartForYear(selectedTaxYear);
  const selectedTaxYearLabel = taxYearStartToLabel(selectedTaxYear);
  const hasDemoData = incomeRecords.some((r: any) => r.isDemo) || expenseRecords.some((r: any) => r.isDemo);

  useEffect(() => {
    storageService.migrateIfNeeded();
  }, []);

  // Transaction form handlers + modals live at the App level so the global
  // "+ Add transaction" action can open them from any view.
  const handleSaveIncome = (formData: any) => {
    try {
      if (editingIncomeId) {
        storeUpdateIncome(editingIncomeId as string, formData);
        setSuccessMessage('Income record updated successfully');
      } else {
        storeAddIncome(formData);
        setSuccessMessage('Income record added successfully');
      }
      setShowIncomeModal(false);
      setEditingIncomeId(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error saving income record:', error);
    }
  };
  const handleSaveExpense = (formData: any) => {
    try {
      if (editingExpenseId) {
        storeUpdateExpense(editingExpenseId as string, formData);
        setSuccessMessage('Expense record updated successfully');
      } else {
        storeAddExpense(formData);
        setSuccessMessage('Expense record added successfully');
      }
      setShowExpenseModal(false);
      setEditingExpenseId(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error saving expense record:', error);
    }
  };
  const editingIncomeRecord = editingIncomeId ? storageService.getIncomeRecord(editingIncomeId) : null;
  const editingExpenseRecord = editingExpenseId ? storageService.getExpenseRecord(editingExpenseId) : null;
  const openAddIncome = () => { setEditingIncomeId(null); setShowIncomeModal(true); };
  const openAddExpense = () => { setEditingExpenseId(null); setShowExpenseModal(true); };

  const { isMobile, isTablet } = useBreakpoint();
  // KPI grid columns per breakpoint (used across sections).
  const kpiCols = isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)";
  const pageHeadingSize = isMobile ? "26px" : "36px";

  const navItems = [
    { id: "dashboard", label: "Dashboard", Icon: Icons.Dashboard },
    { id: "income", label: "Income", Icon: Icons.Income },
    { id: "expenses", label: "Expenses", Icon: Icons.Expenses },
    { id: "tax", label: "Tax estimate", Icon: Icons.Tax },
    { id: "settings", label: "Settings", Icon: Icons.Settings },
  ];

  const renderContent = () => {
    switch (activeNav) {
      case "dashboard": {
        const now = new Date();
        const dateLabel = now
          .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
          .toUpperCase();
        const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
        const taxYearLabel = selectedTaxYearLabel;

        const incomeReceivedYTD = storageService.calculateTotalReceived(taxRef, incomeRecords);
        const expensesYTD = storageService.calculateTotalExpensesYTD(taxRef, expenseRecords);
        const netProfitYTD = storageService.roundCurrency(incomeReceivedYTD - expensesYTD);
        const receiptsCount = storageService.getExpensesInTaxYear(expenseRecords, taxRef).length;

        const dashIncomeByMonth = storageService.getIncomeByMonth(incomeRecords, taxRef);
        const dashExpensesByMonth = storageService.getExpensesByMonth(expenseRecords, taxRef);
        const monthKeys = Array.from(
          new Set([...Object.keys(dashIncomeByMonth), ...Object.keys(dashExpensesByMonth)])
        ).sort();
        const maxMonthly = Math.max(
          1,
          ...monthKeys.map((k) => Math.max(dashIncomeByMonth[k] || 0, dashExpensesByMonth[k] || 0))
        );
        const monthShort = (key: string) => {
          const [y, m] = key.split("-").map(Number);
          return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short" });
        };

        return (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
              <div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[500], fontWeight: "600" }}>{dateLabel}</div>
                <h1 style={{ fontSize: pageHeadingSize, fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  {greeting} 👋
                </h1>
              </div>
              <div style={{ width: "40px", height: "40px", backgroundColor: TOKENS.colors.green[200], borderRadius: "50%" }}></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: kpiCols, gap: "16px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: TOKENS.colors.green[500], color: "white", borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", opacity: 0.9 }}>Recorded cash surplus</div>
                <div style={{ fontSize: "30px", fontWeight: "800", marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>£{netProfitYTD.toFixed(2)}</div>
                <div style={{ fontSize: "13px", opacity: 0.85, marginTop: "8px" }}>Received income − all recorded expenses · {taxYearLabel}</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Income received YTD</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £{incomeReceivedYTD.toFixed(2)}
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Tax year {taxYearLabel}</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Expenses YTD</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £{expensesYTD.toFixed(2)}
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>{receiptsCount} receipt{receiptsCount === 1 ? "" : "s"} logged</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile || isTablet ? "1fr" : "1.4fr 1fr", gap: "16px" }}>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px" }}>
                {monthKeys.length === 0 ? (
                  <>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px", fontFamily: "Manrope, sans-serif" }}>
                      Income vs expenses <span style={{ fontSize: "13px", fontWeight: "500", color: TOKENS.colors.neutral[500] }}>· {taxYearLabel}</span>
                    </h3>
                    <p style={{ fontSize: "14px", color: TOKENS.colors.neutral[600] }}>No transactions recorded for this tax year yet.</p>
                  </>
                ) : (
                  <ChartFigure
                    title="Income vs expenses"
                    subtitle={taxYearLabel}
                    axisLabel="Received income and recorded expenses (£) by month"
                    columns={["Received", "Expenses"]}
                    rows={monthKeys.map((key) => ({ label: monthShort(key), values: [dashIncomeByMonth[key] || 0, dashExpensesByMonth[key] || 0] }))}
                    legend={[{ label: "Received", color: TOKENS.colors.green[500] }, { label: "Expenses", color: TOKENS.colors.green[200] }]}
                  >
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "160px" }}>
                      {monthKeys.map((key) => (
                        <div key={key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "100%", display: "flex", gap: "4px", alignItems: "flex-end", height: "100%" }}>
                            <div style={{ flex: 1, backgroundColor: TOKENS.colors.green[500], borderTopLeftRadius: "4px", borderTopRightRadius: "4px", height: `${((dashIncomeByMonth[key] || 0) / maxMonthly) * 100}%` }}></div>
                            <div style={{ flex: 1, backgroundColor: TOKENS.colors.green[200], borderTopLeftRadius: "4px", borderTopRightRadius: "4px", height: `${((dashExpensesByMonth[key] || 0) / maxMonthly) * 100}%` }}></div>
                          </div>
                          <span style={{ fontSize: "12px", color: TOKENS.colors.neutral[600] }}>{monthShort(key)}</span>
                        </div>
                      ))}
                    </div>
                  </ChartFigure>
                )}
              </div>

              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", fontFamily: "Manrope, sans-serif" }}>
                  Tax year {taxYearLabel}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", color: TOKENS.colors.neutral[600] }}>Outstanding</span>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: TOKENS.colors.semantic.warning }}>£{storageService.calculateOutstanding(taxRef, incomeRecords).toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", color: TOKENS.colors.neutral[600] }}>Overdue</span>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: TOKENS.colors.semantic.danger }}>£{storageService.calculateOverdue(taxRef, incomeRecords).toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${TOKENS.colors.neutral[200]}`, paddingTop: "12px" }}>
                    <span style={{ fontSize: "13px", color: TOKENS.colors.neutral[600] }}>Invoiced total</span>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: TOKENS.colors.neutral[900] }}>£{storageService.calculateTotalInvoiced(taxRef, incomeRecords).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "16px" }}>
              <DeadlineTracker selectedTaxYearLabel={selectedTaxYearLabel} />
            </div>
          </>
        );
      }

      case "income": {
        const totalReceived = storageService.calculateTotalReceived(taxRef, incomeRecords);
        const totalInvoiced = storageService.calculateTotalInvoiced(taxRef, incomeRecords);
        const outstanding = storageService.calculateOutstanding(taxRef, incomeRecords);
        const overdue = storageService.calculateOverdue(taxRef, incomeRecords);
        const thisMonth = storageService.calculateIncomeThisMonthForYear(selectedTaxYear, incomeRecords);
        const avgMonthly = storageService.calculateAverageMonthlyIncomeForYear(selectedTaxYear, incomeRecords);
        const completedTaxMonths = storageService.getCompletedTaxMonthsForYear(selectedTaxYear);
        const avgAvailableFrom = storageService.getFirstAverageAvailableDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const incomeTaxYearLabel = selectedTaxYearLabel;
        const inTaxYear = storageService.getIncomeInTaxYear(incomeRecords, taxRef);
        const statusOf = (r: any) => storageService.normaliseIncomeStatus(r.status);
        const receivedCount = inTaxYear.filter(r => statusOf(r) === INCOME_STATUS.RECEIVED).length;
        const pendingCount = inTaxYear.filter(r => statusOf(r) === INCOME_STATUS.PENDING).length;
        const overdueCount = inTaxYear.filter(r => statusOf(r) === INCOME_STATUS.OVERDUE).length;
        const incomeByMonth = storageService.getIncomeByMonth(incomeRecords, taxRef);
        const incomeBySource = storageService.getIncomeBySource(incomeRecords, taxRef);
        const isCurrentYear = storageService.isCurrentTaxYear(selectedTaxYear);

        const handleEditIncome = (id: string) => {
          setEditingIncomeId(id);
          setShowIncomeModal(true);
        };

        const handleDeleteIncome = (id: string) => {
          setConfirmDialog({ isOpen: true, type: 'income', id });
        };

        const getStatusBadgeVariant = (status: string) => {
          const s = storageService.normaliseIncomeStatus(status);
          if (s === INCOME_STATUS.RECEIVED) return 'success';
          if (s === INCOME_STATUS.PENDING) return 'warning';
          if (s === INCOME_STATUS.OVERDUE) return 'error';
          return 'default';
        };
        const getStatusLabel = (status: string) =>
          INCOME_STATUS_LABELS[storageService.normaliseIncomeStatus(status)] || status;

        const incomeSourceOptions = uniqueSorted(inTaxYear.map((r: any) => r.source));
        const incomeCategoryOptions = uniqueSorted(inTaxYear.map((r: any) => r.category));
        const filteredIncome = filterIncomeRecords(inTaxYear, incomeFilters);
        const searchedIncome = searchIncomeRecords(filteredIncome, incomeSearch);
        const sortedRecords = sortIncomeRecords(searchedIncome, incomeSort);

        return (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
              <div>
                <h1 style={{ fontSize: pageHeadingSize, fontWeight: "800", color: TOKENS.colors.neutral[900], fontFamily: "Manrope, sans-serif" }}>
                  Income
                </h1>
                <p style={{ color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Track and manage your income sources · Tax year {incomeTaxYearLabel}</p>
              </div>
              <Button variant="primary" onClick={() => { setEditingIncomeId(null); setShowIncomeModal(true); }}>
                + Add income
              </Button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: kpiCols, gap: "16px", marginBottom: "16px" }}>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Total received</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £{totalReceived.toFixed(2)}
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>{receivedCount} payment{receivedCount === 1 ? '' : 's'} received</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Total invoiced</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £{totalInvoiced.toFixed(2)}
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Received + outstanding + overdue</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Average per completed tax month</div>
                {avgMonthly === null ? (
                  <>
                    <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[400], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                      —
                    </div>
                    <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Available from {avgAvailableFrom}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                      £{avgMonthly.toFixed(2)}
                    </div>
                    <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Received ÷ {completedTaxMonths} completed tax month{completedTaxMonths === 1 ? '' : 's'}</div>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: kpiCols, gap: "16px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Outstanding</div>
                <div style={{ fontSize: "24px", fontWeight: "800", color: TOKENS.colors.semantic.warning, marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £{outstanding.toFixed(2)}
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>{pendingCount} pending invoice{pendingCount === 1 ? '' : 's'}</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Overdue</div>
                <div style={{ fontSize: "24px", fontWeight: "800", color: TOKENS.colors.semantic.danger, marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £{overdue.toFixed(2)}
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>{overdueCount} overdue invoice{overdueCount === 1 ? '' : 's'}</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>{isCurrentYear ? "Received this month" : "Tax year"}</div>
                <div style={{ fontSize: "24px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  {isCurrentYear ? `£${(thisMonth ?? 0).toFixed(2)}` : incomeTaxYearLabel}
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>{isCurrentYear ? "Current calendar month" : "Complete tax year"}</div>
              </div>
            </div>

            {inTaxYear.length === 0 ? (
              <EmptyState
                icon="📊"
                title="No income records for this tax year"
                description="Start by adding your first income record to track your earnings."
                actionLabel="Add income"
                onAction={() => { setEditingIncomeId(null); setShowIncomeModal(true); }}
              />
            ) : (
              <>
                <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px", marginBottom: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", fontFamily: "Manrope, sans-serif" }}>
                      Income History <span style={{ fontSize: "13px", fontWeight: "500", color: TOKENS.colors.neutral[500] }}>· {incomeTaxYearLabel}</span>
                    </h3>
                    <span role="status" aria-live="polite" style={{ fontSize: "13px", color: TOKENS.colors.neutral[500] }}>Showing {searchedIncome.length} of {inTaxYear.length} records</span>
                  </div>
                  <IncomeFilters
                    filters={incomeFilters}
                    onChange={setIncomeFilters}
                    onReset={resetIncomeFilters}
                    sources={incomeSourceOptions}
                    categories={incomeCategoryOptions}
                    search={incomeSearch}
                    onSearchChange={setIncomeSearch}
                    sort={incomeSort}
                    onSortChange={setIncomeSort}
                  />
                  {searchedIncome.length === 0 ? (
                    <div style={{ padding: "24px", textAlign: "center", color: TOKENS.colors.neutral[600] }}>
                      No income records match your filters.
                    </div>
                  ) : (
                    <TransactionList
                      isMobile={isMobile}
                      getKey={(r: any) => r.id}
                      rows={sortedRecords}
                      columns={[
                        { key: "date", label: "Date", render: (r: any) => storageService.parseLocalDate(r.date).toLocaleDateString() },
                        { key: "source", label: "Source", render: (r: any) => (
                          <span>{r.source}{r.isDemo && <span style={{ marginLeft: "6px" }}><Badge variant="default">Demo</Badge></span>}</span>
                        ) },
                        { key: "category", label: "Category", render: (r: any) => r.category },
                        { key: "amount", label: "Amount", render: (r: any) => <strong>£{parseFloat(r.amount as string).toFixed(2)}</strong> },
                        { key: "status", label: "Status", render: (r: any) => <Badge variant={getStatusBadgeVariant(r.status)}>{getStatusLabel(r.status)}</Badge> },
                        { key: "actions", label: "Actions", align: "right", render: (r: any) => (
                          <ActionLinks onEdit={() => handleEditIncome(r.id)} onDelete={() => handleDeleteIncome(r.id)} label={`income from ${r.source}`} />
                        ) },
                      ]}
                    />
                  )}
                </div>

                {Object.keys(incomeByMonth).length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: isMobile || isTablet ? "1fr" : "1.4fr 1fr", gap: "16px" }}>
                    <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px" }}>
                      <ChartFigure
                        title="Income trend"
                        subtitle={incomeTaxYearLabel}
                        axisLabel="Received income (£) by month"
                        columns={["Received"]}
                        rows={Object.entries(incomeByMonth).sort().map(([month, amount]) => ({ label: month.slice(5), values: [amount] }))}
                      >
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "160px" }}>
                          {Object.entries(incomeByMonth).sort().map(([month, amount]) => {
                            const maxAmount = Math.max(...Object.values(incomeByMonth));
                            const percentage = (amount / maxAmount) * 100;
                            return (
                              <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                <div style={{ width: "100%", backgroundColor: TOKENS.colors.green[500], borderTopLeftRadius: "4px", borderTopRightRadius: "4px", height: `${percentage}%` }}></div>
                                <span style={{ fontSize: "12px", color: TOKENS.colors.neutral[600] }}>{month.slice(5)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </ChartFigure>
                    </div>

                    {Object.keys(incomeBySource).length > 0 && (
                      <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px" }}>
                        <ChartFigure
                          title="Income by source"
                          subtitle={incomeTaxYearLabel}
                          axisLabel="Received income (£) by source"
                          rowHeaderLabel="Source"
                          columns={["Received"]}
                          rows={Object.entries(incomeBySource).map(([source, amount]) => ({ label: source, values: [amount] }))}
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {Object.entries(incomeBySource).map(([source, amount]) => {
                              const total = Object.values(incomeBySource).reduce((a, b) => a + b, 0);
                              const percentage = (amount / total) * 100;
                              return (
                                <div key={source}>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <span style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[700] }}>{source}</span>
                                    <span style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[900] }}>£{amount.toFixed(2)}</span>
                                  </div>
                                  <div style={{ height: "8px", backgroundColor: TOKENS.colors.neutral[200], borderRadius: "4px", overflow: "hidden" }}>
                                    <div style={{ height: "100%", backgroundColor: TOKENS.colors.green[500], width: `${percentage}%` }}></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ChartFigure>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        );
      }

      case "expenses": {
        const totalYTD = storageService.calculateTotalExpensesYTD(taxRef, expenseRecords);
        const thisMonth = storageService.isCurrentTaxYear(selectedTaxYear)
          ? storageService.calculateExpensesThisMonth(new Date(), expenseRecords)
          : null;
        const avgMonthly = storageService.calculateAverageMonthlyExpensesForYear(selectedTaxYear, expenseRecords);
        const completedTaxMonths = storageService.getCompletedTaxMonthsForYear(selectedTaxYear);
        const avgAvailableFrom = storageService.getFirstAverageAvailableDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const expensesByMonth = storageService.getExpensesByMonth(expenseRecords, taxRef);
        const expensesByCategory = storageService.getExpensesByCategory(expenseRecords, taxRef);
        const expenseTaxYearLabel = selectedTaxYearLabel;
        const isCurrentYear = storageService.isCurrentTaxYear(selectedTaxYear);
        const expensesInTaxYear = storageService.getExpensesInTaxYear(expenseRecords, taxRef);

        const handleEditExpense = (id: string) => {
          setEditingExpenseId(id);
          setShowExpenseModal(true);
        };

        const handleDeleteExpense = (id: string) => {
          setConfirmDialog({ isOpen: true, type: 'expense', id });
        };

        const expenseCategoryOptions = uniqueSorted(expensesInTaxYear.map((r: any) => r.category));
        const filteredExpenses = filterExpenseRecords(expensesInTaxYear, expenseFilters);
        const searchedExpenses = searchExpenseRecords(filteredExpenses, expenseSearch);
        const sortedRecords = sortExpenseRecords(searchedExpenses, expenseSort);

        return (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
              <div>
                <h1 style={{ fontSize: pageHeadingSize, fontWeight: "800", color: TOKENS.colors.neutral[900], fontFamily: "Manrope, sans-serif" }}>
                  Expenses
                </h1>
                <p style={{ color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Log and categorize your business expenses · Tax year {expenseTaxYearLabel}</p>
              </div>
              <Button variant="primary" onClick={() => { setEditingExpenseId(null); setShowExpenseModal(true); }}>
                + Add expense
              </Button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: kpiCols, gap: "16px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Total expenses</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £{totalYTD.toFixed(2)}
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>{expensesInTaxYear.length} receipt{expensesInTaxYear.length === 1 ? '' : 's'} logged</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>{isCurrentYear ? "This month" : "Tax year"}</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  {isCurrentYear ? `£${(thisMonth ?? 0).toFixed(2)}` : expenseTaxYearLabel}
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>{isCurrentYear ? "expenses this month" : "Complete tax year"}</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Average per completed tax month</div>
                {avgMonthly === null ? (
                  <>
                    <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[400], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                      —
                    </div>
                    <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Available from {avgAvailableFrom}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                      £{avgMonthly.toFixed(2)}
                    </div>
                    <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Recorded expenses ÷ {completedTaxMonths} completed tax month{completedTaxMonths === 1 ? '' : 's'}</div>
                  </>
                )}
              </div>
            </div>

            {expensesInTaxYear.length === 0 ? (
              <EmptyState
                icon="📝"
                title="No expenses for this tax year"
                description="Start tracking your business expenses to monitor spending and prepare for tax filing."
                actionLabel="Add expense"
                onAction={() => { setEditingExpenseId(null); setShowExpenseModal(true); }}
              />
            ) : (
              <>
                <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px", marginBottom: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", fontFamily: "Manrope, sans-serif" }}>
                      Expense History <span style={{ fontSize: "13px", fontWeight: "500", color: TOKENS.colors.neutral[500] }}>· {expenseTaxYearLabel}</span>
                    </h3>
                    <span role="status" aria-live="polite" style={{ fontSize: "13px", color: TOKENS.colors.neutral[500] }}>Showing {searchedExpenses.length} of {expensesInTaxYear.length} records</span>
                  </div>
                  <ExpenseFilters
                    filters={expenseFilters}
                    onChange={setExpenseFilters}
                    onReset={resetExpenseFilters}
                    categories={expenseCategoryOptions}
                    search={expenseSearch}
                    onSearchChange={setExpenseSearch}
                    sort={expenseSort}
                    onSortChange={setExpenseSort}
                  />
                  {searchedExpenses.length === 0 ? (
                    <div style={{ padding: "24px", textAlign: "center", color: TOKENS.colors.neutral[600] }}>
                      No expense records match your filters.
                    </div>
                  ) : (
                    <TransactionList
                      isMobile={isMobile}
                      getKey={(r: any) => r.id}
                      rows={sortedRecords}
                      columns={[
                        { key: "date", label: "Date", render: (r: any) => storageService.parseLocalDate(r.date).toLocaleDateString() },
                        { key: "merchant", label: "Merchant", render: (r: any) => (
                          <span>{r.merchant}{r.isDemo && <span style={{ marginLeft: "6px" }}><Badge variant="default">Demo</Badge></span>}</span>
                        ) },
                        { key: "category", label: "Category", render: (r: any) => r.category },
                        { key: "amount", label: "Amount", render: (r: any) => <strong>£{parseFloat(r.amount as string).toFixed(2)}</strong> },
                        { key: "method", label: "Method", render: (r: any) => r.paymentMethod },
                        { key: "actions", label: "Actions", align: "right", render: (r: any) => (
                          <ActionLinks onEdit={() => handleEditExpense(r.id)} onDelete={() => handleDeleteExpense(r.id)} label={`expense from ${r.merchant}`} />
                        ) },
                      ]}
                    />
                  )}
                </div>

                {Object.keys(expensesByMonth).length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: isMobile || isTablet ? "1fr" : "1.4fr 1fr", gap: "16px" }}>
                    <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px" }}>
                      <ChartFigure
                        title="Expense trend"
                        subtitle={expenseTaxYearLabel}
                        axisLabel="Recorded expenses (£) by month"
                        columns={["Expenses"]}
                        rows={Object.entries(expensesByMonth).sort().map(([month, amount]) => ({ label: month.slice(5), values: [amount] }))}
                      >
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "160px" }}>
                          {Object.entries(expensesByMonth).sort().map(([month, amount]) => {
                            const maxAmount = Math.max(...Object.values(expensesByMonth));
                            const percentage = (amount / maxAmount) * 100;
                            return (
                              <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                <div style={{ width: "100%", backgroundColor: TOKENS.colors.green[500], borderTopLeftRadius: "4px", borderTopRightRadius: "4px", height: `${percentage}%` }}></div>
                                <span style={{ fontSize: "12px", color: TOKENS.colors.neutral[600] }}>{month.slice(5)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </ChartFigure>
                    </div>

                    {Object.keys(expensesByCategory).length > 0 && (
                      <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px" }}>
                        <ChartFigure
                          title="Expenses by category"
                          subtitle={expenseTaxYearLabel}
                          axisLabel="Recorded expenses (£) by category"
                          rowHeaderLabel="Category"
                          columns={["Expenses"]}
                          rows={Object.entries(expensesByCategory).map(([category, amount]) => ({ label: category, values: [amount] }))}
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {Object.entries(expensesByCategory).map(([category, amount]) => {
                              const total = Object.values(expensesByCategory).reduce((a, b) => a + b, 0);
                              const percentage = (amount / total) * 100;
                              return (
                                <div key={category}>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <span style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[700] }}>{category}</span>
                                    <span style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[900] }}>£{amount.toFixed(2)}</span>
                                  </div>
                                  <div style={{ height: "8px", backgroundColor: TOKENS.colors.neutral[200], borderRadius: "4px", overflow: "hidden" }}>
                                    <div style={{ height: "100%", backgroundColor: TOKENS.colors.green[500], width: `${percentage}%` }}></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ChartFigure>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        );
      }

      case "tax": {
        const taxYearLabel = selectedTaxYearLabel;
        const receivedYTD = storageService.calculateTotalReceived(taxRef, incomeRecords);
        const expensesYTD = storageService.calculateTotalExpensesYTD(taxRef, expenseRecords);
        const netProfitYTD = storageService.roundCurrency(receivedYTD - expensesYTD);

        return (
          <>
            <div style={{ marginBottom: "32px" }}>
              <h1 style={{ fontSize: pageHeadingSize, fontWeight: "800", color: TOKENS.colors.neutral[900], fontFamily: "Manrope, sans-serif" }}>
                Tax estimate preview
              </h1>
              <p style={{ color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Figures below are drawn from your recorded transactions for {taxYearLabel}.</p>
            </div>

            <Alert
              variant="warning"
              title="Estimate not yet available"
              description="A Self Assessment tax estimate needs tested UK tax rules (personal allowance, bands, Class 2/4 NICs) that are not implemented yet. The figures below are your actual recorded income and expenses — not a tax calculation."
            />

            <div style={{ display: "grid", gridTemplateColumns: kpiCols, gap: "16px", marginTop: "24px" }}>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Income received</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £{receivedYTD.toFixed(2)}
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Tax year {taxYearLabel}</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Expenses recorded</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £{expensesYTD.toFixed(2)}
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Tax year {taxYearLabel}</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Recorded cash surplus</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £{netProfitYTD.toFixed(2)}
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Received income − all recorded expenses</div>
              </div>
            </div>
          </>
        );
      }

      case "settings":
        return (
          <>
            <div style={{ marginBottom: "32px" }}>
              <h1 style={{ fontSize: pageHeadingSize, fontWeight: "800", color: TOKENS.colors.neutral[900], fontFamily: "Manrope, sans-serif" }}>
                Settings
              </h1>
              <p style={{ color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Manage your account preferences</p>
            </div>

            <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", fontFamily: "Manrope, sans-serif" }}>
                Account Information
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[700] }}>Business Type</label>
                  <p style={{ color: TOKENS.colors.neutral[900], marginTop: "4px" }}>Sole Trader</p>
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[700] }}>Trading Since</label>
                  <p style={{ color: TOKENS.colors.neutral[900], marginTop: "4px" }}>October 2025</p>
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[700] }}>VAT Registered</label>
                  <p style={{ color: TOKENS.colors.neutral[900], marginTop: "4px" }}>No</p>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "700", fontFamily: "Manrope, sans-serif" }}>
                  Preferences
                </h2>
                <Badge variant="default">Coming soon</Badge>
              </div>
              <p style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginBottom: "16px" }}>
                These preferences are not yet active. There is no email or reporting service connected in this prototype.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", opacity: 0.6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "16px", borderBottom: `1px solid ${TOKENS.colors.neutral[200]}` }}>
                  <div>
                    <div style={{ fontWeight: "600", color: TOKENS.colors.neutral[900] }}>Email notifications</div>
                    <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "4px" }}>Receive tax deadline alerts</div>
                  </div>
                  <Switch checked={notificationsEnabled} onChange={setNotificationsEnabled} disabled aria-label="Email notifications (coming soon)" />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: "600", color: TOKENS.colors.neutral[900] }}>Monthly reports</div>
                    <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "4px" }}>Get automatic summary emails</div>
                  </div>
                  <Switch checked={monthlyReportsEnabled} onChange={setMonthlyReportsEnabled} disabled aria-label="Monthly reports (coming soon)" />
                </div>
              </div>
            </div>

            <div style={{ marginTop: "24px" }}>
              <DataAndBackup />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const railMode = isTablet; // icon-only sidebar on tablet
  const sidebarWidth = railMode ? 76 : 220;

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", width: "100%", height: "100vh", backgroundColor: TOKENS.colors.neutral[50], fontFamily: "Inter, sans-serif" }}>
      {/* Mobile top bar */}
      {isMobile && (
        <header style={{ flexShrink: 0, backgroundColor: TOKENS.colors.neutral[900], color: "white", display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px" }}>
          <div style={{ width: "30px", height: "30px", backgroundColor: TOKENS.colors.green[500], borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icons.Logo />
          </div>
          <span style={{ fontWeight: "700", fontSize: "18px" }}>TaxMate</span>
        </header>
      )}

      {/* Sidebar (desktop full / tablet icon rail) */}
      {!isMobile && (
        <aside
          aria-label="Primary"
          style={{
            width: `${sidebarWidth}px`,
            flex: `0 0 ${sidebarWidth}px`,
            backgroundColor: TOKENS.colors.neutral[900],
            color: "white",
            height: "100vh",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            borderRight: `1px solid ${TOKENS.colors.neutral[700]}`,
          }}
        >
          {/* Logo */}
          <div style={{ padding: railMode ? "22px 0" : "24px 18px", display: "flex", alignItems: "center", justifyContent: railMode ? "center" : "flex-start", gap: "12px", borderBottom: `1px solid ${TOKENS.colors.neutral[700]}` }}>
            <div style={{ width: "32px", height: "32px", backgroundColor: TOKENS.colors.green[500], borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icons.Logo />
            </div>
            {!railMode && <span style={{ fontWeight: "700", fontSize: "18px" }}>TaxMate</span>}
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: railMode ? "16px 10px" : "24px 16px", display: "flex", flexDirection: "column", gap: "4px" }}>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                aria-current={activeNav === item.id ? "page" : undefined}
                aria-label={railMode ? item.label : undefined}
                title={railMode ? item.label : undefined}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: railMode ? "center" : "flex-start",
                  gap: "12px",
                  padding: railMode ? "12px 0" : "12px 16px",
                  borderRadius: "9px",
                  border: "none",
                  backgroundColor: activeNav === item.id ? TOKENS.colors.green[500] : "transparent",
                  color: activeNav === item.id ? "white" : TOKENS.colors.neutral[400],
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontSize: "14px",
                  fontWeight: "500",
                  fontFamily: "Inter, sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (activeNav !== item.id) {
                    e.currentTarget.style.backgroundColor = TOKENS.colors.neutral[700];
                    e.currentTarget.style.color = "white";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeNav !== item.id) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = TOKENS.colors.neutral[400];
                  }
                }}
              >
                <item.Icon />
                {!railMode && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Footer */}
          {!railMode && (
            <div style={{ padding: "24px 16px", borderTop: `1px solid ${TOKENS.colors.neutral[700]}`, fontSize: "12px", color: TOKENS.colors.neutral[500] }}>
              <p>© 2026 Daramola Digital Labs.</p>
              <p style={{ marginTop: "8px" }}>TaxMate UK is a product of Daramola Digital Labs.</p>
            </div>
          )}
        </aside>
      )}

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, overflowY: "auto", backgroundColor: TOKENS.colors.neutral[50], paddingBottom: isMobile ? "80px" : 0, scrollPaddingBottom: isMobile ? "80px" : 0 }}>
        {/* Persistent, prominent browser-storage notice (all views) */}
        <StorageNoticeBanner />
        <BackupReminderBanner />
        <OnboardingModal />
        <div style={{ width: "100%", maxWidth: "1440px", margin: "0 auto", padding: isMobile ? "20px 16px" : "32px 36px", boxSizing: "border-box" }}>
          {/* Global toolbar (visible across all views) */}
          <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
            {hasDemoData && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                Demo data loaded
              </span>
            )}
            <TaxYearSelector />
            <AddTransactionButton onAddIncome={openAddIncome} onAddExpense={openAddExpense} />
          </div>
          {storageError && (
            <div style={{ marginBottom: "24px" }}>
              <Alert variant="error" title="Storage problem detected" description={`${storageError} Use Settings → Data & backup to export what remains.`} />
            </div>
          )}
          {renderContent()}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <nav
          aria-label="Primary"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            backgroundColor: TOKENS.colors.neutral[900],
            borderTop: `1px solid ${TOKENS.colors.neutral[700]}`,
            zIndex: 900,
          }}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              aria-current={activeNav === item.id ? "page" : undefined}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "3px",
                padding: "8px 2px",
                border: "none",
                background: "none",
                color: activeNav === item.id ? TOKENS.colors.green[500] : TOKENS.colors.neutral[400],
                cursor: "pointer",
                fontSize: "10px",
                fontWeight: "600",
                fontFamily: "Inter, sans-serif",
              }}
            >
              <item.Icon />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Success message */}
      {successMessage && (
        <div role="status" aria-live="polite" style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: TOKENS.colors.green[500],
          color: 'white',
          padding: '16px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          zIndex: 2000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}>
          ✓ {successMessage}
        </div>
      )}

      {/* Transaction modals (App-level so the global add action works everywhere) */}
      <Modal
        isOpen={showIncomeModal}
        onClose={() => { setShowIncomeModal(false); setEditingIncomeId(null); }}
        title={editingIncomeId ? 'Edit Income' : 'Add Income'}
      >
        <IncomeForm
          initialData={editingIncomeRecord}
          onSubmit={handleSaveIncome}
          onCancel={() => { setShowIncomeModal(false); setEditingIncomeId(null); }}
        />
      </Modal>
      <Modal
        isOpen={showExpenseModal}
        onClose={() => { setShowExpenseModal(false); setEditingExpenseId(null); }}
        title={editingExpenseId ? 'Edit Expense' : 'Add Expense'}
      >
        <ExpenseForm
          initialData={editingExpenseRecord}
          onSubmit={handleSaveExpense}
          onCancel={() => { setShowExpenseModal(false); setEditingExpenseId(null); }}
        />
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Record"
        message={confirmDialog.type === 'income' ? 'This income record will be permanently deleted. This action cannot be undone.' : 'This expense record will be permanently deleted. This action cannot be undone.'}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          try {
            if (confirmDialog.type === 'income') {
              storeDeleteIncome(confirmDialog.id as string);
              setSuccessMessage('Income record deleted successfully');
            } else if (confirmDialog.type === 'expense') {
              storeDeleteExpense(confirmDialog.id as string);
              setSuccessMessage('Expense record deleted successfully');
            }
            setTimeout(() => setSuccessMessage(null), 3000);
          } catch (error) {
            console.error('Error deleting record:', error);
          }
          setConfirmDialog({ isOpen: false, type: null, id: null });
        }}
        onCancel={() => setConfirmDialog({ isOpen: false, type: null, id: null })}
      />
    </div>
  );
}

export default Dashboard;
