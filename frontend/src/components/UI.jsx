import { useApp } from "../context/AppContext";
import { C } from "../constants";
import { fmt, fmtDate } from "../utils/format";

export function Shell({ children }) {
  const { user, logout } = useApp();
  const [nav, setNav] = useState(null);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", display: "flex" }}>
      {user && <Sidebar nav={nav} setNav={setNav} />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {user && <TopBar />}
        <main style={{ flex: 1, padding: user ? "32px 40px" : "0", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

import { useState } from "react";

const NAV = {
  contractor: [
    { label: "Dashboard", page: "dashboard", icon: "⊞" },
    { label: "Submit Timesheet", page: "submit-timesheet", icon: "✦" },
    { label: "Request Leave", page: "request-leave", icon: "📅" },
    { label: "My Leave", page: "my-leave", icon: "🏖️" },
    { label: "My Timesheets", page: "timesheets", icon: "≡" },
    { label: "Invoices", page: "invoices", icon: "◈" },
    { label: "Payroll", page: "payroll", icon: "◎" },
    { label: "Payslips", page: "payslips", icon: "⊕" },
    { label: "Change Password", page: "change-password", icon: "⚿" },
  ],
  agency: [
    { label: "Dashboard", page: "dashboard", icon: "⊞" },
    { label: "Leave Approvals", page: "leave-approvals", icon: "🏖️" },
    { label: "Timesheet Approvals", page: "timesheet-approvals", icon: "✔" },
    { label: "Invoices", page: "invoices", icon: "◈" },
    { label: "Change Password", page: "change-password", icon: "⚿" },
  ],
  payroll_operator: [
    { label: "Dashboard", page: "dashboard", icon: "⊞" },
    { label: "Process Payroll", page: "process-payroll", icon: "◎" },
    { label: "Payroll Records", page: "payroll", icon: "≡" },
    { label: "Change Password", page: "change-password", icon: "⚿" },
  ],
};

export function Sidebar({ nav, setNav }) {
  const { user } = useApp();
  const items = NAV[user?.role] || [];
  const current = nav || "dashboard";

  return (
    <div style={{
      width: "220px", flexShrink: 0, background: C.surface,
      borderRight: `1px solid ${C.border}`, padding: "24px 0",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "0 20px 24px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: "11px", letterSpacing: "0.2em", color: C.accent, marginBottom: "4px" }}>PAYPLATFORM</div>
        <div style={{ fontSize: "12px", color: C.muted }}>{user?.role?.replace("_", " ").toUpperCase()}</div>
      </div>
      <nav style={{ flex: 1, padding: "16px 0" }}>
        {items.map(item => (
          <button key={item.page} onClick={() => setNav(item.page)} style={{
            display: "flex", alignItems: "center", gap: "10px",
            width: "100%", padding: "10px 20px", textAlign: "left",
            background: current === item.page ? C.accent + "22" : "transparent",
            borderLeft: current === item.page ? `3px solid ${C.accent}` : "3px solid transparent",
            border: "none", color: current === item.page ? C.text : C.muted,
            fontSize: "13px", cursor: "pointer", transition: "all 0.15s",
          }}>
            <span style={{ fontSize: "14px" }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: "13px", color: C.text, marginBottom: "2px" }}>{user?.name}</div>
        <div style={{ fontSize: "11px", color: C.muted, marginBottom: "12px" }}>{user?.email}</div>
        <Btn onClick={() => { useApp(); }} variant="ghost" size="sm" fullWidth onClick2={() => {}}>—</Btn>
      </div>
    </div>
  );
}

export function TopBar() {
  const { user, logout } = useApp();
  return (
    <div style={{
      height: "56px", borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", justifyContent: "flex-end",
      padding: "0 40px", gap: "12px", background: C.surface,
    }}>
      <span style={{ fontSize: "12px", color: C.muted }}>{new Date().toDateString()}</span>
      <button onClick={logout} style={{
        padding: "6px 14px", background: "transparent",
        border: `1px solid ${C.border}`, borderRadius: "6px",
        color: C.muted, fontSize: "12px", cursor: "pointer",
      }}>Sign out</button>
    </div>
  );
}

export function Card({ children, style }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: "10px", padding: "24px", ...style,
    }}>
      {children}
    </div>
  );
}

export function PageTitle({ title, subtitle }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <h1 style={{ fontSize: "22px", fontWeight: "600", margin: 0, color: C.text }}>{title}</h1>
      {subtitle && <p style={{ fontSize: "13px", color: C.muted, margin: "4px 0 0" }}>{subtitle}</p>}
    </div>
  );
}

export function Badge({ status }) {
  const map = {
    submitted: { label: "Submitted", color: C.amber },
    assigned: { label: "Assigned", color: C.blue },
    in_progress: { label: "In Progress", color: C.amber },
    completed: { label: "Completed", color: C.green },
    approved: { label: "Approved", color: C.green },
    changes_requested: { label: "Changes Requested", color: C.red },
    pending_acceptance: { label: "Pending Acceptance", color: C.amber },
    WORK_SUBMITTED: { label: "Submitted", color: C.amber },
    WORK_APPROVED: { label: "Approved", color: C.green },
    WORK_REJECTED: { label: "Rejected", color: C.red },
    INVOICE_GENERATED: { label: "Generated", color: C.blue },
    INVOICE_APPROVED: { label: "Approved", color: C.green },
    PAYMENT_PENDING: { label: "Pending", color: C.amber },
    PAYMENT_RECEIVED: { label: "Paid", color: C.green },
    PAYROLL_PROCESSING: { label: "Processing", color: C.amber },
    PAYROLL_COMPLETED: { label: "Completed", color: C.green },
    PAYOUT_PENDING: { label: "Salary Pending", color: C.amber },
    PAYOUT_COMPLETED: { label: "Salary Paid", color: C.green },
    PAYOUT_FAILED: { label: "Transfer Failed", color: C.red },
    PAYOUT_RETRYING: { label: "Retrying Transfer", color: C.blue },
    COMPLIANCE_PENDING: { label: "Awaiting HMRC", color: C.blue },
  };
  const s = map[status] || { label: status, color: C.muted };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: "20px",
      fontSize: "11px", fontWeight: "600", letterSpacing: "0.05em",
      background: s.color + "22", color: s.color, border: `1px solid ${s.color}44`,
    }}>{s.label}</span>
  );
}

export function Btn({ children, onClick, variant = "primary", size = "md", fullWidth, disabled, type = "button" }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: "6px", cursor: disabled ? "not-allowed" : "pointer",
    border: "none", borderRadius: "8px", fontWeight: "500",
    transition: "all 0.15s", opacity: disabled ? 0.5 : 1,
    width: fullWidth ? "100%" : "auto",
    fontFamily: "inherit",
  };
  const sizes = { sm: { padding: "6px 12px", fontSize: "12px" }, md: { padding: "10px 18px", fontSize: "13px" }, lg: { padding: "13px 24px", fontSize: "14px" } };
  const variants = {
    primary: { background: C.accent, color: "#fff" },
    ghost: { background: "transparent", color: C.muted, border: `1px solid ${C.border}` },
    danger: { background: C.red + "22", color: C.red, border: `1px solid ${C.red}44` },
    success: { background: C.green + "22", color: C.green, border: `1px solid ${C.green}44` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...sizes[size], ...variants[variant] }}>
      {children}
    </button>
  );
}

