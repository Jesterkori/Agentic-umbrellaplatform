import { useEffect } from "react";
import { useApp } from "../context/AppContext";
import { C, THEMES } from "../constants";
import { Card, StatCard, Badge, PageTitle, Table } from "../components/UI";
import { fmt, fmtDate } from "../utils/format";
import { animationStyles } from "../utils/animations";

export default function Dashboard() {
  const { user } = useApp();

  if (user.role === "contractor") return <ContractorDashboard />;
  if (user.role === "agency") return <AgencyDashboard />;
  if (user.role === "client") return <ClientDashboard />;
  return <PayrollDashboard />;
}

function ContractorDashboard() {
  const { user, timesheets, invoices, payrolls, allContracts, activeContract, setActiveContractId } = useApp();
  const myTs = timesheets.filter(t => t.contractorId === user.id);
  const myInv = invoices.filter(i => i.contractorId === user.id);
  const myPay = payrolls.filter(p => p.contractorId === user.id);

  const pending = myTs.filter(t => t.status === "WORK_SUBMITTED").length;
  const approved = myTs.filter(t => t.status === "WORK_APPROVED").length;
  const rejected = myTs.filter(t => t.status === "WORK_REJECTED").length;
  const awaitingPayment = myInv.filter(i => i.status === "INVOICE_APPROVED").length;
  const salaryPending = myPay.filter(p => p.status === "PAYOUT_PENDING").length;
  const salaryFailed = myPay.filter(p => p.status === "PAYOUT_FAILED").length;
  const salaryPaid = myPay.filter(p => p.status === "PAYOUT_COMPLETED").length;
  const totalEarned = myPay.reduce((s, p) => s + p.net, 0);
  const latestPayroll = myPay[0];

  return (
    <div>
      <style>{animationStyles}</style>
      <PageTitle title={`Good day, ${user.name.split(" ")[0]}`} subtitle="Here's your activity overview" />

      {allContracts.length > 0 && (
        <div style={{ marginBottom: "24px", animation: "riseIn 0.5s ease-out backwards" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.1em", color: C.muted, marginBottom: "10px" }}>YOUR CONTRACTS</div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {allContracts.map((contract, i) => {
              const isActive = activeContract?.id === contract.id;
              const isCompleted = contract.status === "completed";
              return (
                <button
                  key={contract.id}
                  onClick={() => setActiveContractId(contract.id)}
                  style={{
                    padding: "14px 18px",
                    borderRadius: "14px",
                    border: `2px solid ${isActive ? C.accent : C.border}`,
                    background: isActive ? C.accent + "14" : C.surface,
                    cursor: isCompleted ? "default" : "pointer",
                    textAlign: "left",
                    minWidth: "210px",
                    opacity: isCompleted ? 0.65 : 1,
                    transition: "all 0.15s",
                    animation: `riseIn 0.5s ease-out ${0.05 * i}s backwards`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "10px", letterSpacing: "0.12em", color: isActive ? C.accent : C.muted, fontWeight: 700 }}>{contract.label}</span>
                    <span style={{
                      fontSize: "10px", padding: "2px 8px", borderRadius: "20px",
                      background: contract.status === "active" ? C.green + "22" : C.border,
                      color: contract.status === "active" ? C.green : C.muted,
                    }}>{contract.status}</span>
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: C.text, marginBottom: "3px" }}>{contract.title}</div>
                  <div style={{ fontSize: "11px", color: C.muted }}>{contract.agency}</div>
                  <div style={{ marginTop: "8px", fontSize: "12px", color: isActive ? C.accent : C.text, fontWeight: 600 }}>£{contract.rate}/day</div>
                </button>
              );
            })}
          </div>
          {activeContract && (
            <div style={{ marginTop: "10px", fontSize: "12px", color: C.muted }}>
              Active: <span style={{ color: C.accent, fontWeight: 600 }}>{activeContract.label} — {activeContract.agency}</span>
              {" · "}{activeContract.description}
            </div>
          )}
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: "16px",
          marginBottom: "28px",
          alignItems: "stretch",
        }}
        className="anime-container"
      >
        <div style={{ animation: "riseIn 0.6s ease-out 0s backwards", minWidth: 0 }}><StatCard label="TIMESHEETS PENDING" value={pending} color={C.amber} /></div>
        <div style={{ animation: "riseIn 0.6s ease-out 0.06s backwards", minWidth: 0 }}><StatCard label="TIMESHEETS APPROVED" value={approved} color={C.green} /></div>
        <div style={{ animation: "riseIn 0.6s ease-out 0.12s backwards", minWidth: 0 }}><StatCard label="ACTION REQUIRED" value={rejected} color={C.red} /></div>
        <div style={{ animation: "riseIn 0.6s ease-out 0.18s backwards", minWidth: 0 }}><StatCard label="TOTAL NET EARNED" value={fmt(totalEarned)} color={C.accent} /></div>
        <div style={{ animation: "riseIn 0.6s ease-out 0.24s backwards", minWidth: 0 }}><StatCard label="INVOICES AWAITING PAYMENT" value={awaitingPayment} color={C.blue} /></div>
        <div style={{ animation: "riseIn 0.6s ease-out 0.30s backwards", minWidth: 0 }}><StatCard label="SALARY PENDING (UMBRELLA)" value={salaryPending} color={C.amber} /></div>
        <div style={{ animation: "riseIn 0.6s ease-out 0.36s backwards", minWidth: 0 }}><StatCard label="TRANSFER ISSUES" value={salaryFailed} color={C.red} /></div>
      </div>
      {rejected > 0 && (
        <div style={{ padding: "10px 14px", background: C.red + "18", border: `1px solid ${C.red}44`, borderRadius: "8px", marginBottom: "16px", fontSize: "12px", color: C.red }}>
          {rejected} rejected timesheet{rejected > 1 ? "s" : ""} need correction and resubmission.
        </div>
      )}
      {salaryPending > 0 && (
        <div style={{ padding: "10px 14px", background: C.amber + "18", border: `1px solid ${C.amber}44`, borderRadius: "8px", marginBottom: "16px", fontSize: "12px", color: "#854F0B" }}>
          {salaryPending} payroll run{salaryPending > 1 ? "s are" : " is"} awaiting umbrella disbursement to your bank account.
        </div>
      )}
      {salaryFailed > 0 && (
        <div style={{ padding: "10px 14px", background: C.red + "18", border: `1px solid ${C.red}44`, borderRadius: "8px", marginBottom: "16px", fontSize: "12px", color: C.red }}>
          Umbrella transfer issue detected for {salaryFailed} payroll run{salaryFailed > 1 ? "s" : ""}. Payroll team is retrying disbursement.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <Card style={{ animation: "scaleIn 0.5s ease-out 0.4s backwards" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "16px" }}>Recent Timesheets</div>
          {myTs.slice(0, 4).map((ts, i) => (
            <div key={ts.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}22`, animation: `slideInLeft 0.5s ease-out ${0.45 + i * 0.06}s backwards` }}>
              <div>
                <div style={{ fontSize: "13px" }}>{fmtDate(ts.weekStart)} – {fmtDate(ts.weekEnd)}</div>
                <div style={{ fontSize: "11px", color: C.muted }}>{ts.hours}h · {fmt(ts.gross)}</div>
              </div>
              <Badge status={ts.status} />
            </div>
          ))}
        </Card>
        <Card style={{ animation: "scaleIn 0.5s ease-out 0.45s backwards" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "16px" }}>Latest Payroll</div>
          {latestPayroll ? (
            <div style={{ animation: "riseIn 0.6s ease-out 0.5s backwards" }}>
              <div style={{ marginBottom: "12px" }}><Badge status={latestPayroll.status} /></div>
              <div style={{ fontSize: "24px", fontWeight: "700", color: C.green, marginBottom: "8px" }}>{fmt(latestPayroll.net)}</div>
              <div style={{ fontSize: "12px", color: C.muted, marginBottom: "4px" }}>Period: {latestPayroll.period}</div>
              <div style={{ fontSize: "12px", color: C.muted }}>Payment date: {fmtDate(latestPayroll.paymentDate)}</div>
              <div style={{ marginTop: "16px", fontSize: "12px" }}>
                <Row label="Gross" value={fmt(latestPayroll.gross)} />
                <Row label="Income Tax" value={`-${fmt(latestPayroll.incomeTax)}`} color={C.red} />
                <Row label="NI" value={`-${fmt(latestPayroll.employeeNI)}`} color={C.red} />
                <Row label="Umbrella Fee" value={`-${fmt(latestPayroll.umbrellaFee)}`} color={C.red} />
                <Row label="Net Pay" value={fmt(latestPayroll.net)} color={C.green} bold />
                <Row label="Salary Status" value={salaryPaid > 0 ? "Paid by Umbrella" : "Awaiting Umbrella Transfer"} color={latestPayroll.status === "PAYOUT_COMPLETED" ? C.green : C.amber} />
              </div>
            </div>
          ) : <div style={{ color: C.muted, fontSize: "13px" }}>No payroll records yet</div>}
        </Card>
      </div>
    </div>
  );
}

function AgencyDashboard() {
  const { timesheets, invoices, deliverables, loadAgencyDeliverables } = useApp();

  useEffect(() => {
    loadAgencyDeliverables();
  }, []);

  const pending = timesheets.filter(t => t.status === "WORK_SUBMITTED").length;
  const invoicePending = invoices.filter(i => i.status === "INVOICE_GENERATED").length;
  const totalPaid = invoices.filter(i => i.status === "PAYMENT_RECEIVED").reduce((s, i) => s + i.gross, 0);
  const completedDeliverables = deliverables.filter(d => d.status === "completed").length;
  const atRiskDeliverables = deliverables.filter(d => Number(d.profitabilityMargin || 0) < 0).length;
  const avgDeliverableMargin = deliverables.length
    ? deliverables.reduce((sum, d) => sum + Number(d.profitabilityMargin || 0), 0) / deliverables.length
    : 0;

  return (
    <div>
      <style>{animationStyles}</style>
      <PageTitle title="Agency Dashboard" subtitle="Overview of contractor activity" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "16px", marginBottom: "28px" }} className="anime-container">
        <div style={{ animation: "riseIn 0.6s ease-out 0s backwards" }}><StatCard label="TIMESHEETS AWAITING APPROVAL" value={pending} color={C.amber} /></div>
        <div style={{ animation: "riseIn 0.6s ease-out 0.06s backwards" }}><StatCard label="INVOICES TO REVIEW" value={invoicePending} color={C.blue} /></div>
        <div style={{ animation: "riseIn 0.6s ease-out 0.12s backwards" }}><StatCard label="TOTAL PAID OUT" value={fmt(totalPaid)} color={C.green} /></div>
        <div style={{ animation: "riseIn 0.6s ease-out 0.18s backwards" }}><StatCard label="DELIVERABLES COMPLETED" value={completedDeliverables} color={C.green} /></div>
        <div style={{ animation: "riseIn 0.6s ease-out 0.24s backwards" }}><StatCard label="DELIVERABLES AT RISK" value={atRiskDeliverables} color={C.red} /></div>
        <div style={{ animation: "riseIn 0.6s ease-out 0.30s backwards" }}><StatCard label="AVG DELIVERABLE MARGIN" value={deliverables.length ? `${avgDeliverableMargin.toFixed(1)}%` : "—"} color={avgDeliverableMargin < 0 ? C.red : C.accent} /></div>
      </div>
      <Card style={{ animation: "scaleIn 0.5s ease-out 0.2s backwards" }}>
        <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "16px" }}>Pending Timesheet Approvals</div>
        {timesheets.filter(t => t.status === "WORK_SUBMITTED").map((ts, i) => (
          <div key={ts.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}22`, animation: `slideInLeft 0.5s ease-out ${0.25 + i * 0.06}s backwards` }}>
            <div>
              <div style={{ fontSize: "13px" }}>{ts.contractorName}</div>
              <div style={{ fontSize: "11px", color: C.muted }}>{fmtDate(ts.weekStart)} – {fmtDate(ts.weekEnd)} · {ts.hours}h</div>
            </div>
            <Badge status={ts.status} />
          </div>
        ))}
        {!timesheets.filter(t => t.status === "WORK_SUBMITTED").length &&
          <div style={{ color: C.muted, fontSize: "13px", animation: "fadeIn 0.6s ease-out 0.3s backwards" }}>No pending approvals</div>}
      </Card>
    </div>
  );
}

