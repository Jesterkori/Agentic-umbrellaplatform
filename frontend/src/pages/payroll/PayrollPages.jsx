import { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { C, Card, PageTitle, StatCard, Badge, Btn, Input, Modal, fmt, fmtDate, Table } from "../../components/UI";
import { downloadPayslipPdf } from "../../utils/pdfExport";
import { computeGrossToNet } from "../../utils/payrollCalc";
import { animationStyles } from "../../utils/animations";

function BRow({ label, value, color, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}22`, fontSize: "13px" }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ color: color || C.text, fontWeight: bold ? "500" : "400" }}>{value}</span>
    </div>
  );
}

function PayslipView({ payroll: p, brandingSettings }) {
  const totalDeductions = (p.incomeTax || 0) + (p.employeeNI || 0) + (p.umbrellaFee || 0) + (p.pension || 0) + (p.studentLoan || 0);
  return (
    <div style={{ fontSize: "13px", border: `1px solid ${C.border}`, borderRadius: "10px", overflow: "hidden", background: "#FBFBF8" }}>
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "20px", fontStyle: "italic", color: "#000" }}>PayPlatform Payslip</div>
        <Btn size="sm" variant="ghost" onClick={() => downloadPayslipPdf(p, brandingSettings)}>Download PDF</Btn>
      </div>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
        <div><span style={{ color: C.muted }}>Contractor: </span>{p.contractorName}</div>
        <div><span style={{ color: C.muted }}>Payslip ID: </span><span style={{ fontFamily: "monospace", color: "#000" }}>{p.payslipId}</span></div>
        <div><span style={{ color: C.muted }}>Period: </span>{p.period}</div>
        <div><span style={{ color: C.muted }}>Tax Code: </span>{p.taxCode}</div>
        <div><span style={{ color: C.muted }}>Paid Date: </span>{fmtDate(p.paymentDate)}</div>
        <div><span style={{ color: C.muted }}>Payout Ref: </span><span style={{ fontFamily: "monospace", color: "#000" }}>{p.payoutReference || "Pending"}</span></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ borderRight: `1px solid ${C.border}`, padding: "10px 12px", minHeight: "150px" }}>
          <div style={{ fontSize: "11px", color: C.muted, marginBottom: "8px" }}>PAYMENTS</div>
          <BRow label="Gross Pay" value={fmt(p.gross)} />
        </div>
        <div style={{ borderRight: `1px solid ${C.border}`, padding: "10px 12px", minHeight: "150px" }}>
          <div style={{ fontSize: "11px", color: C.muted, marginBottom: "8px" }}>DEDUCTIONS</div>
          <BRow label="Tax" value={fmt(p.incomeTax)} color={C.red} />
          <BRow label="NI" value={fmt(p.employeeNI)} color={C.red} />
          <BRow label="Ombrella Fee" value={fmt(p.umbrellaFee)} color={C.red} />
          <BRow label="Pension" value={fmt(p.pension)} color={C.amber} />
          {(p.studentLoan || 0) > 0 && <BRow label="Student Loan" value={fmt(p.studentLoan)} color={C.amber} />}
        </div>
        <div style={{ padding: "10px 12px", minHeight: "150px" }}>
          <div style={{ fontSize: "11px", color: C.muted, marginBottom: "8px" }}>CUMULATIVE FIGURES</div>
          <BRow label="Gross This Period" value={fmt(p.gross)} />
          <BRow label="Total Deductions" value={fmt(totalDeductions)} />
          <BRow label="Net This Period" value={fmt(p.net)} color={C.green} bold />
        </div>
      </div>
      {(p.employerNI || 0) > 0 && (
        <div style={{ padding: "8px 14px", fontSize: "11px", color: C.muted, borderBottom: `1px solid ${C.border}`, background: "#F6F6F3" }}>
          Employer NI (informational, not deducted from net): {fmt(p.employerNI)}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
        <div style={{ borderRight: `1px solid ${C.border}`, padding: "10px 12px", fontWeight: "600" }}>Total Gross Pay: {fmt(p.gross)}</div>
        <div style={{ borderRight: `1px solid ${C.border}`, padding: "10px 12px", fontWeight: "600" }}>Total Deductions: {fmt(totalDeductions)}</div>
        <div style={{ padding: "10px 12px", fontWeight: "700", color: C.green }}>Net Pay: {fmt(p.net)}</div>
      </div>
    </div>
  );
}

export function PayrollOperatorDashboard() {
  const {
    timesheets, invoices, payrolls, hmrcSubmissions, disburseSalary, retryDisbursement,
    payrollLiabilities, payrollBatches, createPayoutBatch, submitPayoutBatch, settleLiabilities, closePayrollPeriod,
    documentBrandingSettings,
  } = useApp();
  const submittedTimesheets = timesheets.filter((t) => t.status === "WORK_SUBMITTED");
  const readyCount = invoices.filter(i => i.status === "PAYMENT_RECEIVED" && !payrolls.find(p => p.invoiceId === i.id)).length;
  const payoutPending = payrolls.filter(p => p.status === "PAYOUT_PENDING").length;
  const compliancePending = payrolls.filter(p => p.status === "COMPLIANCE_PENDING").length;
  const netPaidOut = payrolls.filter(p => p.status === "PAYOUT_COMPLETED").reduce((s, p) => s + p.net, 0);
  const netInPipeline = payrolls.filter(p => p.status !== "PAYOUT_COMPLETED").reduce((s, p) => s + p.net, 0);
  const hmrcDue = hmrcSubmissions.filter(h => h.status === "pending").reduce((s, h) => s + h.total, 0);
  const recentPayrolls = useMemo(
    () => [...payrolls].sort((a, b) => String(b.processedAt || "").localeCompare(String(a.processedAt || ""))).slice(0, 8),
    [payrolls]
  );
  const outstandingLiabilities = payrollLiabilities.filter(l => l.status === "OUTSTANDING");
  const latestBatch = payrollBatches[0];
  const [payslipModal, setPayslipModal] = useState(null);

  return (
    <div>
      <PageTitle title="Payroll Dashboard" subtitle="Real-time payroll overview" />
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <StatCard label="TIMESHEETS SUBMITTED" value={submittedTimesheets.length} color={C.blue} />
        <StatCard label="QUEUE (READY)" value={readyCount} color={C.amber} />
        <StatCard label="AWAITING HMRC" value={compliancePending} color={C.blue} />
        <StatCard label="PAYOUT PENDING" value={payoutPending} color={C.amber} />
        <StatCard label="PAID RUNS" value={payrolls.filter(p => p.status === "PAYOUT_COMPLETED").length} color={C.green} />
        <StatCard label="NET PAID OUT" value={fmt(netPaidOut)} color={C.green} />
        <StatCard label="NET IN PIPELINE" value={fmt(netInPipeline)} color={C.accent} />
        <StatCard label="HMRC DUE (PENDING RTI)" value={fmt(hmrcDue)} color={C.red} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
        <Card>
          <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Submitted timesheets (agency queue visibility)</div>
          {submittedTimesheets.map((ts) => (
            <div key={ts.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}22` }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: "500" }}>{ts.contractorName}</div>
                <div style={{ fontSize: "11px", color: C.muted }}>
                  {fmtDate(ts.weekStart)} - {fmtDate(ts.weekEnd)}  ·  {ts.hours}h  ·  {fmt(ts.gross)}
                </div>
              </div>
              <Badge status={ts.status} />
            </div>
          ))}
          {!submittedTimesheets.length && <div style={{ fontSize: "12px", color: C.muted }}>No submitted timesheets right now.</div>}
        </Card>
        <Card>
          <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Payroll queue</div>
          {invoices.filter(i => i.status === "PAYMENT_RECEIVED" && !payrolls.find(p => p.invoiceId === i.id)).map(inv => (
            <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}22` }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: "500" }}>{inv.contractorName || inv.invoiceNumber}</div>
                <div style={{ fontSize: "11px", color: C.muted }}>{inv.invoiceNumber}  ·  {fmt(inv.gross)}</div>
              </div>
              <Badge status={inv.status} />
            </div>
          ))}
          {!readyCount && <div style={{ fontSize: "12px", color: C.muted }}>No invoices ready</div>}
        </Card>
        <Card>
          <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>HMRC submission status</div>
          {[
            { label: "RTI submissions pending", value: hmrcSubmissions.filter(h => h.status === "pending").length, color: C.amber },
            { label: "RTI submitted (this month)", value: hmrcSubmissions.filter(h => h.status === "submitted").length, color: C.green },
            { label: "Tax & NI to remit", value: fmt(hmrcDue), color: C.red },
            { label: "Next payment deadline", value: "19 Apr 2026", color: C.text },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}22`, fontSize: "12px" }}>
              <span style={{ color: C.muted }}>{row.label}</span>
              <span style={{ color: row.color, fontWeight: "500" }}>{row.value}</span>
            </div>
          ))}
        </Card>
      </div>
      <Card style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Operational controls</div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
          <Btn size="sm" variant="primary" onClick={() => createPayoutBatch(new Date().toISOString().slice(0, 7))}>Create Salary Batch</Btn>
          {latestBatch?.status === "CREATED" && <Btn size="sm" variant="success" onClick={() => submitPayoutBatch(latestBatch.id)}>Submit Latest Batch</Btn>}
          <Btn size="sm" variant="ghost" onClick={settleLiabilities}>Settle Liabilities</Btn>
          <Btn size="sm" variant="ghost" onClick={() => closePayrollPeriod(new Date().toISOString().slice(0, 7))}>Close Current Period</Btn>
        </div>
        <div style={{ fontSize: "11px", color: C.muted }}>
          Outstanding liabilities: {outstandingLiabilities.length}  ·  Latest batch: {latestBatch ? `${latestBatch.id} (${latestBatch.status})` : "none"}
        </div>
      </Card>
      <Card>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Salary disbursement queue</div>
        {recentPayrolls.map(p => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}22` }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "500" }}>{p.contractorName}</div>
              <div style={{ fontSize: "11px", color: C.muted }}>{p.period}  ·  Gross: {fmt(p.gross)}  ·  Net: {fmt(p.net)}</div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Badge status={p.status} />
              {p.status === "PAYOUT_PENDING" && <Btn size="sm" variant="primary" onClick={() => disburseSalary(p.id)}>Disburse Salary</Btn>}
              {p.status === "PAYOUT_FAILED" && <Btn size="sm" variant="success" onClick={() => retryDisbursement(p.id)}>Retry Transfer</Btn>}
              <Btn size="sm" variant="ghost" onClick={() => setPayslipModal(p)}>Payslip</Btn>
            </div>
          </div>
        ))}
        {!payrolls.length && <div style={{ fontSize: "12px", color: C.muted }}>No payroll records yet</div>}
      </Card>
      <Modal open={!!payslipModal} onClose={() => setPayslipModal(null)} title="Payslip"><PayslipView payroll={payslipModal} brandingSettings={documentBrandingSettings} /></Modal>
    </div>
  );
}

export function PayrollSubmittedTimesheetsPage() {
  const { timesheets } = useApp();
  const submitted = timesheets.filter((t) => t.status === "WORK_SUBMITTED");
  const [selected, setSelected] = useState(null);

  return (
    <div>
      <PageTitle
        title="Submitted Timesheets"
        subtitle="Ombrella visibility into contractor submissions before agency approval"
      />
      <Card>
        <Table
          headers={["Contractor", "Week", "Hours", "Gross", "Submitted At", "Status", "Actions"]}
          rows={submitted.map((ts) => [
            ts.contractorName,
            `${fmtDate(ts.weekStart)} - ${fmtDate(ts.weekEnd)}`,
            `${ts.hours}h`,
            fmt(ts.gross),
            fmtDate(ts.submittedAt),
            <Badge status={ts.status} />,
            <Btn size="sm" variant="ghost" onClick={() => setSelected(ts)}>View</Btn>,
          ])}
        />
        {!submitted.length && (
          <div style={{ padding: "16px 0", color: C.muted, fontSize: "12px" }}>
            No contractor timesheets are currently in submitted state.
          </div>
        )}
      </Card>
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Timesheet Details">
        {selected && (
          <div style={{ fontSize: "13px" }}>
            <div style={{ marginBottom: "8px" }}><strong>Contractor:</strong> {selected.contractorName}</div>
            <div style={{ marginBottom: "8px" }}><strong>Week:</strong> {fmtDate(selected.weekStart)} - {fmtDate(selected.weekEnd)}</div>
            <div style={{ marginBottom: "8px" }}><strong>Hours:</strong> {selected.hours}h</div>
            <div style={{ marginBottom: "8px" }}><strong>Rate:</strong> {fmt(selected.rate)}</div>
            <div style={{ marginBottom: "8px" }}><strong>Gross:</strong> {fmt(selected.gross)}</div>
            <div style={{ marginBottom: "8px" }}><strong>Submitted:</strong> {fmtDate(selected.submittedAt)}</div>
            <div style={{ marginBottom: "8px" }}><strong>Status:</strong> <Badge status={selected.status} /></div>
            <div style={{ marginTop: "12px" }}>
              <div style={{ fontSize: "12px", color: C.muted, marginBottom: "4px" }}>Description</div>
              <div style={{ padding: "10px", border: `1px solid ${C.border}`, borderRadius: "8px", background: C.bg }}>
                {selected.description || "No description provided."}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function PayrollQueuePage() {
  const { timesheets, invoices, payrolls } = useApp();
  const submittedTimesheets = timesheets.filter((t) => t.status === "WORK_SUBMITTED");
  const ready = invoices.filter(i => i.status === "PAYMENT_RECEIVED" && !payrolls.find(p => p.invoiceId === i.id));
  const blocked = invoices.filter(i => i.status !== "PAYMENT_RECEIVED" && i.status !== "INVOICE_GENERATED" && !payrolls.find(p => p.invoiceId === i.id));

  return (
    <div>
      <PageTitle title="Payroll Queue" subtitle="Invoices ready for payroll processing" />
      <Card style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>
          Submitted timesheets visibility ({submittedTimesheets.length})
        </div>
        {submittedTimesheets.map((ts) => (
          <div key={ts.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}22` }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "500" }}>{ts.contractorName}</div>
              <div style={{ fontSize: "11px", color: C.muted }}>
                {fmtDate(ts.weekStart)} - {fmtDate(ts.weekEnd)}  ·  {ts.hours}h  ·  {fmt(ts.gross)}
              </div>
            </div>
            <Badge status={ts.status} />
          </div>
        ))}
        {!submittedTimesheets.length && (
          <div style={{ fontSize: "12px", color: C.muted }}>
            No `WORK_SUBMITTED` timesheets found. If agency already approved them, they move out of this list.
          </div>
        )}
      </Card>
      <div style={{ padding: "10px 14px", background: C.amber + "22", border: `1px solid ${C.amber}44`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: "#854F0B" }}>
        Hard rule: payroll can only run when invoice status is PAYMENT_RECEIVED.
      </div>
      <Card style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Ready ({ready.length})</div>
        {ready.map(inv => (
          <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}22` }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "500", fontFamily: "monospace" }}>{inv.invoiceNumber}</div>
              <div style={{ fontSize: "11px", color: C.muted }}>{inv.contractorName}  ·  {fmtDate(inv.weekStart)} - {fmtDate(inv.weekEnd)}  ·  {fmt(inv.gross)}</div>
              {inv.paymentRef && <div style={{ fontSize: "10px", color: C.muted, fontFamily: "monospace" }}>Ref: {inv.paymentRef}</div>}
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <Badge status={inv.status} />
            </div>
          </div>
        ))}
        {!ready.length && <div style={{ fontSize: "12px", color: C.muted }}>No invoices currently ready.</div>}
      </Card>
      <Card>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Blocked upstream</div>
        <div style={{ fontSize: "11px", color: C.muted }}>These invoices have not reached PAYMENT_RECEIVED yet and cannot be processed.</div>
        {invoices.filter(i => i.status !== "PAYMENT_RECEIVED").map(inv => (
          <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}22`, fontSize: "12px" }}>
            <span style={{ fontFamily: "monospace" }}>{inv.invoiceNumber}</span>
            <Badge status={inv.status} />
          </div>
        ))}
      </Card>
    </div>
  );
}