export function Input({ label, error, ...props }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      {label && <label style={{ display: "block", fontSize: "12px", color: C.muted, marginBottom: "6px" }}>{label}</label>}
      <input {...props} style={{
        width: "100%", padding: "10px 14px", background: C.bg,
        border: `1px solid ${error ? C.red : C.border}`, borderRadius: "8px",
        color: C.text, fontSize: "14px", outline: "none", boxSizing: "border-box",
        fontFamily: "inherit",
      }} />
      {error && <div style={{ fontSize: "11px", color: C.red, marginTop: "4px" }}>{error}</div>}
    </div>
  );
}

export function Textarea({ label, ...props }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      {label && <label style={{ display: "block", fontSize: "12px", color: C.muted, marginBottom: "6px" }}>{label}</label>}
      <textarea {...props} style={{
        width: "100%", padding: "10px 14px", background: C.bg,
        border: `1px solid ${C.border}`, borderRadius: "8px",
        color: C.text, fontSize: "14px", outline: "none", boxSizing: "border-box",
        fontFamily: "inherit", resize: "vertical", minHeight: "80px",
      }} />
    </div>
  );
}

export function StatCard({ label, value, color, sub }) {
  return (
    <Card style={{ flex: 1, height: "100%", minHeight: "132px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ fontSize: "11px", color: C.muted, letterSpacing: "0.1em", marginBottom: "8px", minHeight: "30px", lineHeight: 1.35 }}>{label}</div>
      <div style={{ fontSize: "26px", fontWeight: "700", color: color || C.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: "12px", color: C.muted, marginTop: "4px" }}>{sub}</div>}
    </Card>
  );
}

export function MetricCard({ label, value, color, action }) {
  return (
    <StatCard label={label} value={value} color={color} sub={action ? <div style={{ marginTop: "8px" }}>{action}</div> : null} />
  );
}

export function Table({ headers, rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {headers.map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: "500", fontSize: "11px", letterSpacing: "0.08em" }}>
                {h.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.border}22` }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "12px 14px", color: C.text }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ open, onClose, title, children, width = "480px", maxWidth = "90vw" }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000a", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: "12px", padding: "28px", width, maxWidth,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "18px" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Re-export constants and utilities for convenience
export { C, fmt, fmtDate };


