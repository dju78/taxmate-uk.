import { useState } from "react";
import { TOKENS } from "./tokens";
import { Alert, Switch } from "./components";

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

// Main App
function Dashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [monthlyReportsEnabled, setMonthlyReportsEnabled] = useState(true);

  const navItems = [
    { id: "dashboard", label: "Dashboard", Icon: Icons.Dashboard },
    { id: "income", label: "Income", Icon: Icons.Income },
    { id: "expenses", label: "Expenses", Icon: Icons.Expenses },
    { id: "tax", label: "Tax report", Icon: Icons.Tax },
    { id: "settings", label: "Settings", Icon: Icons.Settings },
  ];

  const chartData = [
    { month: "Feb", income: 55, expense: 20 },
    { month: "Mar", income: 70, expense: 25 },
    { month: "Apr", income: 60, expense: 18 },
    { month: "May", income: 85, expense: 30 },
    { month: "Jun", income: 75, expense: 22 },
    { month: "Jul", income: 95, expense: 28 },
  ];

  const renderContent = () => {
    switch (activeNav) {
      case "dashboard":
        return (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
              <div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[500], fontWeight: "600" }}>TUESDAY, 11 JULY</div>
                <h1 style={{ fontSize: "36px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  Morning, Priya 👋
                </h1>
              </div>
              <div style={{ width: "40px", height: "40px", backgroundColor: TOKENS.colors.green[200], borderRadius: "50%" }}></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: TOKENS.colors.green[500], color: "white", borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", opacity: 0.9 }}>Estimated tax owed</div>
                <div style={{ fontSize: "30px", fontWeight: "800", marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>£3,412.60</div>
                <div style={{ fontSize: "13px", opacity: 0.85, marginTop: "8px" }}>Due 31 Jan 2027</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Income YTD</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £38,960
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.green[600], marginTop: "8px" }}>↑ 12% vs last year</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Expenses YTD</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £6,210
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>18 receipts logged</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "16px" }}>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", fontFamily: "Manrope, sans-serif" }}>
                  Income vs expenses
                </h3>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "160px" }}>
                  {chartData.map((data) => (
                    <div key={data.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "100%", display: "flex", gap: "4px", alignItems: "flex-end", height: "100%" }}>
                        <div
                          style={{
                            flex: 1,
                            backgroundColor: TOKENS.colors.green[500],
                            borderTopLeftRadius: "4px",
                            borderTopRightRadius: "4px",
                            height: `${data.income}%`,
                          }}
                        ></div>
                        <div
                          style={{
                            flex: 1,
                            backgroundColor: TOKENS.colors.green[200],
                            borderTopLeftRadius: "4px",
                            borderTopRightRadius: "4px",
                            height: `${data.expense}%`,
                          }}
                        ></div>
                      </div>
                      <span style={{ fontSize: "12px", color: TOKENS.colors.neutral[600] }}>{data.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "24px", width: "100%", fontFamily: "Manrope, sans-serif" }}>
                  Filing progress
                </h3>
                <div
                  style={{
                    width: "128px",
                    height: "128px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "700",
                    fontSize: "20px",
                    background: "conic-gradient(rgb(58, 162, 90) 0deg 216deg, rgb(229, 231, 235) 216deg 360deg)",
                  }}
                >
                  <div
                    style={{
                      width: "96px",
                      height: "96px",
                      backgroundColor: "white",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "700",
                      fontSize: "18px",
                    }}
                  >
                    60%
                  </div>
                </div>
                <p style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "16px", textAlign: "center" }}>
                  3 of 5 steps complete
                </p>
              </div>
            </div>
          </>
        );

      case "income":
        return (
          <>
            <div style={{ marginBottom: "32px" }}>
              <h1 style={{ fontSize: "36px", fontWeight: "800", color: TOKENS.colors.neutral[900], fontFamily: "Manrope, sans-serif" }}>
                Income
              </h1>
              <p style={{ color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Track and manage your income sources</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Total income YTD</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £38,960
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.green[600], marginTop: "8px" }}>↑ 12% vs last year</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>This month</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £3,540
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>4 payments received</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Average per month</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £6,493
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Based on 6 months</div>
              </div>
            </div>

            <Alert variant="warning" title="📌 Income Tip" description="Make sure all income sources are recorded for accurate tax calculations." />
          </>
        );

      case "expenses":
        return (
          <>
            <div style={{ marginBottom: "32px" }}>
              <h1 style={{ fontSize: "36px", fontWeight: "800", color: TOKENS.colors.neutral[900], fontFamily: "Manrope, sans-serif" }}>
                Expenses
              </h1>
              <p style={{ color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Log and categorize your business expenses</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Total expenses YTD</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £6,210
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>18 receipts logged</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>This month</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £1,240
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>12 entries</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Average per month</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £1,035
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Based on 6 months</div>
              </div>
            </div>

            <Alert variant="info" title="💡 Tip" description="Keep receipts organized by category to speed up tax filing." />
          </>
        );

      case "tax":
        return (
          <>
            <div style={{ marginBottom: "32px" }}>
              <h1 style={{ fontSize: "36px", fontWeight: "800", color: TOKENS.colors.neutral[900], fontFamily: "Manrope, sans-serif" }}>
                Tax Report
              </h1>
              <p style={{ color: TOKENS.colors.neutral[600], marginTop: "8px" }}>View your tax liability and estimates</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: TOKENS.colors.green[500], color: "white", borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", opacity: 0.9 }}>Estimated tax bill</div>
                <div style={{ fontSize: "30px", fontWeight: "800", marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>£4,200</div>
                <div style={{ fontSize: "13px", opacity: 0.85, marginTop: "8px" }}>2025/26 Tax Year</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Tax reserved</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £1,820
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>43% of estimate</div>
              </div>
              <div style={{ backgroundColor: "white", border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: TOKENS.colors.neutral[500] }}>Still required</div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: TOKENS.colors.neutral[900], marginTop: "8px", fontFamily: "Manrope, sans-serif" }}>
                  £2,380
                </div>
                <div style={{ fontSize: "13px", color: TOKENS.colors.neutral[600], marginTop: "8px" }}>Due by 31 Jan 2027</div>
              </div>
            </div>

            <Alert variant="warning" title="⚠️ Upcoming Deadline" description="Payment on account due 31 July 2026. Set aside £350 per month." />
          </>
        );

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
    </div>
  );
}

export default Dashboard;
