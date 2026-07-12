import { useState } from "react";
import { TOKENS } from "./tokens";
import { Alert, Switch, Button, Badge, EmptyState } from "./components";
import { IncomeForm } from "./IncomeForm";
import { ExpenseForm } from "./ExpenseForm";
import { storageService, INCOME_STATUS, INCOME_STATUS_LABELS } from "./storage";

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
  Income: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1v22M17 5H9.5a4.5 4.5 0 0 0 0 9h5m0 0a4.5 4.5 0 0 0 0 9H6" />
    </svg>
  ),
  Expenses: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="1" />
      <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" />
    </svg>
  ),
  Tax: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" />
    </svg>
  ),
  Logo: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
    </svg>
  ),
};

// Modal component
const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div style={{
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
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '14px',
        padding: '32px',
        maxHeight: '90vh',
        overflowY: 'auto',
        maxWidth: '600px',
        width: '90%',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: TOKENS.colors.neutral[900], fontFamily: 'Manrope, sans-serif' }}>
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

// Confirmation Dialog component
const ConfirmDialog = ({ isOpen, onConfirm, onCancel, title, message, confirmText = 'Delete', cancelText = 'Cancel' }) => {
  if (!isOpen) return null;
  return (
    <div style={{
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
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '14px',
        padding: '32px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: TOKENS.colors.neutral[900], marginBottom: '12px', fontFamily: 'Manrope, sans-serif' }}>
          {title}
        </h3>
        <p style={{ fontSize: '14px', color: TOKENS.colors.neutral[600], marginBottom: '24px' }}>
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

// Main App
function Dashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [monthlyReportsEnabled, setMonthlyReportsEnabled] = useState(true);
  const [incomeRecords, setIncomeRecords] = useState(() => storageService.getIncomeRecords());
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState(null);
  const [expenseRecords, setExpenseRecords] = useState(() => storageService.getExpenseRecords());
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: null, id: null });
  const [successMessage, setSuccessMessage] = useState(null);

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
        const greeting = now.getHours() < 12 ? "Morning" : now.getHours() < 18 ? "Afternoon" : "Evening";
        const taxYearStart = storageService.getTaxYearStart();
        const taxYearLabel = `${taxYearStart.getFullYear()}/${String((taxYearStart.getFullYear() + 1) % 100).padStart(2, "0")}`;

        const incomeReceivedYTD = storageService.calculateTotalReceived();
        const expensesYTD = storageService.calculateTotalExpensesYTD();
        const netProfitYTD = storageService.roundCurrency(incomeReceivedYTD - expensesYTD);
        const receiptsCount = storageService.getExpensesInTaxYear(expenseRecords).length;

        const dashIncomeByMonth = storageService.getIncomeByMonth();
        const dashExpensesByMonth = storageService.getExpensesByMonth();
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
                <h1 style={{ fontSize: "36px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  {greeting}, Priya 👋
                </h1>
              </div>
              <div style={{ width: "40px", height: "40px", backgroundColor: TOKENS.colors.green[200], borderRadius: "50%" }}></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: TOKENS.colors.green[500], color: "white", borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", opacity: 0.9 }}>Net profit YTD</div>
                <div style={{ fontSize: "30px", fontWeight: "800", marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>£{netProfitYTD.toFixed(2)}</div>
                <div style={{ fontSize: "13px", opacity: 0.85, marginTop: "8px" }}>Received income − expenses · {taxYearLabel}</div>
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

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "16px" }}>
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
                  This tax year
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", color: TOKENS.colors.neutral[600] }}>Outstanding</span>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: TOKENS.colors.semantic.warning }}>£{storageService.calculateOutstanding().toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", color: TOKENS.colors.neutral[600] }}>Overdue</span>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: TOKENS.colors.semantic.danger }}>£{storageService.calculateOverdue().toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${TOKENS.colors.neutral[200]}`, paddingTop: "12px" }}>
                    <span style={{ fontSize: "13px", color: TOKENS.colors.neutral[600] }}>Invoiced total</span>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: TOKENS.colors.neutral[900] }}>£{storageService.calculateTotalInvoiced().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      }

      case "income": {
        const totalReceived = storageService.calculateTotalReceived();
        const totalInvoiced = storageService.calculateTotalInvoiced();
        const outstanding = storageService.calculateOutstanding();
        const overdue = storageService.calculateOverdue();
        const thisMonth = storageService.calculateIncomeThisMonth();
        const avgMonthly = storageService.calculateAverageMonthlyIncome();
        const completedTaxMonths = storageService.getCompletedTaxMonths();
        const avgAvailableFrom = storageService.getFirstAverageAvailableDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const inTaxYear = storageService.getIncomeInTaxYear(incomeRecords);
        const statusOf = (r) => storageService.normaliseIncomeStatus(r.status);
        const receivedCount = inTaxYear.filter(r => statusOf(r) === INCOME_STATUS.RECEIVED).length;
        const pendingCount = inTaxYear.filter(r => statusOf(r) === INCOME_STATUS.PENDING).length;
        const overdueCount = inTaxYear.filter(r => statusOf(r) === INCOME_STATUS.OVERDUE).length;
        const incomeByMonth = storageService.getIncomeByMonth();
        const incomeBySource = storageService.getIncomeBySource();

        const handleSaveIncome = (formData) => {
          try {
            if (editingIncomeId) {
              storageService.updateIncomeRecord(editingIncomeId, formData);
              setSuccessMessage('Income record updated successfully');
            } else {
              storageService.addIncomeRecord(formData);
              setSuccessMessage('Income record added successfully');
            }
            setIncomeRecords(storageService.getIncomeRecords());
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

        const sortedRecords = [...incomeRecords].sort((a, b) => storageService.parseLocalDate(b.date) - storageService.parseLocalDate(a.date));

        return (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
              <div>
                <h1 style={{ fontSize: "36px", fontWeight: "800", color: TOKENS.colors.neutral[900], fontFamily: "Manrope, sans-serif" }}>
                  Income
                </h1>
                <p style={{ color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Track and manage your income sources</p>
              </div>
              <Button variant="primary" onClick={() => { setEditingIncomeId(null); setShowIncomeModal(true); }}>
                + Add income
              </Button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "16px" }}>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Total received YTD</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £{totalReceived.toFixed(2)}
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>{receivedCount} payment{receivedCount === 1 ? '' : 's'} received</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Total invoiced YTD</div>
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

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
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
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Received this month</div>
                <div style={{ fontSize: "24px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £{thisMonth.toFixed(2)}
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Current calendar month</div>
              </div>
            </div>

            {incomeRecords.length === 0 ? (
              <EmptyState
                icon="📊"
                title="No income records yet"
                description="Start by adding your first income record to track your earnings."
                action="Add income"
              />
            ) : (
              <>
                <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px", marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", fontFamily: "Manrope, sans-serif" }}>
                    Income History
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${TOKENS.colors.neutral[200]}` }}>
                          <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: TOKENS.colors.neutral[700] }}>Date</th>
                          <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: TOKENS.colors.neutral[700] }}>Source</th>
                          <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: TOKENS.colors.neutral[700] }}>Category</th>
                          <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: TOKENS.colors.neutral[700] }}>Amount</th>
                          <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: TOKENS.colors.neutral[700] }}>Status</th>
                          <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: TOKENS.colors.neutral[700] }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRecords.map((record) => (
                          <tr key={record.id} style={{ borderBottom: `1px solid ${TOKENS.colors.neutral[200]}` }}>
                            <td style={{ padding: "12px 16px" }}>{storageService.parseLocalDate(record.date).toLocaleDateString()}</td>
                            <td style={{ padding: "12px 16px" }}>{record.source}</td>
                            <td style={{ padding: "12px 16px" }}>{record.category}</td>
                            <td style={{ padding: "12px 16px", fontWeight: "600" }}>£{parseFloat(record.amount).toFixed(2)}</td>
                            <td style={{ padding: "12px 16px" }}>
                              <Badge variant={getStatusBadgeVariant(record.status)}>{getStatusLabel(record.status)}</Badge>
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => handleEditIncome(record.id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: TOKENS.colors.green[500],
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteIncome(record.id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: TOKENS.colors.semantic.danger,
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {Object.keys(incomeByMonth).length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "16px" }}>
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
        const totalYTD = storageService.calculateTotalExpensesYTD();
        const thisMonth = storageService.calculateExpensesThisMonth();
        const avgMonthly = storageService.calculateAverageMonthlyExpenses();
        const completedTaxMonths = storageService.getCompletedTaxMonths();
        const avgAvailableFrom = storageService.getFirstAverageAvailableDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const expensesByMonth = storageService.getExpensesByMonth();
        const expensesByCategory = storageService.getExpensesByCategory();

        const handleSaveExpense = (formData) => {
          try {
            if (editingExpenseId) {
              storageService.updateExpenseRecord(editingExpenseId, formData);
              setSuccessMessage('Expense record updated successfully');
            } else {
              storageService.addExpenseRecord(formData);
              setSuccessMessage('Expense record added successfully');
            }
            setExpenseRecords(storageService.getExpenseRecords());
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
        const sortedRecords = [...expenseRecords].sort((a, b) => storageService.parseLocalDate(b.date) - storageService.parseLocalDate(a.date));

        return (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
              <div>
                <h1 style={{ fontSize: "36px", fontWeight: "800", color: TOKENS.colors.neutral[900], fontFamily: "Manrope, sans-serif" }}>
                  Expenses
                </h1>
                <p style={{ color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Log and categorize your business expenses</p>
              </div>
              <Button variant="primary" onClick={() => { setEditingExpenseId(null); setShowExpenseModal(true); }}>
                + Add expense
              </Button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Total expenses YTD</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £{totalYTD.toFixed(2)}
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>{expenseRecords.length} receipts logged</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>This month</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £{thisMonth.toFixed(2)}
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>expenses this month</div>
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

            {expenseRecords.length === 0 ? (
              <EmptyState
                icon="📝"
                title="No expenses recorded yet"
                description="Start tracking your business expenses to monitor spending and prepare for tax filing."
                action="Add expense"
              />
            ) : (
              <>
                <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px", marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", fontFamily: "Manrope, sans-serif" }}>
                    Expense History
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${TOKENS.colors.neutral[200]}` }}>
                          <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: TOKENS.colors.neutral[700] }}>Date</th>
                          <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: TOKENS.colors.neutral[700] }}>Merchant</th>
                          <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: TOKENS.colors.neutral[700] }}>Category</th>
                          <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: TOKENS.colors.neutral[700] }}>Amount</th>
                          <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: TOKENS.colors.neutral[700] }}>Method</th>
                          <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: TOKENS.colors.neutral[700] }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRecords.map((record) => (
                          <tr key={record.id} style={{ borderBottom: `1px solid ${TOKENS.colors.neutral[200]}` }}>
                            <td style={{ padding: "12px 16px" }}>{storageService.parseLocalDate(record.date).toLocaleDateString()}</td>
                            <td style={{ padding: "12px 16px" }}>{record.merchant}</td>
                            <td style={{ padding: "12px 16px" }}>{record.category}</td>
                            <td style={{ padding: "12px 16px", fontWeight: "600" }}>£{parseFloat(record.amount).toFixed(2)}</td>
                            <td style={{ padding: "12px 16px" }}>{record.paymentMethod}</td>
                            <td style={{ padding: "12px 16px" }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => handleEditExpense(record.id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: TOKENS.colors.green[500],
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteExpense(record.id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: TOKENS.colors.semantic.danger,
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {Object.keys(expensesByMonth).length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "16px" }}>
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
        const taxYearStart = storageService.getTaxYearStart();
        const taxYearLabel = `${taxYearStart.getFullYear()}/${String((taxYearStart.getFullYear() + 1) % 100).padStart(2, "0")}`;
        const receivedYTD = storageService.calculateTotalReceived();
        const expensesYTD = storageService.calculateTotalExpensesYTD();
        const netProfitYTD = storageService.roundCurrency(receivedYTD - expensesYTD);

        return (
          <>
            <div style={{ marginBottom: "32px" }}>
              <h1 style={{ fontSize: "36px", fontWeight: "800", color: TOKENS.colors.neutral[900], fontFamily: "Manrope, sans-serif" }}>
                Tax estimate preview
              </h1>
              <p style={{ color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Figures below are drawn from your recorded transactions for {taxYearLabel}.</p>
            </div>

            <Alert
              variant="warning"
              title="Estimate not yet available"
              description="A Self Assessment tax estimate needs tested UK tax rules (personal allowance, bands, Class 2/4 NICs) that are not implemented yet. The figures below are your actual recorded income and expenses — not a tax calculation."
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginTop: "24px" }}>
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
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Net profit (pre-tax)</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £{netProfitYTD.toFixed(2)}
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Received income − expenses</div>
              </div>
            </div>
          </>
        );
      }

      case "settings":
        return (
          <>
            <div style={{ marginBottom: "32px" }}>
              <h1 style={{ fontSize: "36px", fontWeight: "800", color: TOKENS.colors.neutral[900], fontFamily: "Manrope, sans-serif" }}>
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
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", fontFamily: "Manrope, sans-serif" }}>
                Preferences
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "16px", borderBottom: `1px solid ${TOKENS.colors.neutral[200]}` }}>
                  <div>
                    <div style={{ fontWeight: "600", color: TOKENS.colors.neutral[900] }}>Email notifications</div>
                    <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "4px" }}>Receive tax deadline alerts</div>
                  </div>
                  <Switch checked={notificationsEnabled} onChange={setNotificationsEnabled} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: "600", color: TOKENS.colors.neutral[900] }}>Monthly reports</div>
                    <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "4px" }}>Get automatic summary emails</div>
                  </div>
                  <Switch checked={monthlyReportsEnabled} onChange={setMonthlyReportsEnabled} />
                </div>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh", backgroundColor: TOKENS.colors.neutral[50], fontFamily: "Inter, sans-serif" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: "220px",
          flex: "0 0 220px",
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
        <div style={{ padding: "24px 18px", display: "flex", alignItems: "center", gap: "12px", borderBottom: `1px solid ${TOKENS.colors.neutral[800]}` }}>
          <div style={{ width: "32px", height: "32px", backgroundColor: TOKENS.colors.green[500], borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icons.Logo />
          </div>
          <span style={{ fontWeight: "700", fontSize: "18px" }}>TaxMate</span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "24px 16px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              aria-current={activeNav === item.id ? "page" : undefined}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
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
                  e.target.style.backgroundColor = TOKENS.colors.neutral[800];
                  e.target.style.color = "white";
                }
              }}
              onMouseLeave={(e) => {
                if (activeNav !== item.id) {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.color = TOKENS.colors.neutral[400];
                }
              }}
            >
              <item.Icon />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: "24px 16px", borderTop: `1px solid ${TOKENS.colors.neutral[800]}`, fontSize: "12px", color: TOKENS.colors.neutral[500] }}>
          <p>© 2026 Daramola Digital Labs.</p>
          <p style={{ marginTop: "8px" }}>TaxMate UK is a product of Daramola Digital Labs.</p>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, overflowY: "auto", backgroundColor: TOKENS.colors.neutral[50] }}>
        <div style={{ width: "100%", maxWidth: "1440px", margin: "0 auto", padding: "32px 36px", boxSizing: "border-box" }}>
          {renderContent()}
        </div>
      </main>

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
              storageService.deleteIncomeRecord(confirmDialog.id);
              setIncomeRecords(storageService.getIncomeRecords());
              setSuccessMessage('Income record deleted successfully');
            } else if (confirmDialog.type === 'expense') {
              storageService.deleteExpenseRecord(confirmDialog.id);
              setExpenseRecords(storageService.getExpenseRecords());
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
