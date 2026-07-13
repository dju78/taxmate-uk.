import { useState } from 'react';
import { useTaxStore, taxYearStartToLabel, taxYearReferenceDate } from './store';
import { storageService } from './storage';
import { TOKENS } from './tokens';
import { Alert } from './components';
import type { IncomeRecord, ExpenseRecord } from './types';

type ReportTab = 'summary' | 'income' | 'expenses' | 'tax';

export function ReportsView() {
  const selectedTaxYear = useTaxStore((s) => s.selectedTaxYear);
  const incomeRecords = useTaxStore((s) => s.income);
  const expenseRecords = useTaxStore((s) => s.expenses);

  const [activeTab, setActiveTab] = useState<ReportTab>('summary');

  const taxYearLabel = taxYearStartToLabel(selectedTaxYear);
  const taxRef = taxYearReferenceDate(selectedTaxYear);

  const incomeInYear = storageService.getIncomeInTaxYear(incomeRecords, taxRef) as unknown as IncomeRecord[];
  const expensesInYear = storageService.getExpensesInTaxYear(expenseRecords, taxRef) as unknown as ExpenseRecord[];

  const receivedYTD = storageService.calculateTotalReceived(taxRef, incomeRecords);
  const expensesYTD = storageService.calculateTotalExpensesYTD(taxRef, expenseRecords);
  const netProfitYTD = storageService.roundCurrency(receivedYTD - expensesYTD);

  const pageHeadingSize = "36px"; // Or pass it down via props, but hardcoding for now since we are in a new component
  const kpiCols = "repeat(auto-fit, minmax(240px, 1fr))";

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

      {/* Tabs and Print Button */}
      <div className="mb-6 flex items-center justify-between border-b border-neutral-200 pb-2 print:hidden">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg ${activeTab === 'summary' ? 'bg-neutral-100 text-neutral-900 border-b-2 border-green-600' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg ${activeTab === 'income' ? 'bg-neutral-100 text-neutral-900 border-b-2 border-green-600' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Income
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg ${activeTab === 'expenses' ? 'bg-neutral-100 text-neutral-900 border-b-2 border-green-600' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg ${activeTab === 'tax' ? 'bg-neutral-100 text-neutral-900 border-b-2 border-green-600' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Tax Preview
          </button>
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
          <p className="text-neutral-600">
            {activeTab === 'summary' && 'Tax-year summary'}
            {activeTab === 'income' && 'Income status'}
            {activeTab === 'expenses' && 'Expense breakdown'}
            {activeTab === 'tax' && 'Tax estimate preview'}
          </p>
        </div>

        {activeTab === 'summary' && (
          <div>
            <h2 className="text-xl font-bold mb-4 print:hidden">Tax-year summary</h2>
            <div style={{ display: "grid", gridTemplateColumns: kpiCols, gap: "16px" }}>
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
          </div>
        )}

        {activeTab === 'income' && (
          <div>
            <h2 className="text-xl font-bold mb-4 print:hidden">Income status</h2>
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-neutral-700">Date</th>
                    <th className="px-4 py-3 font-semibold text-neutral-700">Source</th>
                    <th className="px-4 py-3 font-semibold text-neutral-700">Category</th>
                    <th className="px-4 py-3 font-semibold text-neutral-700 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {incomeInYear.length > 0 ? (
                    incomeInYear.map(r => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 whitespace-nowrap">{r.date}</td>
                        <td className="px-4 py-3 font-medium text-neutral-900">{r.source}</td>
                        <td className="px-4 py-3 text-neutral-600">{r.category}</td>
                        <td className="px-4 py-3 text-right font-medium">£{parseFloat(r.amount).toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                        No income recorded for this tax year.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div>
            <h2 className="text-xl font-bold mb-4 print:hidden">Expense breakdown</h2>
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-neutral-700">Date</th>
                    <th className="px-4 py-3 font-semibold text-neutral-700">Merchant</th>
                    <th className="px-4 py-3 font-semibold text-neutral-700">Category</th>
                    <th className="px-4 py-3 font-semibold text-neutral-700 text-right">Amount</th>
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
        )}

        {activeTab === 'tax' && (
          <div>
            <h2 className="text-xl font-bold mb-4 print:hidden">Tax estimate preview</h2>
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
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Expenses recorded</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £{expensesYTD.toFixed(2)}
                </div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Recorded cash surplus</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £{netProfitYTD.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
