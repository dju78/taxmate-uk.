import { useState, useEffect } from "react";
import { TOKENS } from "./tokens";
import { Alert, Switch, Button, Badge, EmptyState, TransactionList } from "./components";
import { IncomeForm } from "./IncomeForm";
import { ExpenseForm } from "./ExpenseForm";
import { storageService, INCOME_STATUS, INCOME_STATUS_LABELS } from "./storage";
import { useBreakpoint, useDialog } from "./hooks";
import { useTaxStore, taxYearStartToLabel } from "./store";
import { TaxYearSelector } from "./TaxYearSelector";

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
const Modal = ({ isOpen, onClose, children, title }) => {
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
const ConfirmDialog = ({ isOpen, onConfirm, onCancel, title, message, confirmText = 'Delete', cancelText = 'Cancel' }) => {
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
const ActionLinks = ({ onEdit, onDelete, label }) => (
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
  const [editingIncomeId, setEditingIncomeId] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: null, id: null });
  const [successMessage, setSuccessMessage] = useState(null);
  const [storageError] = useState(() => storageService.getStorageError());

  // Records + selected tax year live in the Zustand store (single source of truth).
  const incomeRecords = useTaxStore((s) => s.income);
  const expenseRecords = useTaxStore((s) => s.expenses);
  const selectedTaxYear = useTaxStore((s) => s.selectedTaxYear);
  const storeAddIncome = useTaxStore((s) => s.addIncome);
  const storeUpdateIncome = useTaxStore((s) => s.updateIncome);
  const storeDeleteIncome = useTaxStore((s) => s.deleteIncome);
  const storeAddExpense = useTaxStore((s) => s.addExpense);
  const storeUpdateExpense = useTaxStore((s) => s.updateExpense);
  const storeDeleteExpense = useTaxStore((s) => s.deleteExpense);

  // Deterministic reference date that selects the chosen tax year for all
  // window-based calculations (totals, tables, charts, breakdowns, counts).
  const taxRef = storageService.getTaxYearStartForYear(selectedTaxYear);
  const selectedTaxYearLabel = taxYearStartToLabel(selectedTaxYear);

  useEffect(() => {
    storageService.migrateIfNeeded();
  }, []);

  // Trigger a client-side file download.
  const downloadFile = (filename, content, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stamp = () => new Date().toISOString().slice(0, 10);
  // JSON is a COMPLETE backup (all years) plus the saved tax-year preference.
  const handleExportJSON = () => {
    const bundle = storageService.getExportBundle({ selectedTaxYear });
    downloadFile(`taxmate-backup-${stamp()}.json`, JSON.stringify(bundle, null, 2), 'application/json');
  };
  // CSV export is SCOPED to the selected tax year (ledger export).
  const handleExportCSV = () => {
    const yearTag = selectedTaxYearLabel.replace('/', '-');
    const income = storageService.recordsToCSV(storageService.getIncomeInTaxYear(incomeRecords, taxRef));
    const expenses = storageService.recordsToCSV(storageService.getExpensesInTaxYear(expenseRecords, taxRef));
    downloadFile(`taxmate-income-${yearTag}-${stamp()}.csv`, income || 'No income records', 'text/csv');
    downloadFile(`taxmate-expenses-${yearTag}-${stamp()}.csv`, expenses || 'No expense records', 'text/csv');
  };

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
        const monthShort = (key) => {
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
                <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", fontFamily: "Manrope, sans-serif" }}>
                  Income vs expenses <span style={{ fontSize: "13px", fontWeight: "500", color: TOKENS.colors.neutral[500] }}>· {taxYearLabel}</span>
                </h3>
                {monthKeys.length === 0 ? (
                  <p style={{ fontSize: "14px", color: TOKENS.colors.neutral[600] }}>No transactions recorded for this tax year yet.</p>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "160px" }}>
                      {monthKeys.map((key) => (
                        <div key={key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "100%", display: "flex", gap: "4px", alignItems: "flex-end", height: "100%" }}>
                            <div
                              title={`Received £${(dashIncomeByMonth[key] || 0).toFixed(2)}`}
                              style={{ flex: 1, backgroundColor: TOKENS.colors.green[500], borderTopLeftRadius: "4px", borderTopRightRadius: "4px", height: `${((dashIncomeByMonth[key] || 0) / maxMonthly) * 100}%` }}
                            ></div>
                            <div
                              title={`Expenses £${(dashExpensesByMonth[key] || 0).toFixed(2)}`}
                              style={{ flex: 1, backgroundColor: TOKENS.colors.green[200], borderTopLeftRadius: "4px", borderTopRightRadius: "4px", height: `${((dashExpensesByMonth[key] || 0) / maxMonthly) * 100}%` }}
                            ></div>
                          </div>
                          <span style={{ fontSize: "12px", color: TOKENS.colors.neutral[600] }}>{monthShort(key)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "16px", marginTop: "12px", fontSize: "12px", color: TOKENS.colors.neutral[600] }}>
                      <span><span style={{ display: "inline-block", width: "10px", height: "10px", backgroundColor: TOKENS.colors.green[500], borderRadius: "2px", marginRight: "4px" }}></span>Received</span>
                      <span><span style={{ display: "inline-block", width: "10px", height: "10px", backgroundColor: TOKENS.colors.green[200], borderRadius: "2px", marginRight: "4px" }}></span>Expenses</span>
                    </div>
                  </>
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
        const statusOf = (r) => storageService.normaliseIncomeStatus(r.status);
        const receivedCount = inTaxYear.filter(r => statusOf(r) === INCOME_STATUS.RECEIVED).length;
        const pendingCount = inTaxYear.filter(r => statusOf(r) === INCOME_STATUS.PENDING).length;
        const overdueCount = inTaxYear.filter(r => statusOf(r) === INCOME_STATUS.OVERDUE).length;
        const incomeByMonth = storageService.getIncomeByMonth(incomeRecords, taxRef);
        const incomeBySource = storageService.getIncomeBySource(incomeRecords, taxRef);
        const isCurrentYear = storageService.isCurrentTaxYear(selectedTaxYear);

        const handleSaveIncome = (formData) => {
          try {
            if (editingIncomeId) {
              storeUpdateIncome(editingIncomeId, formData);
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

        const handleEditIncome = (id) => {
          setEditingIncomeId(id);
          setShowIncomeModal(true);
        };

        const handleDeleteIncome = (id) => {
          setConfirmDialog({ isOpen: true, type: 'income', id });
        };

        const editingRecord = editingIncomeId ? storageService.getIncomeRecord(editingIncomeId) : null;

        const getStatusBadgeVariant = (status) => {
          const s = storageService.normaliseIncomeStatus(status);
          if (s === INCOME_STATUS.RECEIVED) return 'success';
          if (s === INCOME_STATUS.PENDING) return 'warning';
          if (s === INCOME_STATUS.OVERDUE) return 'error';
          return 'default';
        };
        const getStatusLabel = (status) =>
          INCOME_STATUS_LABELS[storageService.normaliseIncomeStatus(status)] || status;

        const sortedRecords = [...inTaxYear].sort((a, b) => storageService.parseLocalDate(b.date) - storageService.parseLocalDate(a.date));

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
                  <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", fontFamily: "Manrope, sans-serif" }}>
                    Income History <span style={{ fontSize: "13px", fontWeight: "500", color: TOKENS.colors.neutral[500] }}>· {incomeTaxYearLabel}</span>
                  </h3>
                  <TransactionList
                    isMobile={isMobile}
                    getKey={(r) => r.id}
                    rows={sortedRecords}
                    columns={[
                      { key: "date", label: "Date", render: (r) => storageService.parseLocalDate(r.date).toLocaleDateString() },
                      { key: "source", label: "Source", render: (r) => r.source },
                      { key: "category", label: "Category", render: (r) => r.category },
                      { key: "amount", label: "Amount", render: (r) => <strong>£{parseFloat(r.amount).toFixed(2)}</strong> },
                      { key: "status", label: "Status", render: (r) => <Badge variant={getStatusBadgeVariant(r.status)}>{getStatusLabel(r.status)}</Badge> },
                      { key: "actions", label: "Actions", align: "right", render: (r) => (
                        <ActionLinks onEdit={() => handleEditIncome(r.id)} onDelete={() => handleDeleteIncome(r.id)} label={`income from ${r.source}`} />
                      ) },
                    ]}
                  />
                </div>

                {Object.keys(incomeByMonth).length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: isMobile || isTablet ? "1fr" : "1.4fr 1fr", gap: "16px" }}>
                    <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px" }}>
                      <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", fontFamily: "Manrope, sans-serif" }}>
                        Income Trend
                      </h3>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "160px" }}>
                        {Object.entries(incomeByMonth).sort().map(([month, amount]) => {
                          const maxAmount = Math.max(...Object.values(incomeByMonth));
                          const percentage = (amount / maxAmount) * 100;
                          return (
                            <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                              <div
                                style={{
                                  width: "100%",
                                  backgroundColor: TOKENS.colors.green[500],
                                  borderTopLeftRadius: "4px",
                                  borderTopRightRadius: "4px",
                                  height: `${percentage}%`,
                                }}
                                title={`£${amount.toFixed(2)}`}
                              ></div>
                              <span style={{ fontSize: "12px", color: TOKENS.colors.neutral[600] }}>{month.slice(5)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {Object.keys(incomeBySource).length > 0 && (
                      <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px" }}>
                        <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", fontFamily: "Manrope, sans-serif" }}>
                          Income by Source
                        </h3>
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
                                  <div
                                    style={{
                                      height: "100%",
                                      backgroundColor: TOKENS.colors.green[500],
                                      width: `${percentage}%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <Modal
              isOpen={showIncomeModal}
              onClose={() => { setShowIncomeModal(false); setEditingIncomeId(null); }}
              title={editingIncomeId ? 'Edit Income' : 'Add Income'}
            >
              <IncomeForm
                initialData={editingRecord}
                onSubmit={handleSaveIncome}
                onCancel={() => { setShowIncomeModal(false); setEditingIncomeId(null); }}
              />
            </Modal>
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

        const handleSaveExpense = (formData) => {
          try {
            if (editingExpenseId) {
              storeUpdateExpense(editingExpenseId, formData);
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

        const handleEditExpense = (id) => {
          setEditingExpenseId(id);
          setShowExpenseModal(true);
        };

        const handleDeleteExpense = (id) => {
          setConfirmDialog({ isOpen: true, type: 'expense', id });
        };

        const editingRecord = editingExpenseId ? storageService.getExpenseRecord(editingExpenseId) : null;
        const sortedRecords = [...expensesInTaxYear].sort((a, b) => storageService.parseLocalDate(b.date) - storageService.parseLocalDate(a.date));

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
                  <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", fontFamily: "Manrope, sans-serif" }}>
                    Expense History <span style={{ fontSize: "13px", fontWeight: "500", color: TOKENS.colors.neutral[500] }}>· {expenseTaxYearLabel}</span>
                  </h3>
                  <TransactionList
                    isMobile={isMobile}
                    getKey={(r) => r.id}
                    rows={sortedRecords}
                    columns={[
                      { key: "date", label: "Date", render: (r) => storageService.parseLocalDate(r.date).toLocaleDateString() },
                      { key: "merchant", label: "Merchant", render: (r) => r.merchant },
                      { key: "category", label: "Category", render: (r) => r.category },
                      { key: "amount", label: "Amount", render: (r) => <strong>£{parseFloat(r.amount).toFixed(2)}</strong> },
                      { key: "method", label: "Method", render: (r) => r.paymentMethod },
                      { key: "actions", label: "Actions", align: "right", render: (r) => (
                        <ActionLinks onEdit={() => handleEditExpense(r.id)} onDelete={() => handleDeleteExpense(r.id)} label={`expense from ${r.merchant}`} />
                      ) },
                    ]}
                  />
                </div>

                {Object.keys(expensesByMonth).length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: isMobile || isTablet ? "1fr" : "1.4fr 1fr", gap: "16px" }}>
                    <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px" }}>
                      <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", fontFamily: "Manrope, sans-serif" }}>
                        Expense Trend
                      </h3>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "160px" }}>
                        {Object.entries(expensesByMonth).sort().map(([month, amount]) => {
                          const maxAmount = Math.max(...Object.values(expensesByMonth));
                          const percentage = (amount / maxAmount) * 100;
                          return (
                            <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                              <div
                                style={{
                                  width: "100%",
                                  backgroundColor: TOKENS.colors.green[500],
                                  borderTopLeftRadius: "4px",
                                  borderTopRightRadius: "4px",
                                  height: `${percentage}%`,
                                }}
                                title={`£${amount.toFixed(2)}`}
                              ></div>
                              <span style={{ fontSize: "12px", color: TOKENS.colors.neutral[600] }}>{month.slice(5)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {Object.keys(expensesByCategory).length > 0 && (
                      <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px" }}>
                        <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", fontFamily: "Manrope, sans-serif" }}>
                          Expenses by Category
                        </h3>
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
                                  <div
                                    style={{
                                      height: "100%",
                                      backgroundColor: TOKENS.colors.green[500],
                                      width: `${percentage}%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <Modal
              isOpen={showExpenseModal}
              onClose={() => { setShowExpenseModal(false); setEditingExpenseId(null); }}
              title={editingExpenseId ? 'Edit Expense' : 'Add Expense'}
            >
              <ExpenseForm
                initialData={editingRecord}
                onSubmit={handleSaveExpense}
                onCancel={() => { setShowExpenseModal(false); setEditingExpenseId(null); }}
              />
            </Modal>
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

            <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px", marginTop: "24px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px", fontFamily: "Manrope, sans-serif" }}>
                Data &amp; backup
              </h2>
              <p style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginBottom: "16px" }}>
                Your records are stored only in this browser (localStorage). They are not sent to any server and may be lost if you clear your browser data or switch device. Export a backup regularly.
              </p>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <Button variant="secondary" onClick={handleExportJSON}>Export JSON backup</Button>
                <Button variant="secondary" onClick={handleExportCSV}>Export CSV (income &amp; expenses)</Button>
              </div>
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
            borderRight: `1px solid ${TOKENS.colors.neutral[800]}`,
          }}
        >
          {/* Logo */}
          <div style={{ padding: railMode ? "22px 0" : "24px 18px", display: "flex", alignItems: "center", justifyContent: railMode ? "center" : "flex-start", gap: "12px", borderBottom: `1px solid ${TOKENS.colors.neutral[800]}` }}>
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
                    e.currentTarget.style.backgroundColor = TOKENS.colors.neutral[800];
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
            <div style={{ padding: "24px 16px", borderTop: `1px solid ${TOKENS.colors.neutral[800]}`, fontSize: "12px", color: TOKENS.colors.neutral[500] }}>
              <p>© 2026 Daramola Digital Labs.</p>
              <p style={{ marginTop: "8px" }}>TaxMate UK is a product of Daramola Digital Labs.</p>
            </div>
          )}
        </aside>
      )}

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, overflowY: "auto", backgroundColor: TOKENS.colors.neutral[50], paddingBottom: isMobile ? "72px" : 0 }}>
        <div style={{ width: "100%", maxWidth: "1440px", margin: "0 auto", padding: isMobile ? "20px 16px" : "32px 36px", boxSizing: "border-box" }}>
          {/* Global toolbar (visible across all views) */}
          <div className="mb-6 flex items-center justify-end gap-3">
            <TaxYearSelector />
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
            borderTop: `1px solid ${TOKENS.colors.neutral[800]}`,
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
        <div style={{
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
              storeDeleteIncome(confirmDialog.id);
              setSuccessMessage('Income record deleted successfully');
            } else if (confirmDialog.type === 'expense') {
              storeDeleteExpense(confirmDialog.id);
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
