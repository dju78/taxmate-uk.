import { useState } from "react";

const theme = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  cardBorder: "#E2E8F0",
  accent: "#16864C",
  accentSoft: "rgba(22,134,76,0.12)",
  accentGlow: "rgba(22,134,76,0.25)",
  warning: "#C49A2C",
  warnSoft: "rgba(196,154,44,0.12)",
  danger: "#EF4444",
  dangerSoft: "rgba(239,68,68,0.1)",
  textPrimary: "#082554",
  textSecondary: "#475569",
  textMuted: "#64748B",
  blue: "#082554",
  blueSoft: "rgba(8,37,84,0.12)",
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${theme.bg};
    font-family: 'Inter', sans-serif;
    color: ${theme.textPrimary};
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .phone-shell {
    width: 390px;
    height: 844px;
    background: ${theme.bg};
    border-radius: 48px;
    border: 2px solid ${theme.cardBorder};
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.04),
      0 40px 120px rgba(0,0,0,0.8),
      0 0 60px rgba(0,217,126,0.06);
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 28px 8px;
    font-size: 12px;
    font-weight: 600;
    color: ${theme.textSecondary};
    flex-shrink: 0;
  }

  .screen {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 20px 20px;
    scrollbar-width: none;
  }
  .screen::-webkit-scrollbar { display: none; }

  .nav-bar {
    display: flex;
    background: rgba(248,250,252,0.95);
    backdrop-filter: blur(20px);
    border-top: 1px solid ${theme.cardBorder};
    padding: 10px 0 20px;
    flex-shrink: 0;
  }

  .nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    transition: all 0.2s;
    padding: 4px 0;
  }

  .nav-icon {
    font-size: 20px;
    line-height: 1;
  }

  .nav-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: ${theme.textMuted};
    transition: color 0.2s;
  }

  .nav-item.active .nav-label { color: ${theme.accent}; }
  .nav-item.active .nav-icon { filter: drop-shadow(0 0 6px ${theme.accent}); }

  .card {
    background: ${theme.card};
    border: 1px solid ${theme.cardBorder};
    border-radius: 20px;
    padding: 18px;
    margin-bottom: 14px;
  }

  .card-sm {
    background: ${theme.card};
    border: 1px solid ${theme.cardBorder};
    border-radius: 16px;
    padding: 14px 16px;
    margin-bottom: 10px;
  }

  .metric-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 14px;
  }

  .metric-card {
    background: ${theme.card};
    border: 1px solid ${theme.cardBorder};
    border-radius: 18px;
    padding: 16px;
    position: relative;
    overflow: hidden;
  }

  .metric-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    border-radius: 18px 18px 0 0;
  }

  .metric-card.green::before { background: ${theme.accent}; }
  .metric-card.orange::before { background: ${theme.warning}; }
  .metric-card.blue::before { background: ${theme.blue}; }
  .metric-card.red::before { background: ${theme.danger}; }

  .metric-label {
    font-size: 11px;
    color: ${theme.textSecondary};
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .metric-value {
    font-family: 'DM Mono', monospace;
    font-size: 22px;
    font-weight: 500;
    color: ${theme.textPrimary};
    line-height: 1;
  }

  .metric-sub {
    font-size: 11px;
    color: ${theme.textMuted};
    margin-top: 4px;
  }

  .screen-title {
    font-family: 'Syne', sans-serif;
    font-size: 26px;
    font-weight: 800;
    color: ${theme.textPrimary};
    margin-bottom: 4px;
  }

  .screen-sub {
    font-size: 13px;
    color: ${theme.textSecondary};
    margin-bottom: 20px;
  }

  .section-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${theme.textMuted};
    margin: 18px 0 10px;
  }

  .btn-primary {
    width: 100%;
    background: ${theme.accent};
    color: #FFFFFF;
    border: none;
    border-radius: 14px;
    padding: 16px;
    font-size: 15px;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.01em;
    box-shadow: 0 4px 20px ${theme.accentGlow};
  }

  .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }

  .btn-ghost {
    width: 100%;
    background: ${theme.accentSoft};
    color: ${theme.accent};
    border: 1px solid rgba(0,217,126,0.2);
    border-radius: 14px;
    padding: 14px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 10px;
  }

  .input-group {
    margin-bottom: 14px;
  }

  .input-label {
    font-size: 12px;
    font-weight: 600;
    color: ${theme.textSecondary};
    margin-bottom: 6px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .input-field {
    width: 100%;
    background: #FFFFFF;
    border: 1px solid ${theme.cardBorder};
    border-radius: 12px;
    padding: 13px 14px;
    font-size: 15px;
    color: ${theme.textPrimary};
    font-family: 'Inter', sans-serif;
    outline: none;
    transition: border-color 0.2s;
  }

  .input-field:focus { border-color: ${theme.accent}; }
  .input-field::placeholder { color: ${theme.textMuted}; }

  .alert-card {
    background: ${theme.warnSoft};
    border: 1px solid rgba(245,166,35,0.25);
    border-radius: 14px;
    padding: 14px;
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 14px;
  }

  .alert-icon { font-size: 18px; flex-shrink: 0; }

  .alert-text {
    font-size: 13px;
    color: ${theme.warning};
    line-height: 1.5;
    font-weight: 500;
  }

  .list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    background: ${theme.card};
    border: 1px solid ${theme.cardBorder};
    border-radius: 14px;
    margin-bottom: 8px;
  }

  .list-item-left { display: flex; flex-direction: column; gap: 3px; }
  .list-item-name { font-size: 14px; font-weight: 600; color: ${theme.textPrimary}; }
  .list-item-date { font-size: 12px; color: ${theme.textMuted}; }
  .list-item-amount { font-family: 'DM Mono', monospace; font-size: 15px; font-weight: 500; }
  .list-item-amount.pos { color: ${theme.accent}; }
  .list-item-amount.neg { color: ${theme.danger}; }

  .progress-bar-wrap {
    background: rgba(255,255,255,0.06);
    border-radius: 99px;
    height: 8px;
    overflow: hidden;
    margin-top: 8px;
  }

  .progress-bar-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.6s ease;
  }

  .tax-ring-section {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 14px;
  }

  .ring-wrap {
    position: relative;
    width: 100px;
    height: 100px;
    flex-shrink: 0;
  }

  .ring-label {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .ring-pct {
    font-family: 'DM Mono', monospace;
    font-size: 20px;
    font-weight: 500;
    color: ${theme.accent};
    line-height: 1;
  }

  .ring-sub {
    font-size: 10px;
    color: ${theme.textMuted};
    margin-top: 2px;
  }

  .deadline-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    background: ${theme.card};
    border: 1px solid ${theme.cardBorder};
    border-radius: 12px;
    margin-bottom: 8px;
  }

  .deadline-name { font-size: 14px; font-weight: 600; }
  .deadline-date { font-size: 12px; }

  .badge {
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 99px;
    letter-spacing: 0.04em;
  }

  .badge-warn { background: ${theme.warnSoft}; color: ${theme.warning}; }
  .badge-ok { background: ${theme.accentSoft}; color: ${theme.accent}; }
  .badge-danger { background: ${theme.dangerSoft}; color: ${theme.danger}; }

  .bar-chart-wrap { display: flex; align-items: flex-end; gap: 6px; height: 80px; margin-top: 12px; }
  .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .bar-fill { width: 100%; border-radius: 6px 6px 0 0; transition: height 0.5s ease; }
  .bar-month { font-size: 10px; color: ${theme.textMuted}; font-weight: 500; }

  .profile-avatar {
    width: 64px;
    height: 64px;
    border-radius: 20px;
    background: linear-gradient(135deg, ${theme.accent}, ${theme.blue});
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin-bottom: 12px;
  }

  .profile-name {
    font-family: 'Syne', sans-serif;
    font-size: 22px;
    font-weight: 800;
    margin-bottom: 2px;
  }

  .profile-plan {
    font-size: 13px;
    color: ${theme.accent};
    font-weight: 600;
    margin-bottom: 20px;
  }

  .settings-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    background: ${theme.card};
    border: 1px solid ${theme.cardBorder};
    border-radius: 14px;
    margin-bottom: 8px;
  }

  .settings-label { font-size: 14px; font-weight: 500; }
  .settings-value { font-size: 13px; color: ${theme.textSecondary}; }

  .toggle {
    width: 42px;
    height: 24px;
    border-radius: 99px;
    position: relative;
    cursor: pointer;
    transition: background 0.2s;
  }

  .toggle.on { background: ${theme.accent}; }
  .toggle.off { background: ${theme.textMuted}; }

  .toggle::after {
    content: '';
    position: absolute;
    top: 3px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    transition: left 0.2s;
  }

  .toggle.on::after { left: 21px; }
  .toggle.off::after { left: 3px; }

  .logo-mark {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 16px;
    color: ${theme.accent};
    letter-spacing: -0.02em;
  }

  .category-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: 99px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid ${theme.cardBorder};
    background: ${theme.card};
    color: ${theme.textSecondary};
    margin: 0 4px 8px 0;
  }

  .category-pill.selected {
    background: ${theme.accentSoft};
    border-color: rgba(0,217,126,0.3);
    color: ${theme.accent};
  }

  .photo-upload {
    border: 2px dashed ${theme.cardBorder};
    border-radius: 14px;
    padding: 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 14px;
  }

  .photo-upload:hover { border-color: ${theme.accent}; }
  .photo-upload-icon { font-size: 28px; margin-bottom: 6px; }
  .photo-upload-text { font-size: 13px; color: ${theme.textSecondary}; }

  .success-banner {
    background: ${theme.accentSoft};
    border: 1px solid rgba(0,217,126,0.25);
    border-radius: 14px;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
    font-size: 14px;
    font-weight: 600;
    color: ${theme.accent};
  }

  .insight-card {
    background: linear-gradient(135deg, rgba(0,217,126,0.08), rgba(74,158,255,0.08));
    border: 1px solid rgba(0,217,126,0.15);
    border-radius: 18px;
    padding: 16px;
    margin-bottom: 14px;
  }

  .insight-title {
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: ${theme.accent};
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .insight-text {
    font-size: 14px;
    color: ${theme.textPrimary};
    line-height: 1.5;
  }
`;

// ── SVG Ring Chart ──────────────────────────────────────────────────────────
function RingChart({ percent, color, size = 100, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

// ── HOME DASHBOARD ───────────────────────────────────────────────────────────
function HomeScreen() {
  const bars = [
    { m: "Nov", income: 2100, expense: 800 },
    { m: "Dec", income: 2800, expense: 950 },
    { m: "Jan", income: 1900, expense: 700 },
    { m: "Feb", income: 3200, expense: 1100 },
    { m: "Mar", income: 2750, expense: 890 },
    { m: "Apr", income: 3540, expense: 1240 },
  ];
  const maxVal = 4000;

  return (
    <div className="screen">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingTop: 4 }}>
        <div>
          <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 2 }}>
            APRIL 2026
          </div>
          <div className="screen-title" style={{ marginBottom: 0 }}>TaxMate UK</div>
          <div style={{ fontSize: 13, color: theme.textSecondary, fontWeight: 500 }}>by Daramola Digital Labs</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 14, background: `linear-gradient(135deg, ${theme.accent}, ${theme.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#FFFFFF" }}>👤</div>
      </div>

      <div style={{ background: theme.blueSoft, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: theme.textPrimary, fontWeight: 700, marginBottom: 4 }}>A product of Daramola Digital Labs</div>
        <div style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 1.4 }}>
          TaxMate UK helps individuals, sole traders, and small businesses organise tax information, track key records, and make clearer compliance decisions.
        </div>
      </div>

      <div className="insight-card">
        <div className="insight-title">💡 Smart Insight</div>
        <div className="insight-text">You're on track for your best month. Set aside <strong>£638</strong> for tax by 30 Apr.</div>
      </div>

      <div className="metric-grid">
        <div className="metric-card green">
          <div className="metric-label">Income</div>
          <div className="metric-value">£3,540</div>
          <div className="metric-sub" style={{ color: theme.accent }}>↑ 29% vs last mo</div>
        </div>
        <div className="metric-card red">
          <div className="metric-label">Expenses</div>
          <div className="metric-value">£1,240</div>
          <div className="metric-sub">12 entries</div>
        </div>
        <div className="metric-card blue">
          <div className="metric-label">Net Profit</div>
          <div className="metric-value">£2,300</div>
          <div className="metric-sub">this month</div>
        </div>
        <div className="metric-card orange">
          <div className="metric-label">Tax Reserve</div>
          <div className="metric-value">£638</div>
          <div className="metric-sub">~27% of profit</div>
        </div>
      </div>

      <div className="alert-card">
        <div className="alert-icon">⚠️</div>
        <div className="alert-text">Self Assessment deadline in <strong>268 days</strong> — Jan 31, 2027</div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>6-Month Overview</div>
          <div style={{ fontSize: 12, color: theme.textMuted }}>
            <span style={{ color: theme.accent }}>■</span> Income &nbsp;
            <span style={{ color: theme.danger }}>■</span> Expenses
          </div>
        </div>
        <div className="bar-chart-wrap">
          {bars.map((b) => (
            <div className="bar-col" key={b.m}>
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 2, width: "100%" }}>
                <div className="bar-fill" style={{ height: `${(b.income / maxVal) * 100}%`, background: theme.accent, opacity: 0.85, flex: 1 }} />
                <div className="bar-fill" style={{ height: `${(b.expense / maxVal) * 100}%`, background: theme.danger, opacity: 0.7, flex: 1 }} />
              </div>
              <div className="bar-month">{b.m}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div className="section-label">Quick Actions</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[["➕", "Add Income"], ["🧾", "Add Expense"], ["📊", "Tax Report"], ["📤", "Export"]].map(([icon, label]) => (
            <div key={label} style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 14, padding: "14px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── INCOME SCREEN ────────────────────────────────────────────────────────────
function IncomeScreen() {
  const [added, setAdded] = useState(false);
  const entries = [
    { name: "Acme Consulting", date: "22 Apr", amount: "£1,200" },
    { name: "Freelance Project", date: "18 Apr", amount: "£850" },
    { name: "Tutoring Session", date: "15 Apr", amount: "£320" },
    { name: "Design Work", date: "10 Apr", amount: "£780" },
    { name: "Delivery Run", date: "6 Apr", amount: "£390" },
  ];

  return (
    <div className="screen">
      <div style={{ paddingTop: 4, marginBottom: 20 }}>
        <div className="screen-title">Income</div>
        <div className="screen-sub">Track every payment you receive</div>
      </div>

      {added && (
        <div className="success-banner">
          ✅ Income entry added successfully!
        </div>
      )}

      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: theme.textSecondary, letterSpacing: "0.04em", textTransform: "uppercase" }}>Add New Entry</div>
        <div className="input-group">
          <div className="input-label">Customer / Client Name</div>
          <input className="input-field" placeholder="e.g. Acme Ltd" />
        </div>
        <div className="input-group">
          <div className="input-label">Amount (£)</div>
          <input className="input-field" placeholder="0.00" type="number" />
        </div>
        <div className="input-group">
          <div className="input-label">Date</div>
          <input className="input-field" type="date" defaultValue="2026-04-24" />
        </div>
        <div className="input-group" style={{ marginBottom: 16 }}>
          <div className="input-label">Notes (optional)</div>
          <input className="input-field" placeholder="Invoice #, project details..." />
        </div>
        <button className="btn-primary" onClick={() => { setAdded(true); setTimeout(() => setAdded(false), 3000); }}>
          + Add Income Entry
        </button>
      </div>

      <div className="section-label">Recent Income</div>
      {entries.map((e) => (
        <div className="list-item" key={e.name + e.date}>
          <div className="list-item-left">
            <div className="list-item-name">{e.name}</div>
            <div className="list-item-date">{e.date}</div>
          </div>
          <div className="list-item-amount pos">{e.amount}</div>
        </div>
      ))}

      <div className="card" style={{ marginTop: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span style={{ color: theme.textSecondary }}>April Total</span>
          <span style={{ fontFamily: "'DM Mono', monospace", color: theme.accent, fontWeight: 500 }}>£3,540</span>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: "71%", background: theme.accent }} />
        </div>
        <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 6 }}>71% of £5,000 monthly goal</div>
      </div>
    </div>
  );
}

