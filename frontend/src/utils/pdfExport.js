import { jsPDF } from "jspdf";

function money(n) {
  return "£" + Number(n ?? 0).toLocaleString("en-GB", { minimumFractionDigits: 2 });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dateStr(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function hexToRgb(hex, fallback) {
  const source = String(hex || "").trim();
  const parsed = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(source);
  if (!parsed) return fallback;
  return {
    r: parseInt(parsed[1], 16),
    g: parseInt(parsed[2], 16),
    b: parseInt(parsed[3], 16),
  };
}

function resolveDocumentBranding(doc, settings) {
  const legalEntities = settings?.legalEntities || {};
  const fallbackKey = settings?.legalEntityKey || Object.keys(legalEntities)[0] || "";
  const requestedEntityKey =
    normalizeKey(doc?.legalEntityKey) ||
    normalizeKey(doc?.umbrella) ||
    normalizeKey(doc?.agency) ||
    normalizeKey(fallbackKey);

  const entity =
    legalEntities[requestedEntityKey] ||
    legalEntities[normalizeKey(fallbackKey)] ||
    Object.values(legalEntities)[0] ||
    {};

  const clientKey =
    normalizeKey(doc?.clientName) ||
    normalizeKey(doc?.agency) ||
    normalizeKey(doc?.clientId);
  const clientOverride = (settings?.clientOverrides || {})[clientKey] || {};

  return {
    ...entity,
    ...clientOverride,
    primaryRgb: hexToRgb(clientOverride.primaryColor || entity.primaryColor, { r: 12, g: 131, b: 133 }),
    accentRgb: hexToRgb(clientOverride.accentColor || entity.accentColor, { r: 8, g: 92, b: 102 }),
  };
}

export function downloadInvoicePdf(inv, brandingSettings = null) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const m = 40;
  let y = 40;
  const contentWidth = pageW - 2 * m;

  const branding = resolveDocumentBranding(inv, brandingSettings);
  const TEAL = branding.primaryRgb;
  const ACCENT = branding.accentRgb;
  const TEXT = "#222";
  const MUTED = "#555";

  const invoiceNumber = inv.invoiceNumber || "INV100003";
  const invoiceDate = dateStr(inv.generatedAt);
  const paymentDue = dateStr(inv.paymentDue || inv.generatedAt);
  const accountNo = inv.accountNo || "1070436";
  const poRef = inv.poRef || "—";
  const projectRef = inv.projectRef || "—";
  const currency = inv.currency || "GBP";
  const clientName = inv.agency || inv.clientName || "Solutions";
  const clientAddress1 = inv.clientAddress1 || "38 Park View";
  const clientAddress2 = inv.clientAddress2 || "London";
  const clientPostcode = inv.clientPostcode || "SW1Y4 PE";
  const companyName = inv.umbrella || branding.companyName || "OM & CO Pvt Limited";
  const companyAddress1 = inv.companyAddress1 || branding.addressLine1 || "Unit 108, 7th Floor";
  const companyAddress2 = inv.companyAddress2 || branding.addressLine2 || "2 Pinfold Street";
  const companyAddress3 = inv.companyAddress3 || branding.addressLine3 || "The Balance Sheffield";
  const companyPostcode = inv.companyPostcode || branding.postcode || "S12 GU";
  const companyRegNo = inv.companyRegNo || "15446929";
  const vatRegNo = inv.vatRegNo || "468850642";
  const bankName = inv.bankName || "HSBC";
  const bankAccountNo = inv.bankAccountNo || "71001213";
  const sortCode = inv.sortCode || "404157";
  const notes = inv.notes || "";

  const gross = Number(inv.gross || 0);
  const vat = Math.round(gross * 0.2 * 100) / 100;
  const total = Math.round((gross + vat) * 100) / 100;
  const quantity = inv.hours != null ? inv.hours : 0;
  const rate = inv.rate != null ? inv.rate : 0;

  const items = inv.items && inv.items.length > 0 ? inv.items : [
    {
      contractorLabel: `Contractor : ${inv.contractorName || inv.contractorId || "—"}`,
      description: inv.description || "Standard Hourly Rate",
      code: inv.code || "DN1002",
      quantity: quantity.toString(),
      price: formatNumber(rate),
      net: formatNumber(gross),
      vat: formatNumber(vat),
      amount: formatNumber(total),
    },
  ];

  doc.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
  doc.rect(m, y, 62, 62, "F");
  if (String(branding.logoDataUrl || "").startsWith("data:image")) {
    try {
      doc.addImage(branding.logoDataUrl, "PNG", m + 7, y + 7, 48, 48);
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor("#fff");
      doc.text(branding.logoText || "OMB", m + 31, y + 38, { align: "center" });
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor("#fff");
    doc.text(branding.logoText || "OMB", m + 31, y + 38, { align: "center" });
  }

  doc.setTextColor(TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text(branding.invoiceTitle || "INVOICE", m + contentWidth, y + 15, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(MUTED);
  doc.text(`Invoice Ref : ${invoiceNumber}`, m + contentWidth, y + 32, { align: "right" });
  doc.text(`Date : ${invoiceDate}`, m + contentWidth, y + 46, { align: "right" });

  y += 80;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(TEXT);
  doc.text("To:", m, y);
  doc.text(companyName, m + contentWidth, y, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(clientName, m, y + 14);
  doc.text(clientAddress1, m, y + 26);
  doc.text(clientAddress2, m, y + 38);
  doc.text(clientPostcode, m, y + 50);

  doc.text(companyAddress1, m + contentWidth, y + 14, { align: "right" });
  doc.text(companyAddress2, m + contentWidth, y + 26, { align: "right" });
  doc.text(companyAddress3, m + contentWidth, y + 38, { align: "right" });
  doc.text(companyPostcode, m + contentWidth, y + 50, { align: "right" });

  y += 74;

  const accountCols = [0.18, 0.18, 0.2, 0.18, 0.26];
  const accountHeaders = ["A/C NO", "PO Ref.", "Project Ref.", "Currency", "Payment Due"];
  const accountValues = [accountNo, poRef, projectRef, currency, paymentDue];

  let x = m;
  doc.setFillColor(TEAL.r, TEAL.g, TEAL.b);
  doc.rect(m, y, contentWidth, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor("#fff");
  doc.setFontSize(9);
  accountHeaders.forEach((label, index) => {
    const width = accountCols[index] * contentWidth;
    const colEnd = x + width;
    doc.text(label, x + width / 2, y + 16, { align: "center" });
    x += width;
  });

  y += 24;
  x = m;
  doc.setFillColor(244, 244, 244);
  doc.rect(m, y, contentWidth, 24, "F");
  doc.setFont("helvetica", "normal");
  doc.setTextColor(TEXT);
  doc.setFontSize(10);
  accountValues.forEach((value, index) => {
    const width = accountCols[index] * contentWidth;
    const colEnd = x + width;
    doc.text(String(value), x + width / 2, y + 16, { align: "center" });
    x += width;
  });

  y += 42;

  const itemCols = [0.38, 0.11, 0.09, 0.11, 0.14, 0.09, 0.08];
  const itemHeaders = ["Description", "Code", "Quantity", "Price", "Net", "VAT", "Amount"];

  x = m;
  doc.setFillColor(TEAL.r, TEAL.g, TEAL.b);
  doc.rect(m, y, contentWidth, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor("#fff");
  doc.setFontSize(9);
  itemHeaders.forEach((label, index) => {
    const width = itemCols[index] * contentWidth;
    const align = index === 0 ? "left" : "right";
    const colEnd = x + width;
    if (align === "left") {
      doc.text(label, x + 3, y + 16, { align: "left" });
    } else {
      doc.text(label, colEnd - 3, y + 16, { align: "right" });
    }
    x += width;
  });

  y += 24;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  items.forEach((item, rowIndex) => {
    if (item.contractorLabel) {
      doc.setFillColor(232, 245, 245);
      doc.rect(m, y, contentWidth, 20, "F");
      doc.setTextColor(TEXT);
      doc.setFont("helvetica", "bold");
      doc.text(item.contractorLabel, m + 5, y + 14);
      y += 20;
      doc.setFont("helvetica", "normal");
    }

    doc.setFillColor(rowIndex % 2 === 0 ? 255 : 250, 250, 250);
    doc.rect(m, y, contentWidth, 20, "F");
    x = m;
    const rowValues = [item.description, item.code, item.quantity, item.price, item.net, item.vat, item.amount];
    rowValues.forEach((value, index) => {
      const width = itemCols[index] * contentWidth;
      const align = index === 0 ? "left" : "right";
      const colEnd = x + width;
      doc.setTextColor(TEXT);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      if (align === "left") {
        doc.text(String(value), x + 3, y + 14, { align: "left" });
      } else {
        doc.text(String(value), colEnd - 3, y + 14, { align: "right" });
      }
      x += width;
    });
    y += 20;
  });

  const emptyRows = Math.max(0, 2 - items.length);
  for (let i = 0; i < emptyRows; i += 1) {
    doc.setDrawColor(208, 208, 208);
    doc.line(m, y + 10, m + contentWidth, y + 10);
    y += 20;
  }

  y += 18;
  const summaryX = m + contentWidth - 190;
  const summaryWidth = 190;
  const summaryRows = [
    { label: "Net", value: formatNumber(gross), bold: false },
    { label: "VAT", value: formatNumber(vat), bold: false },
    { label: "Total", value: formatNumber(total), bold: true },
  ];

  summaryRows.forEach((row) => {
    if (row.bold) {
      doc.setFillColor(TEAL.r, TEAL.g, TEAL.b);
      doc.setTextColor("#fff");
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setTextColor(TEXT);
    }
    doc.rect(summaryX, y, summaryWidth, 20, "F");
    doc.setFont("helvetica", row.bold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.text(row.label, summaryX + 8, y + 14);
    doc.text(row.value, summaryX + summaryWidth - 8, y + 14, { align: "right" });
    y += 20;
  });

  y += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Please Remit Payment To:", m, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`A/c Name : ${bankName}`, m, y);
  y += 12;
  doc.text(`A/c No : ${bankAccountNo}`, m, y);
  y += 12;
  doc.text(`Sort code : ${sortCode}`, m, y);

  if (notes) {
    y -= 36;
    doc.setFont("helvetica", "bold");
    doc.text("Notes:", m + 260, y);
    doc.setFont("helvetica", "normal");
    doc.text(notes, m + 260, y + 14);
  }

  y += 40;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(branding.footerText || `Company Reg. Number: ${companyRegNo}  ·  VAT Registration Number: ${vatRegNo}`, m, y);

  const safe = (invoiceNumber || "invoice").replace(/[^\w-]/g, "_");
  doc.save(`${safe}.pdf`);
}

export function downloadPayslipPdf(p, brandingSettings = null) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 40;
  const contentWidth = pageW - 2 * m;
  let y = 36;

  const branding = resolveDocumentBranding(p, brandingSettings);
  const TEAL = branding.primaryRgb;
  const TEAL_DARK = branding.accentRgb;
  const TEXT = "#1f2933";
  const MUTED = "#5a6772";

  const contractorName = p.contractorName || "N/A";
  const payslipId = p.payslipId || p.id || "N/A";
  const period = p.period || "N/A";
  const paidDate = dateStr(p.paymentDate);
  const taxCode = p.taxCode || "1257L";
  const payoutRef = p.payoutReference || "Pending";
  const status = p.status || "PAYROLL_COMPLETED";
  const companyName = p.umbrella || branding.companyName || "PaySafe Umbrella";
  const companyAddress =
    p.companyAddress ||
    [branding.addressLine1, branding.addressLine2, branding.addressLine3, branding.postcode]
      .filter(Boolean)
      .join(", ") ||
    "Unit 108, 7th Floor, 2 Pinfold Street, Sheffield";

  const gross = Number(p.gross || 0);
  const incomeTax = Number(p.incomeTax || 0);
  const employeeNI = Number(p.employeeNI || 0);
  const umbrellaFee = Number(p.umbrellaFee || 0);
  const pension = Number(p.pension || 0);
  const studentLoan = Number(p.studentLoan || 0);
  const employerNI = Number(p.employerNI || 0);
  const net = Number(p.net || 0);

  const totalDeductions =
    incomeTax + employeeNI + umbrellaFee + pension + studentLoan;

  doc.setFillColor(TEAL.r, TEAL.g, TEAL.b);
  doc.rect(m, y, contentWidth, 72, "F");
  doc.setFillColor(TEAL_DARK.r, TEAL_DARK.g, TEAL_DARK.b);
  doc.rect(m + 14, y + 14, 44, 44, "F");
  if (String(branding.logoDataUrl || "").startsWith("data:image")) {
    try {
      doc.addImage(branding.logoDataUrl, "PNG", m + 18, y + 18, 36, 36);
    } catch {
      doc.setTextColor("#ffffff");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(branding.logoText || "OMB", m + 36, y + 42, { align: "center" });
    }
  } else {
    doc.setTextColor("#ffffff");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(branding.logoText || "OMB", m + 36, y + 42, { align: "center" });
  }
  doc.setTextColor("#ffffff");
  doc.setFontSize(11);
  doc.text(String(companyName || "PAYSAFE UMBRELLA").toUpperCase(), m + 70, y + 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(branding.headerTagline || "Contractor Payslip", m + 70, y + 45);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text(branding.payslipTitle || "PAYSLIP", m + contentWidth - 14, y + 28, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Payslip Ref: ${payslipId}`, m + contentWidth - 14, y + 45, { align: "right" });
  doc.text(`Paid Date: ${paidDate}`, m + contentWidth - 14, y + 59, { align: "right" });
  y += 90;

  const leftBoxW = contentWidth * 0.52;
  const rightBoxW = contentWidth - leftBoxW - 12;
  const boxH = 96;

  doc.setFillColor(245, 250, 250);
  doc.rect(m, y, leftBoxW, boxH, "F");
  doc.setFillColor(245, 250, 250);
  doc.rect(m + leftBoxW + 12, y, rightBoxW, boxH, "F");

  doc.setTextColor(TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Employee Details", m + 10, y + 16);
  doc.text("Payment Details", m + leftBoxW + 22, y + 16);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED);
  doc.setFontSize(9);
  doc.text(`Name: ${contractorName}`, m + 10, y + 34);
  doc.text(`Period: ${period}`, m + 10, y + 49);
  doc.text(`Tax Code: ${taxCode}`, m + 10, y + 64);
  doc.text(`Status: ${status}`, m + 10, y + 79);

  doc.text(`Company: ${companyName}`, m + leftBoxW + 22, y + 34);
  doc.text(`Payout Ref: ${payoutRef}`, m + leftBoxW + 22, y + 49);
  doc.text(`Net Pay Date: ${paidDate}`, m + leftBoxW + 22, y + 64);
  doc.text(companyAddress, m + leftBoxW + 22, y + 79, { maxWidth: rightBoxW - 24 });
  y += boxH + 18;

  const tableCols = [0.44, 0.12, 0.14, 0.14, 0.16];
  const headers = ["Description", "Code", "Units", "Rate", "Amount"];
  const rows = [
    ["Gross Pay", "E100", "1", "-", money(gross)],
    ["Income Tax", "D110", "1", "-", `-${money(incomeTax)}`],
    ["Employee NI", "D120", "1", "-", `-${money(employeeNI)}`],
    ["Umbrella Fee", "D130", "1", "-", `-${money(umbrellaFee)}`],
    ["Pension", "D140", "1", "-", `-${money(pension)}`],
  ];
  if (studentLoan > 0) rows.push(["Student Loan", "D150", "1", "-", `-${money(studentLoan)}`]);

  let x = m;
  doc.setFillColor(TEAL.r, TEAL.g, TEAL.b);
  doc.rect(m, y, contentWidth, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor("#ffffff");
  headers.forEach((h, index) => {
    const w = tableCols[index] * contentWidth;
    const align = index === 0 ? "left" : "right";
    if (align === "left") doc.text(h, x + 8, y + 16);
    else doc.text(h, x + w - 8, y + 16, { align: "right" });
    x += w;
  });
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  rows.forEach((row, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 250 : 244, 250, 250);
    doc.rect(m, y, contentWidth, 22, "F");
    x = m;
    row.forEach((cell, index) => {
      const w = tableCols[index] * contentWidth;
      const align = index === 0 ? "left" : "right";
      doc.setTextColor(TEXT);
      if (align === "left") doc.text(String(cell), x + 8, y + 15);
      else doc.text(String(cell), x + w - 8, y + 15, { align: "right" });
      x += w;
    });
    y += 22;
  });

  y += 16;
  const summaryX = m + contentWidth - 210;
  const summaryW = 210;
  const summaryRows = [
    { label: "Gross Pay", value: money(gross), strong: false },
    { label: "Total Deductions", value: money(totalDeductions), strong: false },
    { label: "Net Pay", value: money(net), strong: true },
  ];

  summaryRows.forEach((row) => {
    if (row.strong) {
      doc.setFillColor(TEAL.r, TEAL.g, TEAL.b);
      doc.setTextColor("#ffffff");
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setTextColor(TEXT);
    }
    doc.rect(summaryX, y, summaryW, 24, "F");
    doc.setFont("helvetica", row.strong ? "bold" : "normal");
    doc.setFontSize(10);
    doc.text(row.label, summaryX + 10, y + 16);
    doc.text(row.value, summaryX + summaryW - 10, y + 16, { align: "right" });
    y += 24;
  });

  y += 18;
  doc.setTextColor(MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Employer NI (not deducted from net pay): ${money(employerNI)}`, m, y);
  y += 12;
  doc.text("This is a system-generated payslip for payroll record and contractor reference.", m, y);

  doc.setDrawColor(220, 226, 230);
  doc.line(m, pageH - 48, m + contentWidth, pageH - 48);
  doc.setFontSize(8);
  doc.text(branding.footerText || `Payslip Ref: ${payslipId}   |   Generated: ${dateStr(new Date())}`, m, pageH - 34);

  const safe = (p.payslipId || p.id || "payslip").replace(/[^\w-]/g, "_");
  doc.save(`${safe}.pdf`);
}