export function RunPayrollPage() {
  const { invoices, payrolls, processPayroll, disputes } = useApp();
  const blockedByDispute = invoices.filter(i =>
    i.status === "PAYMENT_RECEIVED" &&
    !payrolls.find(p => p.invoiceId === i.id) &&
    disputes.some(d => d.status === "open" && d.invoiceId === i.id)
  );
  const ready = invoices.filter(i =>
    i.status === "PAYMENT_RECEIVED" &&
    !payrolls.find(p => p.invoiceId === i.id) &&
    !disputes.some(d => d.status === "open" && d.invoiceId === i.id)
  );

  const COLORS = {
    base: { bg: "#FFF2B4", border: "#E1C655", title: "#6D5400" },
    expenses: { bg: "#FADAF4", border: "#D38BC6", title: "#7A2C67" },
    fep: { bg: "#DDF4DE", border: "#8CCB8E", title: "#29652B" },
    leave: { bg: "#FEE2C9", border: "#E8A774", title: "#8A481E" },
    reserve: { bg: "#F3DDF7", border: "#B787CF", title: "#5E2F74" },
  };

  const [selected, setSelected] = useState(null);
  const [options, setOptions] = useState({
    payPeriod: "Weekly",
    payBasis: "Daily",
    quantityRate1: 5,
    rate1: 450,
    quantityRate2: 0,
    rate2: 450,
    agencyExpenses: 0,
    mileageMiles: 0,
    mileageRate: 0.45,
    workFromHome: "No",
    workFromHomeAnnualAllowance: 312,
    workplaceParking: 0,
    fixedExpensePotContribution: 0,
    fixedExpensePotBalanceBf: 0,
    fixedExpensePotReimbursed: 0,
    leaveType: "Non-Education",
    awrWeeks: 5.6,
    accrueOrAdvance: "Accrue",
    paidLeaveReserveBalanceBf: 0,
    paidLeaveTaken: 0,
    paidLeaveNmwAdjustment: 0,
    taxRate: 20,
    niRate: 8,
    employerNiRate: 13.8,
    umbrellaFee: 11.25,
    pensionRate: 5,
    studentLoan: 0,
    studentLoanType: "None",
    payAdvanceRepaid: 0,
    otherNetDeductions: 0,
    hasApprenticeshipLevy: false,
    apprenticeshipLevyRate: 0.5,
    sipp: 0,
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [payslipModal, setPayslipModal] = useState(null);

  const grossFromInvoice = selected ? invoices.find(i => i.id === selected)?.gross || 0 : 0;
  const periodMultiplier = options.payPeriod === "Monthly" ? 12 : 52;
  const grossFromRates = ((Number(options.quantityRate1) || 0) * (Number(options.rate1) || 0)) + ((Number(options.quantityRate2) || 0) * (Number(options.rate2) || 0));
  const gross = grossFromRates > 0 ? grossFromRates : grossFromInvoice;
  const awrWeeks = Math.max(0, Number(options.awrWeeks) || 0);
  const weeksWorked = Math.max(1, periodMultiplier - awrWeeks);
  const holidayRateFromAwr = Math.min(0.4, awrWeeks / weeksWorked);
  const holidayPayRate = options.accrueOrAdvance === "Advance" ? 0 : holidayRateFromAwr;
  const companyIncomeOverride = Math.max(0, gross + (Number(options.agencyExpenses) || 0));

  const calcOptions = {
    periodMultiplier,
    companyIncomeOverride,
    taxRate: options.taxRate / 100,
    niRate: options.niRate / 100,
    employerNiRate: options.employerNiRate / 100,
    umbrellaFee: options.umbrellaFee,
    pensionRate: options.pensionRate / 100,
    studentLoan: options.studentLoan,
    studentLoanType: options.studentLoanType,
    agencyExpenses: options.agencyExpenses,
    mileageMiles: options.mileageMiles,
    mileageRate: options.mileageRate,
    workFromHome: options.workFromHome,
    workFromHomeAnnualAllowance: options.workFromHomeAnnualAllowance,
    workplaceParking: options.workplaceParking,
    fixedExpensePotContribution: options.fixedExpensePotContribution,
    fixedExpensePotBalanceBf: options.fixedExpensePotBalanceBf,
    fixedExpensePotReimbursed: options.fixedExpensePotReimbursed,
    paidLeaveReserveBalanceBf: options.paidLeaveReserveBalanceBf,
    paidLeaveTaken: options.paidLeaveTaken,
    payAdvanceRepaid: options.payAdvanceRepaid,
    otherNetDeductions: options.otherNetDeductions,
    holidayPayRate,
    accruePaidLeave: options.accrueOrAdvance !== "Advance",
    hasApprenticeshipLevy: options.hasApprenticeshipLevy,
    apprenticeshipLevyRate: options.apprenticeshipLevyRate / 100,
    sipp: options.sipp,
  };

  const preview = selected
    ? computeGrossToNet(gross, calcOptions)
    : null;
  const tax = preview?.incomeTax ?? 0;
  const ni = preview?.employeeNI ?? 0;
  const eni = preview?.employerNI ?? 0;
  const pen = preview?.pension ?? 0;
  const net = preview?.net ?? 0;

  const run = async () => {
    if (!selected) { setError("Please select an invoice to process."); return; }
    setRunning(true);
    setError("");
    try {
      const res = await processPayroll(selected, {
        ...calcOptions,
        payPeriod: options.payPeriod,
        payBasis: options.payBasis,
        quantityRate1: options.quantityRate1,
        rate1: options.rate1,
        quantityRate2: options.quantityRate2,
        rate2: options.rate2,
        leaveType: options.leaveType,
        awrWeeks: options.awrWeeks,
        accrueOrAdvance: options.accrueOrAdvance,
        paidLeaveNmwAdjustment: options.paidLeaveNmwAdjustment,
      });
      if (res.success) { setResult(res.payroll); setError(""); }
      else setError(res.error);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <PageTitle title="Run Payroll" subtitle="Gross-to-net calculation and disbursement" />
      {blockedByDispute.length > 0 && (
        <div style={{ padding: "10px 14px", background: C.amber + "22", border: `1px solid ${C.amber}44`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: "#854F0B" }}>
          {blockedByDispute.length} invoice{blockedByDispute.length > 1 ? "s are" : " is"} blocked by open dispute and cannot be processed yet.
        </div>
      )}
      {error && <div style={{ padding: "10px 14px", background: C.red + "22", border: `1px solid ${C.red}44`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: C.red }}>{error}</div>}
      {result && (
        <div style={{ padding: "10px 14px", background: C.green + "22", border: `1px solid ${C.green}44`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: C.green }}>
          Payroll calculated and created - Net pay: {fmt(result.net)}. Submit HMRC first; contractor payment unlocks after HMRC submission.
          <Btn size="sm" variant="ghost" onClick={() => setPayslipModal(result)} style={{ marginLeft: "10px" }}>View Payslip</Btn>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <Card>
          <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "14px" }}>Payroll inputs (full NMW + DPSB)</div>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", color: C.muted, display: "block", marginBottom: "6px" }}>Select invoice</label>
            <select value={selected || ""} onChange={e => { setSelected(e.target.value); setResult(null); }} style={{ width: "100%", padding: "8px 10px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.text, fontSize: "13px", fontFamily: "inherit" }}>
              <option value="">- choose invoice -</option>
              {ready.map(inv => <option key={inv.id} value={inv.id}>{inv.invoiceNumber}  ·  {inv.contractorName}  ·  {fmt(inv.gross)}</option>)}
            </select>
            {!ready.length && <div style={{ fontSize: "11px", color: C.muted, marginTop: "6px" }}>No invoices ready - approve a timesheet and confirm payment first.</div>}
          </div>

          <div style={{ padding: "10px", borderRadius: "10px", border: `1px solid ${COLORS.base.border}`, background: COLORS.base.bg, marginBottom: "10px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: COLORS.base.title, marginBottom: "8px" }}>Core Pay (Yellow)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <FieldSelect label="Pay period" value={options.payPeriod} onChange={(v) => setOptions(o => ({ ...o, payPeriod: v }))} options={["Weekly", "Monthly"]} />
              <FieldSelect label="Pay basis" value={options.payBasis} onChange={(v) => setOptions(o => ({ ...o, payBasis: v }))} options={["Daily", "Hourly"]} />
              <FieldNumber label="Qty 1" value={options.quantityRate1} onChange={(v) => setOptions(o => ({ ...o, quantityRate1: v }))} />
              <FieldNumber label="Rate 1 (GBP)" value={options.rate1} onChange={(v) => setOptions(o => ({ ...o, rate1: v }))} />
              <FieldNumber label="Qty 2" value={options.quantityRate2} onChange={(v) => setOptions(o => ({ ...o, quantityRate2: v }))} />
              <FieldNumber label="Rate 2 (GBP)" value={options.rate2} onChange={(v) => setOptions(o => ({ ...o, rate2: v }))} />
            </div>
          </div>

          <div style={{ padding: "10px", borderRadius: "10px", border: `1px solid ${COLORS.expenses.border}`, background: COLORS.expenses.bg, marginBottom: "10px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: COLORS.expenses.title, marginBottom: "8px" }}>Agency Expenses (Pink)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <FieldNumber label="Agency expenses (GBP)" value={options.agencyExpenses} onChange={(v) => setOptions(o => ({ ...o, agencyExpenses: v }))} />
              <FieldNumber label="Mileage miles" value={options.mileageMiles} onChange={(v) => setOptions(o => ({ ...o, mileageMiles: v }))} />
              <FieldNumber label="Mileage rate (GBP)" value={options.mileageRate} onChange={(v) => setOptions(o => ({ ...o, mileageRate: v }))} step="0.01" />
              <FieldNumber label="Workplace parking (GBP)" value={options.workplaceParking} onChange={(v) => setOptions(o => ({ ...o, workplaceParking: v }))} />
              <FieldSelect label="Work from home" value={options.workFromHome} onChange={(v) => setOptions(o => ({ ...o, workFromHome: v }))} options={["No", "Yes"]} />
              <FieldNumber label="WFH annual allowance (GBP)" value={options.workFromHomeAnnualAllowance} onChange={(v) => setOptions(o => ({ ...o, workFromHomeAnnualAllowance: v }))} />
            </div>
          </div>

          <div style={{ padding: "10px", borderRadius: "10px", border: `1px solid ${COLORS.fep.border}`, background: COLORS.fep.bg, marginBottom: "10px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: COLORS.fep.title, marginBottom: "8px" }}>FEP Ledger (Green)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              <FieldNumber label="Contribution" value={options.fixedExpensePotContribution} onChange={(v) => setOptions(o => ({ ...o, fixedExpensePotContribution: v }))} />
              <FieldNumber label="Balance b/f" value={options.fixedExpensePotBalanceBf} onChange={(v) => setOptions(o => ({ ...o, fixedExpensePotBalanceBf: v }))} />
              <FieldNumber label="Reimbursed" value={options.fixedExpensePotReimbursed} onChange={(v) => setOptions(o => ({ ...o, fixedExpensePotReimbursed: v }))} />
            </div>
          </div>

          <div style={{ padding: "10px", borderRadius: "10px", border: `1px solid ${COLORS.leave.border}`, background: COLORS.leave.bg, marginBottom: "10px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: COLORS.leave.title, marginBottom: "8px" }}>Paid Leave Setup (Orange)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <FieldSelect label="Leave type" value={options.leaveType} onChange={(v) => setOptions(o => ({ ...o, leaveType: v }))} options={["Non-Education", "Education"]} />
              <FieldSelect label="Accrue or advance" value={options.accrueOrAdvance} onChange={(v) => setOptions(o => ({ ...o, accrueOrAdvance: v }))} options={["Accrue", "Advance"]} />
              <FieldNumber label="AWR weeks" value={options.awrWeeks} onChange={(v) => setOptions(o => ({ ...o, awrWeeks: v }))} step="0.1" />
              <FieldNumber label="NMW adjustment (GBP)" value={options.paidLeaveNmwAdjustment} onChange={(v) => setOptions(o => ({ ...o, paidLeaveNmwAdjustment: v }))} />
            </div>
          </div>

          <div style={{ padding: "10px", borderRadius: "10px", border: `1px solid ${COLORS.reserve.border}`, background: COLORS.reserve.bg, marginBottom: "10px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: COLORS.reserve.title, marginBottom: "8px" }}>Leave Reserve + Statutory (Mauve)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <FieldNumber label="Leave reserve b/f" value={options.paidLeaveReserveBalanceBf} onChange={(v) => setOptions(o => ({ ...o, paidLeaveReserveBalanceBf: v }))} />
              <FieldNumber label="Leave taken (GBP)" value={options.paidLeaveTaken} onChange={(v) => setOptions(o => ({ ...o, paidLeaveTaken: v }))} />
              <FieldNumber label="Tax rate (%)" value={options.taxRate} onChange={(v) => setOptions(o => ({ ...o, taxRate: v }))} />
              <FieldNumber label="Employee NI (%)" value={options.niRate} onChange={(v) => setOptions(o => ({ ...o, niRate: v }))} />
              <FieldNumber label="Employer NI (%)" value={options.employerNiRate} onChange={(v) => setOptions(o => ({ ...o, employerNiRate: v }))} />
              <FieldNumber label="Umbrella fee (GBP)" value={options.umbrellaFee} onChange={(v) => setOptions(o => ({ ...o, umbrellaFee: v }))} />
              <FieldNumber label="Pension (%)" value={options.pensionRate} onChange={(v) => setOptions(o => ({ ...o, pensionRate: v }))} />
              <FieldNumber label="Student loan (GBP)" value={options.studentLoan} onChange={(v) => setOptions(o => ({ ...o, studentLoan: v }))} />
              <FieldNumber label="Pay advance repaid" value={options.payAdvanceRepaid} onChange={(v) => setOptions(o => ({ ...o, payAdvanceRepaid: v }))} />
              <FieldNumber label="Other net deductions" value={options.otherNetDeductions} onChange={(v) => setOptions(o => ({ ...o, otherNetDeductions: v }))} />
              <FieldSelect label="Student loan type" value={options.studentLoanType} onChange={(v) => setOptions(o => ({ ...o, studentLoanType: v }))} options={["None", "Plan 1", "Plan 2", "Plan 4", "PGL"]} />
              <FieldSelect label="Apprenticeship levy" value={options.hasApprenticeshipLevy ? "Yes" : "No"} onChange={(v) => setOptions(o => ({ ...o, hasApprenticeshipLevy: v === "Yes" }))} options={["No", "Yes"]} />
              <FieldNumber label="Levy rate (%)" value={options.apprenticeshipLevyRate} onChange={(v) => setOptions(o => ({ ...o, apprenticeshipLevyRate: v }))} step="0.1" />
              <FieldNumber label="SIPP (GBP)" value={options.sipp} onChange={(v) => setOptions(o => ({ ...o, sipp: v }))} />
            </div>
          </div>

          <Btn onClick={run} disabled={!selected || running} size="lg">{running ? "Processing..." : "Calculate & Create Payroll"}</Btn>
        </Card>
        <Card>
          <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "14px" }}>Gross-to-net breakdown</div>
          {selected ? (
            <>
              <BRow label="Gross (from rates/invoice)" value={fmt(gross)} />
              <BRow label="Company income override" value={fmt(companyIncomeOverride)} />
              <BRow label="Expenses reimbursed" value={`-${fmt(preview?.expenseReimbursements ?? 0)}`} color={C.red} />
              <BRow label={`Income Tax (${options.taxRate}%)`} value={`-${fmt(tax)}`} color={C.red} />
              <BRow label={`Employee NI (${options.niRate}%)`} value={`-${fmt(ni)}`} color={C.red} />
              <BRow label={`Employer NI (${options.employerNiRate}%)`} value={`${fmt(eni)} (Ombrella cost)`} color={C.muted} />
              <BRow label="Ombrella fee" value={`-${fmt(options.umbrellaFee)}`} color={C.red} />
              <BRow label={`Pension (${options.pensionRate}%)`} value={`-${fmt(pen)}`} color={C.amber} />
              {options.studentLoan > 0 && <BRow label="Student loan" value={`-${fmt(options.studentLoan)}`} color={C.amber} />}
              {(preview?.payAdvanceRepaid || 0) > 0 && <BRow label="Pay advance repaid" value={`-${fmt(preview?.payAdvanceRepaid || 0)}`} color={C.amber} />}
              {(preview?.otherNetDeductions || 0) > 0 && <BRow label="Other net deductions" value={`-${fmt(preview?.otherNetDeductions || 0)}`} color={C.amber} />}
              <div style={{ height: "1px", background: C.border, margin: "8px 0" }} />
              <BRow label="Net pay" value={fmt(net)} color={C.green} bold />
              <div style={{ height: "1px", background: C.border, margin: "8px 0" }} />
              <BRow label="FEP balance c/f" value={fmt(preview?.fixedExpensePotBalanceCf ?? 0)} color={C.accent} />
              <BRow label="Paid leave reserve c/f" value={fmt(preview?.paidLeaveReserveBalanceCf ?? 0)} color={C.accent} />
              <BRow label="Holiday retention rate" value={`${((preview?.holidayRetentionRate || 0) * 100).toFixed(2)}%`} color={C.accent} />
              <BRow label="Tax + employee NI (FPS)" value={fmt(preview?.hmrcEmployeeTotal ?? tax + ni)} color={C.accent} />
              <div style={{ marginTop: "12px", background: C.green + "18", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: C.green, marginBottom: "3px" }}>ESTIMATED NET PAY</div>
                <div style={{ fontSize: "22px", fontWeight: "500", color: C.green }}>{fmt(net)}</div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: "12px", color: C.muted }}>Select an invoice to see the breakdown</div>
          )}
        </Card>
      </div>
      <Modal open={!!payslipModal} onClose={() => setPayslipModal(null)} title="Payslip">{payslipModal && <PayslipView payroll={payslipModal} />}</Modal>
    </div>
  );
}

function FieldNumber({ label, value, onChange, step = "1" }) {
  return (
    <div>
      <label style={{ fontSize: "11px", color: "#3C3C3C", display: "block", marginBottom: "3px" }}>{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", padding: "7px 8px", borderRadius: "8px", border: "1px solid #B9B9B9", background: "#FFFFFF", color: "#222", fontSize: "12px", fontFamily: "inherit" }}
      />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label style={{ fontSize: "11px", color: "#3C3C3C", display: "block", marginBottom: "3px" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "7px 8px", borderRadius: "8px", border: "1px solid #B9B9B9", background: "#FFFFFF", color: "#222", fontSize: "12px", fontFamily: "inherit" }}
      >
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

export function ContractorPaymentsPage() {
  const { payrolls, hmrcSubmissions, disburseSalary, retryDisbursement, loadBootstrap } = useApp();

  useEffect(() => {
    loadBootstrap();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh queue when opening this screen
  }, []);

  const hmrcByPayrollId = useMemo(() => {
    const m = {};
    (hmrcSubmissions || []).forEach((h) => {
      if (h.payrollId) m[h.payrollId] = h;
    });
    return m;
  }, [hmrcSubmissions]);

  /** Only these statuses can be disbursed (API requirement). */
  const readyToPay = useMemo(
    () => payrolls.filter((p) => p.status === "PAYOUT_PENDING" || p.status === "PAYOUT_RETRYING"),
    [payrolls]
  );

  /** HMRC submitted but payroll row not yet PAYOUT_PENDING - refresh from server. */
  const stuckAfterHmrc = useMemo(
    () =>
      payrolls.filter(
        (p) => p.status === "COMPLIANCE_PENDING" && hmrcByPayrollId[p.id]?.status === "submitted"
      ),
    [payrolls, hmrcByPayrollId]
  );

  const awaitingHmrcOnly = useMemo(() => {
    return payrolls.filter((p) => {
      if (p.status !== "COMPLIANCE_PENDING") return false;
      const h = hmrcByPayrollId[p.id];
      return !h || h.status !== "submitted";
    });
  }, [payrolls, hmrcByPayrollId]);

  const failed = payrolls.filter(p => p.status === "PAYOUT_FAILED");
  const paid = payrolls.filter(p => p.status === "PAYOUT_COMPLETED");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const doPay = async (id) => {
    setErr(""); setMsg("");
    const res = await disburseSalary(id);
    if (res.success) setMsg("Contractor payment completed.");
    else setErr(res.error || "Payment failed.");
  };

  return (
    <div>
      <PageTitle title="Contractor Payments" subtitle="Separate step: release salary after payroll calculation" />
      {msg && <div style={{ padding: "10px 14px", background: C.green + "22", border: `1px solid ${C.green}44`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: C.green }}>{msg}</div>}
      {err && <div style={{ padding: "10px 14px", background: C.red + "22", border: `1px solid ${C.red}44`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: C.red }}>{err}</div>}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <StatCard label="AWAITING HMRC" value={awaitingHmrcOnly.length} color={C.blue} />
        <StatCard label="READY TO PAY" value={readyToPay.length} color={C.amber} />
        <StatCard label="FAILED TRANSFERS" value={failed.length} color={C.red} />
        <StatCard label="SALARY PAID" value={paid.length} color={C.green} />
      </div>

      {awaitingHmrcOnly.length > 0 && (
        <Card style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "8px" }}>Blocked until HMRC submission</div>
          <div style={{ fontSize: "11px", color: C.muted }}>
            {awaitingHmrcOnly.length} payroll run{awaitingHmrcOnly.length > 1 ? "s are" : " is"} waiting for HMRC submission. Complete this in HMRC Submissions page first.
          </div>
        </Card>
      )}

      {stuckAfterHmrc.length > 0 && (
        <Card style={{ marginBottom: "14px", border: `1px solid ${C.amber}55` }}>
          <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "8px" }}>HMRC submitted - syncing payment queue</div>
          <div style={{ fontSize: "11px", color: C.muted, marginBottom: "10px" }}>
            {stuckAfterHmrc.length} run(s) show compliance pending while HMRC is already submitted. Click refresh to load the updated payroll status.
          </div>
          <Btn size="sm" variant="primary" onClick={() => loadBootstrap()}>Refresh status</Btn>
        </Card>
      )}

      <Card style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Ready to pay</div>
        {readyToPay.map(p => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}22` }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "500" }}>{p.contractorName}</div>
              <div style={{ fontSize: "11px", color: C.muted }}>{p.period}  ·  Net: {fmt(p.net)}</div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Badge status={p.status} />
              <Btn size="sm" variant="primary" onClick={() => doPay(p.id)}>Pay Contractor</Btn>
            </div>
          </div>
        ))}
        {!readyToPay.length && <div style={{ fontSize: "12px", color: C.muted }}>No pending contractor payments.</div>}
      </Card>

      <Card>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Failed transfers</div>
        {failed.map(p => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}22` }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "500" }}>{p.contractorName}</div>
              <div style={{ fontSize: "11px", color: C.red }}>{p.payoutFailureReason || "Transfer failed"}</div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Badge status={p.status} />
              <Btn size="sm" variant="success" onClick={() => retryDisbursement(p.id)}>Retry</Btn>
            </div>
          </div>
        ))}
        {!failed.length && <div style={{ fontSize: "12px", color: C.muted }}>No failed transfers.</div>}
      </Card>
    </div>
  );
}

export function PayrollRecordsPage() {
  const { payrolls } = useApp();
  const [payslipModal, setPayslipModal] = useState(null);
  const sorted = useMemo(
    () => [...payrolls].sort((a, b) => String(b.processedAt || "").localeCompare(String(a.processedAt || ""))),
    [payrolls]
  );
  return (
    <div>
      <PageTitle title="Payroll Records" subtitle="Complete history of all payroll runs" />
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Contractor", "Period", "Gross", "Tax", "NI", "Net Pay", "Status", "Payslip"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.muted, fontWeight: "500", fontSize: "10px", letterSpacing: "0.06em" }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "10px 10px" }}>{p.contractorName}</td>
                  <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>{p.period}</td>
                  <td style={{ padding: "10px 10px" }}>{fmt(p.gross)}</td>
                  <td style={{ padding: "10px 10px", color: C.red }}>-{fmt(p.incomeTax)}</td>
                  <td style={{ padding: "10px 10px", color: C.red }}>-{fmt(p.employeeNI)}</td>
                  <td style={{ padding: "10px 10px", color: C.green, fontWeight: "500" }}>{fmt(p.net)}</td>
                  <td style={{ padding: "10px 10px" }}><Badge status={p.status} /></td>
                  <td style={{ padding: "10px 10px" }}><Btn size="sm" variant="ghost" onClick={() => setPayslipModal(p)}>View</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!payrolls.length && <div style={{ padding: "20px", color: C.muted, fontSize: "12px" }}>No payroll records yet.</div>}
        </div>
      </Card>
      <Modal open={!!payslipModal} onClose={() => setPayslipModal(null)} title="Payslip">{payslipModal && <PayslipView payroll={payslipModal} />}</Modal>
    </div>
  );
}

export function AllPayslipsPage() {
  const { payrolls } = useApp();
  const [payslipModal, setPayslipModal] = useState(null);
  return (
    <div>
      <PageTitle title="All Payslips" subtitle="View and resend payslips for all contractors" />
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {payrolls.map(p => (
          <Card key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "500", marginBottom: "3px" }}>{p.contractorName} - {p.period}</div>
              <div style={{ fontSize: "11px", color: C.muted }}>Net: {fmt(p.net)}  ·  Tax code: {p.taxCode}  ·  Paid: {fmtDate(p.paymentDate)}</div>
              <div style={{ fontSize: "10px", color: C.muted, fontFamily: "monospace" }}>{p.payslipId}</div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Badge status={p.status} />
              <Btn size="sm" variant="ghost" onClick={() => setPayslipModal(p)}>View</Btn>
              <Btn size="sm" variant="primary" onClick={() => setResendNote("Email delivery is not configured in this demo. Export PDF from the payslip view instead.")}>Resend</Btn>
            </div>
          </Card>
        ))}
        {!payrolls.length && <Card><div style={{ color: C.muted, fontSize: "12px" }}>No payslips yet.</div></Card>}
      </div>
      <Modal open={!!payslipModal} onClose={() => setPayslipModal(null)} title="Payslip">{payslipModal && <PayslipView payroll={payslipModal} />}</Modal>
    </div>
  );
}

export function HmrcSubmissionsPage() {
  const { hmrcSubmissions, submitHmrc } = useApp();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const pending = hmrcSubmissions.filter(h => h.status === "pending");
  const submitted = hmrcSubmissions.filter(h => h.status === "submitted");
  const totalDue = pending.reduce((s, h) => s + h.total, 0);

  return (
    <div>
      <PageTitle title="HMRC Submissions" subtitle="Real-time RTI submissions and tax remittances" />
      {msg && <div style={{ padding: "10px 14px", background: C.green + "22", border: `1px solid ${C.green}44`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: C.green }}>{msg}</div>}
      {err && <div style={{ padding: "10px 14px", background: C.red + "22", border: `1px solid ${C.red}44`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: C.red }}>{err}</div>}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <StatCard label="RTI PENDING" value={pending.length} color={C.amber} />
        <StatCard label="RTI SUBMITTED" value={submitted.length} color={C.green} />
        <StatCard label="TAX & NI DUE" value={fmt(totalDue)} color={C.red} />
      </div>
      <Card style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Submission queue</div>
        {pending.map(h => (
          <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}22` }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "500" }}>{h.type} - {h.contractorName}  ·  {h.period}</div>
              <div style={{ fontSize: "11px", color: C.muted }}>Tax: {fmt(h.tax)} + NI: {fmt(h.ni)} = {fmt(h.total)}  ·  Due 19 Apr 2026</div>
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <Badge status="WORK_SUBMITTED" />
              <Btn size="sm" variant="primary" onClick={async () => {
                setErr(""); setMsg("");
                const res = await submitHmrc(h.id);
                if (res?.success) setMsg("HMRC submitted. Contractor payment is now unlocked.");
                else setErr(res?.error || "Unable to submit HMRC.");
              }}>Submit RTI</Btn>
            </div>
          </div>
        ))}
        {!pending.length && <div style={{ fontSize: "12px", color: C.muted }}>No pending submissions</div>}
      </Card>
      <Card>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Submitted this period</div>
        {submitted.map(h => (
          <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}22`, fontSize: "12px" }}>
            <div>
              <div style={{ fontWeight: "500" }}>{h.type} - {h.contractorName}  ·  {h.period}</div>
              <div style={{ fontSize: "11px", color: C.muted }}>{fmt(h.total)} submitted  ·  {fmtDate(h.submittedAt)}  ·  <span style={{ fontFamily: "monospace" }}>{h.ref}</span></div>
            </div>
            <Badge status="WORK_APPROVED" />
          </div>
        ))}
        {!submitted.length && <div style={{ fontSize: "12px", color: C.muted }}>No submissions yet</div>}
      </Card>
    </div>
  );
}


