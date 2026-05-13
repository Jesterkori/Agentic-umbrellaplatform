import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { PAYMENT_HISTORY, MONTHLY_SPEND } from "../../data/mockData";
import { C, Card, PageTitle, StatCard, Badge, Btn, Input, Textarea, Modal, Table, fmt, fmtDate } from "../../components/UI";
import { analyzeTimesheetForLeave, validateTimesheetAgainstLeave } from "../../utils/leaveUtils";
import { downloadInvoicePdf } from "../../utils/pdfExport";
import { computeGrossToNet } from "../../utils/payrollCalc";
import { animationStyles } from "../../utils/animations";
import OmbrellaInvoice from "../invoice/OmbrellaInvoice";

function Timeline({ items }) {
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: "12px", paddingBottom: "12px", position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: item.color, flexShrink: 0, marginTop: "3px" }} />
            {i < items.length - 1 && <div style={{ width: "1.5px", flex: 1, background: C.border, marginTop: "4px" }} />}
          </div>
          <div style={{ flex: 1, paddingBottom: "4px" }}>
            <div style={{ fontSize: "12px", fontWeight: "500", color: C.text }}>{item.title}</div>
            <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>{item.meta}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function contractorInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts[1]?.[0] || "";
  return String(a + b).toUpperCase() || "?";
}

export function AgencyDashboard() {
  const { timesheets, invoices, contractors } = useApp();
  const pending = timesheets.filter(t => t.status === "WORK_SUBMITTED").length;
  const invGenerated = invoices.filter(i => i.status === "INVOICE_GENERATED").length;
  const invApproved = invoices.filter(i => i.status === "INVOICE_APPROVED").length;
  const totalPaid = invoices.filter(i => i.status === "PAYMENT_RECEIVED").reduce((s, i) => s + i.gross, 0);

  return (
    <div>
      <PageTitle title="Agency Dashboard" subtitle="Live overview - TechStaff Ltd" />
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <StatCard label="PENDING APPROVALS" value={pending} color={C.amber} />
        <StatCard label="INVOICES OUTSTANDING" value={invGenerated + invApproved} color={C.blue} />
        <StatCard label="PAID THIS MONTH" value={fmt(totalPaid)} color={C.green} />
        <StatCard label="REGISTERED CONTRACTORS" value={contractors.length} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <Card>
          <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Pending timesheets</div>
          {timesheets.filter(t => t.status === "WORK_SUBMITTED").slice(0, 3).map(ts => (
            <div key={ts.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}22` }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: "500" }}>{ts.contractorName}</div>
                <div style={{ fontSize: "11px", color: C.muted }}>{fmtDate(ts.weekStart)} - {fmtDate(ts.weekEnd)}  ·  {ts.hours}h  ·  {fmt(ts.gross)}</div>
              </div>
              <Badge status={ts.status} />
            </div>
          ))}
          {!timesheets.filter(t => t.status === "WORK_SUBMITTED").length && <div style={{ fontSize: "12px", color: C.muted }}>No pending timesheets</div>}
        </Card>
        <Card>
          <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Invoice pipeline</div>
          {[
            { label: "Generated (awaiting approval)", value: invGenerated, color: C.blue },
            { label: "Approved (awaiting payment)", value: invApproved, color: C.amber },
            { label: "Received & reconciled", value: invoices.filter(i => i.status === "PAYMENT_RECEIVED").length, color: C.green },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}22`, fontSize: "12px" }}>
              <span style={{ color: C.muted }}>{row.label}</span>
              <span style={{ color: row.color, fontWeight: "500" }}>{row.value}</span>
            </div>
          ))}
        </Card>
      </div>
      <Card>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Recent activity</div>
        <Timeline items={[
          { color: C.green, title: "Invoice auto-generated - INV-2025-001", meta: "Alex Johnson  ·  10-14 Mar  ·  2 hours ago" },
          { color: C.amber, title: "Timesheet submitted - Priya Kumar", meta: "17-21 Mar  ·  40h  ·  Today 09:00" },
          { color: C.amber, title: "Timesheet submitted - Alex Johnson", meta: "17-21 Mar  ·  38h  ·  Today 08:30" },
          { color: C.red,   title: "Timesheet rejected - Maya Lee", meta: "Hours mismatch  ·  Yesterday 16:00" },
        ]} />
      </Card>
    </div>
  );
}

