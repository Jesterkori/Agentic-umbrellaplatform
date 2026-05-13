import { useState } from "react";
import { useApp } from "../../context/AppContext";
import {
  C, Card, PageTitle, StatCard, Badge, Btn, Input, Modal, fmt, fmtDate,
} from "../../components/UI";

function Row({ label, value, color, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}22`, fontSize: 13 }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ color: color || C.text, fontWeight: bold ? 600 : 400 }}>{value}</span>
    </div>
  );
}

function Avatar({ initials, color = C.accent }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: color + "22", color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 600, flexShrink: 0,
    }}>{initials}</div>
  );
}

function TimelineItem({ dot, title, meta, last }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "8px 0" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: dot, flexShrink: 0, marginTop: 3 }} />
        {!last && <div style={{ width: 1.5, flex: 1, background: C.border, marginTop: 4, minHeight: 20 }} />}
      </div>
      <div style={{ paddingBottom: last ? 0 : 8 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{title}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{meta}</div>
      </div>
    </div>
  );
}

export function PayrollOperatorDashboard() {
  const { payrolls, invoices } = useApp();
  const ready = invoices.filter(i => i.status === "PAYMENT_RECEIVED" && !payrolls.find(p => p.invoiceId === i.id)).length;
  const totalNet = payrolls.reduce((s, p) => s + p.net, 0);
  const totalTax = payrolls.reduce((s, p) => s + p.incomeTax + p.employeeNI, 0);

  return (
    <div>
      <PageTitle title="Payroll Dashboard" subtitle="Real-time payroll processing overview" />
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="QUEUE (READY)" value={ready} color={C.amber} />
        <StatCard label="COMPLETED (MTD)" value={payrolls.length} color={C.green} />
        <StatCard label="NET DISBURSED (MTD)" value={fmt(totalNet)} color={C.accent} />
        <StatCard label="HMRC DUE" value={fmt(totalTax)} color={C.red} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Payroll queue</div>
          {invoices.filter(i => i.status === "PAYMENT_RECEIVED" && !payrolls.find(p => p.invoiceId === i.id)).map(inv => (
            <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}22` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar initials="AJ" color={C.blue} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>Alex Johnson</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{inv.invoiceNumber}  �  {fmt(inv.gross)}</div>
                </div>
              </div>
              <Badge status={inv.status} />
            </div>
          ))}
          {!invoices.filter(i => i.status === "PAYMENT_RECEIVED" && !payrolls.find(p => p.invoiceId === i.id)).length && (
            <div style={{ color: C.muted, fontSize: 13 }}>Queue is empty - all payments processed.</div>
          )}
        </Card>

        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>HMRC submission status</div>
          <Row label="RTI submissions pending" value={payrolls.length} color={C.amber} />
          <Row label="RTI submitted this month" value={payrolls.filter(p => p.status === "PAYROLL_COMPLETED").length} color={C.green} />
          <Row label="Tax & NI to remit" value={fmt(totalTax)} color={C.red} />
          <Row label="Next payment deadline" value="19 Apr 2026" />
        </Card>
      </div>

      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Recent payroll runs</div>
        {payrolls.map((p, i) => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < payrolls.length - 1 ? `1px solid ${C.border}22` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar initials={p.contractorName.split(" ").map(n => n[0]).join("")} color={C.blue} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{p.contractorName} - {p.period}</div>
                <div style={{ fontSize: 11, color: C.muted }}>Gross {fmt(p.gross)}  �  Net {fmt(p.net)}  �  Paid {fmtDate(p.paymentDate)}</div>
              </div>
            </div>
            <Badge status={p.status} />
          </div>
        ))}
        {!payrolls.length && <div style={{ color: C.muted, fontSize: 13 }}>No payroll runs yet.</div>}
      </Card>
    </div>
  );
}