function PayrollDashboard() {
  const { payrolls, invoices } = useApp();
  const ready = invoices.filter(i => i.status === "PAYMENT_RECEIVED").length;
  const done = payrolls.filter(p => p.status === "PAYROLL_COMPLETED").length;
  const totalNet = payrolls.reduce((s, p) => s + p.net, 0);

  return (
    <div>
      <style>{animationStyles}</style>
      <PageTitle title="Payroll Dashboard" subtitle="Payroll processing overview" />
      <div style={{ display: "flex", gap: "16px", marginBottom: "28px", flexWrap: "wrap" }} className="anime-container">
        <div style={{ animation: "riseIn 0.6s ease-out 0s backwards" }}><StatCard label="READY TO PROCESS" value={ready} color={C.amber} /></div>
        <div style={{ animation: "riseIn 0.6s ease-out 0.06s backwards" }}><StatCard label="PAYROLLS COMPLETED" value={done} color={C.green} /></div>
        <div style={{ animation: "riseIn 0.6s ease-out 0.12s backwards" }}><StatCard label="TOTAL DISBURSED" value={fmt(totalNet)} color={C.accent} /></div>
      </div>
      <Card style={{ animation: "scaleIn 0.5s ease-out 0.2s backwards" }}>
        <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "16px" }}>Recent Payroll Runs</div>
        {payrolls.map((p, i) => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}22`, animation: `slideInLeft 0.5s ease-out ${0.25 + i * 0.06}s backwards` }}>
            <div>
              <div style={{ fontSize: "13px" }}>{p.contractorName}</div>
              <div style={{ fontSize: "11px", color: C.muted }}>{p.period} · Net: {fmt(p.net)}</div>
            </div>
            <Badge status={p.status} />
          </div>
        ))}
        {!payrolls.length && <div style={{ color: C.muted, fontSize: "13px", animation: "fadeIn 0.6s ease-out 0.3s backwards" }}>No payroll records yet</div>}
      </Card>
    </div>
  );
}

function ClientDashboard() {
  const { invoices } = useApp();
  const generated = invoices.filter(i => i.status === "INVOICE_GENERATED").length;
  const approved = invoices.filter(i => i.status === "INVOICE_APPROVED").length;
  const paid = invoices.filter(i => i.status === "PAYMENT_RECEIVED").length;
  const total = invoices.reduce((sum, i) => sum + Number(i.gross || 0), 0);

  return (
    <div>
      <style>{animationStyles}</style>
      <PageTitle title="Client Dashboard" subtitle="Invoice and payment overview" />
      <div style={{ display: "flex", gap: "16px", marginBottom: "28px", flexWrap: "wrap" }} className="anime-container">
        <div style={{ animation: "riseIn 0.6s ease-out 0s backwards" }}><StatCard label="INVOICES RECEIVED" value={generated + approved + paid} color={C.blue} /></div>
        <div style={{ animation: "riseIn 0.6s ease-out 0.06s backwards" }}><StatCard label="AWAITING PAYMENT" value={approved} color={C.amber} /></div>
        <div style={{ animation: "riseIn 0.6s ease-out 0.12s backwards" }}><StatCard label="PAID INVOICES" value={paid} color={C.green} /></div>
        <div style={{ animation: "riseIn 0.6s ease-out 0.18s backwards" }}><StatCard label="TOTAL INVOICE VALUE" value={fmt(total)} color={C.accent} /></div>
      </div>
      <Card style={{ animation: "scaleIn 0.5s ease-out 0.25s backwards" }}>
        <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "16px" }}>Recent Invoices</div>
        {invoices.slice(0, 8).map((inv, i) => (
          <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}22`, animation: `slideInLeft 0.5s ease-out ${0.3 + i * 0.05}s backwards` }}>
            <div>
              <div style={{ fontSize: "13px" }}>{inv.invoiceNumber}</div>
              <div style={{ fontSize: "11px", color: C.muted }}>{inv.contractorName || "—"} · {fmtDate(inv.weekStart)} – {fmtDate(inv.weekEnd)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "12px", marginBottom: "4px" }}>{fmt(inv.gross)}</div>
              <Badge status={inv.status} />
            </div>
          </div>
        ))}
        {!invoices.length && <div style={{ color: C.muted, fontSize: "13px", animation: "fadeIn 0.6s ease-out 0.35s backwards" }}>No invoices found</div>}
      </Card>
    </div>
  );
}

function Row({ label, value, color, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ color: color || C.text, fontWeight: bold ? "700" : "400" }}>{value}</span>
    </div>
  );
}