export function PayrollSettingsPage() {
  const { documentBrandingSettings, updateDocumentBrandingSettings } = useApp();
  const [saved, setSaved] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(documentBrandingSettings.legalEntityKey || "paysafe");
  const [clientKey, setClientKey] = useState("");

  const legalEntity = documentBrandingSettings.legalEntities?.[selectedEntity] || {};
  const selectedClientOverride = documentBrandingSettings.clientOverrides?.[clientKey] || {};

  const updateEntityField = (field, value) => {
    updateDocumentBrandingSettings((prev) => ({
      ...prev,
      legalEntityKey: selectedEntity,
      legalEntities: {
        ...(prev.legalEntities || {}),
        [selectedEntity]: {
          ...(prev.legalEntities?.[selectedEntity] || { key: selectedEntity }),
          [field]: value,
        },
      },
    }));
  };

  const updateClientOverride = (field, value) => {
    if (!clientKey) return;
    updateDocumentBrandingSettings((prev) => ({
      ...prev,
      clientOverrides: {
        ...(prev.clientOverrides || {}),
        [clientKey]: {
          ...(prev.clientOverrides?.[clientKey] || {}),
          [field]: value,
        },
      },
    }));
  };

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <PageTitle title="Payroll Settings" subtitle="Configure branding by legal entity and client" />
      {saved && <div style={{ padding: "10px 14px", background: C.green + "22", border: `1px solid ${C.green}44`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: C.green }}>Settings saved.</div>}
      <Card style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "14px" }}>Legal entity branding</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Input label="Legal entity key" value={selectedEntity} onChange={(e) => setSelectedEntity(e.target.value)} />
          <Input label="Company name" value={legalEntity.companyName || ""} onChange={(e) => updateEntityField("companyName", e.target.value)} />
          <Input label="Logo text" value={legalEntity.logoText || ""} onChange={(e) => updateEntityField("logoText", e.target.value)} />
          <Input label="Logo data URL (optional)" value={legalEntity.logoDataUrl || ""} onChange={(e) => updateEntityField("logoDataUrl", e.target.value)} />
          <Input label="Primary color (#RRGGBB)" value={legalEntity.primaryColor || ""} onChange={(e) => updateEntityField("primaryColor", e.target.value)} />
          <Input label="Accent color (#RRGGBB)" value={legalEntity.accentColor || ""} onChange={(e) => updateEntityField("accentColor", e.target.value)} />
          <Input label="Address line 1" value={legalEntity.addressLine1 || ""} onChange={(e) => updateEntityField("addressLine1", e.target.value)} />
          <Input label="Address line 2" value={legalEntity.addressLine2 || ""} onChange={(e) => updateEntityField("addressLine2", e.target.value)} />
          <Input label="Address line 3" value={legalEntity.addressLine3 || ""} onChange={(e) => updateEntityField("addressLine3", e.target.value)} />
          <Input label="Postcode" value={legalEntity.postcode || ""} onChange={(e) => updateEntityField("postcode", e.target.value)} />
          <Input label="Invoice title" value={legalEntity.invoiceTitle || ""} onChange={(e) => updateEntityField("invoiceTitle", e.target.value)} />
          <Input label="Payslip title" value={legalEntity.payslipTitle || ""} onChange={(e) => updateEntityField("payslipTitle", e.target.value)} />
          <Input label="Header tagline" value={legalEntity.headerTagline || ""} onChange={(e) => updateEntityField("headerTagline", e.target.value)} />
          <Input label="Footer text" value={legalEntity.footerText || ""} onChange={(e) => updateEntityField("footerText", e.target.value)} />
        </div>
        <Btn onClick={save}>Save branding</Btn>
      </Card>
      <Card>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "14px" }}>Client-level header/footer overrides</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Input label="Client key (e.g. techstaff_ltd)" value={clientKey} onChange={(e) => setClientKey(e.target.value)} />
          <Input label="Override company name" value={selectedClientOverride.companyName || ""} onChange={(e) => updateClientOverride("companyName", e.target.value)} />
          <Input label="Override primary color" value={selectedClientOverride.primaryColor || ""} onChange={(e) => updateClientOverride("primaryColor", e.target.value)} />
          <Input label="Override accent color" value={selectedClientOverride.accentColor || ""} onChange={(e) => updateClientOverride("accentColor", e.target.value)} />
          <Input label="Override invoice title" value={selectedClientOverride.invoiceTitle || ""} onChange={(e) => updateClientOverride("invoiceTitle", e.target.value)} />
          <Input label="Override payslip title" value={selectedClientOverride.payslipTitle || ""} onChange={(e) => updateClientOverride("payslipTitle", e.target.value)} />
          <Input label="Override footer text" value={selectedClientOverride.footerText || ""} onChange={(e) => updateClientOverride("footerText", e.target.value)} />
        </div>
        <Btn onClick={save}>Save client override</Btn>
      </Card>
    </div>
  );
}