export function PayrollQueuePage() {
  const { invoices, payrolls } = useApp();
  const ready = invoices.filter(i => i.status === "PAYMENT_RECEIVED" && !payrolls.find(p => p.invoiceId === i.id));
  const blocked = invoices.filter(i => i.status !== "PAYMENT_RECEIVED");

  return (
    <div>
      <PageTitle title="Payroll Queue" subtitle="Invoices with PAYMENT_RECEIVED status - ready to process" />
      <div style={{ padding: "10px 16px", background: C.amber + "22", border: `1px solid ${C.amber}44`, borderRadius: 8, marginBottom: 16, fontSize: 13, color: C.amber }}>
        Hard rule: payroll can only run when invoice status is PAYMENT_RECEIVED. All other invoices are blocked.
      </div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Ready to process ({ready.length})</div>
        {ready.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>No invoices ready - check for pending payments in the Invoice module.</div>}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          {ready.length > 0 && (
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Invoice", "Contractor", "Period", "Gross", "Payment Ref", "Received"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.muted, fontWeight: 500, fontSize: 11 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {ready.map(inv => (
              <tr key={inv.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                <td style={{ padding: "10px 10px", fontFamily: "monospace", fontSize: 11 }}>{inv.invoiceNumber}</td>
                <td style={{ padding: "10px 10px" }}>Alex Johnson</td>
                <td style={{ padding: "10px 10px" }}>{fmtDate(inv.weekStart)} - {fmtDate(inv.weekEnd)}</td>
                <td style={{ padding: "10px 10px", fontWeight: 500 }}>{fmt(inv.gross)}</td>
                <td style={{ padding: "10px 10px", fontFamily: "monospace", fontSize: 11 }}>{inv.paymentRef || "-"}</td>
                <td style={{ padding: "10px 10px", color: C.muted }}>{fmtDate(inv.paidAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Blocked upstream ({blocked.length})</div>
        <div style={{ fontSize: 12, color: C.muted }}>These invoices are not yet at PAYMENT_RECEIVED status and cannot be processed.</div>
        {blocked.map(inv => (
          <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}22`, fontSize: 12 }}>
            <span style={{ fontFamily: "monospace" }}>{inv.invoiceNumber}</span>
            <Badge status={inv.status} />
          </div>
        ))}
      </Card>
    </div>
  );
}

export function RunPayrollPage() {
  const { invoices, payrolls, processPayroll } = useApp();
  const [selected, setSelected] = useState(null);
  const [pensionPct, setPensionPct] = useState(3);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const ready = invoices.filter(i => i.status === "PAYMENT_RECEIVED" && !payrolls.find(p => p.invoiceId === i.id));

  const gross = selected ? selected.gross : 0;
  const tax = Math.round(gross * 0.20);
  const ni = Math.round(gross * 0.06);
  const eni = Math.round(gross * 0.07);
  const pension = Math.round(gross * pensionPct / 100);
  const net = gross - tax - ni - 250 - pension;

  const run = async () => {
    if (!selected) { setError("Please select an invoice to process."); return; }
    const res = await processPayroll(selected.id);
    if (res.success) setResult(res.payroll);
    else setError(res.error);
  };

  return (
    <div>
      <PageTitle title="Run Payroll" subtitle="Gross-to-net calculation and disbursement" />

      {error && (
        <div style={{ padding: "10px 16px", background: C.red + "22", border: `1px solid ${C.red}44`, borderRadius: 8, marginBottom: 16, fontSize: 13, color: C.red }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ padding: "10px 16px", background: C.green + "22", border: `1px solid ${C.green}44`, borderRadius: 8, marginBottom: 16, fontSize: 13, color: C.green }}>
          Payroll processed - net {fmt(result.net)} queued for disbursement. RTI submission filed with HMRC.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Select invoice to process</div>

          {ready.length === 0 && (
            <div style={{ padding: "12px", background: C.amber + "22", border: `1px solid ${C.amber}44`, borderRadius: 8, fontSize: 12, color: C.amber, marginBottom: 14 }}>
              No invoices ready. The agency must mark payment received first.
            </div>
          )}

          {ready.map(inv => (
            <div key={inv.id} onClick={() => setSelected(inv)} style={{
              padding: "12px", border: `1px solid ${selected?.id === inv.id ? C.accent : C.border}`,
              borderRadius: 8, cursor: "pointer", marginBottom: 8,
              background: selected?.id === inv.id ? C.accent + "0a" : C.surface,
            }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{inv.invoiceNumber} - Alex Johnson</div>
              <div style={{ fontSize: 11, color: C.muted }}>{fmtDate(inv.weekStart)} to {fmtDate(inv.weekEnd)}  �  {fmt(inv.gross)}</div>
            </div>
          ))}

          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6 }}>Tax code</label>
            <input defaultValue="1257L" style={{ width: "100%", padding: "8px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontFamily: "inherit", marginBottom: 12 }} />
            <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6 }}>Pension contribution (%)</label>
            <input type="number" min="0" max="20" value={pensionPct}
              onChange={e => setPensionPct(Number(e.target.value))}
              style={{ width: "100%", padding: "8px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontFamily: "inherit", marginBottom: 14 }} />
            <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6 }}>Ombrella fee (�)</label>
            <input type="number" defaultValue="250"
              style={{ width: "100%", padding: "8px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontFamily: "inherit", marginBottom: 14 }} />
          </div>
          <Btn onClick={run} size="lg" disabled={!selected}>Calculate &amp; Process</Btn>
        </Card>

        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Gross-to-net breakdown</div>
          {selected ? (
            <>
              <Row label="Gross pay" value={fmt(gross)} />
              <Row label="Income Tax (PAYE 20%)" value={`-${fmt(tax)}`} color={C.red} />
              <Row label="Employee NI (6%)" value={`-${fmt(ni)}`} color={C.red} />
              <Row label={`Employer NI (7%) - Ombrella cost`} value={fmt(eni)} color={C.muted} />
              <Row label="Ombrella fee" value={`-${fmt(250)}`} color={C.red} />
              <Row label={`Pension (${pensionPct}%)`} value={`-${fmt(pension)}`} color={C.amber} />
              <div style={{ height: 1, background: C.border, margin: "8px 0" }} />
              <Row label="Net pay" value={fmt(net)} color={C.green} bold />
              <div style={{ height: 1, background: C.border, margin: "8px 0" }} />
              <Row label="Tax + NI to HMRC" value={fmt(tax + ni)} color={C.accent} />
              <div style={{ marginTop: 14, padding: 14, background: C.green + "11", border: `1px solid ${C.green}44`, borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: C.green, marginBottom: 4 }}>NET PAY TO CONTRACTOR</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.green }}>{fmt(net)}</div>
              </div>
            </>
          ) : (
            <div style={{ color: C.muted, fontSize: 13 }}>Select an invoice on the left to see the breakdown.</div>
          )}
        </Card>
      </div>
    </div>
  );
}

export function PayrollRecordsPage() {
  const { payrolls } = useApp();
  const [payslipModal, setPayslipModal] = useState(null);

  return (
    <div>
      <PageTitle title="Payroll Records" subtitle="Complete history of all payroll runs" />
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Contractor", "Period", "Gross", "Tax", "NI", "Ombrella Fee", "Net Pay", "Status", "Payslip"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.muted, fontWeight: 500, fontSize: 11 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payrolls.map(p => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar initials={p.contractorName.split(" ").map(n => n[0]).join("")} color={C.blue} />
                      <span style={{ fontWeight: 500 }}>{p.contractorName}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 10px", color: C.muted }}>{p.period}</td>
                  <td style={{ padding: "10px 10px" }}>{fmt(p.gross)}</td>
                  <td style={{ padding: "10px 10px", color: C.red }}>-{fmt(p.incomeTax)}</td>
                  <td style={{ padding: "10px 10px", color: C.red }}>-{fmt(p.employeeNI)}</td>
                  <td style={{ padding: "10px 10px", color: C.red }}>-{fmt(p.umbrellaFee)}</td>
                  <td style={{ padding: "10px 10px", color: C.green, fontWeight: 600 }}>{fmt(p.net)}</td>
                  <td style={{ padding: "10px 10px" }}><Badge status={p.status} /></td>
                  <td style={{ padding: "10px 10px" }}>
                    <Btn size="sm" variant="ghost" onClick={() => setPayslipModal(p)}>View</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!payrolls.length && <div style={{ padding: 20, color: C.muted, fontSize: 13 }}>No payroll records yet.</div>}
        </div>
      </Card>

      <Modal open={!!payslipModal} onClose={() => setPayslipModal(null)} title="Payslip">
        {payslipModal && <PayslipContent p={payslipModal} />}
      </Modal>
    </div>
  );
}

export function AllPayslipsPage() {
  const { payrolls } = useApp();
  const [payslipModal, setPayslipModal] = useState(null);

  return (
    <div>
      <PageTitle title="All Payslips" subtitle="View and resend payslips for all contractors" />
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["Payslip ID", "Contractor", "Period", "Net Pay", "Tax Code", "Payment Date", "Actions"].map(h => (
                <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.muted, fontWeight: 500, fontSize: 11 }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payrolls.map(p => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                <td style={{ padding: "10px 10px", fontFamily: "monospace", fontSize: 11 }}>{p.payslipId}</td>
                <td style={{ padding: "10px 10px" }}>{p.contractorName}</td>
                <td style={{ padding: "10px 10px", color: C.muted }}>{p.period}</td>
                <td style={{ padding: "10px 10px", color: C.green, fontWeight: 600 }}>{fmt(p.net)}</td>
                <td style={{ padding: "10px 10px", fontFamily: "monospace" }}>{p.taxCode}</td>
                <td style={{ padding: "10px 10px", color: C.muted }}>{fmtDate(p.paymentDate)}</td>
                <td style={{ padding: "10px 10px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn size="sm" variant="ghost" onClick={() => setPayslipModal(p)}>View</Btn>
                    <Btn size="sm" variant="ghost">Resend</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!payrolls.length && <div style={{ padding: 20, color: C.muted, fontSize: 13 }}>No payslips generated yet.</div>}
      </Card>

      <Modal open={!!payslipModal} onClose={() => setPayslipModal(null)} title="Payslip">
        {payslipModal && <PayslipContent p={payslipModal} />}
      </Modal>
    </div>
  );
}

export function HMRCSubmissionsPage() {
  const { payrolls } = useApp();
  const totalDue = payrolls.reduce((s, p) => s + p.incomeTax + p.employeeNI, 0);
  const [submitted, setSubmitted] = useState(false);

  return (
    <div>
      <PageTitle title="HMRC Submissions" subtitle="Real-time RTI submissions and tax remittances" />
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="RTI PENDING" value={submitted ? 0 : payrolls.length} color={C.amber} />
        <StatCard label="RTI SUBMITTED (MTD)" value={submitted ? payrolls.length : 0} color={C.green} />
        <StatCard label="TAX & NI TO REMIT" value={fmt(totalDue)} color={C.red} />
        <StatCard label="NEXT DEADLINE" value="19 Apr" />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>RTI submission queue</div>
        {!submitted && payrolls.map(p => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}22` }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>FPS - {p.contractorName}  �  {p.period}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                Tax {fmt(p.incomeTax)} + NI {fmt(p.employeeNI)} = {fmt(p.incomeTax + p.employeeNI)}  �  Due 19 Apr 2026
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge status="WORK_SUBMITTED" />
              <Btn size="sm" variant="primary" onClick={() => setSubmitted(true)}>Submit RTI</Btn>
            </div>
          </div>
        ))}
        {(submitted || !payrolls.length) && (
          <div style={{ color: C.green, fontSize: 13 }}>All RTI submissions filed.</div>
        )}
      </Card>

      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Submission history</div>
        {submitted && payrolls.map((p, i) => (
          <TimelineItem
            key={p.id}
            dot={C.green}
            title={`FPS - ${p.contractorName}  �  ${p.period}`}
            meta={`${fmt(p.incomeTax + p.employeeNI)} submitted  �  ${fmtDate(new Date().toISOString())}  �  Ref: RTI-${Date.now()}-00${i + 1}`}
            last={i === payrolls.length - 1}
          />
        ))}
        {!submitted && !payrolls.length && (
          <div style={{ color: C.muted, fontSize: 13 }}>No submissions yet.</div>
        )}
      </Card>
    </div>
  );
}


export function PayrollSettingsPage() {
  const [saved, setSaved] = useState(false);

  return (
    <div style={{ maxWidth: 560 }}>
      <PageTitle title="Payroll Settings" subtitle="Configure Ombrella company payroll rules" />
      {saved && (
        <div style={{ padding: "10px 16px", background: C.green + "22", border: `1px solid ${C.green}44`, borderRadius: 8, marginBottom: 16, fontSize: 13, color: C.green }}>
          Settings saved successfully.
        </div>
      )}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Ombrella company details</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Company name" defaultValue="PaySafe Ombrella Ltd" />
          <Input label="Employer PAYE reference" defaultValue="120/AB12345" />
          <Input label="Standard Ombrella fee (�)" type="number" defaultValue="250" />
          <Input label="Default pension (%)" type="number" defaultValue="3" />
        </div>
        <Btn onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}>Save settings</Btn>
      </Card>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Tax year configuration</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Tax year" defaultValue="2024/25" />
          <Input label="Current payroll week" defaultValue="Week 53" />
          <Input label="Personal allowance (�)" type="number" defaultValue="12570" />
          <Input label="Basic rate threshold (�)" type="number" defaultValue="50270" />
          <Input label="NI primary threshold (�)" type="number" defaultValue="12570" />
          <Input label="NI upper earnings limit (�)" type="number" defaultValue="50270" />
        </div>
        <Btn onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}>Update thresholds</Btn>
      </Card>
    </div>
  );
}

export function PayslipContent({ p }) {
  return (
    <div style={{ fontSize: 13 }}>
      <div style={{ background: C.surface, borderRadius: 8, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.15em", color: C.accent, marginBottom: 4 }}>PAYSLIP</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{p.contractorName}</div>
        <div style={{ fontSize: 11, color: C.muted }}>Period: {p.period}</div>
        <div style={{ fontSize: 11, color: C.muted }}>Tax code: {p.taxCode}  �  Payment date: {fmtDate(p.paymentDate)}</div>
        <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>ID: {p.payslipId}</div>
      </div>
      <Row label="Gross pay" value={fmt(p.gross)} />
      <Row label="Income Tax (PAYE)" value={`-${fmt(p.incomeTax)}`} color={C.red} />
      <Row label="Employee NI" value={`-${fmt(p.employeeNI)}`} color={C.red} />
      <Row label="Ombrella fee" value={`-${fmt(p.umbrellaFee)}`} color={C.red} />
      <Row label="Pension" value={`-${fmt(p.pension)}`} color={C.amber} />
      {p.studentLoan > 0 && <Row label="Student loan" value={`-${fmt(p.studentLoan)}`} color={C.amber} />}
      <div style={{ height: 1, background: C.border, margin: "8px 0" }} />
      <Row label="Net pay" value={fmt(p.net)} color={C.green} bold />
      <div style={{ marginTop: 12, padding: 12, background: C.green + "11", borderRadius: 8, textAlign: "center" }}>
        <div style={{ fontSize: 10, color: C.green }}>NET PAY DISBURSED</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.green }}>{fmt(p.net)}</div>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: C.muted, textAlign: "center" }}>
        Employer NI (Ombrella cost, not deducted from pay): {fmt(p.employerNI)}
      </div>
    </div>
  );
}