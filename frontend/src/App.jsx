import { useState, useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { C, THEMES } from "./constants";
import { animationStyles } from "./utils/animations";
import { LoginPage, RegisterPage, ChangePasswordPage } from "./pages/auth/AuthPages";
import HomePage from "./pages/HomePage";
import Dashboard from "./pages/Dashboard";
import { SubmitTimesheetPage, ViewTimesheetsPage } from "./pages/timesheet/TimesheetPages";
import {
  AgencyDashboard, TimesheetApprovalsPage, ContractorsPage,
  AgencyInvoicesPage, PaymentHistoryPage, DisputesPage, ReportsPage, AgencySettingsPage, LeaveApprovalsPage
} from "./pages/agency/AgencyPages";
import { InvoiceListPage } from "./pages/invoice/InvoicePages";
import { RequestLeavePage, MyLeavePage } from "./pages/leave/LeavePages";
import {
  PayrollOperatorDashboard, PayrollSubmittedTimesheetsPage, PayrollQueuePage, RunPayrollPage, PayrollRecordsPage,
  AllPayslipsPage, HmrcSubmissionsPage, PayrollSettingsPage, ContractorPaymentsPage,
  ContractorPayrollDashboard, ContractorPayslipsPage, ContractorBankDetailsPage, ContractorProfilePage
} from "./pages/payroll/PayrollPages";
import { ClientDashboard } from "./pages/client/ClientPages";
import { AgencyDeliverablesPage } from "./pages/deliverables/DeliverablesPages";
import { ClientDeliverablesPage, ContractorDeliverablesPage } from "./pages/deliverables/DeliverablesPages";

const NAV = {
  contractor: [
    { label: "Dashboard",         page: "dashboard",        icon: "⊞" },
    { label: "Profile",           page: "profile",          icon: "◉" },
    { label: "Submit Timesheet",  page: "submit-timesheet", icon: "✦" },
    { label: "Request Leave",     page: "request-leave",    icon: "📅" },
    { label: "My Leave",          page: "my-leave",         icon: "🏖️" },
    { label: "My Timesheets",     page: "timesheets",       icon: "≡" },
    { label: "Deliverables",      page: "deliverables",     icon: "📋" },
    { label: "Invoices",          page: "invoices",         icon: "◈" },
    { label: "Payroll",           page: "payroll",          icon: "◎" },
    { label: "Payslips",          page: "payslips",         icon: "⊕" },
    { label: "Bank Details",      page: "bank-details",     icon: "£" },
    { label: "Change Password",   page: "change-password",  icon: "⚿" },
  ],
  agency: [
    { label: "Dashboard",        page: "dashboard",       icon: "·" },
    { label: "Leave Approvals",  page: "leave-approvals", icon: "🏖️", badge: true },
    { label: "Deliverables",     page: "deliverables",    icon: "·" },
    { label: "Invoices",         page: "invoices",        icon: "·" },
    { label: "Timesheets",       page: "ts-approvals",    icon: "·", badge: true },
    { label: "Contractors",      page: "contractors",     icon: "·" },
    { label: "Payment History",  page: "payment-history", icon: "·" },
    { label: "Disputes",         page: "disputes",        icon: "·" },
    { label: "Reports",          page: "reports",         icon: "·" },
    { label: "Settings",         page: "settings",        icon: "·" },
  ],
  payroll_operator: [
    { label: "Dashboard",        page: "dashboard",    icon: "⊞" },
    { label: "Submitted Timesheets", page: "pr-submitted-timesheets", icon: "✦", badge: true },
    { label: "Payroll Queue",    page: "pr-queue",     icon: "◎", badge: true },
    { label: "Run Payroll",      page: "run-payroll",  icon: "▶" },
    { label: "Contractor Payments", page: "contractor-payments", icon: "£" },
    { label: "Payroll Records",  page: "pr-records",   icon: "≡" },
    { label: "All Payslips",     page: "all-payslips", icon: "⊕" },
    { label: "HMRC Submissions", page: "hmrc",         icon: "✦" },
    { label: "Settings",         page: "settings",     icon: "⚿" },
  ],
  client: [
    { label: "Dashboard",        page: "dashboard",       icon: "+" },
    { label: "Deliverables",     page: "deliverables",    icon: "+" },
    { label: "Invoices",         page: "invoices",        icon: "+" },
    { label: "Change Password",  page: "change-password", icon: "+" },
  ],
};

function PageRouter({ page, setPage }) {
  const { user } = useApp();
  if (page === "dashboard") {
    if (user.role === "agency") return <AgencyDashboard />;
    if (user.role === "payroll_operator") return <PayrollOperatorDashboard />;
    if (user.role === "client") return <ClientDashboard />;
    return <Dashboard />;
  }
  if (page === "submit-timesheet")  return <SubmitTimesheetPage />;
  if (page === "request-leave")     return <RequestLeavePage />;
  if (page === "my-leave")          return <MyLeavePage />;
  if (page === "profile")          return <ContractorProfilePage />;
  if (page === "timesheets")        return <ViewTimesheetsPage />;
  if (page === "invoices")          return user.role === "agency" ? <AgencyInvoicesPage /> : <InvoiceListPage />;
  if (page === "payroll")           return <ContractorPayrollDashboard />;
  if (page === "payslips")          return <ContractorPayslipsPage />;
  if (page === "bank-details")      return <ContractorBankDetailsPage />;
  if (page === "change-password")   return <ChangePasswordPage />;
  if (page === "leave-approvals")    return <LeaveApprovalsPage />;
  if (page === "ts-approvals")      return <TimesheetApprovalsPage />;
  if (page === "contractors")       return <ContractorsPage />;
  if (page === "deliverables")      return user.role === "agency" ? <AgencyDeliverablesPage /> : user.role === "client" ? <ClientDeliverablesPage /> : <ContractorDeliverablesPage />;
  if (page === "payment-history")   return <PaymentHistoryPage />;
  if (page === "disputes")          return <DisputesPage />;
  if (page === "reports")           return <ReportsPage />;
  if (page === "settings")          return user.role === "payroll_operator" ? <PayrollSettingsPage /> : <AgencySettingsPage />;
  if (page === "pr-submitted-timesheets") return <PayrollSubmittedTimesheetsPage />;
  if (page === "pr-queue")          return <PayrollQueuePage />;
  if (page === "run-payroll")       return <RunPayrollPage />;
  if (page === "contractor-payments") return <ContractorPaymentsPage />;
  if (page === "pr-records")        return <PayrollRecordsPage />;
  if (page === "all-payslips")      return <AllPayslipsPage />;
  if (page === "hmrc")              return <HmrcSubmissionsPage />;
    return <Dashboard />;
}

function AppShell() {
  const { user, logout, timesheets, disputes, invoices, hmrcSubmissions } = useApp();
  const [authMode, setAuthMode] = useState("home");
  const [page, setPage] = useState("dashboard");
  const [theme, setTheme] = useState(() => localStorage.getItem("appTheme") || "dark");

  useEffect(() => {
    localStorage.setItem("appTheme", theme);
  }, [theme]);

  const colors = THEMES[theme] || THEMES.dark;
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  if (!user) {
    if (authMode === "home") {
      return <HomePage onLogin={() => setAuthMode("login")} onRegister={() => setAuthMode("register")} />;
    }
    return authMode === "login"
      ? <LoginPage onSwitch={() => setAuthMode("register")} onBack={() => setAuthMode("home")} />
      : <RegisterPage onSwitch={() => setAuthMode("login")} onBack={() => setAuthMode("home")} />;
  }

  const navItems = NAV[user.role] || [];

  const getBadge = (navPage) => {
    if (navPage === "ts-approvals") return timesheets.filter(t => t.status === "WORK_SUBMITTED").length;
    if (navPage === "pr-submitted-timesheets") return timesheets.filter(t => t.status === "WORK_SUBMITTED").length;
    if (navPage === "disputes") return disputes?.filter(d => d.status === "open").length || 0;
    if (navPage === "pr-queue") return invoices.filter(i => i.status === "PAYMENT_RECEIVED").length;
    if (navPage === "hmrc") return hmrcSubmissions?.filter(h => h.status === "pending").length || 0;
    return 0;
  };

  const topbarRight = () => {
    if (user.role === "agency") return `TechStaff Ltd`;
    if (user.role === "payroll_operator") return `PaySafe Umbrella · Tax year 2024/25`;
    if (user.role === "client") return user.agency ? `Client: ${user.agency}` : "Client Portal";
    return user.agency ? `Agency: ${user.agency}` : "";
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", display: "flex" }}>
      <style>{animationStyles}</style>
      <div style={{ width: "230px", flexShrink: 0, background: colors.surface, borderRight: `1px solid ${colors.border}`, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 18px 16px", borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.2em", color: colors.accent, marginBottom: "3px" }}>PAYPLATFORM</div>
          <div style={{ fontSize: "11px", color: colors.muted }}>{user.role.replace("_", " ").toUpperCase()}</div>
        </div>
        <nav style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
          {navItems.map(item => {
            const badge = getBadge(item.page);
            return (
              <button key={item.page} onClick={() => setPage(item.page)} style={{
                display: "flex", alignItems: "center", gap: "9px", width: "100%", padding: "9px 18px",
                textAlign: "left", background: page === item.page ? colors.accent + "20" : "transparent",
                borderLeft: page === item.page ? `3px solid ${colors.accent}` : "3px solid transparent",
                border: "none", color: page === item.page ? colors.text : colors.muted,
                fontSize: "13px", cursor: "pointer", transition: "all 0.12s", fontFamily: "inherit",
              }}>
                <span style={{ fontSize: "14px", width: "16px", textAlign: "center" }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {badge > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", borderRadius: "50%", background: colors.red, color: "#fff", fontSize: "10px", fontWeight: "500" }}>{badge}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: "14px 18px", borderTop: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: "12px", color: colors.text, marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: "500" }}>{user.name}</div>
          <div style={{ fontSize: "11px", color: colors.muted, marginBottom: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
          <button onClick={logout} style={{ width: "100%", padding: "7px", background: "transparent", border: `1px solid ${colors.border}`, borderRadius: "6px", color: colors.muted, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>Sign out</button>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ height: "48px", borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: colors.surface, flexShrink: 0 }}>
          <div style={{ fontSize: "12px", color: colors.muted }}>{new Date().toDateString()}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={toggleTheme}
              style={{
                border: `1px solid ${colors.border}`,
                background: colors.surface,
                color: colors.text,
                borderRadius: "6px",
                padding: "6px 10px",
                fontSize: "14px",
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <div style={{ fontSize: "12px", color: colors.muted }}>{topbarRight()}</div>
          </div>
        </div>
        <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>
          <PageRouter page={page} setPage={setPage} />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