// ── EXPENSE SCREEN ───────────────────────────────────────────────────────────
function ExpenseScreen() {
  const [selected, setSelected] = useState("Travel");
  const [added, setAdded] = useState(false);
  const categories = ["Travel", "Software", "Equipment", "Marketing", "Office", "Training", "Other"];
  const entries = [
    { name: "Fuel", cat: "Travel", date: "23 Apr", amount: "£48" },
    { name: "Adobe CC", cat: "Software", date: "21 Apr", amount: "£54" },
    { name: "Laptop Stand", cat: "Equipment", date: "18 Apr", amount: "£89" },
    { name: "Facebook Ads", cat: "Marketing", date: "15 Apr", amount: "£120" },
    { name: "Co-working Space", cat: "Office", date: "12 Apr", amount: "£200" },
  ];

  return (
    <div className="screen">
      <div style={{ paddingTop: 4, marginBottom: 20 }}>
        <div className="screen-title">Expenses</div>
        <div className="screen-sub">Log costs to reduce your tax bill</div>
      </div>

      {added && (
        <div className="success-banner">✅ Expense added and categorised!</div>
      )}

      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: theme.textSecondary, letterSpacing: "0.04em", textTransform: "uppercase" }}>Add New Expense</div>

        <div className="input-group">
          <div className="input-label">Amount (£)</div>
          <input className="input-field" placeholder="0.00" type="number" />
        </div>

        <div className="input-label" style={{ marginBottom: 8 }}>Category</div>
        <div style={{ flexWrap: "wrap", display: "flex", marginBottom: 14 }}>
          {categories.map((c) => (
            <div key={c} className={`category-pill ${selected === c ? "selected" : ""}`} onClick={() => setSelected(c)}>
              {c}
            </div>
          ))}
        </div>

        <div className="input-group">
          <div className="input-label">Supplier / Description</div>
          <input className="input-field" placeholder="e.g. Shell Garage, Amazon" />
        </div>

        <div className="photo-upload">
          <div className="photo-upload-icon">📷</div>
          <div className="photo-upload-text">Tap to attach receipt photo</div>
        </div>

        <button className="btn-primary" onClick={() => { setAdded(true); setTimeout(() => setAdded(false), 3000); }}>
          + Add Expense
        </button>
      </div>

      <div className="section-label">Recent Expenses</div>
      {entries.map((e) => (
        <div className="list-item" key={e.name + e.date}>
          <div className="list-item-left">
            <div className="list-item-name">{e.name}</div>
            <div className="list-item-date">{e.cat} · {e.date}</div>
          </div>
          <div className="list-item-amount neg">−{e.amount}</div>
        </div>
      ))}
    </div>
  );
}

