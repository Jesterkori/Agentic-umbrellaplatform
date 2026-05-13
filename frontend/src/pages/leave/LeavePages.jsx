import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { C, Card, PageTitle, StatCard, Badge, Btn, Input, Textarea, Modal, fmt, fmtDate, Table } from "../../components/UI";
import { animationStyles } from "../../utils/animations";

export function RequestLeavePage() {
  const { user, leaveRequests, leaveBalances, LEAVE_TYPES, submitLeaveRequest } = useApp();
  const [form, setForm] = useState({
    leaveType: "ANNUAL",
    startDate: "",
    endDate: "",
    reason: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const myBalances = leaveBalances.filter(b => b.contractorId === user.id);
  const myRequests = leaveRequests.filter(r => r.contractorId === user.id);

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getBalanceForType = (type) => {
    const balance = myBalances.find(b => b.leaveType === type);
    return balance ? balance.remaining : 0;
  };

  const canRequestLeave = () => {
    const days = calculateDays(form.startDate, form.endDate);
    const remaining = getBalanceForType(form.leaveType);
    const leaveTypeConfig = LEAVE_TYPES[form.leaveType];
    
    if (!leaveTypeConfig.paid) return true; // Unpaid leave always allowed
    return remaining >= days;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Calculate days
    const calculateDays = (start, end) => {
      if (!start || !end) return 0;
      const startDate = new Date(start);
      const endDate = new Date(end);
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    };
    
    const days = calculateDays(form.startDate, form.endDate);
    
    const res = await submitLeaveRequest({
      leaveType: form.leaveType,
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason,
      days,
    });
    if (!res.success) {
      setSuccessMsg(res.error || "Unable to submit leave request");
      setSubmitting(false);
      setTimeout(() => setSuccessMsg(""), 3000);
      return;
    }
    setSuccessMsg("Leave request submitted successfully!");
    setForm({ leaveType: "ANNUAL", startDate: "", endDate: "", reason: "" });
    setSubmitting(false);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  return (
    <div>
      <style>{animationStyles}</style>
      <div style={{ animation: "riseIn 0.6s ease-out backwards" }}>
        <PageTitle title="Request Leave" subtitle="Submit a new leave request" />
      </div>
      
      {successMsg && (
        <div style={{
          padding: "10px 14px",
          background: C.green + "22",
          border: `1px solid ${C.green}44`,
          borderRadius: "8px",
          marginBottom: "14px",
          fontSize: "13px",
          color: C.green,
          animation: "scaleIn 0.5s ease-out 0.1s backwards"
        }}>{successMsg}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        <Card>
          <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "16px" }}>Your Leave Balances</div>
          {myBalances.map(balance => {
            const leaveType = LEAVE_TYPES[balance.leaveType];
            return (
              <div key={balance.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}22` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: leaveType.color }} />
                  <span style={{ fontSize: "13px" }}>{leaveType.name}</span>
                </div>
                <span style={{ fontSize: "13px", fontWeight: "500", color: balance.remaining < 0 ? C.red : C.text }}>
                  {balance.remaining < 0 ? `${Math.abs(balance.remaining)} overdrawn` : `${balance.remaining} days`}
                </span>
              </div>
            );
          })}
        </Card>

        <Card>
          <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "16px" }}>Request Form</div>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", color: C.muted, marginBottom: "4px" }}>Leave Type</label>
              <select
                value={form.leaveType}
                onChange={e => setForm(prev => ({ ...prev, leaveType: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: "8px",
                  color: C.text,
                  fontSize: "13px",
                  fontFamily: "inherit"
                }}
              >
                {Object.entries(LEAVE_TYPES).map(([key, type]) => (
                  <option key={key} value={key}>{type.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: C.muted, marginBottom: "4px" }}>Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: "8px",
                    color: C.text,
                    fontSize: "13px",
                    fontFamily: "inherit"
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: C.muted, marginBottom: "4px" }}>End Date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                  min={form.startDate}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: "8px",
                    color: C.text,
                    fontSize: "13px",
                    fontFamily: "inherit"
                  }}
                  required
                />
              </div>
            </div>

            {form.startDate && form.endDate && (
              <div style={{ marginBottom: "12px", padding: "8px 12px", background: canRequestLeave() ? C.green + "11" : C.red + "11", borderRadius: "6px" }}>
                <div style={{ fontSize: "12px", color: canRequestLeave() ? C.green : C.red }}>
                  Duration: {calculateDays(form.startDate, form.endDate)} days
                  {!canRequestLeave() && ` - Insufficient balance (${getBalanceForType(form.leaveType)} days remaining)`}
                </div>
              </div>
            )}

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", color: C.muted, marginBottom: "4px" }}>Reason</label>
              <textarea
                value={form.reason}
                onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Please provide a reason for your leave request..."
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
                  minHeight: "60px"
                }}
                required
              />
            </div>

            <Btn
              type="submit"
              disabled={submitting || !canRequestLeave()}
              variant="primary"
              fullWidth
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </Btn>
          </form>
        </Card>
      </div>

      <Card>
        <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "16px" }}>Your Recent Requests</div>
        {myRequests.length > 0 ? (
          <Table
            headers={["Type", "Dates", "Days", "Status", "Submitted"]}
            rows={myRequests.slice(0, 5).map(request => {
              const leaveType = LEAVE_TYPES[request.leaveType];
              return [
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: leaveType.color }} />
                  {leaveType.name}
                </span>,
                `${fmtDate(request.startDate)} - ${fmtDate(request.endDate)}`,
                request.days,
                <Badge status={request.status} />,
                fmtDate(request.submittedAt)
              ];
            })}
          />
        ) : (
          <div style={{ padding: "20px", color: C.muted, fontSize: "13px", textAlign: "center" }}>
            No leave requests found
          </div>
        )}
      </Card>
    </div>
  );
}

export function MyLeavePage() {
  const { user, leaveRequests, leaveBalances, LEAVE_TYPES } = useApp();
  const [selectedRequest, setSelectedRequest] = useState(null);

  const myRequests = leaveRequests.filter(r => r.contractorId === user.id);
  const myBalances = leaveBalances.filter(b => b.contractorId === user.id);

  const pendingCount = myRequests.filter(r => r.status === "pending").length;
  const approvedCount = myRequests.filter(r => r.status === "approved").length;
  const totalAnnualUsed = myBalances.find(b => b.leaveType === "ANNUAL")?.used || 0;
  const totalAnnualRemaining = myBalances.find(b => b.leaveType === "ANNUAL")?.remaining || 0;

  return (
    <div>
      <PageTitle title="My Leave" subtitle="View your leave history and balances" />
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        <StatCard label="PENDING REQUESTS" value={pendingCount} color={C.amber} />
        <StatCard label="APPROVED THIS YEAR" value={approvedCount} color={C.green} />
        <StatCard label="ANNUAL LEAVE USED" value={`${totalAnnualUsed} days`} color={C.blue} />
        <StatCard label="ANNUAL LEAVE LEFT" value={`${totalAnnualRemaining} days`} color={C.accent} />
      </div>

      <Card>
        <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "16px" }}>Leave Balances</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          {myBalances.map(balance => {
            const leaveType = LEAVE_TYPES[balance.leaveType];
            return (
              <div key={balance.id} style={{
                padding: "12px",
                border: `1px solid ${C.border}`,
                borderRadius: "8px",
                background: C.surface
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: leaveType.color }} />
                  <span style={{ fontSize: "13px", fontWeight: "500" }}>{leaveType.name}</span>
                </div>
                <div style={{ fontSize: "11px", color: C.muted, marginBottom: "4px" }}>
                  {leaveType.paid ? "Paid" : "Unpaid"} Leave
                </div>
                <div style={{ fontSize: "16px", fontWeight: "600", color: balance.remaining < 0 ? C.red : C.text }}>
                  {balance.remaining < 0 ? `-${Math.abs(balance.remaining)}` : balance.remaining} days
                </div>
                <div style={{ fontSize: "11px", color: C.muted }}>
                  {balance.used} used of {balance.totalAllowance} total
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card style={{ marginTop: "16px" }}>
        <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "16px" }}>Leave History</div>
        {myRequests.length > 0 ? (
          <Table
            headers={["Type", "Dates", "Days", "Status", "Reason", "Submitted"]}
            rows={myRequests.map(request => {
              const leaveType = LEAVE_TYPES[request.leaveType];
              return [
                <span style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
                      onClick={() => setSelectedRequest(request)}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: leaveType.color }} />
                  {leaveType.name}
                </span>,
                `${fmtDate(request.startDate)} - ${fmtDate(request.endDate)}`,
                request.days,
                <Badge status={request.status} />,
                <span style={{ fontSize: "12px", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {request.reason}
                </span>,
                fmtDate(request.submittedAt)
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
              <div style={{ marginBottom: "8px" }}><strong>Type:</strong> {LEAVE_TYPES[selectedRequest.leaveType].name}</div>
              <div style={{ marginBottom: "8px" }}><strong>Period:</strong> {fmtDate(selectedRequest.startDate)} - {fmtDate(selectedRequest.endDate)}</div>
              <div style={{ marginBottom: "8px" }}><strong>Duration:</strong> {selectedRequest.days} days</div>
              <div style={{ marginBottom: "8px" }}><strong>Reason:</strong> {selectedRequest.reason}</div>
              <div style={{ marginBottom: "8px" }}><strong>Submitted:</strong> {fmtDate(selectedRequest.submittedAt)}</div>
              {selectedRequest.approvedAt && (
                <div style={{ marginBottom: "8px" }}><strong>Approved:</strong> {fmtDate(selectedRequest.approvedAt)} by {selectedRequest.approvedBy}</div>
              )}
              {selectedRequest.rejectionReason && (
                <div style={{ marginBottom: "8px", color: C.red }}><strong>Rejection Reason:</strong> {selectedRequest.rejectionReason}</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
