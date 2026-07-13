import { useRef, useState } from 'react';
import { useTaxStore, taxYearStartToLabel, taxYearReferenceDate, getAvailableTaxYears } from './store';
import { storageService } from './storage';
import { TOKENS } from './tokens';
import { Alert } from './components';
import { useBreakpoint } from './hooks';
import { diagnosticsService } from './diagnostics';
import type { IncomeRecord, ExpenseRecord } from './types';
import { calculateEstimate } from './tax-engine/estimate';
import type { EstimateInput, TaxRegion, DeductionMethod } from './tax-engine/types';
import { toPence, formatPounds } from './tax-engine/money';
type ReportTab = 'summary' | 'income' | 'expenses' | 'tax' | 'past';

const REPORT_TABS: { id: ReportTab; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'income', label: 'Income' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'tax', label: 'Tax Preview' },
  { id: 'past', label: 'Past Years' },
];

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

export function ReportsView() {
  const selectedTaxYear = useTaxStore((s) => s.selectedTaxYear);
  const setSelectedTaxYear = useTaxStore((s) => s.setSelectedTaxYear);
  const incomeRecords = useTaxStore((s) => s.income);
  const expenseRecords = useTaxStore((s) => s.expenses);

  const [activeTab, setActiveTab] = useState<ReportTab>('summary');
  const [profileForm, setProfileForm] = useState({
    taxRegion: 'england' as TaxRegion,
    singleBusiness: true,
    accountingBasis: 'cash' as "cash" | "traditional",
    deductionMethod: 'actual-expenses' as DeductionMethod,
    hasOtherIncome: false,
    tradingAllowanceEligible: true,
    giftAidOrPension: false,
  });
  const [isConfirmed, setIsConfirmed] = useState(false);

  const updateProfile = <K extends keyof typeof profileForm>(key: K, val: typeof profileForm[K]) => {
    setProfileForm(prev => ({ ...prev, [key]: val }));
    setIsConfirmed(false); // invalidate estimate on any change
  };
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const flash = (m: string) => {
    setMessage(m);
    window.setTimeout(() => setMessage(null), 5000);
  };

  const taxYearLabel = taxYearStartToLabel(selectedTaxYear);
  const taxRef = taxYearReferenceDate(selectedTaxYear);

  const incomeInYear = storageService.getIncomeInTaxYear(incomeRecords, taxRef) as unknown as IncomeRecord[];
  const expensesInYear = storageService.getExpensesInTaxYear(expenseRecords, taxRef) as unknown as ExpenseRecord[];

  const receivedYTD = storageService.calculateTotalReceived(taxRef, incomeRecords);
  const expensesYTD = storageService.calculateTotalExpensesYTD(taxRef, expenseRecords);
  const netProfitYTD = storageService.roundCurrency(receivedYTD - expensesYTD);

  // Advanced calcs
  const pendingIncome = incomeInYear.filter(r => r.status === 'pending').reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const overdueIncome = incomeInYear.filter(r => r.status === 'overdue').reduce((sum, r) => sum + parseFloat(r.amount), 0);
  
  // Engine estimate
  let estimateResult = null;
  let estimateError = null;
  if (isConfirmed) {
    try {
      const expensesForEngine = expensesInYear.map(e => ({
        amount: toPence(parseFloat(e.amount)),
        treatment: (e.taxTreatment as 'allowable' | 'not-allowable' | 'needs-review') || 'needs-review',
        paymentStatus: e.paymentStatus as 'paid' | 'unpaid' | undefined
      }));
      
      const estimateInput: EstimateInput = {
        taxYear: taxYearLabel.replace('/', '-'),
        profile: {
          taxRegion: profileForm.taxRegion,
          hasEmploymentIncome: profileForm.hasOtherIncome,
          hasPensionIncome: false,
          hasPropertyIncome: false,
          hasDividends: false,
          hasSavingsInterest: false,
          hasCapitalGains: false,
          hasOtherTaxableIncome: false,
          accountingBasis: profileForm.accountingBasis,
          singleBusiness: profileForm.singleBusiness,
        },
        receivedTradingIncome: toPence(receivedYTD),
        deductionMethod: profileForm.deductionMethod,
        tradingAllowanceEligible: profileForm.tradingAllowanceEligible,
        giftAidOrPensionContributions: profileForm.giftAidOrPension,
        expenses: expensesForEngine
      };
      
      estimateResult = calculateEstimate(estimateInput);
    } catch (err) {
      estimateError = err instanceof Error ? err.message : "Calculation failed.";
    }
  }  
  // Breakdowns
  const incomeBySource = incomeInYear.reduce((acc, r) => {
    acc[r.source] = (acc[r.source] || 0) + parseFloat(r.amount);
    return acc;
  }, {} as Record<string, number>);

  const expensesByCategory = expensesInYear.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + parseFloat(r.amount);
    return acc;
  }, {} as Record<string, number>);

  // Monthly trend (YYYY-MM)
  const monthlyTrend = () => {
    const months: Record<string, { income: number, expense: number }> = {};
    incomeInYear.forEach(r => {
      const m = r.date.substring(0, 7);
      if (!months[m]) months[m] = { income: 0, expense: 0 };
      months[m].income += parseFloat(r.amount);
    });
    expensesInYear.forEach(r => {
      const m = r.date.substring(0, 7);
      if (!months[m]) months[m] = { income: 0, expense: 0 };
      months[m].expense += parseFloat(r.amount);
    });
    return Object.entries(months).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const { isMobile } = useBreakpoint();
  const pageHeadingSize = isMobile ? "26px" : "36px";
  const kpiCols = "repeat(auto-fit, minmax(240px, 1fr))";

  const stamp = () => new Date().toISOString().slice(0, 10);
  // lastExportDate is only recorded AFTER the JSON download succeeds — a
  // failed export must never advance the backup-reminder clock. CSV exports
  // do not count as a "successful JSON backup" for reminder purposes.
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
  const handleExportIncomeCSV = () => {
    try {
      const yearTag = taxYearLabel.replace('/', '-');
      const inc = storageService.recordsToCSV(incomeInYear);
      downloadFile(`taxmate-income-${yearTag}-${stamp()}.csv`, inc || 'No income records', 'text/csv');
      diagnosticsService.logEvent('EXPORT_SUCCESS', 'export', 'info');
      flash('Income CSV exported successfully.');
    } catch {
      diagnosticsService.logEvent('EXPORT_FAILURE', 'export', 'error');
      flash('Income CSV export failed. Your existing data was not changed.');
    }
  };
  const handleExportExpenseCSV = () => {
    try {
      const yearTag = taxYearLabel.replace('/', '-');
      const exp = storageService.recordsToCSV(expensesInYear);
      downloadFile(`taxmate-expenses-${yearTag}-${stamp()}.csv`, exp || 'No expense records', 'text/csv');
      diagnosticsService.logEvent('EXPORT_SUCCESS', 'export', 'info');
      flash('Expense CSV exported successfully.');
    } catch {
      diagnosticsService.logEvent('EXPORT_FAILURE', 'export', 'error');
      flash('Expense CSV export failed. Your existing data was not changed.');
    }
  };
  const handleExportSummaryCSV = () => {
    try {
      const yearTag = taxYearLabel.replace('/', '-');
      const summary = `Metric,Value\nIncome Received,${receivedYTD.toFixed(2)}\nOutstanding Income,${pendingIncome.toFixed(2)}\nOverdue Income,${overdueIncome.toFixed(2)}\nRecorded Expenses,${expensesYTD.toFixed(2)}\nRecorded Cash Surplus,${netProfitYTD.toFixed(2)}\nIncome Transaction Count,${incomeInYear.length}\nExpense Transaction Count,${expensesInYear.length}`;
      downloadFile(`taxmate-summary-${yearTag}-${stamp()}.csv`, summary, 'text/csv');
      diagnosticsService.logEvent('EXPORT_SUCCESS', 'export', 'info');
      flash('Summary CSV exported successfully.');
    } catch {
      diagnosticsService.logEvent('EXPORT_FAILURE', 'export', 'error');
      flash('Summary CSV export failed. Your existing data was not changed.');
    }
  };

  const pastYears = getAvailableTaxYears().filter(y => y !== selectedTaxYear);

  // Standard ARIA tabs roving-tabindex pattern: arrow keys move focus AND
  // activate the tab immediately (automatic activation), matching the
  // existing single-click activation model these tabs already use.
  const onTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number;
    switch (e.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % REPORT_TABS.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + REPORT_TABS.length) % REPORT_TABS.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = REPORT_TABS.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    setActiveTab(REPORT_TABS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="reports-view">
      <div className="mb-8 print:hidden">
        <h1 style={{ fontSize: pageHeadingSize, fontWeight: "800", color: TOKENS.colors.neutral[900], fontFamily: "Manrope, sans-serif" }}>
          Tax Year Reports
        </h1>
        <p style={{ color: TOKENS.colors.neutral[600], marginTop: "8px" }}>
          Reports and summaries for {taxYearLabel}.
        </p>
      </div>

      <div role="status" aria-live="polite" className="print:hidden">
        {message && (
          <div className="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800">
            {message}
          </div>
        )}
      </div>

      {/* Tabs and Print Button */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-2 print:hidden">
        <div role="tablist" aria-label="Report sections" className="flex flex-wrap gap-2">
          {REPORT_TABS.map((tab, index) => (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[index] = el; }}
              role="tab"
              id={`report-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`report-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => onTabKeyDown(e, index)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg ${activeTab === tab.id ? 'bg-neutral-100 text-neutral-900 border-b-2 border-green-600' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
        >
          Print Report
        </button>
      </div>

      <div className="print-section">
        {/* Print Header (Only visible when printing) */}
        <div className="hidden print:block mb-8 border-b border-neutral-300 pb-4">
          <h1 className="text-2xl font-bold">TaxMate Report: {taxYearLabel}</h1>
          <p className="text-neutral-600 mt-2">
            <strong>Generation Date:</strong> {new Date().toLocaleString('en-GB')}
          </p>
          <div className="mt-4 p-4 rounded-lg bg-neutral-50 text-xs text-neutral-600 border border-neutral-200">
            <strong>Data quality notes:</strong> All records are stored locally on your device. The accuracy of these reports depends entirely on your inputs. Demo records, if loaded, are included in these totals.
          </div>
        </div>

        {/* SUMMARY TAB */}
        <div
          role="tabpanel"
          id="report-panel-summary"
          aria-labelledby="report-tab-summary"
          tabIndex={0}
          className={activeTab === 'summary' ? 'block' : 'hidden print:block print:mb-8'}
        >
          <div className="flex items-center justify-between mb-4 print:hidden">
            <h2 className="text-xl font-bold">Tax-year summary</h2>
            <div className="flex gap-2">
              <button onClick={handleExportSummaryCSV} className="text-sm px-3 py-1 bg-white border border-neutral-300 rounded hover:bg-neutral-50">CSV Summary</button>
              <button onClick={handleExportJSON} className="text-sm px-3 py-1 bg-white border border-neutral-300 rounded hover:bg-neutral-50">JSON Backup</button>
            </div>
          </div>
          <h2 className="hidden print:block text-xl font-bold mb-4">Tax-year summary</h2>
          
          <div style={{ display: "grid", gridTemplateColumns: kpiCols, gap: "16px", marginBottom: "24px" }}>
            <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[600] }}>Income received</div>
              <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                £{receivedYTD.toFixed(2)}
              </div>
            </div>
            <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[600] }}>Expenses recorded</div>
              <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                £{expensesYTD.toFixed(2)}
              </div>
            </div>
            <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[600] }}>Recorded cash surplus</div>
              <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                £{netProfitYTD.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: kpiCols, gap: "16px", marginBottom: "24px" }}>
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
              <div className="text-sm text-neutral-500 font-semibold">Outstanding Income</div>
              <div className="text-xl font-bold mt-1 text-yellow-700">£{pendingIncome.toFixed(2)}</div>
            </div>
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
              <div className="text-sm text-neutral-500 font-semibold">Overdue Income</div>
              <div className="text-xl font-bold mt-1 text-red-700">£{overdueIncome.toFixed(2)}</div>
            </div>
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
              <div className="text-sm text-neutral-500 font-semibold">Transaction Counts</div>
              <div className="text-base font-bold mt-1 text-neutral-800">{incomeInYear.length} Income / {expensesInYear.length} Expenses</div>
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 mb-6">
            <h3 className="font-bold mb-3">Monthly Trend</h3>
            <div className="space-y-2">
              {monthlyTrend().length > 0 ? monthlyTrend().map(([m, totals]) => (
                <div key={m} className="flex justify-between text-sm border-b border-neutral-100 pb-2">
                  <span className="font-semibold text-neutral-700">{m}</span>
                  <span className="text-neutral-600">Inc: £{totals.income.toFixed(2)} | Exp: £{totals.expense.toFixed(2)}</span>
                </div>
              )) : (
                <div className="text-sm text-neutral-500">No transactions recorded.</div>
              )}
            </div>
          </div>

          {/* Data Quality Notes for screen */}
          <div className="print:hidden mt-6 p-4 rounded-lg bg-neutral-50 text-xs text-neutral-600 border border-neutral-200">
            <strong>Data quality notes:</strong> All records are stored locally on your device. The accuracy of these reports depends entirely on your inputs. Demo records, if loaded, are included in these totals. <br/>
            <strong>Generation Date:</strong> {new Date().toLocaleString('en-GB')}
          </div>
        </div>

        {/* INCOME TAB */}
        <div
          role="tabpanel"
          id="report-panel-income"
          aria-labelledby="report-tab-income"
          tabIndex={0}
          className={activeTab === 'income' ? 'block' : 'hidden print:block print:break-before-page print:mb-8'}
        >
          <div className="flex items-center justify-between mb-4 print:hidden">
            <h2 className="text-xl font-bold">Income status</h2>
            <button onClick={handleExportIncomeCSV} className="text-sm px-3 py-1 bg-white border border-neutral-300 rounded hover:bg-neutral-50">CSV Export</button>
          </div>
          <h2 className="hidden print:block text-xl font-bold mb-4">Income status</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-neutral-200">
              <h3 className="font-bold mb-2">Income Source Breakdown</h3>
              <div className="space-y-1 text-sm">
                {Object.entries(incomeBySource).length > 0 ? Object.entries(incomeBySource).map(([src, total]) => (
                  <div key={src} className="flex justify-between">
                    <span className="text-neutral-600">{src}</span>
                    <span className="font-medium">£{total.toFixed(2)}</span>
                  </div>
                )) : <div className="text-neutral-500">No income sources.</div>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold text-neutral-700">Date</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-neutral-700">Source</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-neutral-700">Category</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-neutral-700">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-neutral-700 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {incomeInYear.length > 0 ? (
                  incomeInYear.map(r => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 whitespace-nowrap">{r.date}</td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{r.source}</td>
                      <td className="px-4 py-3 text-neutral-600">{r.category}</td>
                      <td className="px-4 py-3 text-neutral-600 capitalize">{r.status}</td>
                      <td className="px-4 py-3 text-right font-medium">£{parseFloat(r.amount).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                      No income recorded for this tax year.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* EXPENSES TAB */}
        <div
          role="tabpanel"
          id="report-panel-expenses"
          aria-labelledby="report-tab-expenses"
          tabIndex={0}
          className={activeTab === 'expenses' ? 'block' : 'hidden print:block print:break-before-page print:mb-8'}
        >
          <div className="flex items-center justify-between mb-4 print:hidden">
            <h2 className="text-xl font-bold">Expense breakdown</h2>
            <button onClick={handleExportExpenseCSV} className="text-sm px-3 py-1 bg-white border border-neutral-300 rounded hover:bg-neutral-50">CSV Export</button>
          </div>
          <h2 className="hidden print:block text-xl font-bold mb-4">Expense breakdown</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-neutral-200">
              <h3 className="font-bold mb-2">Expense Category Breakdown</h3>
              <div className="space-y-1 text-sm">
                {Object.entries(expensesByCategory).length > 0 ? Object.entries(expensesByCategory).map(([cat, total]) => (
                  <div key={cat} className="flex justify-between">
                    <span className="text-neutral-600">{cat}</span>
                    <span className="font-medium">£{total.toFixed(2)}</span>
                  </div>
                )) : <div className="text-neutral-500">No expense categories.</div>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold text-neutral-700">Date</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-neutral-700">Merchant</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-neutral-700">Category</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-neutral-700 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {expensesInYear.length > 0 ? (
                  expensesInYear.map(r => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 whitespace-nowrap">{r.date}</td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{r.merchant}</td>
                      <td className="px-4 py-3 text-neutral-600">{r.category}</td>
                      <td className="px-4 py-3 text-right font-medium">£{parseFloat(r.amount).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                      No expenses recorded for this tax year.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TAX PREVIEW TAB */}
        <div
          role="tabpanel"
          id="report-panel-tax"
          aria-labelledby="report-tab-tax"
          tabIndex={0}
          className={activeTab === 'tax' ? 'block' : 'hidden print:block print:break-before-page print:mb-8'}
        >
          <h2 className="text-xl font-bold mb-4">Tax estimate preview</h2>

          <div className="mb-6 max-w-2xl">
            <Alert
              variant="warning"
              title="Prototype estimate only"
              description="This calculation uses the information and assumptions you provide and may not include all income, reliefs, adjustments or individual circumstances. It is not tax advice, is not HMRC-approved and must not be used by itself to complete or file a tax return. Check current GOV.UK guidance or consult a qualified tax professional."
            />
          </div>

          {!isConfirmed || estimateError ? (
            <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm max-w-2xl print:hidden">
              <h3 className="font-bold text-lg mb-4 text-neutral-900">Tax Profile Details</h3>
              <p className="text-sm text-neutral-600 mb-6">Provide your exact profile details to generate an accurate estimate.</p>
              
              {estimateError && (
                <div className="mb-6">
                  <Alert variant="error" title="Estimate unavailable" description={estimateError} />
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Tax Region</label>
                  <select 
                    value={profileForm.taxRegion}
                    onChange={(e) => updateProfile('taxRegion', e.target.value as TaxRegion)}
                    className="w-full p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                  >
                    <option value="england">England</option>
                    <option value="wales">Wales</option>
                    <option value="ni">Northern Ireland</option>
                    <option value="scotland">Scotland</option>
                  </select>
                </div>
                
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={profileForm.singleBusiness} onChange={(e) => updateProfile('singleBusiness', e.target.checked)} className="mt-1 w-5 h-5 rounded border-neutral-300 text-green-600 focus:ring-green-500" />
                  <span className="text-sm text-neutral-700">My only source of self-employment is this single sole-trader business.</span>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={profileForm.hasOtherIncome} onChange={(e) => updateProfile('hasOtherIncome', e.target.checked)} className="mt-1 w-5 h-5 rounded border-neutral-300 text-green-600 focus:ring-green-500" />
                  <span className="text-sm text-neutral-700">I have other sources of taxable income (e.g. employment, property, dividends).</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Accounting Basis</label>
                  <select 
                    value={profileForm.accountingBasis}
                    onChange={(e) => updateProfile('accountingBasis', e.target.value as "cash" | "traditional")}
                    className="w-full p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                  >
                    <option value="cash">Cash Basis (Default)</option>
                    <option value="traditional">Traditional (Accruals) Basis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Deduction Method</label>
                  <select 
                    value={profileForm.deductionMethod}
                    onChange={(e) => updateProfile('deductionMethod', e.target.value as DeductionMethod)}
                    className="w-full p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                  >
                    <option value="actual-expenses">Actual Expenses</option>
                    <option value="trading-allowance">£1,000 Trading Allowance</option>
                  </select>
                </div>

                {profileForm.deductionMethod === 'trading-allowance' && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={profileForm.tradingAllowanceEligible} onChange={(e) => updateProfile('tradingAllowanceEligible', e.target.checked)} className="mt-1 w-5 h-5 rounded border-neutral-300 text-green-600 focus:ring-green-500" />
                    <span className="text-sm text-neutral-700">I am eligible to claim the Trading Allowance.</span>
                  </label>
                )}

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={profileForm.giftAidOrPension} onChange={(e) => updateProfile('giftAidOrPension', e.target.checked)} className="mt-1 w-5 h-5 rounded border-neutral-300 text-green-600 focus:ring-green-500" />
                  <span className="text-sm text-neutral-700">I have made Gift Aid donations or personal pension contributions (not accounted for here).</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsConfirmed(true)}
                  className="mt-6 px-4 py-2 bg-neutral-900 text-white rounded font-medium hover:bg-black transition-colors"
                >
                  Calculate Estimate
                </button>
              </div>
            </div>
          ) : estimateResult ? (
            <div className="space-y-6">
              {estimateResult.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 space-y-2">
                  {estimateResult.warnings.map((w, i) => <p key={i}>• {w}</p>)}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
                  <h3 className="font-bold text-neutral-800 mb-4">Profit Calculation</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-neutral-600">
                      <span>Trading Income</span>
                      <span>£{formatPounds(estimateResult.receivedTradingIncome)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Deduction ({estimateResult.deductionMethodUsed === 'actual-expenses' ? 'Actual Expenses' : 'Trading Allowance'})</span>
                      <span className="text-red-600">− £{formatPounds(estimateResult.deductionAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-neutral-900 pt-2 border-t border-neutral-100">
                      <span>Taxable Profit</span>
                      <span>£{formatPounds(estimateResult.taxableTradingProfit)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
                  <h3 className="font-bold text-neutral-800 mb-4">Tax Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-neutral-600">
                      <span>Personal Allowance</span>
                      <span className="text-green-600">− £{formatPounds(estimateResult.personalAllowanceUsed)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Taxable Income</span>
                      <span>£{formatPounds(estimateResult.taxableIncome)}</span>
                    </div>
                    <div className="pt-2 border-t border-neutral-100 space-y-1">
                      {estimateResult.incomeTaxByBand.filter(b => b.taxDue > 0).map(b => (
                        <div key={b.name} className="flex justify-between text-neutral-600">
                          <span>{b.name} ({(b.rate * 100).toFixed(0)}%)</span>
                          <span>£{formatPounds(b.taxDue)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between font-bold text-neutral-900 pt-2 border-t border-neutral-100">
                      <span>Income Tax Due</span>
                      <span>£{formatPounds(estimateResult.totalIncomeTax)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-neutral-900">
                      <span>Class 4 NICs</span>
                      <span>£{formatPounds(estimateResult.class4NICs)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-6 rounded-xl border border-green-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-green-900">Estimated Total Tax</h3>
                  <p className="text-sm text-green-800 mt-1">Based on rules for {estimateResult.taxYear}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-green-900 font-['Manrope']">£{formatPounds(estimateResult.estimatedTotal)}</div>
                  <div className="text-sm text-green-800 font-medium mt-1">Effective rate: {estimateResult.effectiveRate.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* PAST YEARS TAB */}
        <div
          role="tabpanel"
          id="report-panel-past"
          aria-labelledby="report-tab-past"
          tabIndex={0}
          className={activeTab === 'past' ? 'block' : 'hidden print:block print:break-before-page'}
        >
          <h2 className="text-xl font-bold mb-4">Past Tax Years Summary</h2>
          {pastYears.length > 0 ? pastYears.map(year => {
            const yrRef = storageService.getTaxYearStartForYear(year);
            const yrIncome = storageService.getIncomeInTaxYear(incomeRecords, yrRef) as unknown as IncomeRecord[];
            const yrExpense = storageService.getExpensesInTaxYear(expenseRecords, yrRef) as unknown as ExpenseRecord[];
            const rYTD = storageService.calculateTotalReceived(yrRef, incomeRecords);
            const eYTD = storageService.calculateTotalExpensesYTD(yrRef, expenseRecords);
            const netYTD = storageService.roundCurrency(rYTD - eYTD);
            
            return (
              <div key={year} className="bg-white border border-neutral-200 rounded-xl p-5 mb-4 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2">
                  <h3 className="text-lg font-bold text-neutral-900">{taxYearStartToLabel(year)}</h3>
                  <button 
                    onClick={() => { setSelectedTaxYear(year); setActiveTab('summary'); }}
                    className="text-sm font-semibold text-green-700 hover:text-green-800 print:hidden"
                  >
                    Open report &rarr;
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div>
                    <div className="text-xs text-neutral-500 font-semibold">Income Count</div>
                    <div className="font-bold text-neutral-800">{yrIncome.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 font-semibold">Expense Count</div>
                    <div className="font-bold text-neutral-800">{yrExpense.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 font-semibold">Income Received</div>
                    <div className="font-bold text-green-700">£{rYTD.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 font-semibold">Recorded Expenses</div>
                    <div className="font-bold text-neutral-800">£{eYTD.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 font-semibold">Cash Surplus</div>
                    <div className="font-bold text-neutral-900">£{netYTD.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="p-8 text-center text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-200">
              No other available tax years to display.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
