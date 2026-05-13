import React from "react";
import { fmt, fmtDate } from "../../utils/format";
import LogoMark from "../../components/LogoMark";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const defaultCompany = {
  name: "OM & CO Pvt Limited",
  address1: "Unit 108, 7th Floor",
  address2: "2 Pinfold Street",
  address3: "The Balance Sheffield",
  postcode: "S12 GU",
  regNo: "15446929",
  vatNo: "468850642",
  bankName: "HSBC",
  accountNo: "71001213",
  sortCode: "404157",
};

export default function OmbrellaInvoice({ invoice = {} }) {
  const invoiceRef = invoice.invoiceNumber || "INV100003";
  const invoiceDate = fmtDate(invoice.generatedAt);
  const paymentDue = invoice.paymentDue || invoice.generatedAt || "";
  const formattedPaymentDue = fmtDate(paymentDue);
  const accountNo = invoice.accountNo || "1070436";
  const poRef = invoice.poRef || "—";
  const projectRef = invoice.projectRef || "—";
  const currency = invoice.currency || "GBP";
  const clientName = invoice.agency || "Solutions";

  // Process leave information if available
  const leaveInfo = invoice.leaveInfo || {};
  const hasLeaveDeductions = leaveInfo.unpaidLeaveDays > 0;
  const hasPaidLeave = leaveInfo.paidLeaveDays > 0;
  const clientAddress1 = invoice.clientAddress1 || "38 Park View";
  const clientAddress2 = invoice.clientAddress2 || "London";
  const clientPostcode = invoice.clientPostcode || "SW1Y4 PE";
  const companyName = invoice.umbrella || defaultCompany.name;
  const companyAddress1 = invoice.companyAddress1 || defaultCompany.address1;
  const companyAddress2 = invoice.companyAddress2 || defaultCompany.address2;
  const companyAddress3 = invoice.companyAddress3 || defaultCompany.address3;
  const companyPostcode = invoice.companyPostcode || defaultCompany.postcode;
  const companyRegNo = invoice.companyRegNo || defaultCompany.regNo;
  const vatRegNo = invoice.vatRegNo || defaultCompany.vatNo;
  const bankName = invoice.bankName || defaultCompany.bankName;
  const bankAccountNo = invoice.bankAccountNo || defaultCompany.accountNo;
  const sortCode = invoice.sortCode || defaultCompany.sortCode;
  const notes = invoice.notes || "";

  const baseNetValue = Number(invoice.gross || 0);
  const quantity = invoice.hours != null ? invoice.hours : 0;
  const price = invoice.rate != null ? invoice.rate : 0;
  
  // Calculate leave deductions/additions
  const unpaidDeduction = hasLeaveDeductions ? Math.round((leaveInfo.unpaidLeaveDays * price) * 100) / 100 : 0;
  const paidLeaveAmount = hasPaidLeave ? Math.round((leaveInfo.paidLeaveDays * price) * 100) / 100 : 0;
  
  // Adjust totals for leave
  const netValue = Math.round((baseNetValue - unpaidDeduction + paidLeaveAmount) * 100) / 100;
  const vatValue = Math.round(netValue * 0.2 * 100) / 100;
  const totalValue = Math.round((netValue + vatValue) * 100) / 100;

  const items = invoice.items && invoice.items.length > 0
    ? invoice.items
    : (() => {
        const baseItems = [
          {
            contractorLabel: `Contractor : ${invoice.contractorName || invoice.contractorId || "—"}`,
            description: invoice.description || "Standard Hourly Rate",
            code: invoice.code || "DN1002",
            quantity: quantity.toString(),
            price: formatNumber(price),
            net: formatNumber(netValue),
            vat: formatNumber(vatValue),
            amount: formatNumber(totalValue),
          },
        ];

        // Add leave deduction items if applicable
        if (hasLeaveDeductions) {
          const unpaidDeduction = Math.round((leaveInfo.unpaidLeaveDays * price) * 100) / 100;
          const unpaidVat = Math.round(unpaidDeduction * 0.2 * 100) / 100;
          
          baseItems.push({
            contractorLabel: `Contractor : ${invoice.contractorName || invoice.contractorId || "—"}`,
            description: `Unpaid Leave Deduction (${leaveInfo.unpaidLeaveDays} day${leaveInfo.unpaidLeaveDays !== 1 ? 's' : ''})`,
            code: "LEAVE001",
            quantity: leaveInfo.unpaidLeaveDays.toString(),
            price: formatNumber(price),
            net: `-${formatNumber(unpaidDeduction)}`,
            vat: `-${formatNumber(unpaidVat)}`,
            amount: `-${formatNumber(unpaidDeduction + unpaidVat)}`,
          });
        }

        // Add paid leave information if applicable
        if (hasPaidLeave) {
          const paidLeaveAmount = Math.round((leaveInfo.paidLeaveDays * price) * 100) / 100;
          const paidLeaveVat = Math.round(paidLeaveAmount * 0.2 * 100) / 100;
          
          baseItems.push({
            contractorLabel: `Contractor : ${invoice.contractorName || invoice.contractorId || "—"}`,
            description: `Paid Leave (${leaveInfo.paidLeaveDays} day${leaveInfo.paidLeaveDays !== 1 ? 's' : ''})`,
            code: "LEAVE002",
            quantity: leaveInfo.paidLeaveDays.toString(),
            price: formatNumber(price),
            net: formatNumber(paidLeaveAmount),
            vat: formatNumber(paidLeaveVat),
            amount: formatNumber(paidLeaveAmount + paidLeaveVat),
          });
        }

        return baseItems;
      })();

  const TEAL = "#008080";
  const LTEAL = "#e8f5f5";
  const GRAY = "#f4f4f4";
  const BORDER = "#d0d0d0";
  const TEXT = "#222";
  const MUTED = "#555";

  const cell = {
    padding: "10px 11px",
    fontSize: "11.5px",
    color: TEXT,
    borderBottom: `1px solid ${BORDER}`,
  };

  const hcell = {
    padding: "10px 11px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#fff",
    background: TEAL,
    letterSpacing: "0.03em",
    textTransform: "uppercase",
  };

  return (
    <div style={{
      fontFamily: "'Calibri', 'Segoe UI', Arial, sans-serif",
      background: "#fff",
      color: TEXT,
      maxWidth: "820px",
      width: "100%",
      margin: "0 auto",
      padding: "22px 24px 18px",
      boxSizing: "border-box",
      border: "1px solid #ccc",
      boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: "18px", alignItems: "start", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <LogoMark compact />
          <div>
            <div style={{ fontWeight: 900, fontSize: "22px", color: TEAL, letterSpacing: "0.08em" }}>OMBRELLA</div>
            <div style={{ fontSize: "9px", color: MUTED, letterSpacing: "0.12em" }}>Business The Future</div>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "26px", fontWeight: 800, letterSpacing: "0.05em", color: TEXT }}>INVOICE</div>
          <div style={{ marginTop: "8px", fontSize: "11.5px", color: MUTED }}>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <span style={{ fontWeight: 600 }}>Invoice Ref :</span>
              <span style={{ fontFamily: "monospace" }}>{invoiceRef}</span>
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "3px" }}>
              <span style={{ fontWeight: 600 }}>Date :</span>
              <span>{invoiceDate}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px", marginBottom: "20px" }}>
        <div style={{ fontSize: "11.5px", lineHeight: 1.65 }}>
          <div style={{ fontWeight: 700, marginBottom: "2px" }}>To:</div>
          <div style={{ fontWeight: 700 }}>{clientName}</div>
          <div style={{ color: MUTED }}>{clientAddress1}</div>
          <div style={{ color: MUTED }}>{clientAddress2}</div>
          <div style={{ color: MUTED }}>{clientPostcode}</div>
        </div>
        <div style={{ fontSize: "11.5px", lineHeight: 1.65, textAlign: "right" }}>
          <div style={{ fontWeight: 700 }}>{companyName}</div>
          <div style={{ color: MUTED }}>{companyAddress1}</div>
          <div style={{ color: MUTED }}>{companyAddress2}</div>
          <div style={{ color: MUTED }}>{companyAddress3}</div>
          <div style={{ color: MUTED }}>{companyPostcode}</div>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", marginBottom: "20px" }}>
        <colgroup>
          <col style={{ width: "18%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "24%" }} />
        </colgroup>
        <thead>
          <tr>
            { ["A/C NO", "PO Ref.", "Project Ref.", "Currency", "Payment Due"].map(h => (
              <th key={h} style={{ ...hcell, textAlign: "center" }}>{h}</th>
            )) }
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: GRAY }}>
            {[accountNo, poRef, projectRef, currency, formattedPaymentDue].map((v, i) => (
              <td key={i} style={{ ...cell, textAlign: "center", fontFamily: i === 0 ? "monospace" : "inherit" }}>{v}</td>
            ))}
          </tr>
        </tbody>
      </table>

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", marginBottom: "24px" }}>
        <colgroup>
          <col style={{ width: "38%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "8%" }} />
        </colgroup>
        <thead>
          <tr>
            { ["Description", "Code", "Quantity", "Price", "Net", "VAT", "Amount"].map((h, i) => (
              <th key={h} style={{ ...hcell, textAlign: i === 0 ? "left" : "right", padding: "10px 8px" }}>{h}</th>
            )) }
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <React.Fragment key={`item-group-${idx}`}>
              {item.contractorLabel && (
                <tr>
                  <td colSpan={7} style={{ ...cell, fontWeight: 700, color: TEXT, background: LTEAL, paddingLeft: "10px" }}>
                    {item.contractorLabel}
                  </td>
                </tr>
              )}
              <tr style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ ...cell, textAlign: "left" }}>{item.description}</td>
                <td style={{ ...cell, textAlign: "right", fontFamily: "monospace" }}>{item.code}</td>
                <td style={{ ...cell, textAlign: "right" }}>{item.quantity}</td>
                <td style={{ ...cell, textAlign: "right" }}>{item.price}</td>
                <td style={{ ...cell, textAlign: "right", fontWeight: 500 }}>{item.net}</td>
                <td style={{ ...cell, textAlign: "right" }}>{item.vat}</td>
                <td style={{ ...cell, textAlign: "right", fontWeight: 700 }}>{item.amount}</td>
              </tr>
            </React.Fragment>
          ))}
          {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
            <tr key={`empty-${i}`} style={{ height: "22px" }}>
              <td colSpan={7} style={{ borderBottom: `1px solid ${BORDER}` }} />
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px" }}>
        <div style={{ fontSize: "11.5px", lineHeight: 1.8, flex: 1 }}>
          <div style={{ fontWeight: 700, marginBottom: "4px" }}>Please Remit Payment To:</div>
          <div><span style={{ fontWeight: 600 }}>A/c Name</span> : {bankName}</div>
          <div><span style={{ fontWeight: 600 }}>A/c No</span> : <span style={{ fontFamily: "monospace" }}>{bankAccountNo}</span></div>
          <div><span style={{ fontWeight: 600 }}>Sort code</span> : <span style={{ fontFamily: "monospace" }}>{sortCode}</span></div>
        </div>

        {notes && (
          <div style={{ fontSize: "11.5px", flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: "4px" }}>Notes:</div>
            <div style={{ color: MUTED }}>{notes}</div>
          </div>
        )}

        <div style={{ minWidth: "190px" }}>
          {[
            { label: "Net", value: formatNumber(netValue), bold: false },
            { label: "VAT", value: formatNumber(vatValue), bold: false },
            { label: "Total", value: formatNumber(totalValue), bold: true },
          ].map(row => (
            <div key={row.label} style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "7px 12px",
              borderBottom: row.label === "VAT" ? `2px solid ${TEAL}` : `1px solid ${BORDER}`,
              background: row.label === "Total" ? TEAL : "#fff",
              color: row.label === "Total" ? "#fff" : TEXT,
              fontWeight: row.bold ? "700" : "400",
              fontSize: row.bold ? "13px" : "12px",
              marginTop: row.label === "Total" ? "1px" : "0",
            }}>
              <span>{row.label}</span>
              <span style={{ fontFamily: "monospace" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: "28px",
        paddingTop: "12px",
        borderTop: `1px solid ${BORDER}`,
        fontSize: "10px",
        color: MUTED,
        textAlign: "center",
        letterSpacing: "0.02em",
      }}>
        Company Reg. Number: {companyRegNo}  ·  VAT Registration Number: {vatRegNo}
      </div>
    </div>
  );
}
