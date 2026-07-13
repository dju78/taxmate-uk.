import type { ReactNode, CSSProperties, InputHTMLAttributes } from 'react';
import { TOKENS } from './tokens';

// Button component - reusable design system component
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
  style?: CSSProperties;
  className?: string;
}

export const Button = ({ variant = 'primary', disabled = false, children, onClick, type = 'button', 'aria-label': ariaLabel, style, className }: ButtonProps) => {
  const baseStyles: CSSProperties = {
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '16px',
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.6 : 1,
  };

  const variantStyles: Record<string, CSSProperties> = {
    primary: { backgroundColor: TOKENS.colors.green[500], color: '#FFFFFF' },
    secondary: { backgroundColor: 'transparent', color: TOKENS.colors.green[500], border: `2px solid ${TOKENS.colors.green[500]}` },
    ghost: { backgroundColor: 'transparent', color: TOKENS.colors.neutral[700] },
    danger: { backgroundColor: TOKENS.colors.semantic.danger, color: '#FFFFFF' },
  };

  return (
    <button
      type={type}
      aria-label={ariaLabel}
      style={{ ...baseStyles, ...variantStyles[variant], ...style }}
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  );
};

// Input component
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
}

export const Input = ({ error = false, success = false, ...props }: InputProps) => {
  const borderColor = error ? TOKENS.colors.semantic.danger : success ? TOKENS.colors.green[500] : TOKENS.colors.neutral[200];
  return (
    <input
      style={{
        width: '100%',
        padding: '12px 16px',
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        fontFamily: 'Inter, sans-serif',
        fontSize: '16px',
        boxSizing: 'border-box',
      }}
      {...props}
    />
  );
};

// Badge component
export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error';
  children: ReactNode;
}

export const Badge = ({ variant = 'default', children }: BadgeProps) => {
  const colors: Record<string, { bg: string; text: string }> = {
    default: { bg: TOKENS.colors.neutral[100], text: TOKENS.colors.neutral[700] },
    success: { bg: TOKENS.colors.green[100], text: TOKENS.colors.green[700] },
    warning: { bg: '#FEF3C7', text: '#92400E' },
    error: { bg: '#FEE2E2', text: TOKENS.colors.semantic.danger },
  };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '600',
        backgroundColor: colors[variant].bg,
        color: colors[variant].text,
      }}
    >
      {children}
    </span>
  );
};

// Alert component
export interface AlertProps {
  variant?: 'warning' | 'success' | 'error';
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}

export const Alert = ({ variant = 'warning', title, description, children }: AlertProps) => {
  const styles: Record<string, { bg: string; borderColor: string; color: string }> = {
    warning: { bg: '#FFFBEB', borderColor: '#FCD34D', color: '#78350F' },
    success: { bg: TOKENS.colors.green[50], borderColor: TOKENS.colors.green[500], color: TOKENS.colors.green[700] },
    error: { bg: '#FEE2E2', borderColor: TOKENS.colors.semantic.danger, color: TOKENS.colors.semantic.danger },
  };
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: styles[variant].bg,
        borderLeft: `4px solid ${styles[variant].borderColor}`,
        color: styles[variant].color,
      }}
    >
      {title && <div style={{ fontWeight: '600', marginBottom: '4px' }}>{title}</div>}
      <div style={{ fontSize: '14px' }}>{description || children}</div>
    </div>
  );
};

// Table component
export interface TableProps {
  columns: string[];
  rows: ReactNode[][];
}

export const Table = ({ columns, rows }: TableProps) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: `2px solid ${TOKENS.colors.neutral[200]}` }}>
          {columns.map((col) => (
            <th key={col} scope="col" style={{ textAlign: 'left', padding: '8px 16px', fontWeight: '600', color: TOKENS.colors.neutral[700] }}>
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx} style={{ borderBottom: `1px solid ${TOKENS.colors.neutral[200]}` }}>
            {row.map((cell, cidx) => (
              <td key={cidx} style={{ padding: '12px 16px' }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Transaction list - responsive table (desktop/tablet) / stacked cards (mobile)
export interface TransactionListColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
}
export interface TransactionListProps<T> {
  isMobile: boolean;
  columns: TransactionListColumn<T>[];
  rows: T[];
  getKey: (row: T) => string;
}

export function TransactionList<T>({ isMobile, columns, rows, getKey }: TransactionListProps<T>) {
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {rows.map((row) => (
          <div
            key={getKey(row)}
            style={{ border: `1px solid ${TOKENS.colors.neutral[200]}`, borderRadius: '12px', padding: '14px 16px' }}
          >
            {columns.map((col) => (
              <div
                key={col.key}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '5px 0' }}
              >
                <span style={{ fontSize: '12px', fontWeight: '600', color: TOKENS.colors.neutral[500] }}>{col.label}</span>
                <span style={{ fontSize: '14px', color: TOKENS.colors.neutral[900], textAlign: 'right' }}>{col.render(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${TOKENS.colors.neutral[200]}` }}>
            {columns.map((col) => (
              <th key={col.key} scope="col" style={{ textAlign: col.align || 'left', padding: '12px 16px', fontWeight: '600', color: TOKENS.colors.neutral[700] }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getKey(row)} style={{ borderBottom: `1px solid ${TOKENS.colors.neutral[200]}` }}>
              {columns.map((col) => (
                <td key={col.key} style={{ padding: '12px 16px', textAlign: col.align || 'left' }}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Empty state component - reusable design system component
export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ icon, title, description, action, actionLabel, onAction }: EmptyStateProps) => {
  const label = actionLabel || action;
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px' }}>
      <div style={{ fontSize: '56px', marginBottom: '16px' }} aria-hidden="true">{icon}</div>
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: TOKENS.colors.neutral[900] }}>
        {title}
      </h3>
      <p style={{ color: TOKENS.colors.neutral[600], marginBottom: '24px' }}>
        {description}
      </p>
      {label && onAction && (
        <Button variant="primary" onClick={onAction}>{label}</Button>
      )}
    </div>
  );
};

// Functional Switch component
export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}

export const Switch = ({ checked, onChange, disabled = false, 'aria-label': ariaLabel }: SwitchProps) => (
  <button
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    style={{
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      height: '24px',
      width: '44px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: checked ? TOKENS.colors.green[500] : TOKENS.colors.neutral[300],
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'background-color 0.2s ease',
    }}
  >
    <span
      style={{
        display: 'inline-block',
        height: '16px',
        width: '16px',
        borderRadius: '50%',
        backgroundColor: 'white',
        position: 'absolute',
        left: checked ? '24px' : '4px',
        transition: 'left 0.2s ease',
      }}
    />
  </button>
);