// ── TAX SCREEN ───────────────────────────────────────────────────────────────
function TaxScreen() {
  const saved = 1820;
  const target = 4200;
  const pct = Math.round((saved / target) * 100);

  return (
    <div className="screen">
      <div style={{ paddingTop: 4, marginBottom: 20 }}>
        <div className="screen-title">Tax Planner</div>
        <div className="screen-sub">Stay ahead of HMRC — always</div>
      </div>

      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: theme.textSecondary, letterSpacing: "0.04em", textTransform: "uppercase" }}>2025–26 Tax Year</div>
        <div className="tax-ring-section">
          <div className="ring-wrap">
            <RingChart percent={pct} color={theme.accent} />
            <div className="ring-label">
              <div className="ring-pct">{pct}%</div>
              <div className="ring-sub">saved</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 3 }}>Estimated Tax Bill</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 500, color: theme.textPrimary }}>£4,200</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 3 }}>Reserved So Far</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: theme.accent }}>£1,820</div>
            </div>
          </div>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${theme.accent}, ${theme.blue})` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: theme.textMuted }}>
          <span>£{saved.toLocaleString()} saved</span>
          <span>£{(target - saved).toLocaleString()} remaining</span>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric-card blue">
          <div className="metric-label">Monthly Save</div>
          <div className="metric-value">£350</div>
          <div className="metric-sub">recommended</div>
        </div>
        <div className="metric-card green">
          <div className="metric-label">Effective Rate</div>
          <div className="metric-value">19.4%</div>
          <div className="metric-sub">of net profit</div>
        </div>
      </div>

      <div className="insight-card">
        <div className="insight-title">📌 Tax Tip</div>
        <div className="insight-text">You have £1,240 in expenses this month. Claiming all eligible costs saves you an estimated <strong>£248</strong> in tax.</div>
      </div>

      <div className="section-label">Upcoming Deadlines</div>
      {[
        { name: "Payment on Account", date: "31 Jul 2026", badge: "badge-warn", label: "99 days" },
        { name: "Self Assessment Filing", date: "31 Jan 2027", badge: "badge-ok", label: "On Track" },
        { name: "NI Class 2 Due", date: "31 Jan 2027", badge: "badge-ok", label: "On Track" },
      ].map((d) => (
        <div className="deadline-item" key={d.name}>
          <div>
            <div className="deadline-name">{d.name}</div>
            <div className="deadline-date" style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>{d.date}</div>
          </div>
          <div className={`badge ${d.badge}`}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── REPORTS SCREEN ───────────────────────────────────────────────────────────
function ReportsScreen() {
  return (
    <div className="screen">
      <div style={{ paddingTop: 4, marginBottom: 20 }}>
        <div className="screen-title">Reports</div>
        <div className="screen-sub">Your financial picture, clearly</div>
      </div>

      <div className="metric-grid">
        <div className="metric-card green">
          <div className="metric-label">YTD Income</div>
          <div className="metric-value">£16,280</div>
        </div>
        <div className="metric-card red">
          <div className="metric-label">YTD Expenses</div>
          <div className="metric-value">£5,140</div>
        </div>
        <div className="metric-card blue">
          <div className="metric-label">Net Profit</div>
          <div className="metric-value">£11,140</div>
        </div>
        <div className="metric-card orange">
          <div className="metric-label">Tax Estimate</div>
          <div className="metric-value">£4,200</div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Monthly Profit Trend</div>
        <div className="bar-chart-wrap">
          {[
            { m: "Nov", v: 1300 },
            { m: "Dec", v: 1850 },
            { m: "Jan", v: 1200 },
            { m: "Feb", v: 2100 },
            { m: "Mar", v: 1860 },
            { m: "Apr", v: 2300 },
          ].map((b) => (
            <div className="bar-col" key={b.m}>
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                <div className="bar-fill" style={{ height: `${(b.v / 2500) * 100}%`, background: `linear-gradient(180deg, ${theme.accent}, ${theme.blue})`, width: "100%" }} />
              </div>
              <div className="bar-month">{b.m}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-label">Expense Breakdown</div>
      {[
        { cat: "Travel", pct: 28, amount: "£1,439" },
        { cat: "Software", pct: 22, amount: "£1,131" },
        { cat: "Marketing", pct: 20, amount: "£1,028" },
        { cat: "Equipment", pct: 18, amount: "£925" },
        { cat: "Other", pct: 12, amount: "£617" },
      ].map((e) => (
        <div key={e.cat} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{e.cat}</span>
            <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: theme.danger }}>{e.amount}</span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${e.pct}%`, background: theme.danger, opacity: 0.7 }} />
          </div>
        </div>
      ))}

      <div className="section-label">Export</div>
      <button className="btn-ghost">📄 Export PDF Report</button>
      <button className="btn-ghost">📊 Export CSV Data</button>
      <button className="btn-primary" style={{ background: theme.blue, boxShadow: "none" }}>📤 Send to Accountant</button>
    </div>
  );
}

