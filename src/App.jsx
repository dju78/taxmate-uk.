import { useState } from "react";

const OKCH = {
  // Neutrals
  neutral0: "#FFFFFF",
  neutral50: "#F7F8F9",
  neutral100: "#EDEFF1",
  neutral200: "#DCE0E3",
  neutral500: "#75808A",
  neutral600: "#565F68",
  neutral700: "#3A4148",
  neutral900: "#1A1F24",
  // Green
  greenPrimary: "#3AA25A",
  greenLight: "#EAF6EE",
  greenLightBorder: "#D4EEDB",
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=Inter:wght@400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${OKCH.neutral50};
    font-family: 'Inter', sans-serif;
    color: ${OKCH.neutral700};
  }

  .dashboard-container {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 0;
    background: white;
    border: 1px solid ${OKCH.neutral200};
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 20px 50px -20px rgba(0, 0, 0, 0.2);
    min-height: 100vh;
  }

  .sidebar {
    background: ${OKCH.neutral900};
    padding: 26px 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
  }

  .sidebar-logo {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 28px;
    padding: 0 6px;
  }

  .sidebar-logo-mark {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: ${OKCH.greenPrimary};
  }

  .sidebar-logo-text {
    font-family: 'Manrope', sans-serif;
    font-weight: 800;
    color: white;
    font-size: 15px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 9px;
    background: transparent;
    color: oklch(75% 0.01 240);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .nav-item.active {
    background: oklch(58% 0.13 150 / 0.18);
    color: oklch(85% 0.06 150);
  }

  .nav-icon {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    background: currentColor;
    opacity: 0.5;
  }

  .main-content {
    padding: 32px 36px;
    overflow-y: auto;
  }

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;
  }

  .header-left div:first-child {
    font-size: 13px;
    color: oklch(50% 0.015 240);
    font-weight: 600;
  }

  .header-title {
    font-family: 'Manrope', sans-serif;
    font-size: 24px;
    font-weight: 800;
    margin: 4px 0 0;
    color: ${OKCH.neutral900};
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: oklch(94% 0.04 150);
    border: 1.5px solid ${OKCH.neutral200};
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }

  .kpi-card {
    border-radius: 16px;
    padding: 20px;
    border: 1px solid ${OKCH.neutral200};
  }

  .kpi-card.hero {
    background: ${OKCH.greenPrimary};
    color: white;
  }

  .kpi-label {
    font-size: 13px;
    font-weight: 600;
    opacity: 0.85;
  }

  .kpi-value {
    font-family: 'Manrope', sans-serif;
    font-size: 30px;
    font-weight: 800;
    margin-top: 8px;
  }

  .kpi-sub {
    font-size: 12px;
    opacity: 0.85;
    margin-top: 6px;
  }

  .kpi-card.white .kpi-label { color: oklch(50% 0.015 240); }
  .kpi-card.white .kpi-value { color: ${OKCH.neutral900}; }
  .kpi-card.white .kpi-sub { color: oklch(45% 0.015 240); }

  .lower-section {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 16px;
  }

  .chart-card {
    background: white;
    border: 1px solid ${OKCH.neutral200};
    border-radius: 16px;
    padding: 22px;
  }

  .chart-title {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 18px;
  }

  .bars-container {
    display: flex;
    align-items: flex-end;
    gap: 14px;
    height: 140px;
  }

  .bar-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    height: 100%;
    justify-content: flex-end;
  }

  .bar-pair {
    width: 100%;
    display: flex;
    gap: 3px;
    align-items: flex-end;
    height: 100%;
  }

  .bar {
    flex: 1;
    border-radius: 4px 4px 0 0;
  }

  .bar.income { background: ${OKCH.greenPrimary}; }
  .bar.expense { background: oklch(88% 0.02 150); }

  .bar-label {
    font-size: 11px;
    color: oklch(55% 0.015 240);
  }

  .progress-card {
    background: white;
    border: 1px solid ${OKCH.neutral200};
    border-radius: 16px;
    padding: 22px;
  }

  .progress-title {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 16px;
  }

  .progress-ring {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: conic-gradient(${OKCH.greenPrimary} 0deg 216deg, oklch(92% 0.006 240) 216deg 360deg);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
  }

  .progress-inner {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Manrope', sans-serif;
    font-weight: 800;
    font-size: 20px;
  }

  .progress-label {
    font-size: 13px;
    color: oklch(45% 0.015 240);
    text-align: center;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .dashboard-container {
      grid-template-columns: 1fr;
      min-height: auto;
    }

    .sidebar {
      padding: 16px 12px;
      flex-direction: row;
      gap: 12px;
      align-items: center;
      overflow-x: auto;
      border-bottom: 1px solid ${OKCH.neutral200};
      margin-bottom: 16px;
    }

    .sidebar-logo {
      margin-bottom: 0;
      padding: 0 8px;
      flex-shrink: 0;
    }

    .nav-item {
      padding: 8px 12px;
      font-size: 12px;
      flex-shrink: 0;
    }

    .main-content {
      padding: 20px 16px;
    }

    .header-row {
      margin-bottom: 20px;
    }

    .header-title {
      font-size: 20px;
    }

    .kpi-grid {
      grid-template-columns: 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }

    .kpi-card {
      padding: 16px;
    }

    .kpi-value {
      font-size: 24px;
    }

    .lower-section {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .bars-container {
      height: 100px;
    }

    .progress-ring {
      width: 100px;
      height: 100px;
    }

    .progress-inner {
      width: 70px;
      height: 70px;
      font-size: 16px;
    }
  }
`;

function Dashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "income", label: "Income" },
    { id: "expenses", label: "Expenses" },
    { id: "tax", label: "Tax report" },
    { id: "settings", label: "Settings" },
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
            <div className="header-row">
              <div>
                <div>Tuesday, 11 July</div>
                <div className="header-title">Morning, Priya 👋</div>
              </div>
              <div className="avatar"></div>
            </div>

            <div className="kpi-grid">
              <div className="kpi-card hero">
                <div className="kpi-label">Estimated tax owed</div>
                <div className="kpi-value">£3,412.60</div>
                <div className="kpi-sub">Due 31 Jan 2027</div>
              </div>
              <div className="kpi-card white">
                <div className="kpi-label">Income YTD</div>
                <div className="kpi-value">£38,960</div>
                <div className="kpi-sub">↑ 12% vs last year</div>
              </div>
              <div className="kpi-card white">
                <div className="kpi-label">Expenses YTD</div>
                <div className="kpi-value">£6,210</div>
                <div className="kpi-sub">18 receipts logged</div>
              </div>
            </div>

            <div className="lower-section">
              <div className="chart-card">
                <div className="chart-title">Income vs expenses</div>
                <div className="bars-container">
                  {chartData.map((data) => (
                    <div key={data.month} className="bar-group">
                      <div className="bar-pair">
                        <div className="bar income" style={{ height: `${data.income}%` }}></div>
                        <div className="bar expense" style={{ height: `${data.expense}%` }}></div>
                      </div>
                      <div className="bar-label">{data.month}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="progress-card">
                <div className="progress-title">Filing progress</div>
                <div className="progress-ring">
                  <div className="progress-inner">60%</div>
                </div>
                <div className="progress-label">3 of 5 steps complete</div>
              </div>
            </div>
          </>
        );
      case "income":
        return (
          <div className="header-row" style={{ marginBottom: "20px" }}>
            <div style={{ flex: 1 }}>
              <div className="header-title" style={{ margin: 0 }}>Income</div>
              <div style={{ fontSize: "14px", color: OKCH.neutral500, marginTop: "8px" }}>Track and manage your income sources</div>
            </div>
          </div>
        );
      case "expenses":
        return (
          <div className="header-row" style={{ marginBottom: "20px" }}>
            <div style={{ flex: 1 }}>
              <div className="header-title" style={{ margin: 0 }}>Expenses</div>
              <div style={{ fontSize: "14px", color: OKCH.neutral500, marginTop: "8px" }}>Log and categorize your business expenses</div>
            </div>
          </div>
        );
      case "tax":
        return (
          <div className="header-row" style={{ marginBottom: "20px" }}>
            <div style={{ flex: 1 }}>
              <div className="header-title" style={{ margin: 0 }}>Tax Report</div>
              <div style={{ fontSize: "14px", color: OKCH.neutral500, marginTop: "8px" }}>View your tax liability and estimates</div>
            </div>
          </div>
        );
      case "settings":
        return (
          <div className="header-row" style={{ marginBottom: "20px" }}>
            <div style={{ flex: 1 }}>
              <div className="header-title" style={{ margin: 0 }}>Settings</div>
              <div style={{ fontSize: "14px", color: OKCH.neutral500, marginTop: "8px" }}>Manage your account preferences</div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: OKCH.neutral50, padding: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{styles}</style>

      <div className="dashboard-container">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-mark"></div>
            <div className="sidebar-logo-text">TaxMate</div>
          </div>
          {navItems.map((item) => (
            <div
              key={item.id}
              className={`nav-item ${activeNav === item.id ? "active" : ""}`}
              onClick={() => setActiveNav(item.id)}
            >
              <div className="nav-icon"></div>
              {item.label}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="main-content">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