export function ContractorPayrollDashboard() {
  const { user, payrolls, documentBrandingSettings } = useApp();
  const myPayrolls = payrolls.filter(p => p.contractorId === user.id);
  const [payslipModal, setPayslipModal] = useState(null);
  const totalNet = myPayrolls.reduce((s, p) => s + p.net, 0);
  const totalTax = myPayrolls.reduce((s, p) => s + p.incomeTax, 0);
  const latest = myPayrolls[0];

  return (
    <div>
      <PageTitle title="Payroll" subtitle="Your earnings and deductions summary" />
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <StatCard label="TOTAL NET EARNED" value={fmt(totalNet)} color={C.green} />
        <StatCard label="TOTAL TAX PAID" value={fmt(totalTax)} color={C.amber} />
        <StatCard label="PAYROLL RUNS" value={myPayrolls.length} />
        {latest && <StatCard label="LAST PAYMENT" value={fmtDate(latest.paymentDate)} color={C.accent} />}
      </div>
      {latest && (
        <Card style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Latest payroll breakdown</div>
          <BRow label="Gross Pay" value={fmt(latest.gross)} />
          <BRow label="Income Tax (PAYE)" value={`-${fmt(latest.incomeTax)}`} color={C.red} />
          <BRow label="Employee NI" value={`-${fmt(latest.employeeNI)}`} color={C.red} />
          <BRow label="Ombrella Fee" value={`-${fmt(latest.umbrellaFee)}`} color={C.red} />
          <BRow label="Pension" value={`-${fmt(latest.pension)}`} color={C.amber} />
          <div style={{ height: "1px", background: C.border, margin: "8px 0" }} />
          <BRow label="Net Pay" value={fmt(latest.net)} color={C.green} bold />
          {latest.payoutReference && <BRow label="Salary Ref" value={latest.payoutReference} color={C.blue} />}
          {latest.payoutFailureReason && <BRow label="Transfer Issue" value={latest.payoutFailureReason} color={C.red} />}
          <div style={{ marginTop: "10px" }}>
            <Btn size="sm" variant="ghost" onClick={() => setPayslipModal(latest)}>View Payslip</Btn>
          </div>
        </Card>
      )}
      <Card>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>All payroll records</div>
        <Table
          headers={["Period", "Gross", "Tax", "NI", "Net", "Status", "Payslip"]}
          rows={myPayrolls.map(p => [
            p.period, fmt(p.gross),
            <span style={{ color: C.red }}>-{fmt(p.incomeTax)}</span>,
            <span style={{ color: C.red }}>-{fmt(p.employeeNI)}</span>,
            <strong style={{ color: C.green }}>{fmt(p.net)}</strong>,
            <Badge status={p.status} />,
            <Btn size="sm" variant="ghost" onClick={() => setPayslipModal(p)}>View</Btn>,
          ])}
        />
        {!myPayrolls.length && <div style={{ padding: "16px 0", color: C.muted, fontSize: "12px" }}>No payroll records yet.</div>}
      </Card>
      <Modal open={!!payslipModal} onClose={() => setPayslipModal(null)} title="Payslip">{payslipModal && <PayslipView payroll={payslipModal} brandingSettings={documentBrandingSettings} />}</Modal>
    </div>
  );
}

