import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants";
import { Card, PageTitle, Badge, Btn, Modal, Table } from "../../components/UI";
import { fmt, fmtDate } from "../../utils/format";
import { downloadInvoicePdf } from "../../utils/pdfExport";
import { generateLeaveSummary } from "../../utils/leaveUtils";
import { animationStyles } from "../../utils/animations";
import OmbrellaInvoice from "./OmbrellaInvoice";

export function InvoiceListPage() {
  const { user, invoices, approveInvoice, markPaymentReceived, leaveRequests, documentBrandingSettings } = useApp();
  const [selected, setSelected] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [confirmType, setConfirmType] = useState(null);

  // Get approved leave requests for invoice processing
  const approvedLeaveRequests = leaveRequests.filter(lr => lr.status === "approved");

  // Process invoices to include leave information
  const processedInvoices = invoices.map(invoice => {
    // Find corresponding timesheet to calculate leave
    const timesheetWeekStart = invoice.weekStart; // Assuming invoice has weekStart
    if (!timesheetWeekStart) return invoice;

    // Create a mock timesheet object for leave analysis
    const mockTimesheet = {
      id: invoice.timesheetId,
      contractorId: invoice.contractorId,
      contractorName: invoice.contractorName,
      weekStart: timesheetWeekStart,
      weekEnd: invoice.weekEnd,
      hours: invoice.hours,
      rate: invoice.rate,
      gross: invoice.gross
    };

    const leaveSummary = generateLeaveSummary(mockTimesheet, approvedLeaveRequests);
    
    return {
      ...invoice,
      leaveInfo: leaveSummary || {
        paidLeaveDays: 0,
        unpaidLeaveDays: 0,
        totalLeaveDays: 0
      }
    };
  });

  const visible = user.role === "contractor"
    ? processedInvoices.filter(i => i.contractorId === user.id)
    : processedInvoices;

  const openConfirm = (inv, type) => { setConfirmModal(inv); setConfirmType(type); };

  const doConfirm = async () => {
    if (confirmType === "approve") await approveInvoice(confirmModal.id);
    if (confirmType === "payment") await markPaymentReceived(confirmModal.id);
    setConfirmModal(null);
  };

  return (
    <div>
      <style>{animationStyles}</style>
      <div style={{ animation: "riseIn 0.6s ease-out backwards" }}>
        <PageTitle title="Invoices" subtitle={user.role === "contractor" ? "Your invoice history" : "Manage agency invoices"} />
      </div>
      <Card style={{ animation: "scaleIn 0.5s ease-out 0.1s backwards" }}>
        <Table
          headers={["Invoice #", "Period", "Hours", "Gross", "Status", "Generated", "Actions"]}
          rows={visible.map((inv, i) => [
            <span style={{ fontFamily: "monospace", fontSize: "12px", animation: `slideInLeft 0.5s ease-out ${0.15 + i * 0.04}s backwards` }}>{inv.invoiceNumber}</span>,
            <div style={{ animation: `slideInLeft 0.5s ease-out ${0.15 + i * 0.04}s backwards` }}>{fmtDate(inv.weekStart)} – {fmtDate(inv.weekEnd)}</div>,
            <div style={{ animation: `slideInLeft 0.5s ease-out ${0.15 + i * 0.04}s backwards` }}>{inv.hours}h</div>,
            <div style={{ animation: `slideInLeft 0.5s ease-out ${0.15 + i * 0.04}s backwards` }}>{fmt(inv.gross)}</div>,
            <div style={{ animation: `slideInLeft 0.5s ease-out ${0.15 + i * 0.04}s backwards` }}><Badge status={inv.status} /></div>,
            <div style={{ animation: `slideInLeft 0.5s ease-out ${0.15 + i * 0.04}s backwards` }}>{fmtDate(inv.generatedAt)}</div>,
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", animation: `slideInLeft 0.5s ease-out ${0.15 + i * 0.04}s backwards` }}>
              <Btn size="sm" variant="ghost" onClick={() => setSelected(inv)}>Details</Btn>
              {user.role === "agency" && inv.status === "INVOICE_GENERATED" && (
                <Btn size="sm" variant="success" onClick={() => openConfirm(inv, "approve")}>Approve</Btn>
              )}
              {user.role === "agency" && inv.status === "INVOICE_APPROVED" && (
                <Btn size="sm" variant="primary" onClick={() => openConfirm(inv, "payment")}>Mark Paid</Btn>
              )}
            </div>
          ])}
        />
        {!visible.length && <div style={{ padding: "20px", color: C.muted, fontSize: "13px", animation: "fadeIn 0.6s ease-out 0.2s backwards" }}>No invoices found.</div>}
      </Card>

      {/* Details modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Invoice Details" width="800px" maxWidth="95vw">
        {selected && <InvoiceDetail inv={selected} brandingSettings={documentBrandingSettings} />}
      </Modal>

      {/* Confirm modal */}
      <Modal open={!!confirmModal} onClose={() => setConfirmModal(null)}
        title={confirmType === "approve" ? "Approve Invoice" : "Confirm Payment Received"}>
        {confirmModal && (
          <div>
            <div style={{ fontSize: "13px", color: C.muted, marginBottom: "16px" }}>
              {confirmType === "approve"
                ? `Approve invoice ${confirmModal.invoiceNumber} for ${fmt(confirmModal.gross)}? This action cannot be undone.`
                : `Confirm that payment of ${fmt(confirmModal.gross)} has been received for ${confirmModal.invoiceNumber}?`}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <Btn variant={confirmType === "approve" ? "success" : "primary"} onClick={doConfirm}>
                {confirmType === "approve" ? "Approve Invoice" : "Confirm Payment"}
              </Btn>
              <Btn variant="ghost" onClick={() => setConfirmModal(null)}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function InvoiceDetail({ inv, brandingSettings }) {
  return (
    <div style={{ padding: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "22px", fontWeight: 700, color: C.text }}>Invoice</div>
          <Badge status={inv.status} />
        </div>
        <Btn size="sm" variant="ghost" onClick={() => downloadInvoicePdf(inv, brandingSettings)}>Download PDF</Btn>
      </div>
      <OmbrellaInvoice invoice={inv} />
    </div>
  );
}

function Row({ label, value, mono = false }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", padding: "4px 0", fontSize: "12px" }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ fontFamily: mono ? "monospace" : "inherit" }}>{value}</span>
    </div>
  );
}