export function TimesheetApprovalsPage() {
  const { timesheets, approveTimesheet, rejectTimesheet, leaveRequests } = useApp();
  const [filter, setFilter] = useState("WORK_SUBMITTED");
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detailModal, setDetailModal] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Get approved leave requests for analysis
  const approvedLeaveRequests = leaveRequests.filter(lr => lr.status === "approved");

  const filtered = filter === "all" ? timesheets : timesheets.filter(t => t.status === filter);

  const doApprove = async (ts) => {
    const res = await approveTimesheet(ts.id, ts.version);
    if (res.success) {
      setSuccessMsg("Timesheet approved - invoice auto-generated.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } else {
      setSuccessMsg(res.error);
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const doReject = async () => {
    if (!rejectReason.trim()) return;
    await rejectTimesheet(rejectModal.id, rejectReason, rejectModal.version);
    setRejectModal(null);
    setRejectReason("");
  };

  return (
    <div>
      <PageTitle title="Timesheet Approvals" subtitle="Review, approve or reject contractor submissions" />
      {successMsg && <div style={{ padding: "10px 14px", background: C.green + "22", border: `1px solid ${C.green}44`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: C.green }}>{successMsg}</div>}
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
        {[["WORK_SUBMITTED", "Pending"], ["WORK_APPROVED", "Approved"], ["WORK_REJECTED", "Rejected"], ["all", "All"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} style={{ padding: "5px 12px", borderRadius: "20px", border: `1px solid ${filter === val ? C.accent : C.border}`, background: filter === val ? C.accent + "22" : "transparent", color: filter === val ? C.accent : C.muted, fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
        ))}
      </div>
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Contractor", "Period", "Hours", "Leave", "Gross", "Description", "Ver.", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.muted, fontWeight: "500", fontSize: "10px", letterSpacing: "0.06em" }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(ts => {
                const leaveAnalysis = analyzeTimesheetForLeave(ts, approvedLeaveRequests);
                return (
                <tr key={ts.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "10px 10px" }}>{ts.contractorName}</td>
                  <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>{fmtDate(ts.weekStart)} - {fmtDate(ts.weekEnd)}</td>
                  <td style={{ padding: "10px 10px" }}>{ts.hours}h</td>
                  <td style={{ padding: "10px 10px" }}>
                    {leaveAnalysis.hasLeave ? (
                      <div style={{ fontSize: "11px" }}>
                        <div style={{ color: C.muted, marginBottom: "2px" }}>
                          {leaveAnalysis.totalLeaveDays} day{leaveAnalysis.totalLeaveDays !== 1 ? 's' : ''}
                        </div>
                        {leaveAnalysis.totalPaidLeaveDays > 0 && (
                          <div style={{ color: C.green, fontSize: "10px" }}>
                            {leaveAnalysis.totalPaidLeaveDays} paid
                          </div>
                        )}
                        {leaveAnalysis.totalUnpaidLeaveDays > 0 && (
                          <div style={{ color: C.red, fontSize: "10px" }}>
                            {leaveAnalysis.totalUnpaidLeaveDays} unpaid
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: C.muted, fontSize: "11px" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 10px" }}>{fmt(ts.gross)}</td>
                  <td style={{ padding: "10px 10px", color: C.muted, maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ts.description}</td>
                  <td style={{ padding: "10px 10px" }}>v{ts.version}</td>
                  <td style={{ padding: "10px 10px" }}><Badge status={ts.status} /></td>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <Btn size="sm" variant="ghost" onClick={() => setDetailModal(ts)}>View</Btn>
                      {ts.status === "WORK_SUBMITTED" && <>
                        <Btn size="sm" variant="success" onClick={() => doApprove(ts)}>Approve</Btn>
                        <Btn size="sm" variant="danger" onClick={() => { setRejectModal(ts); setRejectReason(""); }}>Reject</Btn>
                      </>}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && <div style={{ padding: "20px", color: C.muted, fontSize: "12px" }}>No timesheets in this state.</div>}
        </div>
      </Card>

      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title="Timesheet Details">
        {detailModal && (
          <div style={{ fontSize: "13px" }}>
            {[
              ["Contractor", detailModal.contractorName],
              ["Period", `${fmtDate(detailModal.weekStart)} - ${fmtDate(detailModal.weekEnd)}`],
              ["Hours", `${detailModal.hours}h`],
              ["Rate", fmt(detailModal.rate)],
              ["Gross", fmt(detailModal.gross)],
              ["Version", `v${detailModal.version}`],
              ["Submitted", fmtDate(detailModal.submittedAt)],
              ...(detailModal.approvedBy ? [["Approved by", detailModal.approvedBy]] : []),
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}22` }}>
                <span style={{ color: C.muted }}>{l}</span><span>{v}</span>
              </div>
            ))}
            {detailModal.rejectionReason && <div style={{ marginTop: "10px", padding: "10px", background: C.red + "11", borderRadius: "6px", color: C.red, fontSize: "12px" }}><strong>Rejection reason:</strong> {detailModal.rejectionReason}</div>}
            
            {/* Leave Analysis */}
            {(() => {
              const leaveAnalysis = analyzeTimesheetForLeave(detailModal, approvedLeaveRequests);
              if (leaveAnalysis.hasLeave) {
                return (
                  <div style={{ marginTop: "10px", padding: "10px", background: C.blue + "11", borderRadius: "6px", border: `1px solid ${C.blue}33` }}>
                    <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "8px", color: C.blue }}>🏖️ Leave Analysis</div>
                    <div style={{ fontSize: "11px", lineHeight: "1.4" }}>
                      <div style={{ marginBottom: "4px" }}><strong>Total Leave:</strong> {leaveAnalysis.totalLeaveDays} day{leaveAnalysis.totalLeaveDays !== 1 ? 's' : ''}</div>
                      {leaveAnalysis.totalPaidLeaveDays > 0 && (
                        <div style={{ marginBottom: "4px", color: C.green }}><strong>Paid Leave:</strong> {leaveAnalysis.totalPaidLeaveDays} day{leaveAnalysis.totalPaidLeaveDays !== 1 ? 's' : ''} ({fmt(leaveAnalysis.totalPaidLeaveDays * detailModal.rate)})</div>
                      )}
                      {leaveAnalysis.totalUnpaidLeaveDays > 0 && (
                        <div style={{ marginBottom: "4px", color: C.red }}><strong>Unpaid Leave:</strong> {leaveAnalysis.totalUnpaidLeaveDays} day{leaveAnalysis.totalUnpaidLeaveDays !== 1 ? 's' : ''}</div>
                      )}
                      <div style={{ marginBottom: "4px" }}><strong>Expected Working Days:</strong> {leaveAnalysis.expectedWorkingDays}</div>
                      <div style={{ marginBottom: "4px" }}><strong>Actual Worked Days:</strong> {leaveAnalysis.actualWorkedDays.toFixed(1)}</div>
                      
                      {leaveAnalysis.leaveDetails.length > 0 && (
                        <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: `1px solid ${C.border}33` }}>
                          <div style={{ fontWeight: "500", marginBottom: "3px" }}>Leave Breakdown:</div>
                          {leaveAnalysis.leaveDetails.map((leave, idx) => (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: leave.color }} />
                              <span>{leave.leaveTypeName}: {leave.days} day{leave.days !== 1 ? 's' : ''} ({leave.period})</span>
                              <span style={{ color: leave.isPaid ? C.green : C.red, fontSize: "10px" }}>
                                {leave.isPaid ? "Paid" : "Unpaid"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            <div style={{ marginTop: "10px", padding: "10px", background: C.surface, borderRadius: "6px", fontSize: "12px", color: C.muted }}>{detailModal.description}</div>
            {detailModal.versions.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <div style={{ fontSize: "11px", color: C.muted, marginBottom: "6px" }}>VERSION HISTORY</div>
                {detailModal.versions.map(v => <div key={v.version} style={{ fontSize: "11px", color: C.muted }}>v{v.version}: {v.hours}h - {fmtDate(v.submittedAt)}</div>)}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Timesheet">
        {rejectModal && (
          <div>
            <div style={{ padding: "8px 12px", background: C.amber + "22", border: `1px solid ${C.amber}44`, borderRadius: "6px", fontSize: "12px", color: "#854F0B", marginBottom: "12px" }}>A rejection reason is mandatory and sent to the contractor immediately.</div>
            <div style={{ fontSize: "12px", color: C.muted, marginBottom: "12px" }}>Rejecting: {rejectModal.contractorName} - {fmtDate(rejectModal.weekStart)} to {fmtDate(rejectModal.weekEnd)}</div>
            <Textarea label="Rejection reason" placeholder="Describe the issue clearly..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            <div style={{ display: "flex", gap: "8px" }}>
              <Btn variant="danger" onClick={doReject} disabled={!rejectReason.trim()}>Confirm Rejection</Btn>
              <Btn variant="ghost" onClick={() => setRejectModal(null)}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function ContractorsPage() {
  const { contractors, loadAgencyContractors } = useApp();
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await loadAgencyContractors();
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  // Refresh when opening the page; list also loads after agency login.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageTitle
        title="Contractors"
        subtitle="Same directory fields as the contractor Profile (personal, mobile & bank verification status, skills, resume, photo). Open Details for the full record."
      />
                 <div style={{ display: "flex", gap: "8px", marginBottom: "14px", alignItems: "center" }}>
                   <Btn size="sm" variant="ghost" onClick={() => loadAgencyContractors()}>Refresh list</Btn>
                   {loading && <span style={{ fontSize: "12px", color: C.muted }}>Loading...</span>}
                 </div>
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Name", "Mobile", "Ombrella", "Rate/day", "Tax code", "Login email", "Verifications", "Actions"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.muted, fontWeight: "500", fontSize: "10px", letterSpacing: "0.06em" }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contractors.map(c => {
                const ini = contractorInitials(c.name);
                return (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                    <td style={{ padding: "10px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {c.profilePictureUrl ? (
                          <img alt="" src={c.profilePictureUrl} style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: C.accent + "44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "500", color: C.text, flexShrink: 0 }}>{ini}</div>
                        )}
                        <span style={{ fontWeight: "500" }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 10px", color: C.muted }}>{c.mobileNumber || "-"}</td>
                    <td style={{ padding: "10px 10px", color: C.muted }}>{c.umbrella || "-"}</td>
                    <td style={{ padding: "10px 10px" }}>{c.rate != null ? fmt(c.rate) : "-"}</td>
                    <td style={{ padding: "10px 10px", fontFamily: "monospace", fontSize: "11px" }}>{c.taxCode || "-"}</td>
                    <td style={{ padding: "10px 10px", color: C.muted }}>{c.email}</td>
                    <td style={{ padding: "10px 10px" }}>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        <Badge status={c.mobileVerified ? "WORK_APPROVED" : "WORK_SUBMITTED"} />
                        <span style={{ fontSize: "10px", color: C.muted }}>{c.mobileVerified ? "Mobile" : "Mobile?"}</span>
                        <Badge status={c.bankVerified ? "PAYOUT_COMPLETED" : "PAYOUT_PENDING"} />
                        <span style={{ fontSize: "10px", color: C.muted }}>{c.bankVerified ? "Bank" : "Bank?"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <Btn size="sm" variant="ghost" onClick={() => setSelected(c)}>Details</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && !contractors.length && (
          <div style={{ padding: "20px", color: C.muted, fontSize: "13px" }}>
            No contractors are assigned to your agency yet, or the directory is empty.
          </div>
        )}
      </Card>
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Contractor details">
        {selected && (
          <div style={{ fontSize: "13px", maxHeight: "70vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "16px" }}>
              {selected.profilePictureUrl ? (
                <img alt="" src={selected.profilePictureUrl} style={{ width: "56px", height: "56px", borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: C.accent + "44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "500" }}>
                  {contractorInitials(selected.name)}
                </div>
              )}
              <div>
                <div style={{ fontSize: "15px", fontWeight: "500" }}>{selected.name}</div>
                <div style={{ fontSize: "12px", color: C.muted }}>Platform login: {selected.email}</div>
                <div style={{ fontSize: "12px", color: C.muted }}>Personal email: {selected.personalEmail || "-"}</div>
              </div>
            </div>
            {[
              ["Agency", selected.agency || "-"],
              ["Ombrella", selected.umbrella || "-"],
              ["Day rate", selected.rate != null ? fmt(selected.rate) : "-"],
              ["Tax code", selected.taxCode || "-"],
              ["Mobile", selected.mobileNumber || "-"],
              ["Mobile verified", selected.mobileVerified ? "Yes" : "No"],
              ["Bank verified (Ombrella pay)", selected.bankVerified ? "Yes" : "No"],
              ["Bank account name", selected.bankAccountName || "-"],
              ["Sort code", selected.bankSortCode || "-"],
              ["Account number", selected.bankAccountNumber || "-"],
              ["Address line", selected.addressLine || "-"],
              ["City", selected.city || "-"],
              ["Postcode", selected.postcode || "-"],
              ["Country", selected.country || "-"],
              ["Date of birth", selected.dateOfBirth ? fmtDate(selected.dateOfBirth) : "-"],
              ["Joined", selected.createdAt ? fmtDate(selected.createdAt) : "-"],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "7px 0", borderBottom: `1px solid ${C.border}22` }}>
                <span style={{ color: C.muted }}>{l}</span>
                <span style={{ textAlign: "right" }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: "12px" }}>
              <div style={{ fontSize: "11px", color: C.muted, marginBottom: "6px" }}>SKILLS</div>
              <div style={{ padding: "10px", background: C.bg, borderRadius: "8px", border: `1px solid ${C.border}` }}>
                {selected.skills || "-"}
              </div>
            </div>
            {selected.resumeUrl && (
              <div style={{ marginTop: "12px" }}>
                <div style={{ fontSize: "11px", color: C.muted, marginBottom: "6px" }}>RESUME</div>
                {selected.resumeUrl.startsWith("http") ? (
                  <a href={selected.resumeUrl} target="_blank" rel="noreferrer" style={{ color: C.accent, fontSize: "13px" }}>Open resume link</a>
                ) : (
                  <a href={selected.resumeUrl} download={`resume-${selected.id}.pdf`} style={{ color: C.accent, fontSize: "13px" }}>Download uploaded file</a>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export function AgencyInvoicesPage() {
  const { invoices, approveInvoice, markPaymentReceived, documentBrandingSettings } = useApp();
  const [selected, setSelected] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [confirmType, setConfirmType] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [paymentForm, setPaymentForm] = useState({ amount: "", reference: "" });
  const [submitting, setSubmitting] = useState(false);

  const doConfirm = async () => {
    setSubmitting(true);
    if (confirmType === "approve") {
      const res = await approveInvoice(confirmModal.id);
      setSuccessMsg(res.success ? "Invoice approved - payment now due." : res.error);
    }
    if (confirmType === "payment") {
      const res = await markPaymentReceived(confirmModal.id, {
        amount: paymentForm.amount ? Number(paymentForm.amount) : undefined,
        reference: paymentForm.reference || undefined,
      });
      setSuccessMsg(res.success ? "Payment confirmed - payroll is now unlocked." : res.error);
    }
    setConfirmModal(null);
    setPaymentForm({ amount: "", reference: "" });
    setSubmitting(false);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  return (
    <div>
      <PageTitle title="Invoices" subtitle="Approve invoices and confirm payments" />
      {successMsg && (
        <div style={{
          padding: "10px 14px",
          background: (successMsg.toLowerCase().includes("error") || successMsg.toLowerCase().includes("mismatch")) ? C.red + "22" : C.green + "22",
          border: `1px solid ${(successMsg.toLowerCase().includes("error") || successMsg.toLowerCase().includes("mismatch")) ? C.red : C.green}44`,
          borderRadius: "8px",
          marginBottom: "14px",
          fontSize: "13px",
          color: (successMsg.toLowerCase().includes("error") || successMsg.toLowerCase().includes("mismatch")) ? C.red : C.green,
        }}>{successMsg}</div>
      )}
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Invoice #", "Contractor", "Period", "Gross", "Status", "Generated", "Actions"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.muted, fontWeight: "500", fontSize: "10px", letterSpacing: "0.06em" }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "10px 10px", fontFamily: "monospace", fontSize: "11px" }}>{inv.invoiceNumber}</td>
                  <td style={{ padding: "10px 10px" }}>{inv.contractorName || "-"}</td>
                  <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>{fmtDate(inv.weekStart)} - {fmtDate(inv.weekEnd)}</td>
                  <td style={{ padding: "10px 10px" }}>{fmt(inv.gross)}</td>
                  <td style={{ padding: "10px 10px" }}><Badge status={inv.status} /></td>
                  <td style={{ padding: "10px 10px" }}>{fmtDate(inv.generatedAt)}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <Btn size="sm" variant="ghost" onClick={() => setSelected(inv)}>Details</Btn>
                      {inv.status === "INVOICE_GENERATED" && <Btn size="sm" variant="success" onClick={() => { setConfirmModal(inv); setConfirmType("approve"); }}>Approve</Btn>}
                      {inv.status === "INVOICE_APPROVED" && <Btn size="sm" variant="primary" onClick={() => { setConfirmModal(inv); setConfirmType("payment"); setPaymentForm({ amount: inv.gross, reference: "" }); }}>Mark Paid</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Invoice Details" width="800px" maxWidth="95vw">
        {selected && (
          <div>
            <div style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Badge status={selected.status} />
              <Btn size="sm" variant="ghost" onClick={() => downloadInvoicePdf(selected, documentBrandingSettings)}>Download PDF</Btn>
            </div>
            <OmbrellaInvoice invoice={selected} />
          </div>
        )}
      </Modal>

      <Modal open={!!confirmModal} onClose={() => setConfirmModal(null)} title={confirmType === "approve" ? "Approve Invoice" : "Confirm Payment Received"}>
        {confirmModal && (
          <div>
            <div style={{ fontSize: "13px", color: C.muted, marginBottom: "14px" }}>
              {confirmType === "approve" ? `Approve ${confirmModal.invoiceNumber} for ${fmt(confirmModal.gross)}? This cannot be undone.` : `Confirm payment of ${fmt(confirmModal.gross)} received for ${confirmModal.invoiceNumber}?`}
            </div>
            {confirmType === "payment" && (
              <div style={{ marginBottom: "14px" }}>
                <Input
                  label="Amount received"
                  type="number"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                />
                <Input
                  label="Payment reference (optional)"
                  value={paymentForm.reference}
                  onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))}
                />
              </div>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <Btn variant={confirmType === "approve" ? "success" : "primary"} onClick={doConfirm} disabled={submitting}>{submitting ? "Processing..." : (confirmType === "approve" ? "Approve Invoice" : "Confirm Payment")}</Btn>
              <Btn variant="ghost" onClick={() => setConfirmModal(null)}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function PaymentHistoryPage() {
  const { invoices } = useApp();
  const paid = invoices.filter(i => i.status === "PAYMENT_RECEIVED");
  const allHistory = [
    ...paid.map(i => ({ ref: i.paymentRef, invoiceNumber: i.invoiceNumber, contractorName: i.contractorName, amount: i.gross, date: i.paidAt, status: "Reconciled" })),
    ...PAYMENT_HISTORY,
  ];
  const totalMTD = allHistory.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div>
      <PageTitle title="Payment History" subtitle="All outgoing payments with reconciliation status" />
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <StatCard label="PAID THIS MONTH" value={fmt(totalMTD)} color={C.green} />
        <StatCard label="OUTSTANDING" value={fmt(37100)} color={C.amber} />
        <StatCard label="TOTAL YTD" value={fmt(210400)} />
      </div>
      <Card>
        <Table
          headers={["Payment Ref", "Invoice", "Contractor", "Amount", "Date", "Status"]}
          rows={allHistory.map(p => [
            <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{p.ref || "-"}</span>,
            <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{p.invoiceNumber}</span>,
            p.contractorName,
            fmt(p.amount),
            fmtDate(p.date),
            <Badge status="WORK_APPROVED" />,
          ])}
        />
      </Card>
    </div>
  );
}

export function DisputesPage() {
  const { disputes, resolveDispute } = useApp();
  const [resolveModal, setResolveModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  return (
    <div>
      <PageTitle title="Disputes" subtitle="Exception queue - payment mismatches and timesheet disputes" />
      {disputes.filter(d => d.status === "open").length > 0 && (
        <div style={{ padding: "10px 14px", background: C.amber + "22", border: `1px solid ${C.amber}44`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: "#854F0B" }}>
          {disputes.filter(d => d.status === "open").length} active dispute{disputes.filter(d => d.status === "open").length > 1 ? "s" : ""} require attention
        </div>
      )}
      <Card style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Active disputes</div>
        {disputes.filter(d => d.status === "open").map(d => (
          <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${C.border}22` }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "500" }}>{d.type} - {d.invoiceNumber}</div>
              <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>{d.contractorName}{d.shortfall ? `  ·  Shortfall: ${fmt(d.shortfall)}` : ""}</div>
              <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>{d.notes}</div>
              <div style={{ marginTop: "6px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "3px", fontSize: "10px", background: C.surface, color: C.muted, border: `1px solid ${C.border}` }}>{d.type}</span>
                <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "3px", fontSize: "10px", background: C.surface, color: C.muted, border: `1px solid ${C.border}` }}>Raised {fmtDate(d.raisedAt)}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
              <Btn size="sm" variant="primary" onClick={() => setResolveModal(d)}>Resolve</Btn>
              <Btn size="sm" variant="ghost" onClick={() => setDetailModal(d)}>Details</Btn>
            </div>
          </div>
        ))}
        {!disputes.filter(d => d.status === "open").length && <div style={{ fontSize: "12px", color: C.muted }}>No active disputes</div>}
      </Card>
      <Card>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Resolved disputes</div>
        {disputes.filter(d => d.status === "resolved").map(d => (
          <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}22` }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "500" }}>{d.type} - {d.contractorName}  ·  {d.invoiceNumber}</div>
              <div style={{ fontSize: "11px", color: C.muted }}>{d.notes}</div>
            </div>
            <Badge status="WORK_APPROVED" />
          </div>
        ))}
      </Card>
      <Modal open={!!resolveModal} onClose={() => setResolveModal(null)} title="Resolve Dispute">
        {resolveModal && (
          <div>
            <div style={{ fontSize: "13px", color: C.muted, marginBottom: "14px" }}>Mark this dispute as resolved? This will clear it from the active queue.</div>
            <div style={{ fontSize: "13px", marginBottom: "14px" }}>{resolveModal.notes}</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <Btn variant="success" onClick={() => { resolveDispute(resolveModal.id); setResolveModal(null); }}>Mark Resolved</Btn>
              <Btn variant="ghost" onClick={() => setResolveModal(null)}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title="Dispute Details">
        {detailModal && (
          <div style={{ fontSize: "13px" }}>
            <div style={{ marginBottom: "10px", fontWeight: "500" }}>{detailModal.type} - {detailModal.invoiceNumber}</div>
            <div style={{ color: C.muted, marginBottom: "8px" }}>Contractor: {detailModal.contractorName}</div>
            {detailModal.expected != null && <div style={{ marginBottom: "6px" }}>Expected: {fmt(detailModal.expected)}</div>}
            {detailModal.received != null && <div style={{ marginBottom: "6px" }}>Received: {fmt(detailModal.received)}</div>}
            {detailModal.shortfall != null && <div style={{ marginBottom: "6px", color: C.red }}>Shortfall: {fmt(detailModal.shortfall)}</div>}
            <div style={{ marginTop: "10px", padding: "10px", border: `1px solid ${C.border}`, borderRadius: "8px", color: C.muted }}>{detailModal.notes}</div>
          </div>
        )}
      </Modal>
    </div>
  );
}


export function AgencySettingsPage() {
  const [saved, setSaved] = useState(false);
  return (
    <div>
      <PageTitle title="Agency Settings" subtitle="Manage agency profile and preferences" />
      {saved && <div style={{ padding: "10px 14px", background: C.green + "22", border: `1px solid ${C.green}44`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: C.green }}>Settings saved.</div>}
      <Card style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "14px" }}>Agency profile</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Input label="Agency name" defaultValue="TechStaff Ltd" />
          <Input label="Registration number" defaultValue="12345678" />
          <Input label="Primary contact" defaultValue="Sarah Mitchell" />
          <Input label="Contact email" defaultValue="sarah@techstaff.com" />
          <Input label="Bank sort code" defaultValue="20-00-00" />
          <Input label="Bank account number" defaultValue="87654321" />
        </div>
        <Btn onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}>Save changes</Btn>
      </Card>
      <Card>
        <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "12px" }}>Notification preferences</div>
        {[["Email on invoice generated", true], ["Email on payment mismatch", true], ["Email on timesheet resubmitted", false]].map(([label, checked]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}22`, fontSize: "12px" }}>
            <span style={{ color: C.muted }}>{label}</span>
            <input type="checkbox" defaultChecked={checked} />
          </div>
        ))}
      </Card>
    </div>
  );
}

export function LeaveApprovalsPage() {
  const { leaveRequests, leaveBalances, LEAVE_TYPES, approveLeaveRequest, rejectLeaveRequest } = useApp();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [confirmType, setConfirmType] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const pendingRequests = leaveRequests.filter(r => r.status === "pending");
  const allRequests = leaveRequests.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  const handleApprove = (request) => {
    setConfirmModal(request);
    setConfirmType("approve");
  };

  const handleReject = (request) => {
    setConfirmModal(request);
    setConfirmType("reject");
    setRejectionReason("");
  };

  const confirmAction = async () => {
    if (confirmType === "reject" && !rejectionReason.trim()) {
      return;
    }

    const res = confirmType === "approve"
      ? await approveLeaveRequest(confirmModal.id)
      : await rejectLeaveRequest(confirmModal.id, rejectionReason);

    if (!res.success) {
      setSuccessMsg(res.error || "Action failed");
      setTimeout(() => setSuccessMsg(""), 3000);
      return;
    }

    setSuccessMsg(`Leave request ${confirmType === "approve" ? "approved" : "rejected"} successfully!`);
    setConfirmModal(null);
    setConfirmType(null);
    setRejectionReason("");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const getContractorBalance = (contractorId, leaveType) => {
    const balance = leaveBalances.find(b => b.contractorId === contractorId && b.leaveType === leaveType);
    return balance ? balance.remaining : 0;
  };

  return (
    <div>
      <PageTitle title="Leave Approvals" subtitle="Review and manage contractor leave requests" />
      
      {successMsg && (
        <div style={{
          padding: "10px 14px",
          background: C.green + "22",
          border: `1px solid ${C.green}44`,
          borderRadius: "8px",
          marginBottom: "14px",
          fontSize: "13px",
          color: C.green,
        }}>{successMsg}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        <StatCard label="PENDING REQUESTS" value={pendingRequests.length} color={C.amber} />
        <StatCard label="APPROVED THIS MONTH" value={leaveRequests.filter(r => r.status === "approved").length} color={C.green} />
        <StatCard label="REJECTED THIS MONTH" value={leaveRequests.filter(r => r.status === "rejected").length} color={C.red} />
        <StatCard label="TOTAL REQUESTS" value={leaveRequests.length} color={C.blue} />
      </div>

      {pendingRequests.length > 0 && (
        <Card style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "16px", color: C.amber }}>
            Pending Approvals ({pendingRequests.length})
          </div>
          <Table
            headers={["Contractor", "Type", "Dates", "Days", "Balance", "Reason", "Actions"]}
            rows={pendingRequests.map(request => {
              const leaveType = LEAVE_TYPES[request.leaveType];
              const remainingBalance = getContractorBalance(request.contractorId, request.leaveType);
              return [
                request.contractorName,
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: leaveType.color }} />
                  {leaveType.name}
                </span>,
                `${fmtDate(request.startDate)} - ${fmtDate(request.endDate)}`,
                request.days,
                <span style={{ color: remainingBalance < 0 ? C.red : C.text }}>
                  {remainingBalance < 0 ? `-${Math.abs(remainingBalance)}` : remainingBalance} days
                </span>,
                <span style={{ fontSize: "12px", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {request.reason}
                </span>,
                <div style={{ display: "flex", gap: "6px" }}>
                  <Btn size="sm" variant="success" onClick={() => handleApprove(request)}>Approve</Btn>
                  <Btn size="sm" variant="danger" onClick={() => handleReject(request)}>Reject</Btn>
                </div>
              ];
            })}
          />
        </Card>
      )}

      <Card>
        <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "16px" }}>All Leave Requests</div>
        {allRequests.length > 0 ? (
          <Table
            headers={["Contractor", "Type", "Dates", "Days", "Status", "Submitted", "Actions"]}
            rows={allRequests.map(request => {
              const leaveType = LEAVE_TYPES[request.leaveType];
              return [
                request.contractorName,
                <span style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
                      onClick={() => setSelectedRequest(request)}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: leaveType.color }} />
                  {leaveType.name}
                </span>,
                `${fmtDate(request.startDate)} - ${fmtDate(request.endDate)}`,
                request.days,
                <Badge status={request.status} />,
                fmtDate(request.submittedAt),
                <Btn size="sm" variant="ghost" onClick={() => setSelectedRequest(request)}>View</Btn>
              ];
            })}
          />
        ) : (
          <div style={{ padding: "20px", color: C.muted, fontSize: "13px", textAlign: "center" }}>
            No leave requests found
          </div>
        )}
      </Card>

      <Modal open={!!selectedRequest} onClose={() => setSelectedRequest(null)} title="Leave Request Details">
        {selectedRequest && (
          <div>
            <div style={{ marginBottom: "12px" }}>
              <Badge status={selectedRequest.status} />
            </div>
            <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
              <div style={{ marginBottom: "8px" }}><strong>Contractor:</strong> {selectedRequest.contractorName}</div>
              <div style={{ marginBottom: "8px" }}><strong>Type:</strong> {LEAVE_TYPES[selectedRequest.leaveType].name}</div>
              <div style={{ marginBottom: "8px" }}><strong>Period:</strong> {fmtDate(selectedRequest.startDate)} - {fmtDate(selectedRequest.endDate)}</div>
              <div style={{ marginBottom: "8px" }}><strong>Duration:</strong> {selectedRequest.days} days</div>
              <div style={{ marginBottom: "8px" }}><strong>Current Balance:</strong> {getContractorBalance(selectedRequest.contractorId, selectedRequest.leaveType)} days</div>
              <div style={{ marginBottom: "8px" }}><strong>Reason:</strong> {selectedRequest.reason}</div>
              <div style={{ marginBottom: "8px" }}><strong>Submitted:</strong> {fmtDate(selectedRequest.submittedAt)}</div>
              {selectedRequest.approvedAt && (
                <div style={{ marginBottom: "8px" }}><strong>Approved:</strong> {fmtDate(selectedRequest.approvedAt)} by {selectedRequest.approvedBy}</div>
              )}
              {selectedRequest.rejectionReason && (
                <div style={{ marginBottom: "8px", color: C.red }}><strong>Rejection Reason:</strong> {selectedRequest.rejectionReason}</div>
              )}
            </div>
            {selectedRequest.status === "pending" && (
              <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                <Btn variant="success" onClick={() => { setSelectedRequest(null); handleApprove(selectedRequest); }}>
                  Approve
                </Btn>
                <Btn variant="danger" onClick={() => { setSelectedRequest(null); handleReject(selectedRequest); }}>
                  Reject
                </Btn>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!confirmModal} onClose={() => setConfirmModal(null)} 
             title={confirmType === "approve" ? "Approve Leave Request" : "Reject Leave Request"}>
        {confirmModal && (
          <div>
            <div style={{ fontSize: "13px", color: C.muted, marginBottom: "14px" }}>
              {confirmType === "approve" 
                ? `Approve ${confirmModal.contractorName}'s ${LEAVE_TYPES[confirmModal.leaveType].name} request for ${confirmModal.days} days?`
                : `Reject ${confirmModal.contractorName}'s ${LEAVE_TYPES[confirmModal.leaveType].name} request?`
              }
            </div>
            
            {confirmType === "reject" && (
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", color: C.muted, marginBottom: "4px" }}>
                  Rejection Reason (required)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: "8px",
                    color: C.text,
                    fontSize: "13px",
                    fontFamily: "inherit",
                    resize: "vertical",
                    minHeight: "80px"
                  }}
                  required
                />
              </div>
            )}
            
            <div style={{ display: "flex", gap: "8px" }}>
              <Btn variant={confirmType === "approve" ? "success" : "danger"} onClick={confirmAction}>
                {confirmType === "approve" ? "Approve" : "Reject"}
              </Btn>
              <Btn variant="ghost" onClick={() => setConfirmModal(null)}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function ReportsPage() {
  return (
    <div>
      <PageTitle title="Reports" subtitle="Generate and view agency reports" />
      <Card>
        <div style={{ fontSize: "13px", color: C.muted }}>Reports page coming soon...</div>
      </Card>
    </div>
  );
}