export function ContractorPayslipsPage() {
  const { user, payrolls, documentBrandingSettings } = useApp();
  const myPayrolls = payrolls.filter(p => p.contractorId === user.id);
  const [payslipModal, setPayslipModal] = useState(null);
  return (
    <div>
      <PageTitle title="My Payslips" subtitle="View your payslips - retained for 7 years" />
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {myPayrolls.map(p => (
          <Card key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "500", marginBottom: "3px" }}>Payslip - {p.period}</div>
              <div style={{ fontSize: "11px", color: C.muted }}>Net: {fmt(p.net)}  ·  Tax code: {p.taxCode}  ·  Paid: {fmtDate(p.paymentDate)}</div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Badge status={p.status} />
              <Btn size="sm" variant="ghost" onClick={() => setPayslipModal(p)}>View Payslip</Btn>
            </div>
          </Card>
        ))}
        {!myPayrolls.length && <Card><div style={{ color: C.muted, fontSize: "12px" }}>No payslips available yet.</div></Card>}
      </div>
      <Modal open={!!payslipModal} onClose={() => setPayslipModal(null)} title="Payslip">{payslipModal && <PayslipView payroll={payslipModal} brandingSettings={documentBrandingSettings} />}</Modal>
    </div>
  );
}

export function ContractorProfilePage() {
  const { user, updateProfile, changePassword, sendMobileOtp, verifyMobileOtp, updateBankDetails, sendBankOtp, verifyBankOtp } = useApp();
  const [profile, setProfile] = useState({
    name: user?.name || "",
    personalEmail: user?.personalEmail || "",
    mobileNumber: user?.mobileNumber || "",
    addressLine: user?.addressLine || "",
    city: user?.city || "",
    postcode: user?.postcode || "",
    country: user?.country || "",
    dateOfBirth: user?.dateOfBirth || "",
    skills: user?.skills || "",
    resumeUrl: user?.resumeUrl || "",
    profilePictureUrl: user?.profilePictureUrl || "",
  });
  const [bank, setBank] = useState({
    bankAccountName: user?.bankAccountName || "",
    bankSortCode: user?.bankSortCode || "",
    bankAccountNumber: user?.bankAccountNumber || "",
  });
  const [mobileOtp, setMobileOtp] = useState("");
  const [bankOtp, setBankOtp] = useState("");
  const [mobileHint, setMobileHint] = useState("");
  const [bankHint, setBankHint] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const setField = (k, v) => setProfile((p) => ({ ...p, [k]: v }));

  const saveProfile = async () => {
    setMsg(""); setErr("");
    const res = await updateProfile(profile);
    if (res.success) setMsg("Profile details saved.");
    else setErr(res.error || "Unable to save profile.");
  };

  const saveBank = async () => {
    setMsg(""); setErr("");
    const res = await updateBankDetails(bank);
    if (res.success) setMsg("Bank details updated.");
    else setErr(res.error || "Unable to save bank details.");
  };

  const sendMobile = async () => {
    setMsg(""); setErr(""); setMobileHint("");
    const res = await sendMobileOtp();
    if (res.success) {
      setMsg(res.message || "Mobile OTP sent.");
      if (res.otp) setMobileHint(`Demo OTP: ${res.otp}`);
    } else {
      setErr(res.error || "Unable to send mobile OTP.");
    }
  };

  const verifyMobile = async () => {
    setMsg(""); setErr("");
    const res = await verifyMobileOtp(mobileOtp);
    if (res.success) {
      setMsg("Mobile number verified.");
      setMobileOtp("");
      setMobileHint("");
    } else {
      setErr(res.error || "Mobile OTP verification failed.");
    }
  };

  const sendBank = async () => {
    setMsg(""); setErr(""); setBankHint("");
    const res = await sendBankOtp();
    if (res.success) {
      setMsg(res.message || "Bank OTP sent.");
      if (res.otp) setBankHint(`Demo OTP: ${res.otp}`);
    } else {
      setErr(res.error || "Unable to send bank OTP.");
    }
  };

  const verifyBank = async () => {
    setMsg(""); setErr("");
    const res = await verifyBankOtp(bankOtp);
    if (res.success) {
      setMsg("Bank account verified.");
      setBankOtp("");
      setBankHint("");
    } else {
      setErr(res.error || "Bank OTP verification failed.");
    }
  };

  const doChangePassword = async () => {
    setMsg("");
    setErr("");
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setErr("Please fill all password fields.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErr("New password and confirm password do not match.");
      return;
    }
    const res = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
    if (res.success) {
      setMsg("Password changed successfully.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      setErr(res.error || "Unable to change password.");
    }
  };

  const viewRow = (label, value) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "7px 0", borderBottom: `1px solid ${C.border}22` }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ color: C.text, textAlign: "right", marginLeft: "12px" }}>{value || "-"}</span>
    </div>
  );

  const readFileAsDataUrl = (file, cb) => {
    const reader = new FileReader();
    reader.onload = () => cb(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ maxWidth: "860px" }}>
      <PageTitle title="My Profile" subtitle="Manage personal details, mobile verification, bank verification, resume, profile photo, and skills" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ fontSize: "12px", color: C.muted }}>
          Mode: <strong style={{ color: C.text }}>{editMode ? "Edit" : "View"}</strong>
        </div>
        <Btn size="sm" variant={editMode ? "ghost" : "primary"} onClick={() => setEditMode((v) => !v)}>
          {editMode ? "Switch to View" : "Switch to Edit"}
        </Btn>
      </div>
      {msg && <div style={{ padding: "10px 14px", background: C.green + "22", border: `1px solid ${C.green}44`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: C.green }}>{msg}</div>}
      {err && <div style={{ padding: "10px 14px", background: C.red + "22", border: `1px solid ${C.red}44`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: C.red }}>{err}</div>}

      <Card style={{ marginBottom: "14px" }}>
        <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: "86px", height: "86px", borderRadius: "999px", overflow: "hidden", border: `1px solid ${C.border}`, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {profile.profilePictureUrl ? (
              <img src={profile.profilePictureUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ color: C.muted, fontSize: "22px", fontWeight: "600" }}>{(profile.name || user?.name || "?").slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: "240px" }}>
            <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>{profile.name || user?.name || "Contractor"}</div>
            <div style={{ fontSize: "12px", color: C.muted, marginBottom: "3px" }}>{profile.personalEmail || user?.email || "No email"}</div>
            <div style={{ fontSize: "12px", color: C.muted }}>{profile.mobileNumber || "No mobile"}</div>
          </div>
        </div>
      </Card>

      <Card style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Personal Details</div>
        {editMode ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Input label="Full name" value={profile.name} onChange={(e) => setField("name", e.target.value)} />
              <Input label="Personal email" value={profile.personalEmail} onChange={(e) => setField("personalEmail", e.target.value)} />
              <Input label="Mobile number" value={profile.mobileNumber} onChange={(e) => setField("mobileNumber", e.target.value)} />
              <Input label="Date of birth" type="date" value={profile.dateOfBirth || ""} onChange={(e) => setField("dateOfBirth", e.target.value)} />
              <Input label="Address line" value={profile.addressLine} onChange={(e) => setField("addressLine", e.target.value)} />
              <Input label="City" value={profile.city} onChange={(e) => setField("city", e.target.value)} />
              <Input label="Postcode" value={profile.postcode} onChange={(e) => setField("postcode", e.target.value)} />
              <Input label="Country" value={profile.country} onChange={(e) => setField("country", e.target.value)} />
              <div style={{ gridColumn: "1 / -1" }}>
                <Input label="Skills (comma separated)" value={profile.skills} onChange={(e) => setField("skills", e.target.value)} />
              </div>
            </div>
            <Btn onClick={saveProfile}>Save Personal Details</Btn>
          </>
        ) : (
          <div>
            {viewRow("Full name", profile.name)}
            {viewRow("Personal email", profile.personalEmail)}
            {viewRow("Mobile number", profile.mobileNumber)}
            {viewRow("Date of birth", profile.dateOfBirth)}
            {viewRow("Address", [profile.addressLine, profile.city, profile.postcode, profile.country].filter(Boolean).join(", "))}
            {viewRow("Skills", profile.skills)}
          </div>
        )}
      </Card>

      <Card style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Profile Picture & Resume</div>
        {editMode ? (
          <>
            <Input label="Profile picture URL" value={profile.profilePictureUrl} onChange={(e) => setField("profilePictureUrl", e.target.value)} />
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", color: C.muted, marginBottom: "6px" }}>Upload profile picture</label>
              <input type="file" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) readFileAsDataUrl(f, (dataUrl) => setField("profilePictureUrl", dataUrl));
              }} />
            </div>
            <Input label="Resume URL" value={profile.resumeUrl} onChange={(e) => setField("resumeUrl", e.target.value)} />
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", color: C.muted, marginBottom: "6px" }}>Upload resume (PDF/DOC)</label>
              <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) readFileAsDataUrl(f, (dataUrl) => setField("resumeUrl", dataUrl));
              }} />
            </div>
            <Btn onClick={saveProfile}>Save Resume & Profile Picture</Btn>
          </>
        ) : (
          <div>
            {viewRow("Profile picture", profile.profilePictureUrl ? "Available" : "Not set")}
            {viewRow("Resume", profile.resumeUrl ? "Available" : "Not set")}
          </div>
        )}
      </Card>

      <Card style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Change Password</div>
        <Input
          type="password"
          label="Current password"
          value={passwordForm.currentPassword}
          onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
        />
        <Input
          type="password"
          label="New password"
          value={passwordForm.newPassword}
          onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
        />
        <Input
          type="password"
          label="Confirm new password"
          value={passwordForm.confirmPassword}
          onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
        />
        <Btn onClick={doChangePassword}>Update Password</Btn>
      </Card>

      <Card style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Mobile Verification</div>
        <div style={{ fontSize: "12px", color: C.muted, marginBottom: "10px" }}>
          Current status: <Badge status={user?.mobileVerified ? "WORK_APPROVED" : "WORK_SUBMITTED"} />
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
          <Btn size="sm" variant="primary" onClick={sendMobile}>Send Mobile OTP</Btn>
        </div>
        <Input label="Enter mobile OTP" value={mobileOtp} onChange={(e) => setMobileOtp(e.target.value)} />
        <Btn size="sm" variant="success" onClick={verifyMobile} disabled={!mobileOtp}>Verify Mobile OTP</Btn>
        {mobileHint && <div style={{ marginTop: "8px", fontSize: "12px", color: C.accent }}>{mobileHint}</div>}
      </Card>

      <Card>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Bank Details & Verification</div>
        <Input label="Account holder name" value={bank.bankAccountName} onChange={(e) => setBank((b) => ({ ...b, bankAccountName: e.target.value }))} />
        <Input label="Sort code" value={bank.bankSortCode} onChange={(e) => setBank((b) => ({ ...b, bankSortCode: e.target.value }))} />
        <Input label="Account number" value={bank.bankAccountNumber} onChange={(e) => setBank((b) => ({ ...b, bankAccountNumber: e.target.value }))} />
        <Btn onClick={saveBank}>Save Bank Details</Btn>
        <div style={{ marginTop: "14px", borderTop: `1px solid ${C.border}`, paddingTop: "14px" }}>
          <div style={{ fontSize: "12px", color: C.muted, marginBottom: "8px" }}>
            Bank verification: <Badge status={user?.bankVerified ? "PAYOUT_COMPLETED" : "PAYOUT_PENDING"} />
          </div>
          <Btn size="sm" variant="primary" onClick={sendBank}>Send Bank OTP</Btn>
          <Input label="Enter bank OTP" value={bankOtp} onChange={(e) => setBankOtp(e.target.value)} />
          <Btn size="sm" variant="success" onClick={verifyBank} disabled={!bankOtp}>Verify Bank OTP</Btn>
          {bankHint && <div style={{ marginTop: "8px", fontSize: "12px", color: C.accent }}>{bankHint}</div>}
        </div>
      </Card>
    </div>
  );
}