// ── PROFILE SCREEN ───────────────────────────────────────────────────────────
function ProfileScreen() {
  const [notifs, setNotifs] = useState(true);
  const [reminders, setReminders] = useState(true);

  return (
    <div className="screen">
      <div style={{ paddingTop: 4, marginBottom: 20 }}>
        <div className="screen-title">Profile</div>
        <div className="screen-sub">Your account & preferences</div>
      </div>

      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div className="profile-avatar">👤</div>
        </div>
        <div className="profile-name">Alex Johnson</div>
        <div className="profile-plan">⭐ TaxMate Pro</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'DM Mono'", fontSize: 20, fontWeight: 500, color: theme.accent }}>89</div>
            <div style={{ fontSize: 11, color: theme.textMuted }}>Entries</div>
          </div>
          <div style={{ width: 1, background: theme.cardBorder }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'DM Mono'", fontSize: 20, fontWeight: 500, color: theme.accent }}>6</div>
            <div style={{ fontSize: 11, color: theme.textMuted }}>Months</div>
          </div>
          <div style={{ width: 1, background: theme.cardBorder }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'DM Mono'", fontSize: 20, fontWeight: 500, color: theme.accent }}>43%</div>
            <div style={{ fontSize: 11, color: theme.textMuted }}>Tax saved</div>
          </div>
        </div>
      </div>

      <div className="section-label">Business Details</div>
      {[
        { label: "Business Type", value: "Sole Trader" },
        { label: "Trading Since", value: "Oct 2025" },
        { label: "VAT Registered", value: "No" },
      ].map((r) => (
        <div className="settings-row" key={r.label}>
          <div className="settings-label">{r.label}</div>
          <div className="settings-value">{r.value}</div>
        </div>
      ))}

      <div className="section-label">Notifications</div>
      <div className="settings-row">
        <div className="settings-label">Push Notifications</div>
        <div className={`toggle ${notifs ? "on" : "off"}`} onClick={() => setNotifs(!notifs)} />
      </div>
      <div className="settings-row">
        <div className="settings-label">Tax Deadline Reminders</div>
        <div className={`toggle ${reminders ? "on" : "off"}`} onClick={() => setReminders(!reminders)} />
      </div>

      <div className="section-label">Subscription</div>
      <div className="card" style={{ background: "linear-gradient(135deg, rgba(0,217,126,0.08), rgba(74,158,255,0.06))", border: `1px solid rgba(0,217,126,0.2)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, marginBottom: 3 }}>TaxMate Pro</div>
            <div style={{ fontSize: 13, color: theme.textSecondary }}>Renews 1 May 2026</div>
          </div>
          <div style={{ fontFamily: "'DM Mono'", fontSize: 18, color: theme.accent }}>£9.99/mo</div>
        </div>
        <div style={{ height: 1, background: theme.cardBorder, margin: "14px 0" }} />
        <button className="btn-ghost" style={{ marginBottom: 0, padding: "10px 14px" }}>Manage Subscription</button>
      </div>

      <div className="section-label">Support</div>
      {["Help Centre", "Privacy Policy", "Terms of Service", "Contact Support"].map((item) => (
        <div className="settings-row" key={item} style={{ cursor: "pointer" }}>
          <div className="settings-label">{item}</div>
          <div style={{ color: theme.textMuted }}>›</div>
        </div>
      ))}

      <button style={{ width: "100%", background: theme.dangerSoft, border: `1px solid rgba(255,92,92,0.2)`, color: theme.danger, borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 10 }}>
        Sign Out
      </button>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "home", icon: "🏠", label: "Home", Screen: HomeScreen },
  { id: "income", icon: "💷", label: "Income", Screen: IncomeScreen },
  { id: "expense", icon: "🧾", label: "Expenses", Screen: ExpenseScreen },
  { id: "tax", icon: "📋", label: "Tax", Screen: TaxScreen },
  { id: "reports", icon: "📊", label: "Reports", Screen: ReportsScreen },
];

export default function TaxMateApp() {
  const [active, setActive] = useState("home");
  const [showProfile, setShowProfile] = useState(false);

  const CurrentScreen = showProfile ? ProfileScreen :
    TABS.find((t) => t.id === active)?.Screen;

  return (
    <>
      <style>{styles}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, background: "#F0F4F8", minHeight: "100vh", padding: "40px 20px" }}>
        {/* App brand header outside phone */}
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
            <img src="/logo.svg" alt="DDL Logo" style={{ width: 32, height: 32 }} />
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 22, color: theme.textPrimary }}>
              TaxMate <span style={{ color: theme.accent }}>UK</span>
            </div>
            <div style={{ background: theme.accentSoft, color: theme.accent, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99, border: `1px solid ${theme.accentSoft}` }}>PROTOTYPE</div>
          </div>
        </div>

        {/* Phone shell */}
        <div className="phone-shell">
          {/* Status bar */}
          <div className="status-bar">
            <span>9:41</span>
            <div className="logo-mark">TaxMate UK</div>
            <span>⚡ 87%</span>
          </div>

          {/* Active screen */}
          <CurrentScreen />

          {/* Bottom nav */}
          <div className="nav-bar">
            {TABS.map((t) => (
              <div key={t.id} className={`nav-item ${active === t.id && !showProfile ? "active" : ""}`}
                onClick={() => { setActive(t.id); setShowProfile(false); }}>
                <div className="nav-icon">{t.icon}</div>
                <div className="nav-label">{t.label}</div>
              </div>
            ))}
            <div className={`nav-item ${showProfile ? "active" : ""}`} onClick={() => setShowProfile(true)}>
              <div className="nav-icon">👤</div>
              <div className="nav-label">Profile</div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: theme.textMuted, textAlign: "center", maxWidth: 400, marginTop: 10, lineHeight: 1.5 }}>
          <div>© 2026 Daramola Digital Labs. All rights reserved.</div>
          <div>TaxMate UK is a product of Daramola Digital Labs.</div>
        </div>
      </div>
    </>
  );
}
