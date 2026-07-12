import { TOKENS } from "./tokens";

// Button component - reusable design system component
export const Button = ({ variant = "primary", disabled = false, children, onClick, type = "button" }) => {
  const baseStyles = {
    padding: "12px 24px",
    borderRadius: "8px",
    fontWeight: "600",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "16px",
    fontFamily: "Inter, sans-serif",
    transition: "all 0.2s ease",
    outline: "none",
  };

  const variantStyles = {
    primary: {
      backgroundColor: TOKENS.colors.green[500],
      color: "#FFFFFF",
    },
    secondary: {
      backgroundColor: "transparent",
      color: TOKENS.colors.green[500],
      border: `2px solid ${TOKENS.colors.green[500]}`,
    },
    ghost: {
      backgroundColor: "transparent",
      color: TOKENS.colors.neutral[700],
    },
    danger: {
      backgroundColor: TOKENS.colors.semantic.danger,
      color: "#FFFFFF",
    },
  };

  return (
    <button
      type={type}
      style={{ ...baseStyles, ...variantStyles[variant] }}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

// Input component
export const Input = ({ error = false, success = false, ...props }) => {
  const borderColor = error ? TOKENS.colors.semantic.danger : success ? TOKENS.colors.green[500] : TOKENS.colors.neutral[200];
  return (
    <input
      style={{
        width: "100%",
        padding: "12px 16px",
        border: `2px solid ${borderColor}`,
        borderRadius: "8px",
        fontFamily: "Inter, sans-serif",
        fontSize: "16px",
        boxSizing: "border-box",
      }}
      {...props}
    />
  );
};

// Badge component
export const Badge = ({ variant = "default", children }) => {
  const colors = {
    default: { bg: TOKENS.colors.neutral[100], text: TOKENS.colors.neutral[700] },
    success: { bg: TOKENS.colors.green[100], text: TOKENS.colors.green[700] },
    warning: { bg: "#FEF3C7", text: "#92400E" },
    error: { bg: "#FEE2E2", text: TOKENS.colors.semantic.danger },
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "13px",
        fontWeight: "600",
        backgroundColor: colors[variant].bg,
        color: colors[variant].text,
      }}
    >
      {children}
    </span>
  );
};

// Alert component
export const Alert = ({ variant = "warning", title, description, children }) => {
  const styles = {
    warning: {
      bg: "#FFFBEB",
      borderColor: "#FCD34D",
      color: "#78350F",
    },
    success: {
      bg: TOKENS.colors.green[50],
      borderColor: TOKENS.colors.green[500],
      color: TOKENS.colors.green[700],
    },
    error: {
      bg: "#FEE2E2",
      borderColor: TOKENS.colors.semantic.danger,
      color: TOKENS.colors.semantic.danger,
    },
  };
  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "8px",
        backgroundColor: styles[variant].bg,
        borderLeft: `4px solid ${styles[variant].borderColor}`,
        color: styles[variant].color,
      }}
    >
      {title && <div style={{ fontWeight: "600", marginBottom: "4px" }}>{title}</div>}
      <div style={{ fontSize: "14px" }}>{description || children}</div>
    </div>
  );
};

// Table component
export const Table = ({ columns, rows }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: `2px solid ${TOKENS.colors.neutral[200]}` }}>
          {columns.map((col) => (
            <th key={col} style={{ textAlign: "left", padding: "8px 16px", fontWeight: "600", color: TOKENS.colors.neutral[700] }}>
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx} style={{ borderBottom: `1px solid ${TOKENS.colors.neutral[200]}` }}>
            {row.map((cell, cidx) => (
              <td key={cidx} style={{ padding: "12px 16px" }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Empty state component - reusable design system component
export const EmptyState = ({ icon, title, description, action }) => (
  <div style={{ textAlign: "center", padding: "48px 16px" }}>
    <div style={{ fontSize: "56px", marginBottom: "16px" }}>{icon}</div>
    <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px", color: TOKENS.colors.neutral[900] }}>
      {title}
    </h3>
    <p style={{ color: TOKENS.colors.neutral[600], marginBottom: "24px" }}>
      {description}
    </p>
    {action && <Button variant="primary">{action}</Button>}
  </div>
);

// Functional Switch component
export const Switch = ({ checked, onChange, disabled = false }) => (
  <button
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    style={{
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      height: "24px",
      width: "44px",
      borderRadius: "12px",
      border: "none",
      backgroundColor: checked ? TOKENS.colors.green[500] : TOKENS.colors.neutral[300],
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      transition: "background-color 0.2s ease",
    }}
  >
    <span
      style={{
        display: "inline-block",
        height: "16px",
        width: "16px",
        borderRadius: "50%",
        backgroundColor: "white",
        position: "absolute",
        left: checked ? "24px" : "4px",
        transition: "left 0.2s ease",
      }}
    />
  </button>
);