export function ContractorBankDetailsPage() {
  const { user, updateBankDetails, sendBankOtp, verifyBankOtp } = useApp();
  const [form, setForm] = useState({
    bankAccountName: user?.bankAccountName || "",
    bankSortCode: user?.bankSortCode || "",
    bankAccountNumber: user?.bankAccountNumber || "",
  });
  const [otp, setOtp] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const save = async () => {
    setErr(""); setMsg("");
    const res = await updateBankDetails(form);
    if (res.success) setMsg("Bank details saved. Verification set to pending.");
    else setErr(res.error || "Unable to save bank details.");
  };

  const sendOtp = async () => {
    setErr(""); setMsg(""); setOtpHint("");
    const res = await sendBankOtp();
    if (res.success) {
      setMsg(res.message || "OTP sent to linked mobile.");
      if (res.otp) setOtpHint(`Demo OTP: ${res.otp}`);
    } else {
      setErr(res.error || "Unable to send OTP.");
    }
  };

  const verifyOtp = async () => {
    setErr(""); setMsg("");
    const res = await verifyBankOtp(otp);
    if (res.success) {
      setMsg("OTP verified. Bank account is now verified for salary disbursement.");
      setOtp("");
      setOtpHint("");
    } else {
      setErr(res.error || "OTP verification failed.");
    }
  };

  return (
    <div style={{ maxWidth: "620px" }}>
      <PageTitle title="Bank Details" subtitle="Salary is paid only to verified contractor bank account" />
      {msg && <div style={{ padding: "10px 14px", background: C.green + "22", border: `1px solid ${C.green}44`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: C.green }}>{msg}</div>}
      {err && <div style={{ padding: "10px 14px", background: C.red + "22", border: `1px solid ${C.red}44`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: C.red }}>{err}</div>}
      <Card>
        <div style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: C.muted }}>Verification status</span>
          <Badge status={user?.bankVerified ? "PAYOUT_COMPLETED" : "PAYOUT_PENDING"} />
        </div>
        <Input label="Account holder name" value={form.bankAccountName} onChange={e => setForm(f => ({ ...f, bankAccountName: e.target.value }))} />
        <Input label="Sort code" placeholder="20-00-00" value={form.bankSortCode} onChange={e => setForm(f => ({ ...f, bankSortCode: e.target.value }))} />
        <Input label="Account number" value={form.bankAccountNumber} onChange={e => setForm(f => ({ ...f, bankAccountNumber: e.target.value }))} />
        <Btn onClick={save}>Save Bank Details</Btn>
        <div style={{ marginTop: "14px", borderTop: `1px solid ${C.border}`, paddingTop: "14px" }}>
          <div style={{ fontSize: "12px", color: C.muted, marginBottom: "8px" }}>
            Linked mobile: {user?.mobileNumber || "Not linked"}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "8px" }}>
            <Btn size="sm" variant="primary" onClick={sendOtp}>Share OTP to Mobile</Btn>
          </div>
          <Input label="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} />
          <Btn size="sm" variant="success" onClick={verifyOtp} disabled={!otp}>Verify OTP</Btn>
          {otpHint && <div style={{ marginTop: "8px", fontSize: "12px", color: C.accent }}>{otpHint}</div>}
        </div>
      </Card>
    </div>
  );
}