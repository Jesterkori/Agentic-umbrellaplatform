require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { query, run, initDb } = require("./db");
const { Server } = require("socket.io");
const http = require("http");

const app = express();
const server = http.createServer(app);
const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
].filter(Boolean));

const io = new Server(server, {
  cors: {
    origin: [...allowedOrigins],
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    port: Number(process.env.PORT || 4000),
  });
});

io.on('connection', (socket) => {
  if (process.env.NODE_ENV !== "production") {
    console.log('A user connected:', socket.id);
  }

  socket.on('disconnect', () => {
    if (process.env.NODE_ENV !== "production") {
      console.log('User disconnected:', socket.id);
    }
  });
});

const genId = (prefix) => `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const idempotencyStore = new Map();

const LEAVE_RULES = {
  ANNUAL: { paid: true, allowance: 28, accrualPeriod: "annual" },
  SICK: { paid: true, allowance: 0, accrualPeriod: "rolling" },
  MATERNITY: { paid: true, allowance: 52, accrualPeriod: "annual" },
  PATERNITY: { paid: true, allowance: 2, accrualPeriod: "annual" },
  UNPAID: { paid: false, allowance: 0, accrualPeriod: "none" },
};
const DELIVERABLE_WORKLOAD_MAX = 5;

function toIsoDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function workingDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return 0;
  let days = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) days += 1;
  }
  return days;
}

function overlapWindow(aStart, aEnd, bStart, bEnd) {
  const start = new Date(Math.max(new Date(aStart).getTime(), new Date(bStart).getTime()));
  const end = new Date(Math.min(new Date(aEnd).getTime(), new Date(bEnd).getTime()));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null;
  return { start, end };
}

async function getApprovedLeaveOverlaps(contractorId, weekStart, weekEnd) {
  const rows = await query(
    `SELECT * FROM leave_requests
     WHERE contractor_id=$1
       AND status='approved'
       AND start_date <= $3
       AND end_date >= $2`,
    [contractorId, weekStart, weekEnd]
  );
  return rows.rows;
}

function buildLeaveSummary(leaveRows, weekStart, weekEnd, rate) {
  const details = [];
  let totalLeaveDays = 0;
  let totalPaidLeaveDays = 0;
  let totalUnpaidLeaveDays = 0;
  for (const leave of leaveRows) {
    const overlap = overlapWindow(weekStart, weekEnd, leave.start_date, leave.end_date);
    if (!overlap) continue;
    const days = workingDaysBetween(overlap.start, overlap.end);
    if (!days) continue;
    const rule = LEAVE_RULES[leave.leave_type] || LEAVE_RULES.UNPAID;
    totalLeaveDays += days;
    if (rule.paid) totalPaidLeaveDays += days;
    else totalUnpaidLeaveDays += days;
    details.push({
      id: leave.id,
      leaveType: leave.leave_type,
      days,
      paid: rule.paid,
      startDate: overlap.start.toISOString().slice(0, 10),
      endDate: overlap.end.toISOString().slice(0, 10),
    });
  }
  return {
    totalLeaveDays,
    paidLeaveDays: totalPaidLeaveDays,
    unpaidLeaveDays: totalUnpaidLeaveDays,
    paidLeaveAmount: Math.round(totalPaidLeaveDays * Number(rate || 0)),
    details,
  };
}

function calculateOvertime(hours, weekStart, weekEnd, leaveSummary) {
  const workingDays = workingDaysBetween(weekStart, weekEnd);
  const availableWorkingDays = Math.max(0, workingDays - Number(leaveSummary.totalLeaveDays || 0));
  const regularHoursCap = availableWorkingDays * 8;
  const overtimeHours = Math.max(0, Number(hours || 0) - regularHoursCap);
  return { workingDays, availableWorkingDays, regularHoursCap, overtimeHours };
}

function mapLeaveRequest(row) {
  return {
    id: row.id,
    contractorId: row.contractor_id,
    contractorName: row.contractor_name,
    leaveType: row.leave_type,
    startDate: row.start_date,
    endDate: row.end_date,
    days: Number(row.days),
    status: row.status,
    reason: row.reason,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    rejectionReason: row.rejection_reason,
  };
}

function mapLeaveBalance(row) {
  return {
    id: row.id,
    contractorId: row.contractor_id,
    contractorName: row.contractor_name,
    leaveType: row.leave_type,
    totalAllowance: Number(row.total_allowance || 0),
    used: Number(row.used || 0),
    accrued: Number(row.accrued || 0),
    carryOver: Number(row.carry_over || 0),
    remaining: Number(row.remaining || 0),
    accrualPeriod: row.accrual_period,
    updatedAt: row.updated_at,
  };
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonValue(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeMilestones(milestones) {
  return parseJsonArray(milestones).map((milestone, index) => {
    if (typeof milestone === "string") {
      return {
        name: milestone,
        completed: false,
        completedAt: null,
        completedBy: null,
        approved: false,
        approvedAt: null,
        approvedBy: null,
        evidence: [],
        order: index,
      };
    }
    return {
      name: milestone?.name || `Milestone ${index + 1}`,
      completed: Boolean(milestone?.completed),
      completedAt: milestone?.completedAt || null,
      completedBy: milestone?.completedBy || null,
      approved: Boolean(milestone?.approved),
      approvedAt: milestone?.approvedAt || null,
      approvedBy: milestone?.approvedBy || null,
      evidence: parseJsonArray(milestone?.evidence),
      order: Number.isFinite(Number(milestone?.order)) ? Number(milestone.order) : index,
    };
  });
}

function completedMilestoneCount(milestones) {
  return normalizeMilestones(milestones).filter((milestone) => milestone.completed).length;
}

function approvedMilestoneCount(milestones) {
  return normalizeMilestones(milestones).filter((milestone) => milestone.approved).length;
}

function milestoneProgressCap(milestones) {
  const items = normalizeMilestones(milestones);
  if (!items.length) return 100;
  return Math.floor((approvedMilestoneCount(items) / items.length) * 100);
}

function progressHoursCap(actualHours, estimatedHours) {
  const estimated = Number(estimatedHours || 0);
  if (!estimated) return 100;
  const actual = Number(actualHours || 0);
  return Math.floor((actual / estimated) * 100);
}

function getDeliverableBonus(deliverableRow) {
  const qualityScore = Number(deliverableRow.quality_score || deliverableRow.client_rating || 0);
  const margin = Number(deliverableRow.profitability_margin || 0);
  const completed = Number(deliverableRow.progress || 0) >= 100 && String(deliverableRow.status || "").toLowerCase() === "completed";
  if (!completed) return 0;
  const baseBonus = 25;
  const qualityBonus = Math.max(0, Math.round((qualityScore || 0) * 10));
  const marginBonus = Math.max(0, Math.round(margin / 10));
  return roundCurrency(baseBonus + qualityBonus + marginBonus);
}

function mapDeliverableRow(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name || null,
    agencyId: row.agency_id || null,
    contractorId: row.contractor_id || null,
    contractorName: row.contractor_name || null,
    acceptedBy: row.accepted_by || null,
    acceptedAt: row.accepted_at || null,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    progress: Number(row.progress || 0),
    estimatedHours: Number(row.estimated_hours || 0),
    actualHours: Number(row.actual_hours || 0),
    milestones: normalizeMilestones(row.milestones),
    attachments: parseJsonArray(row.attachments),
    clientRating: row.client_rating != null ? Number(row.client_rating) : null,
    contractorNotes: row.contractor_notes || "",
    rejectionReason: row.rejection_reason || null,
    lastProgressUpdate: row.last_progress_update || null,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    revisionCount: Number(row.revision_count || 0),
    changeRequests: parseJsonValue(row.change_requests, []),
    profitabilityMargin: row.profitability_margin != null ? Number(row.profitability_margin) : null,
    completionEvidence: parseJsonValue(row.completion_evidence, []),
    qualityScore: row.quality_score != null ? Number(row.quality_score) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureLeaveBalance(contractorId, contractorName, leaveType) {
  const existing = await query(
    `SELECT * FROM leave_balances WHERE contractor_id=$1 AND leave_type=$2`,
    [contractorId, leaveType]
  );
  if (existing.rows.length) return existing.rows[0];
  const rule = LEAVE_RULES[leaveType] || LEAVE_RULES.UNPAID;
  const id = genId("lb");
  await query(
    `INSERT INTO leave_balances
     (id, contractor_id, contractor_name, leave_type, total_allowance, used, accrued, carry_over, remaining, accrual_period, updated_at)
     VALUES ($1,$2,$3,$4,$5,0,0,0,$6,$7,datetime('now'))`,
    [id, contractorId, contractorName, leaveType, rule.allowance, rule.allowance, rule.accrualPeriod]
  );
  const created = await query("SELECT * FROM leave_balances WHERE id=$1", [id]);
  return created.rows[0];
}

async function recalculateAnnualAccrual(contractorId) {
  const approved = await query(
    `SELECT COALESCE(SUM(hours),0) as total_hours
     FROM timesheets
     WHERE contractor_id=$1 AND status='WORK_APPROVED'`,
    [contractorId]
  );
  const totalHours = Number(approved.rows[0]?.total_hours || 0);
  const workedDays = totalHours / 8;
  return Number((workedDays / 20).toFixed(2));
}

async function maybeApplyCarryOver(balanceRow) {
  if (balanceRow.leave_type !== "ANNUAL") return balanceRow;
  const year = new Date().getFullYear();
  const check = await query(
    `SELECT id FROM leave_balance_history
     WHERE leave_balance_id=$1 AND change_type='carry_over' AND metadata LIKE $2
     LIMIT 1`,
    [balanceRow.id, `%\"year\":${year}%`]
  );
  if (check.rows.length) return balanceRow;
  const carry = Math.min(5, Math.max(0, Number(balanceRow.remaining || 0)));
  if (!carry) return balanceRow;
  const before = Number(balanceRow.remaining || 0);
  const after = before + carry;
  await query(
    `UPDATE leave_balances
     SET total_allowance=total_allowance+$1, carry_over=COALESCE(carry_over,0)+$1, remaining=remaining+$1, updated_at=datetime('now')
     WHERE id=$2`,
    [carry, balanceRow.id]
  );
  await query(
    `INSERT INTO leave_balance_history
     (id, contractor_id, leave_balance_id, change_type, delta, before_value, after_value, metadata)
     VALUES ($1,$2,$3,'carry_over',$4,$5,$6,$7)`,
    [genId("lbh"), balanceRow.contractor_id, balanceRow.id, carry, before, after, JSON.stringify({ year })]
  );
  const fresh = await query("SELECT * FROM leave_balances WHERE id=$1", [balanceRow.id]);
  return fresh.rows[0];
}

async function refreshLeaveBalance(contractorId, contractorName, leaveType) {
  const ensured = await ensureLeaveBalance(contractorId, contractorName, leaveType);
  let row = await maybeApplyCarryOver(ensured);
  const rule = LEAVE_RULES[leaveType] || LEAVE_RULES.UNPAID;
  if (leaveType === "ANNUAL") {
    const accrued = await recalculateAnnualAccrual(contractorId);
    const paidUsed = await query(
      `SELECT COALESCE(SUM(days),0) as used_days
       FROM leave_requests
       WHERE contractor_id=$1 AND leave_type='ANNUAL' AND status='approved'`,
      [contractorId]
    );
    const used = Number(paidUsed.rows[0]?.used_days || 0);
    const baseAllowance = rule.allowance + Number(row.carry_over || 0);
    const nextTotal = Math.max(baseAllowance, baseAllowance + accrued);
    const remaining = Number((nextTotal - used).toFixed(2));
    await query(
      `UPDATE leave_balances
       SET total_allowance=$1, accrued=$2, used=$3, remaining=$4, updated_at=datetime('now')
       WHERE id=$5`,
      [nextTotal, accrued, used, remaining, row.id]
    );
  }
  const updated = await query("SELECT * FROM leave_balances WHERE id=$1", [row.id]);
  return updated.rows[0];
}

function mapTimesheet(row) {
  return {
    id: row.id,
    contractorId: row.contractor_id,
    contractorName: row.contractor_name,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    hours: Number(row.hours),
    rate: Number(row.rate),
    gross: Number(row.gross),
    status: row.status,
    version: row.version,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    description: row.description,
    rejectionReason: row.rejection_reason,
    versions: row.versions ? JSON.parse(row.versions) : [],
  };
}

function mapInvoice(row) {
  const leaveSummary = row.leave_summary
    ? (typeof row.leave_summary === "string" ? JSON.parse(row.leave_summary) : row.leave_summary)
    : {};
  return {
    id: row.id,
    timesheetId: row.timesheet_id,
    contractorId: row.contractor_id,
    contractorName: row.contractor_name,
    agency: row.agency,
    umbrella: row.umbrella,
    invoiceNumber: row.invoice_number,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    hours: Number(row.hours || 0),
    rate: Number(row.rate || 0),
    gross: Number(row.gross),
    status: row.status,
    workRecordState: row.work_record_state,
    generatedAt: row.generated_at,
    approvedAt: row.approved_at,
    paidAt: row.paid_at,
    paymentRef: row.payment_ref,
    amountReceived: row.amount_received ? Number(row.amount_received) : null,
    isDraft: Boolean(Number(row.is_draft || 0)),
    leaveSummary,
    overtimeHours: Number(row.overtime_hours || 0),
    overtimeAmount: Number(row.overtime_amount || 0),
  };
}

function mapPayroll(row) {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    contractorId: row.contractor_id,
    contractorName: row.contractor_name,
    period: row.period,
    gross: Number(row.gross),
    incomeTax: Number(row.income_tax),
    employeeNI: Number(row.employee_ni),
    employerNI: Number(row.employer_ni),
    umbrellaFee: Number(row.umbrella_fee),
    pension: Number(row.pension),
    studentLoan: Number(row.student_loan),
    net: Number(row.net),
    taxCode: row.tax_code || "1257L",
    status: row.status,
    processedAt: row.processed_at,
    completedAt: row.completed_at,
    paymentDate: row.payment_date,
    payslipId: row.payslip_id,
    payoutReference: row.payout_reference,
    payoutAttempts: Number(row.payout_attempts || 0),
    payoutFailureReason: row.payout_failure_reason,
  };
}

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function getMissingKycFields(userRow) {
  if (!userRow) return ["contractor_record_missing"];
  const required = [
    ["mobile_number", "mobileNumber"],
    ["personal_email", "personalEmail"],
    ["address_line", "addressLine"],
    ["city", "city"],
    ["postcode", "postcode"],
    ["country", "country"],
    ["date_of_birth", "dateOfBirth"],
    ["bank_account_name", "bankAccountName"],
    ["bank_sort_code", "bankSortCode"],
    ["bank_account_number", "bankAccountNumber"],
  ];
  return required
    .filter(([dbField]) => !String(userRow[dbField] || "").trim())
    .map(([, apiField]) => apiField);
}

function computePayrollBreakdown(inv, options = {}) {
  const leaveSummary = inv.leave_summary ? JSON.parse(inv.leave_summary) : {};
  const unpaidLeaveDays = Number(leaveSummary.unpaidLeaveDays || 0);
  const unpaidLeaveDeduction = Math.round(unpaidLeaveDays * Number(inv.rate || 0));
  const deliverableBonus = Number(options.deliverableBonus || 0);
  const gross = Math.max(0, Number(inv.gross) - unpaidLeaveDeduction + deliverableBonus);
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));
  const taxRate = clamp(Number(options.taxRate) || 0.2, 0, 0.5);
  const niRate = clamp(Number(options.niRate) || 0.06, 0, 0.15);
  const employerNiRate = clamp(options.employerNiRate != null ? Number(options.employerNiRate) : 0.07, 0, 0.2);
  const umbrellaFee = clamp(options.umbrellaFee != null ? Number(options.umbrellaFee) : 250, 0, 50000);
  const pensionRate = clamp(Number(options.pensionRate) || 0.03, 0, 0.2);
  const studentLoan = clamp(Number(options.studentLoan) || 0, 0, 50000);
  const incomeTax = Math.round(gross * taxRate);
  const employeeNI = Math.round(gross * niRate);
  const employerNI = Math.round(gross * employerNiRate);
  const pension = Math.round(gross * pensionRate);
  const net = gross - incomeTax - employeeNI - umbrellaFee - pension - studentLoan;
  return {
    leaveSummary,
    unpaidLeaveDays,
    unpaidLeaveDeduction,
    deliverableBonus,
    gross,
    rates: { taxRate, niRate, employerNiRate, pensionRate },
    deductions: { incomeTax, employeeNI, employerNI, umbrellaFee, pension, studentLoan },
    net,
  };
}

async function evaluatePayrollSafeguards(inv) {
  const issues = [];
  const contractor = await query(
    `SELECT id, bank_verified, mobile_verified, mobile_number, personal_email, address_line, city, postcode, country,
            date_of_birth, bank_account_name, bank_sort_code, bank_account_number
     FROM users WHERE id=$1`,
    [inv.contractor_id]
  );
  const user = contractor.rows[0] || null;
  if (!user) {
    issues.push({ code: "CONTRACTOR_NOT_FOUND", severity: "blocking", message: "Contractor record for this invoice is missing." });
  } else {
    if (!Number(user.bank_verified)) {
      issues.push({ code: "BANK_VERIFICATION_MISSING", severity: "blocking", message: "Contractor bank account is not verified." });
    }
    if (!Number(user.mobile_verified)) {
      issues.push({ code: "MOBILE_VERIFICATION_MISSING", severity: "blocking", message: "Contractor mobile verification is incomplete." });
    }
    const missingKycFields = getMissingKycFields(user);
    if (missingKycFields.length) {
      issues.push({
        code: "KYC_INCOMPLETE",
        severity: "blocking",
        message: "Contractor KYC data is incomplete.",
        details: { missingFields: missingKycFields },
      });
    }
  }

  const pendingLeaves = await query(
    `SELECT id, leave_type, start_date, end_date
     FROM leave_requests
     WHERE contractor_id=$1
       AND status='pending'
       AND start_date <= $3
       AND end_date >= $2`,
    [inv.contractor_id, inv.week_start, inv.week_end]
  );
  if (pendingLeaves.rows.length) {
    issues.push({
      code: "UNRESOLVED_LEAVE_CONFLICT",
      severity: "blocking",
      message: "Pending leave requests overlap this payroll period.",
      details: {
        leaveRequestIds: pendingLeaves.rows.map((r) => r.id),
        overlapCount: pendingLeaves.rows.length,
      },
    });
  }

  const ts = await query("SELECT id, contractor_id, week_start, week_end FROM timesheets WHERE id=$1", [inv.timesheet_id]);
  if (ts.rows.length) {
    const t = ts.rows[0];
    const duplicates = await query(
      `SELECT id, status
       FROM timesheets
       WHERE contractor_id=$1
         AND week_start=$2
         AND week_end=$3
         AND id<>$4
         AND status IN ('WORK_SUBMITTED','WORK_APPROVED')`,
      [t.contractor_id, t.week_start, t.week_end, t.id]
    );
    if (duplicates.rows.length) {
      issues.push({
        code: "DUPLICATE_TIMESHEETS",
        severity: "blocking",
        message: "Duplicate timesheets exist for the same contractor and week.",
        details: { duplicateIds: duplicates.rows.map((r) => r.id), count: duplicates.rows.length },
      });
    }
  }

  return {
    ok: !issues.some((i) => i.severity === "blocking"),
    blockingIssueCount: issues.filter((i) => i.severity === "blocking").length,
    issues,
  };
}

async function buildPayrollAssessment(invoiceId, options = {}) {
  const invR = await query("SELECT * FROM invoices WHERE id = $1", [invoiceId]);
  if (!invR.rows.length) {
    const err = new Error("Invoice not found");
    err.status = 404;
    throw err;
  }
  const inv = invR.rows[0];
  const existingPayroll = await query("SELECT id FROM payrolls WHERE invoice_id=$1", [invoiceId]);
  const safeguards = await evaluatePayrollSafeguards(inv);
  const completedDeliverables = await query(
    `SELECT * FROM deliverables
     WHERE contractor_id=$1 AND status='completed' AND completed_at IS NOT NULL
     ORDER BY completed_at DESC`,
    [inv.contractor_id]
  );
  const deliverableBonus = completedDeliverables.rows.reduce((sum, deliverableRow) => sum + getDeliverableBonus(deliverableRow), 0);
  const breakdown = computePayrollBreakdown(inv, { ...options, deliverableBonus });
  const latestPayroll = await query(
    `SELECT * FROM payrolls WHERE contractor_id=$1 ORDER BY processed_at DESC LIMIT 1`,
    [inv.contractor_id]
  );

  const previous = latestPayroll.rows[0] || null;
  const previousNet = previous ? Number(previous.net || 0) : 0;
  const previousGross = previous ? Number(previous.gross || 0) : 0;
  const netDelta = breakdown.net - previousNet;
  const grossDelta = breakdown.gross - previousGross;
  const netDeltaPct = previousNet ? Number(((netDelta / previousNet) * 100).toFixed(2)) : null;
  const grossDeltaPct = previousGross ? Number(((grossDelta / previousGross) * 100).toFixed(2)) : null;

  return {
    invoice: {
      id: inv.id,
      contractorId: inv.contractor_id,
      contractorName: inv.contractor_name,
      status: inv.status,
      weekStart: inv.week_start,
      weekEnd: inv.week_end,
      originalGross: Number(inv.gross || 0),
      hasExistingPayroll: existingPayroll.rows.length > 0,
      deliverableBonus,
      completedDeliverables: completedDeliverables.rows.length,
    },
    safeguards,
    projection: {
      gross: roundCurrency(breakdown.gross),
      net: roundCurrency(breakdown.net),
      unpaidLeaveDays: roundCurrency(breakdown.unpaidLeaveDays),
      unpaidLeaveDeduction: roundCurrency(breakdown.unpaidLeaveDeduction),
      deliverableBonus: roundCurrency(breakdown.deliverableBonus),
      rates: breakdown.rates,
      deductions: {
        incomeTax: roundCurrency(breakdown.deductions.incomeTax),
        employeeNI: roundCurrency(breakdown.deductions.employeeNI),
        employerNI: roundCurrency(breakdown.deductions.employerNI),
        umbrellaFee: roundCurrency(breakdown.deductions.umbrellaFee),
        pension: roundCurrency(breakdown.deductions.pension),
        studentLoan: roundCurrency(breakdown.deductions.studentLoan),
      },
    },
    varianceReport: {
      baseline: previous
        ? {
            payrollId: previous.id,
            gross: roundCurrency(previousGross),
            net: roundCurrency(previousNet),
          }
        : null,
      deltas: {
        grossDelta: roundCurrency(grossDelta),
        grossDeltaPct,
        netDelta: roundCurrency(netDelta),
        netDeltaPct,
      },
      varianceFlag: Math.abs(Number(netDeltaPct || 0)) >= 20 || Math.abs(Number(grossDeltaPct || 0)) >= 20,
    },
  };
}

async function pushAudit(event, actor = "system", metadata = {}) {
  await query(
    `INSERT INTO audit_logs (id, event, actor, metadata) VALUES ($1, $2, $3, $4)`,
    [genId("audit-"), event, actor, JSON.stringify(metadata)]
  );
}

async function ensureColumn(table, column, ddl) {
  const check = await query(`SELECT name FROM pragma_table_info('${table}') WHERE name = $1`, [column]);
  if (!check.rows.length) {
    await query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

async function ensureTable(createSql) {
  await query(createSql);
}

async function reconcileLegacyPayrollStatuses() {
  // Older builds left processed payrolls in PAYROLL_COMPLETED, which hides them from
  // both HMRC and Contractor Payments queues in current UI logic.
  await query(
    `UPDATE payrolls
     SET status='PAYOUT_PENDING'
     WHERE status='PAYROLL_COMPLETED'
       AND id IN (
         SELECT payroll_id
         FROM hmrc_submissions
         WHERE payroll_id IS NOT NULL AND status='submitted'
       )`
  );

  await query(
    `UPDATE payrolls
     SET status='COMPLIANCE_PENDING'
     WHERE status='PAYROLL_COMPLETED'`
  );
}

async function reconcileSubmittedHmrcWithoutPayrollId() {
  const grouped = await query(
    `SELECT contractor_name, COUNT(1) as submitted_count
     FROM hmrc_submissions
     WHERE status='submitted'
       AND (payroll_id IS NULL OR payroll_id = '')
       AND contractor_name IS NOT NULL
     GROUP BY contractor_name`
  );

  for (const row of grouped.rows) {
    const contractorName = row.contractor_name;
    const submittedCount = Number(row.submitted_count || 0);
    if (!contractorName || submittedCount <= 0) continue;

    const pending = await query(
      `SELECT id
       FROM payrolls
       WHERE contractor_name=$1 AND status='COMPLIANCE_PENDING'
       ORDER BY processed_at ASC`,
      [contractorName]
    );
    if (!pending.rows.length) continue;

    // Promote up to the number of legacy submitted HMRC rows for that contractor.
    const toPromote = pending.rows.slice(0, submittedCount);
    for (const p of toPromote) {
      await query("UPDATE payrolls SET status='PAYOUT_PENDING' WHERE id=$1 AND status='COMPLIANCE_PENDING'", [p.id]);
    }
  }
}

function issueToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const [, token] = auth.split(" ");
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (_e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

function requireIdempotency(req, res, next) {
  const key = req.headers["x-idempotency-key"];
  if (!key) return next();
  const composite = `${req.method}:${req.path}:${key}`;
  if (idempotencyStore.has(composite)) {
    return res.status(409).json({ error: "Duplicate action blocked by idempotency key." });
  }
  idempotencyStore.set(composite, Date.now());
  return next();
}

async function hardenPasswords() {
  const users = await query("SELECT id, password_hash FROM users");
  for (const u of users.rows) {
    if (!u.password_hash || String(u.password_hash).startsWith("$2")) continue;
    const hashed = await bcrypt.hash(String(u.password_hash), 10);
    await query("UPDATE users SET password_hash=$1 WHERE id=$2", [hashed, u.id]);
  }
}

async function ensureDemoCredentials() {
  const demoHash = await bcrypt.hash("demo123", 10);
  await query(
    `UPDATE users
     SET password_hash=$1
     WHERE email IN ('contractor@demo.com','agency@demo.com','payroll@demo.com','client@demo.com')`,
    [demoHash]
  );
}

async function ensureDefaultLeaveBalances() {
  const contractors = await query("SELECT id, name FROM users WHERE role='contractor'");
  for (const c of contractors.rows) {
    await ensureLeaveBalance(c.id, c.name, "ANNUAL");
    await refreshLeaveBalance(c.id, c.name, "ANNUAL");
  }
}

app.get("/api/health", async (_req, res) => {
  try {
    await query("SELECT 1");
    res.json({ ok: true, service: "backend", db: "connected" });
  } catch (err) {
    res.status(500).json({ ok: false, service: "backend", db: "disconnected", error: err.message });
  }
});

function mapAgencyContractor(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    personalEmail: row.personal_email || "",
    agency: row.agency || "",
    umbrella: row.umbrella || "",
    taxCode: row.tax_code || "",
    rate: row.rate != null ? Number(row.rate) : null,
    mobileNumber: row.mobile_number || "",
    mobileVerified: Boolean(row.mobile_verified),
    bankVerified: Boolean(row.bank_verified),
    bankAccountName: row.bank_account_name || "",
    bankSortCode: row.bank_sort_code || "",
    bankAccountNumber: row.bank_account_number || "",
    addressLine: row.address_line || "",
    city: row.city || "",
    postcode: row.postcode || "",
    country: row.country || "",
    dateOfBirth: row.date_of_birth || "",
    skills: row.skills || "",
    resumeUrl: row.resume_url || "",
    profilePictureUrl: row.profile_picture_url || "",
    createdAt: row.created_at || null,
  };
}

app.get("/api/agency/contractors", requireAuth, requireRole("agency"), async (req, res) => {
  try {
    const me = await query("SELECT agency FROM users WHERE id=$1", [req.user.sub]);
    if (!me.rows.length) return res.status(404).json({ error: "User not found" });
    const myAgency = me.rows[0].agency || null;
    const cols = `id, email, name, agency, umbrella, tax_code, rate, mobile_number, mobile_verified, bank_verified,
      bank_account_name, bank_sort_code, bank_account_number,
      personal_email, address_line, city, postcode, country, date_of_birth, skills, resume_url, profile_picture_url, created_at`;
    let result;
    if (myAgency) {
      result = await query(
        `SELECT ${cols}
         FROM users
         WHERE role='contractor'
           AND (agency=$1 OR agency IS NULL OR TRIM(agency)='')
         ORDER BY LOWER(name)`,
        [myAgency]
      );
    } else {
      result = await query(`SELECT ${cols} FROM users WHERE role='contractor' ORDER BY LOWER(name)`);
    }
    res.json({ contractors: result.rows.map(mapAgencyContractor) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/client/assignments", requireAuth, requireRole("client"), async (req, res) => {
  try {
    const { title, description, dueDate } = req.body || {};
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }
    const me = await query("SELECT agency FROM users WHERE id=$1", [req.user.sub]);
    if (!me.rows.length) return res.status(404).json({ error: "User not found" });
    const myAgency = me.rows[0].agency;
    if (!myAgency) {
      return res.status(400).json({ error: "Client must be associated with an agency" });
    }
    const assignmentId = genId("asg");
    const submittedAt = new Date().toISOString();
    await query(
      `INSERT INTO assignments (id, client_id, agency, title, description, status, submitted_at, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [assignmentId, req.user.sub, myAgency, title, description || "", "submitted", submittedAt, dueDate || null]
    );
    const assignment = {
      id: assignmentId,
      clientId: req.user.sub,
      agency: myAgency,
      title,
      description: description || "",
      status: "submitted",
      submittedAt,
      dueDate: dueDate || null,
    };
    await pushAudit("assignment.submitted", req.user?.name || "client", { assignmentId, agency: myAgency });
    res.json({ assignment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/client/assignments", requireAuth, requireRole("client"), async (req, res) => {
  try {
    const sql = `SELECT id, client_id, agency, contractor_id, contractor_name, title, description, status, submitted_at, assigned_at, due_date FROM assignments WHERE client_id=$1 ORDER BY submitted_at DESC`;
    const result = await query(sql, [req.user.sub]);
    res.json({
      assignments: result.rows.map(r => ({
        id: r.id,
        clientId: r.client_id,
        agency: r.agency,
        contractorId: r.contractor_id,
        contractorName: r.contractor_name,
        title: r.title,
        description: r.description,
        status: r.status,
        submittedAt: r.submitted_at,
        assignedAt: r.assigned_at,
        dueDate: r.due_date,
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deliverables endpoints
app.post("/api/client/deliverables", requireAuth, requireRole("client"), async (req, res) => {
  try {
    const { title, description, priority, dueDate, estimatedHours = 0, milestones = [], attachments = [], templateId = null } = req.body || {};
    if (!title) return res.status(400).json({ error: "Title is required" });
    let nextMilestones = normalizeMilestones(milestones);
    let nextEstimatedHours = Number(estimatedHours || 0);
    if (templateId) {
      const template = await query("SELECT * FROM deliverable_templates WHERE id=$1", [templateId]);
      if (!template.rows.length) return res.status(404).json({ error: "Template not found" });
      const templateRow = template.rows[0];
      if (!nextMilestones.length) {
        nextMilestones = normalizeMilestones(templateRow.default_milestones);
      }
      if (!nextEstimatedHours) {
        nextEstimatedHours = Number(templateRow.estimated_hours || 0);
      }
    }
    const deliverableId = genId("del");
    const createdAt = new Date().toISOString();
    await query(
      `INSERT INTO deliverables
       (id, client_id, title, description, priority, status, progress, estimated_hours, actual_hours, milestones, attachments, due_date, revision_count, change_requests, profitability_margin, completion_evidence, quality_score, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'submitted',0,$6,0,$7,$8,$9,0,'[]','0','[]',NULL,$10,$10)`,
      [deliverableId, req.user.sub, title, description || "", priority || "medium", nextEstimatedHours, JSON.stringify(nextMilestones), JSON.stringify(attachments || []), dueDate || null, createdAt]
    );
    const created = await query(
      `SELECT d.*, c.name as client_name, con.name as contractor_name
       FROM deliverables d
       JOIN users c ON c.id=d.client_id
       LEFT JOIN users con ON con.id=d.contractor_id
       WHERE d.id=$1`,
      [deliverableId]
    );
    await pushAudit("deliverable.created", req.user?.name || "client", { deliverableId });
    io.emit("deliverable:updated", mapDeliverableRow(created.rows[0]));
    res.json({ deliverable: mapDeliverableRow(created.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/agency/deliverables", requireAuth, requireRole("agency"), async (req, res) => {
  try {
    const me = await query("SELECT agency FROM users WHERE id=$1", [req.user.sub]);
    const myAgency = me.rows[0]?.agency || null;
    const sql = `
      SELECT d.*, c.name as client_name, con.name as contractor_name
      FROM deliverables d
      JOIN users c ON d.client_id = c.id
      LEFT JOIN users con ON d.contractor_id = con.id
      WHERE d.agency_id = $1
         OR (d.agency_id IS NULL AND ($2 IS NULL OR c.agency = $2 OR d.contractor_id IS NULL))
      ORDER BY d.created_at DESC
    `;
    const result = await query(sql, [req.user.sub, myAgency]);
     const workload = await query(
      `SELECT contractor_id, COUNT(1) as active_count
       FROM deliverables
       WHERE contractor_id IS NOT NULL AND status IN ('pending_acceptance','accepted','in_progress','changes_requested')
       GROUP BY contractor_id`
    );
    const workloadByContractor = Object.fromEntries(workload.rows.map(r => [r.contractor_id, Number(r.active_count)]));
    res.json({ deliverables: result.rows.map(mapDeliverableRow), workloadByContractor, workloadLimit: DELIVERABLE_WORKLOAD_MAX });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/client/deliverables", requireAuth, requireRole("client"), async (req, res) => {
  try {
    const sql = `
      SELECT d.*, c.name as client_name, con.name as contractor_name
      FROM deliverables d
      JOIN users c ON c.id=d.client_id
      LEFT JOIN users con ON d.contractor_id = con.id
      WHERE d.client_id = $1
      ORDER BY d.created_at DESC
    `;
    const result = await query(sql, [req.user.sub]);
    res.json({ deliverables: result.rows.map(mapDeliverableRow) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/contractor/deliverables", requireAuth, requireRole("contractor"), async (req, res) => {
  try {
    const sql = `
      SELECT d.*, c.name as client_name
      FROM deliverables d
      JOIN users c ON d.client_id = c.id
      WHERE d.contractor_id = $1
      ORDER BY d.created_at DESC
    `;
    const result = await query(sql, [req.user.sub]);
    res.json({ deliverables: result.rows.map(mapDeliverableRow) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/agency/deliverables/:id/assign", requireAuth, requireRole("agency"), async (req, res) => {
  try {
    const { id } = req.params;
    const { contractorId } = req.body || {};
    if (!contractorId) return res.status(400).json({ error: "Contractor ID is required" });

    const me = await query("SELECT agency FROM users WHERE id=$1", [req.user.sub]);
    const myAgency = me.rows[0]?.agency || null;
    const deliverable = await query(
      `SELECT d.*
       FROM deliverables d
       JOIN users c ON c.id=d.client_id
       WHERE d.id=$1
         AND (d.agency_id=$2 OR d.agency_id IS NULL OR ($3 IS NOT NULL AND c.agency=$3))`,
      [id, req.user.sub, myAgency]
    );
    if (!deliverable.rows.length) return res.status(404).json({ error: "Deliverable not found or not accessible" });

    const contractor = await query(
      `SELECT id, name, agency
       FROM users
       WHERE id=$1
         AND role='contractor'
         AND (agency=$2 OR agency IS NULL OR TRIM(agency)='')`,
      [contractorId, myAgency]
    );
    if (!contractor.rows.length) return res.status(400).json({ error: "Invalid contractor" });

    if (myAgency && (!contractor.rows[0].agency || !String(contractor.rows[0].agency).trim())) {
      await query("UPDATE users SET agency=$1 WHERE id=$2", [myAgency, contractorId]);
    }

    const workload = await query(
      `SELECT COUNT(1) as active_count
       FROM deliverables
       WHERE contractor_id=$1 AND status IN ('pending_acceptance','accepted','in_progress','changes_requested')`,
      [contractorId]
    );
    const activeCount = Number(workload.rows[0]?.active_count || 0);
    if (activeCount >= DELIVERABLE_WORKLOAD_MAX) {
      return res.status(409).json({ error: `Contractor workload limit reached (${DELIVERABLE_WORKLOAD_MAX}).` });
    }

    await query(
      `UPDATE deliverables
       SET contractor_id=$1, agency_id=$2, accepted_by=NULL, accepted_at=NULL, rejection_reason=NULL,
           status='pending_acceptance', progress=0, updated_at=$3
       WHERE id=$4`,
      [contractorId, req.user.sub, new Date().toISOString(), id]
    );
    const updated = await query(
      `SELECT d.*, c.name as client_name, con.name as contractor_name
       FROM deliverables d
       JOIN users c ON c.id=d.client_id
       LEFT JOIN users con ON con.id=d.contractor_id
       WHERE d.id=$1`,
      [id]
    );
    await pushAudit("deliverable.assigned", req.user?.name || "agency", { deliverableId: id, contractorId });
    io.emit("deliverable:updated", mapDeliverableRow(updated.rows[0]));
    res.json({ success: true, deliverable: mapDeliverableRow(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/contractor/deliverables/:id/accept", requireAuth, requireRole("contractor"), requireIdempotency, async (req, res) => {
  try {
    const { id } = req.params;
    const row = await query("SELECT * FROM deliverables WHERE id=$1", [id]);
    if (!row.rows.length) return res.status(404).json({ error: "Deliverable not found" });
    const d = row.rows[0];
    if (d.contractor_id !== req.user.sub) return res.status(403).json({ error: "Not your deliverable" });
    if (d.status !== "pending_acceptance") return res.status(400).json({ error: "Deliverable is not awaiting acceptance." });

    const workload = await query(
      `SELECT COUNT(1) as active_count
       FROM deliverables
       WHERE contractor_id=$1 AND status IN ('accepted','in_progress')`,
      [req.user.sub]
    );
    const activeCount = Number(workload.rows[0]?.active_count || 0);
    if (activeCount >= DELIVERABLE_WORKLOAD_MAX) {
      return res.status(409).json({ error: `You already have ${DELIVERABLE_WORKLOAD_MAX} active deliverables.` });
    }

    const now = new Date().toISOString();
    await query(
      `UPDATE deliverables
       SET status='accepted', accepted_by=$1, accepted_at=$2, updated_at=$2
       WHERE id=$3`,
      [req.user.sub, now, id]
    );
    const updated = await query(
      `SELECT d.*, c.name as client_name, con.name as contractor_name
       FROM deliverables d
       JOIN users c ON c.id=d.client_id
       LEFT JOIN users con ON con.id=d.contractor_id
       WHERE d.id=$1`,
      [id]
    );
    await pushAudit("deliverable.accepted", req.user?.name || "contractor", { deliverableId: id });
    io.emit("deliverable:updated", mapDeliverableRow(updated.rows[0]));
    res.json({ success: true, deliverable: mapDeliverableRow(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/contractor/deliverables/:id/reject", requireAuth, requireRole("contractor"), requireIdempotency, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const row = await query("SELECT * FROM deliverables WHERE id=$1", [id]);
    if (!row.rows.length) return res.status(404).json({ error: "Deliverable not found" });
    const d = row.rows[0];
    if (d.contractor_id !== req.user.sub) return res.status(403).json({ error: "Not your deliverable" });
    if (!["pending_acceptance", "assigned"].includes(d.status)) {
      return res.status(400).json({ error: "Deliverable cannot be rejected in current state." });
    }
    const now = new Date().toISOString();
    await query(
      `UPDATE deliverables
       SET status='submitted', contractor_id=NULL, accepted_by=NULL, accepted_at=NULL, rejection_reason=$1, updated_at=$2
       WHERE id=$3`,
      [reason || "Rejected by contractor", now, id]
    );
    const updated = await query(
      `SELECT d.*, c.name as client_name, con.name as contractor_name
       FROM deliverables d
       JOIN users c ON c.id=d.client_id
       LEFT JOIN users con ON con.id=d.contractor_id
       WHERE d.id=$1`,
      [id]
    );
    await pushAudit("deliverable.rejected_by_contractor", req.user?.name || "contractor", { deliverableId: id, reason: reason || "" });
    io.emit("deliverable:updated", mapDeliverableRow(updated.rows[0]));
    res.json({ success: true, deliverable: mapDeliverableRow(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/deliverables/:id/progress", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { progress, actualHours, contractorNotes, attachments } = req.body || {};
    const row = await query("SELECT * FROM deliverables WHERE id=$1", [id]);
    if (!row.rows.length) return res.status(404).json({ error: "Deliverable not found" });
    const d = row.rows[0];
    const canUpdate =
      (req.user.role === "contractor" && d.contractor_id === req.user.sub) ||
      req.user.role === "agency";
    if (!canUpdate) return res.status(403).json({ error: "Unauthorized" });

    const currentProgress = Number(d.progress || 0);
    const nextProgress = Math.max(0, Math.min(100, Number(progress ?? d.progress ?? 0)));
    const nextActualHours = Number(actualHours ?? d.actual_hours ?? 0);
    const milestones = normalizeMilestones(d.milestones);
    const completedCount = completedMilestoneCount(milestones);
    const milestoneCap = milestoneProgressCap(milestones);
    const hoursCap = progressHoursCap(nextActualHours, d.estimated_hours);
    const allowedCap = Math.min(100, Math.max(0, Math.min(milestoneCap, hoursCap + 5)));

    if (req.user.role === "contractor" && nextProgress > currentProgress + 25) {
      return res.status(400).json({ error: "Progress jump too large. Update milestones or evidence first." });
    }
    if (nextProgress > 0 && nextActualHours <= 0) {
      return res.status(400).json({ error: "Actual hours are required before progress can be updated." });
    }
    if (nextProgress > allowedCap) {
      return res.status(400).json({
        error: `Progress cannot exceed completed milestones and actual hours. Allowed maximum is ${allowedCap}%.`,
        allowedProgress: allowedCap,
        milestoneProgressCap: milestoneCap,
        hoursProgressCap: hoursCap,
      });
    }
    if (nextProgress >= 100 && milestones.length && !milestones.every((m) => m.completed && m.approved)) {
      return res.status(400).json({
        error: "All milestones must be manually completed and approved before progress can reach 100%.",
      });
    }

    const nextStatus = nextProgress >= 100 && milestones.length && milestones.every((m) => m.approved)
      ? "completed"
      : (d.status === "accepted" || d.status === "changes_requested" ? "in_progress" : d.status);
    const now = new Date().toISOString();
    const profitabilityMargin = Number(d.estimated_hours || 0)
      ? roundCurrency(((Number(d.estimated_hours || 0) - Number(nextActualHours || 0)) / Number(d.estimated_hours || 0)) * 100)
      : null;

    await query(
      `UPDATE deliverables
       SET progress=$1,
           actual_hours=$2,
           contractor_notes=$3,
           attachments=$4,
           profitability_margin=$5,
           status=$6,
           completed_at=CASE WHEN $6='completed' THEN $7 ELSE completed_at END,
           last_progress_update=$7,
           updated_at=$7
       WHERE id=$8`,
      [
        nextProgress,
        nextActualHours,
        contractorNotes ?? d.contractor_notes ?? "",
        JSON.stringify(attachments ?? parseJsonArray(d.attachments)),
        profitabilityMargin,
        nextStatus,
        now,
        id,
      ]
    );

    const updated = await query(
      `SELECT d.*, c.name as client_name, con.name as contractor_name
       FROM deliverables d
       JOIN users c ON c.id=d.client_id
       LEFT JOIN users con ON con.id=d.contractor_id
       WHERE d.id=$1`,
      [id]
    );
    await pushAudit("deliverable.progress_updated", req.user?.name || req.user.role, { deliverableId: id, progress: nextProgress });
    io.emit("deliverable:updated", mapDeliverableRow(updated.rows[0]));
    res.json({ success: true, deliverable: mapDeliverableRow(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/deliverables/:id/milestones/:index/complete", requireAuth, async (req, res) => {
  try {
    const { id, index } = req.params;
    const row = await query("SELECT * FROM deliverables WHERE id=$1", [id]);
    if (!row.rows.length) return res.status(404).json({ error: "Deliverable not found" });
    const d = row.rows[0];
    const allowed =
      (req.user.role === "contractor" && d.contractor_id === req.user.sub) ||
      req.user.role === "agency";
    if (!allowed) return res.status(403).json({ error: "Unauthorized" });
    const milestoneIndex = Number(index);
    const milestones = normalizeMilestones(d.milestones);
    if (!Number.isInteger(milestoneIndex) || milestoneIndex < 0 || milestoneIndex >= milestones.length) {
      return res.status(400).json({ error: "Invalid milestone index" });
    }
    milestones[milestoneIndex] = {
      ...milestones[milestoneIndex],
      completed: true,
      completedAt: new Date().toISOString(),
      completedBy: req.user.sub,
    };
    const completedCount = completedMilestoneCount(milestones);
    const progressValue = milestones.length ? Math.floor((completedCount / milestones.length) * 100) : 0;
    await query(
      `UPDATE deliverables
       SET milestones=$1,
           progress=$2,
           status=CASE WHEN $3 THEN 'completed' ELSE status END,
           completed_at=CASE WHEN $3 THEN $4 ELSE completed_at END,
           updated_at=$4
       WHERE id=$5`,
      [JSON.stringify(milestones), progressValue, milestones.every((m) => m.completed && m.approved), new Date().toISOString(), id]
    );
    const updated = await query(
      `SELECT d.*, c.name as client_name, con.name as contractor_name
       FROM deliverables d
       JOIN users c ON c.id=d.client_id
       LEFT JOIN users con ON con.id=d.contractor_id
       WHERE d.id=$1`,
      [id]
    );
    await pushAudit("deliverable.milestone_completed", req.user?.name || req.user.role, { deliverableId: id, milestoneIndex });
    io.emit("deliverable:updated", mapDeliverableRow(updated.rows[0]));
    res.json({ success: true, deliverable: mapDeliverableRow(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/deliverables/:id/milestones/:index/approve", requireAuth, requireRole("client"), async (req, res) => {
  try {
    const { id, index } = req.params;
    const row = await query("SELECT * FROM deliverables WHERE id=$1", [id]);
    if (!row.rows.length) return res.status(404).json({ error: "Deliverable not found" });
    const d = row.rows[0];
    if (d.client_id !== req.user.sub) return res.status(403).json({ error: "Unauthorized" });
    const milestoneIndex = Number(index);
    const milestones = normalizeMilestones(d.milestones);
    if (!Number.isInteger(milestoneIndex) || milestoneIndex < 0 || milestoneIndex >= milestones.length) {
      return res.status(400).json({ error: "Invalid milestone index" });
    }
    if (!milestones[milestoneIndex].completed) {
      return res.status(400).json({ error: "Milestone must be completed before approval." });
    }
    milestones[milestoneIndex] = {
      ...milestones[milestoneIndex],
      approved: true,
      approvedAt: new Date().toISOString(),
      approvedBy: req.user.sub,
    };
    const allApproved = milestones.length ? milestones.every((m) => m.approved) : false;
    const now = new Date().toISOString();
    await query(
      `UPDATE deliverables
       SET milestones=$1,
           progress=CASE WHEN $2 THEN 100 ELSE progress END,
           status=CASE WHEN $2 THEN 'completed' ELSE status END,
           completed_at=CASE WHEN $2 THEN $3 ELSE completed_at END,
           updated_at=$3
       WHERE id=$4`,
      [JSON.stringify(milestones), allApproved, now, id]
    );
    const updated = await query(
      `SELECT d.*, c.name as client_name, con.name as contractor_name
       FROM deliverables d
       JOIN users c ON c.id=d.client_id
       LEFT JOIN users con ON con.id=d.contractor_id
       WHERE d.id=$1`,
      [id]
    );
    await pushAudit("deliverable.milestone_approved", req.user?.name || req.user.role, { deliverableId: id, milestoneIndex });
    io.emit("deliverable:updated", mapDeliverableRow(updated.rows[0]));
    res.json({ success: true, deliverable: mapDeliverableRow(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/deliverables/:id/evidence", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { milestoneIndex = null, evidenceFiles = [], notes = "" } = req.body || {};
    const row = await query("SELECT * FROM deliverables WHERE id=$1", [id]);
    if (!row.rows.length) return res.status(404).json({ error: "Deliverable not found" });
    const d = row.rows[0];
    const canUpload =
      (req.user.role === "contractor" && d.contractor_id === req.user.sub) ||
      req.user.role === "agency" ||
      (req.user.role === "client" && d.client_id === req.user.sub);
    if (!canUpload) return res.status(403).json({ error: "Unauthorized" });
    const evidence = {
      id: genId("ev"),
      milestoneIndex: milestoneIndex == null ? null : Number(milestoneIndex),
      evidenceFiles: parseJsonArray(evidenceFiles),
      notes,
      submittedBy: req.user.sub,
      submittedAt: new Date().toISOString(),
    };
    const completionEvidence = parseJsonValue(d.completion_evidence, []);
    completionEvidence.push(evidence);
    const milestones = normalizeMilestones(d.milestones);
    if (evidence.milestoneIndex != null && milestones[evidence.milestoneIndex]) {
      milestones[evidence.milestoneIndex] = {
        ...milestones[evidence.milestoneIndex],
        evidence: [...(milestones[evidence.milestoneIndex].evidence || []), evidence],
      };
    }
    await query(
      `UPDATE deliverables
       SET completion_evidence=$1,
           milestones=$2,
           updated_at=$3
       WHERE id=$4`,
      [JSON.stringify(completionEvidence), JSON.stringify(milestones), evidence.submittedAt, id]
    );
    await query(
      `INSERT INTO milestone_evidence (id, deliverable_id, milestone_index, uploaded_by, notes, files, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [evidence.id, id, evidence.milestoneIndex, req.user.sub, notes, JSON.stringify(evidence.evidenceFiles), evidence.submittedAt]
    );
    const updated = await query(
      `SELECT d.*, c.name as client_name, con.name as contractor_name
       FROM deliverables d
       JOIN users c ON c.id=d.client_id
       LEFT JOIN users con ON con.id=d.contractor_id
       WHERE d.id=$1`,
      [id]
    );
    await pushAudit("deliverable.evidence_added", req.user?.name || req.user.role, { deliverableId: id, milestoneIndex: evidence.milestoneIndex });
    io.emit("deliverable:updated", mapDeliverableRow(updated.rows[0]));
    res.json({ success: true, deliverable: mapDeliverableRow(updated.rows[0]), evidence });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/deliverables/:id/change-request", requireAuth, requireRole("client"), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, changes = [], priority = "medium" } = req.body || {};
    const row = await query("SELECT * FROM deliverables WHERE id=$1", [id]);
    if (!row.rows.length) return res.status(404).json({ error: "Deliverable not found" });
    const d = row.rows[0];
    if (d.client_id !== req.user.sub) return res.status(403).json({ error: "Unauthorized" });
    const changeRequest = {
      id: genId("cr"),
      reason: reason || "Changes requested",
      changes: parseJsonArray(changes),
      priority,
      createdBy: req.user.sub,
      createdAt: new Date().toISOString(),
    };
    const changeRequests = parseJsonValue(d.change_requests, []);
    changeRequests.push(changeRequest);
    const revisionCount = Number(d.revision_count || 0) + 1;
    await query(
      `UPDATE deliverables
       SET change_requests=$1,
           revision_count=$2,
           status='changes_requested',
           updated_at=$3
       WHERE id=$4`,
      [JSON.stringify(changeRequests), revisionCount, changeRequest.createdAt, id]
    );
    await query(
      `INSERT INTO deliverable_revisions (id, deliverable_id, milestone_index, revision_type, notes, attachments, requested_by, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        changeRequest.id,
        id,
        null,
        "change_request",
        changeRequest.reason,
        JSON.stringify(changeRequest.changes),
        req.user.sub,
        "open",
        changeRequest.createdAt,
        changeRequest.createdAt,
      ]
    );
    const updated = await query(
      `SELECT d.*, c.name as client_name, con.name as contractor_name
       FROM deliverables d
       JOIN users c ON c.id=d.client_id
       LEFT JOIN users con ON con.id=d.contractor_id
       WHERE d.id=$1`,
      [id]
    );
    await pushAudit("deliverable.change_requested", req.user?.name || req.user.role, { deliverableId: id });
    io.emit("deliverable:updated", mapDeliverableRow(updated.rows[0]));
    res.json({ success: true, deliverable: mapDeliverableRow(updated.rows[0]), changeRequest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/deliverables/:id/profitability", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const row = await query("SELECT * FROM deliverables WHERE id=$1", [id]);
    if (!row.rows.length) return res.status(404).json({ error: "Deliverable not found" });
    const d = row.rows[0];
    const canView =
      (req.user.role === "contractor" && d.contractor_id === req.user.sub) ||
      (req.user.role === "client" && d.client_id === req.user.sub) ||
      req.user.role === "agency";
    if (!canView) return res.status(403).json({ error: "Unauthorized" });
    const estimated = Number(d.estimated_hours || 0);
    const actual = Number(d.actual_hours || 0);
    const qualityScore = Number(d.quality_score || d.client_rating || 0);
    const margin = Number(d.profitability_margin != null ? d.profitability_margin : (estimated ? ((estimated - actual) / estimated) * 100 : 0));
    const bonus = getDeliverableBonus(d);
    res.json({
      success: true,
      profitability: {
        estimatedHours: estimated,
        actualHours: actual,
        varianceHours: roundCurrency(estimated - actual),
        profitabilityMargin: roundCurrency(margin),
        qualityScore: roundCurrency(qualityScore),
        bonus,
        adjustedValue: roundCurrency(Math.max(0, estimated * Number(d.priority === "high" ? 1.2 : 1) + bonus)),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/deliverables/templates", requireAuth, requireRole("agency"), async (req, res) => {
  try {
    const { title, description = "", defaultMilestones = [], estimatedHours = 0 } = req.body || {};
    if (!title) return res.status(400).json({ error: "Title is required" });
    const id = genId("tpl");
    const createdAt = new Date().toISOString();
    await query(
      `INSERT INTO deliverable_templates (id, agency_id, title, description, default_milestones, estimated_hours, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, req.user.sub, title, description || "", JSON.stringify(parseJsonArray(defaultMilestones)), Number(estimatedHours || 0), createdAt]
    );
    const created = await query("SELECT * FROM deliverable_templates WHERE id=$1", [id]);
    res.json({ success: true, template: created.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/deliverables/templates", requireAuth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT *
       FROM deliverable_templates
       WHERE is_active = 1 OR is_active IS NULL
       ORDER BY created_at DESC`
    );
    res.json({
      templates: rows.rows.map((template) => ({
        ...template,
        defaultMilestones: parseJsonArray(template.default_milestones),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/deliverables/:id/status", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ error: "Status is required" });
    const row = await query("SELECT * FROM deliverables WHERE id=$1", [id]);
    if (!row.rows.length) return res.status(404).json({ error: "Deliverable not found" });
    const d = row.rows[0];
    const allowed =
      (req.user.role === "contractor" && d.contractor_id === req.user.sub) ||
      (req.user.role === "client" && d.client_id === req.user.sub) ||
      req.user.role === "agency";
    if (!allowed) return res.status(403).json({ error: "Unauthorized" });

    if (status === "completed") {
      const milestones = normalizeMilestones(d.milestones);
      if (milestones.length && !milestones.every((m) => m.completed && m.approved)) {
        return res.status(400).json({ error: "All milestones must be completed and approved before marking the deliverable complete." });
      }
    }

    const now = new Date().toISOString();
    await query(
      `UPDATE deliverables
       SET status=$1,
           completed_at=CASE WHEN $1='completed' THEN $2 ELSE completed_at END,
           progress=CASE WHEN $1='completed' THEN 100 ELSE progress END,
           updated_at=$2
       WHERE id=$3`,
      [status, now, id]
    );
    const updated = await query(
      `SELECT d.*, c.name as client_name, con.name as contractor_name
       FROM deliverables d
       JOIN users c ON c.id=d.client_id
       LEFT JOIN users con ON con.id=d.contractor_id
       WHERE d.id=$1`,
      [id]
    );
    io.emit("deliverable:updated", mapDeliverableRow(updated.rows[0]));
    res.json({ deliverable: mapDeliverableRow(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/deliverables/:id/messages", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const d = await query("SELECT client_id, contractor_id FROM deliverables WHERE id=$1", [id]);
    if (!d.rows.length) return res.status(404).json({ error: "Deliverable not found" });
    const row = d.rows[0];
    const allowed = req.user.role === "agency" || row.client_id === req.user.sub || row.contractor_id === req.user.sub;
    if (!allowed) return res.status(403).json({ error: "Unauthorized" });
    const messages = await query("SELECT * FROM deliverable_messages WHERE deliverable_id=$1 ORDER BY created_at ASC", [id]);
    res.json({
      messages: messages.rows.map(m => ({
        id: m.id,
        deliverableId: m.deliverable_id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        senderRole: m.sender_role,
        message: m.message,
        attachments: parseJsonArray(m.attachments),
        createdAt: m.created_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/deliverables/:id/messages", requireAuth, requireIdempotency, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, attachments = [] } = req.body || {};
    if (!message || !String(message).trim()) return res.status(400).json({ error: "Message is required" });
    const d = await query("SELECT client_id, contractor_id FROM deliverables WHERE id=$1", [id]);
    if (!d.rows.length) return res.status(404).json({ error: "Deliverable not found" });
    const row = d.rows[0];
    const allowed = req.user.role === "agency" || row.client_id === req.user.sub || row.contractor_id === req.user.sub;
    if (!allowed) return res.status(403).json({ error: "Unauthorized" });
    const messageId = genId("msg");
    await query(
      `INSERT INTO deliverable_messages
       (id, deliverable_id, sender_id, sender_name, sender_role, message, attachments, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [messageId, id, req.user.sub, req.user.name || req.user.role, req.user.role, String(message).trim(), JSON.stringify(attachments || []), new Date().toISOString()]
    );
    const created = await query("SELECT * FROM deliverable_messages WHERE id=$1", [messageId]);
    const out = {
      id: created.rows[0].id,
      deliverableId: created.rows[0].deliverable_id,
      senderId: created.rows[0].sender_id,
      senderName: created.rows[0].sender_name,
      senderRole: created.rows[0].sender_role,
      message: created.rows[0].message,
      attachments: parseJsonArray(created.rows[0].attachments),
      createdAt: created.rows[0].created_at,
    };
    io.emit("deliverable:message_added", out);
    await pushAudit("deliverable.message_added", req.user?.name || req.user.role, { deliverableId: id, messageId });
    res.json({ success: true, message: out });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/deliverables/:id/rate", requireAuth, requireRole("client"), requireIdempotency, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body || {};
    const value = Number(rating);
    if (!Number.isFinite(value) || value < 1 || value > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5." });
    }
    const row = await query("SELECT * FROM deliverables WHERE id=$1", [id]);
    if (!row.rows.length) return res.status(404).json({ error: "Deliverable not found" });
    const d = row.rows[0];
    if (d.client_id !== req.user.sub) return res.status(403).json({ error: "Only the client can rate this deliverable." });
    if (d.status !== "completed") return res.status(400).json({ error: "Deliverable must be completed before rating." });
    await query("UPDATE deliverables SET client_rating=$1, updated_at=$2 WHERE id=$3", [value, new Date().toISOString(), id]);
    const updated = await query(
      `SELECT d.*, c.name as client_name, con.name as contractor_name
       FROM deliverables d
       JOIN users c ON c.id=d.client_id
       LEFT JOIN users con ON con.id=d.contractor_id
       WHERE d.id=$1`,
      [id]
    );
    await pushAudit("deliverable.rated", req.user?.name || "client", { deliverableId: id, rating: value });
    io.emit("deliverable:updated", mapDeliverableRow(updated.rows[0]));
    res.json({ success: true, deliverable: mapDeliverableRow(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/agency/assignments", requireAuth, requireRole("agency"), async (req, res) => {
  try {
    const me = await query("SELECT agency FROM users WHERE id=$1", [req.user.sub]);
    if (!me.rows.length) return res.status(404).json({ error: "User not found" });
    const myAgency = me.rows[0].agency;
    const sql = myAgency
      ? `SELECT id, client_id, agency, contractor_id, contractor_name, title, description, status, submitted_at, assigned_at, due_date FROM assignments WHERE agency=$1 ORDER BY submitted_at DESC`
      : `SELECT id, client_id, agency, contractor_id, contractor_name, title, description, status, submitted_at, assigned_at, due_date FROM assignments ORDER BY submitted_at DESC`;
    const result = myAgency ? await query(sql, [myAgency]) : await query(sql);
    res.json({
      assignments: result.rows.map(r => ({
        id: r.id,
        clientId: r.client_id,
        agency: r.agency,
        contractorId: r.contractor_id,
        contractorName: r.contractor_name,
        title: r.title,
        description: r.description,
        status: r.status,
        submittedAt: r.submitted_at,
        assignedAt: r.assigned_at,
        dueDate: r.due_date,
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/agency/assignments/:id/assign", requireAuth, requireRole("agency"), async (req, res) => {
  try {
    const { id } = req.params;
    const { contractorId } = req.body || {};
    if (!contractorId) {
      return res.status(400).json({ error: "Contractor ID is required" });
    }
    const me = await query("SELECT agency FROM users WHERE id=$1", [req.user.sub]);
    if (!me.rows.length) return res.status(404).json({ error: "User not found" });
    const myAgency = me.rows[0].agency;
    const assignment = await query("SELECT id, agency, status FROM assignments WHERE id=$1", [id]);
    if (!assignment.rows.length) return res.status(404).json({ error: "Assignment not found" });
    const asg = assignment.rows[0];
    if (myAgency && asg.agency !== myAgency) {
      return res.status(403).json({ error: "Assignment does not belong to your agency" });
    }
    if (asg.status !== "submitted") {
      return res.status(400).json({ error: "Assignment is not in submitted status" });
    }
    const contractor = await query("SELECT id, name, agency FROM users WHERE id=$1 AND role='contractor'", [contractorId]);
    if (!contractor.rows.length) return res.status(404).json({ error: "Contractor not found" });
    const contractorRow = contractor.rows[0];
    if (myAgency && contractorRow.agency !== myAgency) {
      return res.status(403).json({ error: "Contractor must belong to your agency" });
    }
    const assignedAt = new Date().toISOString();
    await query(
      "UPDATE assignments SET contractor_id=$1, contractor_name=$2, status='assigned', assigned_at=$3 WHERE id=$4",
      [contractorRow.id, contractorRow.name, assignedAt, id]
    );
    const updated = await query("SELECT * FROM assignments WHERE id=$1", [id]);
    const row = updated.rows[0];
    const result = {
      id: row.id,
      clientId: row.client_id,
      agency: row.agency,
      contractorId: row.contractor_id,
      contractorName: row.contractor_name,
      title: row.title,
      description: row.description,
      status: row.status,
      submittedAt: row.submitted_at,
      assignedAt: row.assigned_at,
      dueDate: row.due_date,
    };
    await pushAudit("assignment.assigned", req.user?.name || "agency", { assignmentId: id, contractorId });
    res.json({ assignment: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();
    const result = await query(
      `SELECT id, email, role, name, agency, umbrella, tax_code, rate,
              bank_account_name, bank_sort_code, bank_account_number, mobile_number, bank_verified,
              mobile_verified, personal_email, address_line, city, postcode, country, date_of_birth,
              skills, resume_url, profile_picture_url, password_hash
       FROM users
       WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );
    if (!result.rows.length) return res.status(401).json({ error: "Invalid email or password" });
    const u = result.rows[0];
    const ok = await bcrypt.compare(password || "", u.password_hash || "");
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });
    const token = issueToken(u);
    res.json({
      token,
      user: {
        id: u.id,
        email: u.email,
        role: u.role,
        name: u.name,
        agency: u.agency,
        umbrella: u.umbrella,
        taxCode: u.tax_code,
        rate: u.rate ? Number(u.rate) : null,
        bankAccountName: u.bank_account_name,
        bankSortCode: u.bank_sort_code,
        bankAccountNumber: u.bank_account_number,
        mobileNumber: u.mobile_number,
        bankVerified: Boolean(u.bank_verified),
        mobileVerified: Boolean(u.mobile_verified),
        personalEmail: u.personal_email,
        addressLine: u.address_line,
        city: u.city,
        postcode: u.postcode,
        country: u.country,
        dateOfBirth: u.date_of_birth,
        skills: u.skills || "",
        resumeUrl: u.resume_url || "",
        profilePictureUrl: u.profile_picture_url || "",
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const normalizedEmail = String(email).trim().toLowerCase();
    
    const existing = await query("SELECT id FROM users WHERE LOWER(email) = $1", [normalizedEmail]);
    if (existing.rows.length) {
      return res.status(409).json({ error: "Email already exists" });
    }
    
    const id = genId("u");
    const passwordHash = await bcrypt.hash(password, 10);
    
    await query(
      `INSERT INTO users (id, email, password_hash, role, name)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, normalizedEmail, passwordHash, role, name]
    );
    
    const u = {
      id,
      email: normalizedEmail,
      role,
      name,
      agency: null,
      umbrella: null,
      tax_code: null,
      rate: null,
      bank_account_name: null,
      bank_sort_code: null,
      bank_account_number: null,
      mobile_number: null,
      bank_verified: 0,
      mobile_verified: 0,
      personal_email: null,
      address_line: null,
      city: null,
      postcode: null,
      country: null,
      date_of_birth: null,
      skills: "",
      resume_url: "",
      profile_picture_url: ""
    };
    
    const token = issueToken(u);
    res.json({
      token,
      user: {
        id: u.id,
        email: u.email,
        role: u.role,
        name: u.name,
        agency: u.agency,
        umbrella: u.umbrella,
        taxCode: u.tax_code,
        rate: u.rate,
        bankAccountName: u.bank_account_name,
        bankSortCode: u.bank_sort_code,
        bankAccountNumber: u.bank_account_number,
        mobileNumber: u.mobile_number,
        bankVerified: false,
        mobileVerified: false,
        personalEmail: u.personal_email,
        addressLine: u.address_line,
        city: u.city,
        postcode: u.postcode,
        country: u.country,
        dateOfBirth: u.date_of_birth,
        skills: u.skills,
        resumeUrl: u.resume_url,
        profilePictureUrl: u.profile_picture_url,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/me/profile", requireAuth, requireRole("contractor"), requireIdempotency, async (req, res) => {
  try {
    const {
      name,
      personalEmail,
      mobileNumber,
      addressLine,
      city,
      postcode,
      country,
      dateOfBirth,
      skills,
      resumeUrl,
      profilePictureUrl,
    } = req.body || {};
    const current = await query(
      `SELECT id, name, personal_email, mobile_number, address_line, city, postcode, country, date_of_birth, skills, resume_url, profile_picture_url
       FROM users WHERE id=$1`,
      [req.user.sub]
    );
    if (!current.rows.length) return res.status(404).json({ error: "User not found" });
    const before = current.rows[0];
    const nextMobile = (mobileNumber ?? before.mobile_number ?? "").trim();
    const mobileChanged = nextMobile !== String(before.mobile_number || "").trim();
    await query(
      `UPDATE users
       SET name=$1, personal_email=$2, mobile_number=$3, address_line=$4, city=$5, postcode=$6, country=$7, date_of_birth=$8, skills=$9, resume_url=$10, profile_picture_url=$11,
           mobile_verified = CASE WHEN $12 THEN 0 ELSE COALESCE(mobile_verified, 0) END
       WHERE id=$13`,
      [
        name || before.name,
        personalEmail ?? before.personal_email,
        nextMobile,
        addressLine ?? before.address_line,
        city ?? before.city,
        postcode ?? before.postcode,
        country ?? before.country,
        dateOfBirth ?? before.date_of_birth,
        skills ?? before.skills,
        resumeUrl ?? before.resume_url,
        profilePictureUrl ?? before.profile_picture_url,
        mobileChanged ? 1 : 0,
        req.user.sub,
      ]
    );
    const user = await query(
      `SELECT id, email, role, name, agency, umbrella, tax_code, rate,
              bank_account_name, bank_sort_code, bank_account_number, mobile_number, bank_verified, mobile_verified,
              personal_email, address_line, city, postcode, country, date_of_birth, skills, resume_url, profile_picture_url
       FROM users WHERE id=$1`,
      [req.user.sub]
    );
    const u = user.rows[0];
    await pushAudit("profile.updated", req.user?.name || "contractor", { userId: req.user.sub });
    res.json({
      success: true,
      user: {
        id: u.id,
        email: u.email,
        role: u.role,
        name: u.name,
        agency: u.agency,
        umbrella: u.umbrella,
        taxCode: u.tax_code,
        rate: u.rate ? Number(u.rate) : null,
        bankAccountName: u.bank_account_name,
        bankSortCode: u.bank_sort_code,
        bankAccountNumber: u.bank_account_number,
        mobileNumber: u.mobile_number,
        bankVerified: Boolean(u.bank_verified),
        mobileVerified: Boolean(u.mobile_verified),
        personalEmail: u.personal_email,
        addressLine: u.address_line,
        city: u.city,
        postcode: u.postcode,
        country: u.country,
        dateOfBirth: u.date_of_birth,
        skills: u.skills || "",
        resumeUrl: u.resume_url || "",
        profilePictureUrl: u.profile_picture_url || "",
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/me/mobile/send-otp", requireAuth, requireRole("contractor"), requireIdempotency, async (req, res) => {
  try {
    const user = await query("SELECT id, mobile_number FROM users WHERE id=$1", [req.user.sub]);
    if (!user.rows.length) return res.status(404).json({ error: "User not found" });
    const mobile = user.rows[0].mobile_number;
    if (!mobile) return res.status(400).json({ error: "No mobile number found." });
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await query("UPDATE users SET mobile_otp_code=$1, mobile_otp_expires_at=$2 WHERE id=$3", [otp, expiresAt, req.user.sub]);
    await pushAudit("mobile_otp.sent", req.user?.name || "contractor", { userId: req.user.sub, mobile });
    res.json({
      success: true,
      message: `OTP sent to ${mobile}`,
      ...(process.env.NODE_ENV !== "production" ? { otp } : {}),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/me/mobile/verify-otp", requireAuth, requireRole("contractor"), requireIdempotency, async (req, res) => {
  try {
    const { otp } = req.body || {};
    if (!otp) return res.status(400).json({ error: "OTP is required." });
    const user = await query("SELECT id, mobile_otp_code, mobile_otp_expires_at FROM users WHERE id=$1", [req.user.sub]);
    if (!user.rows.length) return res.status(404).json({ error: "User not found" });
    const row = user.rows[0];
    if (!row.mobile_otp_code || !row.mobile_otp_expires_at) {
      return res.status(400).json({ error: "No active OTP. Please request a new one." });
    }
    if (new Date(row.mobile_otp_expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: "OTP expired. Please request a new one." });
    }
    if (String(otp).trim() !== String(row.mobile_otp_code).trim()) {
      return res.status(400).json({ error: "Invalid OTP." });
    }
    await query(
      "UPDATE users SET mobile_verified=1, mobile_otp_code=NULL, mobile_otp_expires_at=NULL WHERE id=$1",
      [req.user.sub]
    );
    const updated = await query(
      `SELECT id, email, role, name, agency, umbrella, tax_code, rate, bank_account_name, bank_sort_code, bank_account_number, mobile_number, bank_verified, mobile_verified,
              personal_email, address_line, city, postcode, country, date_of_birth, skills, resume_url, profile_picture_url
       FROM users WHERE id=$1`,
      [req.user.sub]
    );
    const u = updated.rows[0];
    await pushAudit("mobile_otp.verified", req.user?.name || "contractor", { userId: req.user.sub });
    res.json({
      success: true,
      user: {
        id: u.id,
        email: u.email,
        role: u.role,
        name: u.name,
        agency: u.agency,
        umbrella: u.umbrella,
        taxCode: u.tax_code,
        rate: u.rate ? Number(u.rate) : null,
        bankAccountName: u.bank_account_name,
        bankSortCode: u.bank_sort_code,
        bankAccountNumber: u.bank_account_number,
        mobileNumber: u.mobile_number,
        bankVerified: Boolean(u.bank_verified),
        mobileVerified: Boolean(u.mobile_verified),
        personalEmail: u.personal_email,
        addressLine: u.address_line,
        city: u.city,
        postcode: u.postcode,
        country: u.country,
        dateOfBirth: u.date_of_birth,
        skills: u.skills || "",
        resumeUrl: u.resume_url || "",
        profilePictureUrl: u.profile_picture_url || "",
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/me/bank-details", requireAuth, requireRole("contractor"), requireIdempotency, async (req, res) => {
  try {
    const { bankAccountName, bankSortCode, bankAccountNumber } = req.body || {};
    if (!bankAccountName || !bankSortCode || !bankAccountNumber) {
      return res.status(400).json({ error: "All bank detail fields are required." });
    }
    await query(
      `UPDATE users
       SET bank_account_name=$1, bank_sort_code=$2, bank_account_number=$3, bank_verified=0
       WHERE id=$4`,
      [bankAccountName, bankSortCode, bankAccountNumber, req.user.sub]
    );
    await pushAudit("bank_details.updated", req.user?.name || "contractor", { userId: req.user.sub });
    const user = await query(
      `SELECT id, email, role, name, agency, umbrella, tax_code, rate,
              bank_account_name, bank_sort_code, bank_account_number, mobile_number, bank_verified, mobile_verified,
              personal_email, address_line, city, postcode, country, date_of_birth, skills, resume_url, profile_picture_url
       FROM users WHERE id=$1`,
      [req.user.sub]
    );
    const u = user.rows[0];
    res.json({
      success: true,
      user: {
        id: u.id,
        email: u.email,
        role: u.role,
        name: u.name,
        agency: u.agency,
        umbrella: u.umbrella,
        taxCode: u.tax_code,
        rate: u.rate ? Number(u.rate) : null,
        bankAccountName: u.bank_account_name,
        bankSortCode: u.bank_sort_code,
        bankAccountNumber: u.bank_account_number,
        mobileNumber: u.mobile_number,
        bankVerified: Boolean(u.bank_verified),
        mobileVerified: Boolean(u.mobile_verified),
        personalEmail: u.personal_email,
        addressLine: u.address_line,
        city: u.city,
        postcode: u.postcode,
        country: u.country,
        dateOfBirth: u.date_of_birth,
        skills: u.skills || "",
        resumeUrl: u.resume_url || "",
        profilePictureUrl: u.profile_picture_url || "",
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/me/bank-details/send-otp", requireAuth, requireRole("contractor"), requireIdempotency, async (req, res) => {
  try {
    const user = await query("SELECT id, mobile_number FROM users WHERE id=$1", [req.user.sub]);
    if (!user.rows.length) return res.status(404).json({ error: "User not found" });
    const mobile = user.rows[0].mobile_number;
    if (!mobile) return res.status(400).json({ error: "No linked mobile number found for OTP." });
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await query(
      "UPDATE users SET bank_otp_code=$1, bank_otp_expires_at=$2 WHERE id=$3",
      [otp, expiresAt, req.user.sub]
    );
    await pushAudit("bank_otp.sent", req.user?.name || "contractor", { userId: req.user.sub, mobile });
    res.json({
      success: true,
      message: `OTP sent to ${mobile}`,
      ...(process.env.NODE_ENV !== "production" ? { otp } : {}),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/me/bank-details/verify-otp", requireAuth, requireRole("contractor"), requireIdempotency, async (req, res) => {
  try {
    const { otp } = req.body || {};
    if (!otp) return res.status(400).json({ error: "OTP is required." });
    const user = await query(
      "SELECT id, bank_otp_code, bank_otp_expires_at FROM users WHERE id=$1",
      [req.user.sub]
    );
    if (!user.rows.length) return res.status(404).json({ error: "User not found" });
    const row = user.rows[0];
    if (!row.bank_otp_code || !row.bank_otp_expires_at) {
      return res.status(400).json({ error: "No active OTP. Please request a new one." });
    }
    if (new Date(row.bank_otp_expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: "OTP expired. Please request a new one." });
    }
    if (String(otp).trim() !== String(row.bank_otp_code).trim()) {
      return res.status(400).json({ error: "Invalid OTP." });
    }
    await query(
      "UPDATE users SET bank_verified=1, bank_otp_code=NULL, bank_otp_expires_at=NULL WHERE id=$1",
      [req.user.sub]
    );
    await pushAudit("bank_otp.verified", req.user?.name || "contractor", { userId: req.user.sub });
    const updated = await query(
      `SELECT id, email, role, name, agency, umbrella, tax_code, rate,
              bank_account_name, bank_sort_code, bank_account_number, mobile_number, bank_verified, mobile_verified,
              personal_email, address_line, city, postcode, country, date_of_birth, skills, resume_url, profile_picture_url
       FROM users WHERE id=$1`,
      [req.user.sub]
    );
    const u = updated.rows[0];
    res.json({
      success: true,
      user: {
        id: u.id,
        email: u.email,
        role: u.role,
        name: u.name,
        agency: u.agency,
        umbrella: u.umbrella,
        taxCode: u.tax_code,
        rate: u.rate ? Number(u.rate) : null,
        bankAccountName: u.bank_account_name,
        bankSortCode: u.bank_sort_code,
        bankAccountNumber: u.bank_account_number,
        mobileNumber: u.mobile_number,
        bankVerified: Boolean(u.bank_verified),
        mobileVerified: Boolean(u.mobile_verified),
        personalEmail: u.personal_email,
        addressLine: u.address_line,
        city: u.city,
        postcode: u.postcode,
        country: u.country,
        dateOfBirth: u.date_of_birth,
        skills: u.skills || "",
        resumeUrl: u.resume_url || "",
        profilePictureUrl: u.profile_picture_url || "",
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/leave/requests", requireAuth, async (req, res) => {
  try {
    let rows;
    if (req.user.role === "contractor") {
      rows = await query("SELECT * FROM leave_requests WHERE contractor_id=$1 ORDER BY submitted_at DESC", [req.user.sub]);
    } else if (req.user.role === "agency") {
      rows = await query(
        `SELECT lr.*
         FROM leave_requests lr
         JOIN users u ON u.id = lr.contractor_id
         WHERE u.agency = (SELECT agency FROM users WHERE id=$1)
         ORDER BY lr.submitted_at DESC`,
        [req.user.sub]
      );
    } else {
      rows = await query("SELECT * FROM leave_requests ORDER BY submitted_at DESC");
    }
    res.json({ leaveRequests: rows.rows.map(mapLeaveRequest) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/leave/requests", requireAuth, requireRole("contractor"), requireIdempotency, async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body || {};
    if (!leaveType || !startDate || !endDate) {
      return res.status(400).json({ error: "leaveType, startDate and endDate are required." });
    }
    const rule = LEAVE_RULES[leaveType];
    if (!rule) return res.status(400).json({ error: "Unsupported leave type." });
    const s = toIsoDate(startDate);
    const e = toIsoDate(endDate);
    if (!s || !e || s > e) return res.status(400).json({ error: "Invalid leave period." });
    const days = workingDaysBetween(s, e);
    if (days <= 0) return res.status(400).json({ error: "Leave must include at least one working day." });

    const overlap = await query(
      `SELECT id FROM leave_requests
       WHERE contractor_id=$1
         AND status IN ('pending','approved')
         AND start_date <= $3
         AND end_date >= $2
       LIMIT 1`,
      [req.user.sub, s, e]
    );
    if (overlap.rows.length) {
      return res.status(409).json({ error: "Leave request overlaps an existing request." });
    }

    const me = await query("SELECT id, name FROM users WHERE id=$1", [req.user.sub]);
    if (!me.rows.length) return res.status(404).json({ error: "User not found" });
    const contractorName = me.rows[0].name;

    const balance = await refreshLeaveBalance(req.user.sub, contractorName, leaveType);
    if (rule.paid && Number(balance.remaining || 0) < days) {
      return res.status(400).json({ error: `Insufficient ${leaveType} balance. Remaining: ${balance.remaining} days.` });
    }

    const id = genId("lr");
    await query(
      `INSERT INTO leave_requests
       (id, contractor_id, contractor_name, leave_type, start_date, end_date, days, status, reason, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,datetime('now'))`,
      [id, req.user.sub, contractorName, leaveType, s, e, days, reason || ""]
    );
    const created = await query("SELECT * FROM leave_requests WHERE id=$1", [id]);
    await pushAudit("leave.requested", req.user?.name || contractorName, { leaveRequestId: id, leaveType, days });
    io.emit("leave:request_updated", mapLeaveRequest(created.rows[0]));
    res.json({ success: true, leaveRequest: mapLeaveRequest(created.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/leave/requests/:id/approve", requireAuth, requireRole("agency"), requireIdempotency, async (req, res) => {
  try {
    const { id } = req.params;
    await run("BEGIN TRANSACTION");
    const reqRow = await query("SELECT * FROM leave_requests WHERE id=$1", [id]);
    if (!reqRow.rows.length) throw new Error("Leave request not found.");
    const leaveRequest = reqRow.rows[0];
    if (leaveRequest.status !== "pending") throw new Error("Only pending leave requests can be approved.");
    const rule = LEAVE_RULES[leaveRequest.leave_type] || LEAVE_RULES.UNPAID;

    let updatedBalance = null;
    if (rule.paid) {
      const refreshed = await refreshLeaveBalance(leaveRequest.contractor_id, leaveRequest.contractor_name, leaveRequest.leave_type);
      const before = Number(refreshed.remaining || 0);
      const days = Number(leaveRequest.days || 0);
      if (before < days) throw new Error(`Insufficient leave balance. Remaining ${before} days.`);
      const after = Number((before - days).toFixed(2));
      await query(
        `UPDATE leave_balances
         SET used=used+$1, remaining=$2, updated_at=datetime('now')
         WHERE id=$3`,
        [days, after, refreshed.id]
      );
      await query(
        `INSERT INTO leave_balance_history
         (id, contractor_id, leave_balance_id, leave_request_id, change_type, delta, before_value, after_value, metadata)
         VALUES ($1,$2,$3,$4,'deduction',$5,$6,$7,$8)`,
        [genId("lbh"), leaveRequest.contractor_id, refreshed.id, leaveRequest.id, -days, before, after, JSON.stringify({ leaveType: leaveRequest.leave_type })]
      );
      const fresh = await query("SELECT * FROM leave_balances WHERE id=$1", [refreshed.id]);
      updatedBalance = fresh.rows[0];
    }

    await query(
      `UPDATE leave_requests
       SET status='approved', approved_at=datetime('now'), approved_by=$1, rejection_reason=NULL
       WHERE id=$2`,
      [req.user?.name || "agency", id]
    );

    // Cascade: validate overlapping submitted timesheets and auto-reject obvious conflicts.
    const overlaps = await query(
      `SELECT * FROM timesheets
       WHERE contractor_id=$1
         AND status='WORK_SUBMITTED'
         AND week_start <= $3
         AND week_end >= $2`,
      [leaveRequest.contractor_id, leaveRequest.start_date, leaveRequest.end_date]
    );
    for (const ts of overlaps.rows) {
      const approvedLeaves = await getApprovedLeaveOverlaps(ts.contractor_id, ts.week_start, ts.week_end);
      const summary = buildLeaveSummary(approvedLeaves.concat([leaveRequest]), ts.week_start, ts.week_end, ts.rate);
      const overtime = calculateOvertime(ts.hours, ts.week_start, ts.week_end, summary);
      if (Number(ts.hours) > overtime.regularHoursCap + 16) {
        await query(
          `UPDATE timesheets
           SET status='WORK_REJECTED', rejection_reason=$1
           WHERE id=$2`,
          ["Auto-rejected: submitted hours conflict with approved leave.", ts.id]
        );
        await pushAudit("timesheet.auto_rejected", "system", { timesheetId: ts.id, leaveRequestId: leaveRequest.id });
      }
    }

    // Cascade: refresh draft invoices for overlapping approved timesheets.
    const draftInvoices = await query(
      `SELECT i.*, t.week_start, t.week_end, t.hours, t.rate, t.contractor_id
       FROM invoices i
       JOIN timesheets t ON t.id = i.timesheet_id
       WHERE i.is_draft=1
         AND t.contractor_id=$1
         AND t.week_start <= $3
         AND t.week_end >= $2`,
      [leaveRequest.contractor_id, leaveRequest.start_date, leaveRequest.end_date]
    );
    for (const inv of draftInvoices.rows) {
      const approvedLeaves = await getApprovedLeaveOverlaps(inv.contractor_id, inv.week_start, inv.week_end);
      const summary = buildLeaveSummary(approvedLeaves, inv.week_start, inv.week_end, inv.rate);
      const overtime = calculateOvertime(inv.hours, inv.week_start, inv.week_end, summary);
      const overtimeAmount = Math.round(overtime.overtimeHours * Number(inv.rate || 0) * 1.25);
      await query(
        `UPDATE invoices
         SET leave_summary=$1, overtime_hours=$2, overtime_amount=$3
         WHERE id=$4`,
        [JSON.stringify(summary), overtime.overtimeHours, overtimeAmount, inv.id]
      );
      const refreshed = await query("SELECT * FROM invoices WHERE id=$1", [inv.id]);
      io.emit("invoice:updated", mapInvoice(refreshed.rows[0]));
    }

    await run("COMMIT");
    const updatedRequest = await query("SELECT * FROM leave_requests WHERE id=$1", [id]);
    await pushAudit("leave.approved", req.user?.name || "agency", { leaveRequestId: id });
    io.emit("leave:request_updated", mapLeaveRequest(updatedRequest.rows[0]));
    if (updatedBalance) io.emit("leave:balance_updated", mapLeaveBalance(updatedBalance));
    res.json({ success: true, leaveRequest: mapLeaveRequest(updatedRequest.rows[0]), leaveBalance: updatedBalance ? mapLeaveBalance(updatedBalance) : null });
  } catch (err) {
    await run("ROLLBACK");
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/leave/requests/:id/reject", requireAuth, requireRole("agency"), requireIdempotency, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const reqRow = await query("SELECT * FROM leave_requests WHERE id=$1", [id]);
    if (!reqRow.rows.length) return res.status(404).json({ error: "Leave request not found." });
    if (reqRow.rows[0].status !== "pending") return res.status(400).json({ error: "Only pending leave requests can be rejected." });
    await query(
      `UPDATE leave_requests
       SET status='rejected', approved_at=NULL, approved_by=NULL, rejection_reason=$1
       WHERE id=$2`,
      [reason || "Rejected by agency.", id]
    );
    const updated = await query("SELECT * FROM leave_requests WHERE id=$1", [id]);
    await pushAudit("leave.rejected", req.user?.name || "agency", { leaveRequestId: id, reason: reason || "" });
    io.emit("leave:request_updated", mapLeaveRequest(updated.rows[0]));
    res.json({ success: true, leaveRequest: mapLeaveRequest(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/bootstrap", async (_req, res) => {
  try {
    const [timesheets, invoices, payrolls, disputes, hmrc, audits, liabilities, batches, periods, leaveRequests, leaveBalances] = await Promise.all([
      query("SELECT * FROM timesheets ORDER BY submitted_at DESC"),
      query("SELECT * FROM invoices ORDER BY generated_at DESC"),
      query("SELECT * FROM payrolls ORDER BY processed_at DESC"),
      query("SELECT * FROM disputes ORDER BY raised_at DESC"),
      query("SELECT * FROM hmrc_submissions ORDER BY COALESCE(submitted_at, datetime('now')) DESC"),
      query("SELECT * FROM audit_logs ORDER BY at DESC LIMIT 200"),
      query("SELECT * FROM payroll_liabilities ORDER BY created_at DESC"),
      query("SELECT * FROM payroll_batches ORDER BY created_at DESC"),
      query("SELECT * FROM payroll_periods ORDER BY period_key DESC"),
      query("SELECT * FROM leave_requests ORDER BY submitted_at DESC"),
      query("SELECT * FROM leave_balances ORDER BY updated_at DESC"),
    ]);
    res.json({
      timesheets: timesheets.rows.map(mapTimesheet),
      invoices: invoices.rows.map(mapInvoice),
      payrolls: payrolls.rows.map(mapPayroll),
      disputes: disputes.rows.map(d => ({
        id: d.id, type: d.type, invoiceId: d.invoice_id, invoiceNumber: d.invoice_number,
        contractorName: d.contractor_name, expected: d.expected ? Number(d.expected) : null,
        received: d.received ? Number(d.received) : null, shortfall: d.shortfall ? Number(d.shortfall) : null,
        status: d.status, raisedAt: d.raised_at, resolvedAt: d.resolved_at, notes: d.notes,
      })),
      hmrcSubmissions: hmrc.rows.map(h => ({
        id: h.id, payrollId: h.payroll_id, type: h.type, contractorName: h.contractor_name, period: h.period,
        tax: Number(h.tax), ni: Number(h.ni), total: Number(h.total),
        status: h.status, submittedAt: h.submitted_at, ref: h.ref,
      })),
      payrollLiabilities: liabilities.rows.map(l => ({
        id: l.id, payrollId: l.payroll_id, contractorId: l.contractor_id, hmrcTax: Number(l.hmrc_tax),
        hmrcNi: Number(l.hmrc_ni), pension: Number(l.pension), status: l.status, createdAt: l.created_at, settledAt: l.settled_at,
      })),
      payrollBatches: batches.rows.map(b => ({
        id: b.id, periodKey: b.period_key, payrollCount: Number(b.payroll_count), totalNet: Number(b.total_net),
        status: b.status, createdBy: b.created_by, createdAt: b.created_at, submittedAt: b.submitted_at, bankReference: b.bank_reference,
      })),
      payrollPeriods: periods.rows.map(p => ({
        periodKey: p.period_key, status: p.status, closedBy: p.closed_by, closedAt: p.closed_at, notes: p.notes,
      })),
      leaveRequests: leaveRequests.rows.map(mapLeaveRequest),
      leaveBalances: leaveBalances.rows.map(mapLeaveBalance),
      auditLogs: audits.rows.map(a => ({ id: a.id, event: a.event, actor: a.actor, at: a.at, metadata: a.metadata ? JSON.parse(a.metadata) : {} })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/timesheets", requireAuth, requireRole("contractor"), requireIdempotency, async (req, res) => {
  try {
    const { contractorId, contractorName, weekStart, weekEnd, hours, rate, description } = req.body;
    const start = toIsoDate(weekStart);
    const end = toIsoDate(weekEnd);
    const submittedHours = Number(hours || 0);
    const payRate = Number(rate || 0);
    if (!start || !end || start > end) {
      return res.status(400).json({ error: "Invalid week range." });
    }
    if (!Number.isFinite(submittedHours) || submittedHours <= 0 || submittedHours > 112) {
      return res.status(400).json({ error: "Hours must be between 0 and 112." });
    }

    const approvedLeave = await getApprovedLeaveOverlaps(contractorId, start, end);
    const leaveSummary = buildLeaveSummary(approvedLeave, start, end, payRate);
    const overtime = calculateOvertime(submittedHours, start, end, leaveSummary);

    let status = "WORK_SUBMITTED";
    let rejectionReason = null;
    if (submittedHours > overtime.regularHoursCap + 16) {
      status = "WORK_REJECTED";
      rejectionReason = "Auto-rejected: submitted hours exceed expected working time after approved leave.";
    }

    const id = genId("ts");
    await query(
      `INSERT INTO timesheets
      (id, contractor_id, contractor_name, week_start, week_end, hours, rate, gross, status, version, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,$10)`,
      [id, contractorId, contractorName, start, end, submittedHours, payRate, submittedHours * payRate, status, description]
    );
    if (rejectionReason) {
      await query("UPDATE timesheets SET rejection_reason=$1 WHERE id=$2", [rejectionReason, id]);
      await pushAudit("timesheet.auto_rejected", "system", { timesheetId: id, reason: rejectionReason });
    }
    await pushAudit("timesheet.submitted", req.user?.name || contractorName || "contractor", { timesheetId: id });
    const created = await query("SELECT * FROM timesheets WHERE id = $1", [id]);
    res.json({ success: true, timesheet: mapTimesheet(created.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/timesheets/:id/resubmit", requireAuth, requireRole("contractor"), requireIdempotency, async (req, res) => {
  try {
    const { id } = req.params;
    const { hours, description, expectedVersion } = req.body;
    const existing = await query("SELECT * FROM timesheets WHERE id = $1", [id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Timesheet not found" });
    const ts = existing.rows[0];
    if (ts.status !== "WORK_REJECTED") return res.status(400).json({ error: "Only rejected timesheets can be resubmitted." });
    if (expectedVersion != null && Number(expectedVersion) !== ts.version) return res.status(409).json({ error: "Conflict: timesheet changed." });
    const parsedVersions = ts.versions ? JSON.parse(ts.versions) : [];
    const versions = [...parsedVersions, { version: ts.version, hours: Number(ts.hours), submittedAt: ts.submitted_at }];
    await query(
      `UPDATE timesheets
       SET hours=$1, gross=$2, description=$3, status='WORK_SUBMITTED', version=version+1,
           submitted_at=datetime('now'), rejection_reason=NULL, approved_at=NULL, approved_by=NULL, versions=$4
       WHERE id=$5`,
      [hours, Number(hours) * Number(ts.rate), description, JSON.stringify(versions), id]
    );
    await pushAudit("timesheet.resubmitted", req.user?.name || "contractor", { timesheetId: id });
    const updated = await query("SELECT * FROM timesheets WHERE id = $1", [id]);
    res.json({ success: true, timesheet: mapTimesheet(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/timesheets/:id", requireAuth, requireRole("contractor"), requireIdempotency, async (req, res) => {
  try {
    const { id } = req.params;
    const { hours, description, weekStart, weekEnd, expectedVersion } = req.body;
    const existing = await query("SELECT * FROM timesheets WHERE id=$1", [id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Timesheet not found" });
    const ts = existing.rows[0];
    if (ts.contractor_id !== req.user.sub) return res.status(403).json({ error: "Not your timesheet" });
    if (ts.status !== "WORK_SUBMITTED") return res.status(400).json({ error: "Only submitted timesheets can be edited." });
    if (expectedVersion != null && Number(expectedVersion) !== ts.version) return res.status(409).json({ error: "Conflict: timesheet changed." });
    const nextHours = Number(hours ?? ts.hours);
    const nextWeekStart = weekStart || ts.week_start;
    const nextWeekEnd = weekEnd || ts.week_end;
    await query(
      `UPDATE timesheets
       SET hours=$1, gross=$2, description=$3, week_start=$4, week_end=$5, version=version+1
       WHERE id=$6`,
      [nextHours, nextHours * Number(ts.rate), description ?? ts.description, nextWeekStart, nextWeekEnd, id]
    );
    await pushAudit("timesheet.edited", req.user?.name || "contractor", { timesheetId: id });
    const updated = await query("SELECT * FROM timesheets WHERE id=$1", [id]);
    res.json({ success: true, timesheet: mapTimesheet(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/timesheets/:id", requireAuth, requireRole("contractor"), requireIdempotency, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await query("SELECT * FROM timesheets WHERE id=$1", [id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Timesheet not found" });
    const ts = existing.rows[0];
    if (ts.contractor_id !== req.user.sub) return res.status(403).json({ error: "Not your timesheet" });
    if (!["WORK_SUBMITTED", "WORK_REJECTED"].includes(ts.status)) {
      return res.status(400).json({ error: "Only submitted or rejected timesheets can be deleted." });
    }
    await query("DELETE FROM timesheets WHERE id=$1", [id]);
    await pushAudit("timesheet.deleted", req.user?.name || "contractor", { timesheetId: id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/timesheets/:id/approve", requireAuth, requireRole("agency"), requireIdempotency, async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy = "agency", expectedVersion } = req.body;
    await run("BEGIN TRANSACTION");
    const r = await query("SELECT * FROM timesheets WHERE id = $1", [id]);
    if (!r.rows.length) throw new Error("Timesheet not found");
    const ts = r.rows[0];
    if (ts.status !== "WORK_SUBMITTED") throw new Error("Only WORK_SUBMITTED timesheets can be approved.");
    if (expectedVersion != null && Number(expectedVersion) !== ts.version) throw new Error("Conflict: timesheet changed.");
    const approvedLeave = await getApprovedLeaveOverlaps(ts.contractor_id, ts.week_start, ts.week_end);
    const leaveSummary = buildLeaveSummary(approvedLeave, ts.week_start, ts.week_end, ts.rate);
    const overtime = calculateOvertime(ts.hours, ts.week_start, ts.week_end, leaveSummary);
    if (Number(ts.hours) > overtime.regularHoursCap + 16) {
      throw new Error("Timesheet conflicts with approved leave and was blocked from approval.");
    }
    await query(
      "UPDATE timesheets SET status='WORK_APPROVED', approved_at=datetime('now'), approved_by=$1 WHERE id=$2",
      [approvedBy, id]
    );
    const invoiceId = genId("inv");
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
    await query(
      `INSERT INTO invoices
      (id, timesheet_id, contractor_id, contractor_name, agency, umbrella, invoice_number, week_start, week_end, hours, rate, gross, status, work_record_state, is_draft, leave_summary, overtime_hours, overtime_amount)
      VALUES ($1,$2,$3,$4,'TechStaff Ltd','PaySafe Umbrella',$5,$6,$7,$8,$9,$10,'INVOICE_GENERATED','WORK_APPROVED',1,$11,$12,$13)`,
      [
        invoiceId,
        id,
        ts.contractor_id,
        ts.contractor_name,
        invoiceNumber,
        ts.week_start,
        ts.week_end,
        ts.hours,
        ts.rate,
        ts.gross,
        JSON.stringify(leaveSummary),
        overtime.overtimeHours,
        Math.round(overtime.overtimeHours * Number(ts.rate || 0) * 1.25),
      ]
    );
    await run("COMMIT");
    await pushAudit("timesheet.approved", req.user?.name || approvedBy, { timesheetId: id });
    await pushAudit("invoice.generated", req.user?.name || approvedBy, { invoiceId, timesheetId: id });
    const [tsUpdated, invUpdated] = await Promise.all([
      query("SELECT * FROM timesheets WHERE id = $1", [id]),
      query("SELECT * FROM invoices WHERE id = $1", [invoiceId]),
    ]);
    io.emit('invoice:created', mapInvoice(invUpdated.rows[0]));
    io.emit('timesheet:updated', mapTimesheet(tsUpdated.rows[0]));
    res.json({ success: true, timesheet: mapTimesheet(tsUpdated.rows[0]), invoice: mapInvoice(invUpdated.rows[0]) });
  } catch (err) {
    await run("ROLLBACK");
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/timesheets/:id/reject", requireAuth, requireRole("agency"), requireIdempotency, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, expectedVersion } = req.body;
    const r = await query("SELECT * FROM timesheets WHERE id = $1", [id]);
    if (!r.rows.length) return res.status(404).json({ error: "Timesheet not found" });
    const ts = r.rows[0];
    if (ts.status !== "WORK_SUBMITTED") return res.status(400).json({ error: "Only WORK_SUBMITTED timesheets can be rejected." });
    if (expectedVersion != null && Number(expectedVersion) !== ts.version) return res.status(409).json({ error: "Conflict: timesheet changed." });
    await query("UPDATE timesheets SET status='WORK_REJECTED', rejection_reason=$1 WHERE id=$2", [reason, id]);
    await pushAudit("timesheet.rejected", req.user?.name || "agency", { timesheetId: id, reason });
    const updated = await query("SELECT * FROM timesheets WHERE id = $1", [id]);
    res.json({ success: true, timesheet: mapTimesheet(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/invoices/:id/approve", requireAuth, requireRole("agency"), requireIdempotency, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE invoices SET status='INVOICE_APPROVED', approved_at=datetime('now'), is_draft=0
       WHERE id=$1 AND status='INVOICE_GENERATED'`,
      [id]
    );
    if (!result.changes) return res.status(400).json({ error: "Only generated invoices can be approved." });
    const updated = await query("SELECT * FROM invoices WHERE id=$1", [id]);
    await pushAudit("invoice.approved", req.user?.name || "agency", { invoiceId: id });
    io.emit('invoice:updated', mapInvoice(updated.rows[0]));
    res.json({ success: true, invoice: mapInvoice(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/invoices/:id/payment", requireAuth, requireRole("agency"), requireIdempotency, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reference } = req.body || {};
    const invR = await query("SELECT * FROM invoices WHERE id = $1", [id]);
    if (!invR.rows.length) return res.status(404).json({ error: "Invoice not found" });
    const inv = invR.rows[0];
    if (!["INVOICE_APPROVED", "PAYMENT_PENDING"].includes(inv.status)) {
      return res.status(400).json({ error: "Invoice must be approved before payment reconciliation." });
    }
    const receivedAmount = amount != null ? Number(amount) : Number(inv.gross);
    const ref = reference || `PAY-TL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
    const status = receivedAmount === Number(inv.gross) ? "PAYMENT_RECEIVED" : "PAYMENT_PENDING";
    await query(
      `UPDATE invoices SET status=$1, paid_at=datetime('now'), payment_ref=$2, amount_received=$3 WHERE id=$4`,
      [status, ref, receivedAmount, id]
    );
    const updated = await query("SELECT * FROM invoices WHERE id=$1", [id]);
    await pushAudit("payment.received_notification", req.user?.name || "agency", { invoiceId: id, amount: receivedAmount, paymentRef: ref });
    if (status === "PAYMENT_PENDING") {
      const disputeId = genId("d");
      const shortfall = Number(inv.gross) - receivedAmount;
      await query(
        `INSERT INTO disputes
        (id, type, invoice_id, invoice_number, contractor_name, expected, received, shortfall, status, notes)
        VALUES ($1,'Payment mismatch',$2,$3,$4,$5,$6,$7,'open',$8)`,
        [disputeId, id, inv.invoice_number, inv.contractor_name, inv.gross, receivedAmount, shortfall, "Payment amount mismatch detected during reconciliation."]
      );
      await pushAudit("payment.mismatch_raised", "system", { invoiceId: id, shortfall });
      return res.status(409).json({ success: false, error: "Payment mismatch detected. Added to exception queue.", invoice: mapInvoice(updated.rows[0]) });
    }
    await pushAudit("payment.reconciled", "system", { invoiceId: id, paymentRef: ref });
    io.emit('invoice:updated', mapInvoice(updated.rows[0]));
    res.json({ success: true, invoice: mapInvoice(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payroll/process", requireAuth, requireRole("payroll_operator"), requireIdempotency, async (req, res) => {
  try {
    const { invoiceId, options = {}, dryRun = false } = req.body;
    const assessment = await buildPayrollAssessment(invoiceId, options);
    if (dryRun) {
      return res.json({ success: true, dryRun: true, report: assessment });
    }
    const inv = await query("SELECT * FROM invoices WHERE id = $1", [invoiceId]);
    if (!inv.rows.length) return res.status(404).json({ error: "Invoice not found" });
    const invRow = inv.rows[0];
    if (!assessment.safeguards.ok) {
      return res.status(400).json({ error: "Pre-payroll validation failed.", report: assessment });
    }
    if (assessment.invoice.hasExistingPayroll) {
      return res.status(400).json({ error: "Payroll already exists for this invoice." });
    }
    if (invRow.status !== "PAYMENT_RECEIVED") return res.status(400).json({ error: "Invoice must be in PAYMENT_RECEIVED state before payroll can run." });
    const gross = Number(assessment.projection.gross || 0);
    const incomeTax = Number(assessment.projection.deductions.incomeTax || 0);
    const employeeNI = Number(assessment.projection.deductions.employeeNI || 0);
    const employerNI = Number(assessment.projection.deductions.employerNI || 0);
    const umbrellaFee = Number(assessment.projection.deductions.umbrellaFee || 0);
    const pension = Number(assessment.projection.deductions.pension || 0);
    const studentLoan = Number(assessment.projection.deductions.studentLoan || 0);
    const net = Number(assessment.projection.net || 0);
    const id = genId("pr");
    const payslipId = genId("ps");
    const period = `${invRow.week_start} – ${invRow.week_end}`;
    await query(
      `INSERT INTO payrolls
      (id, invoice_id, contractor_id, contractor_name, period, gross, income_tax, employee_ni, employer_ni, umbrella_fee, pension, student_loan, net, tax_code, status, payment_date, payslip_id, completed_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'1257L','COMPLIANCE_PENDING',NULL,$14,datetime('now'))`,
      [id, invoiceId, invRow.contractor_id, invRow.contractor_name, period, gross, incomeTax, employeeNI, employerNI, umbrellaFee, pension, studentLoan, net, payslipId]
    );
    await query("UPDATE invoices SET work_record_state='PAYROLL_COMPLETED' WHERE id=$1", [invoiceId]);
    const hmrcId = genId("h");
    await query(
      `INSERT INTO hmrc_submissions (id, payroll_id, type, contractor_name, period, tax, ni, total, status)
       VALUES ($1,$2,'FPS',$3,$4,$5,$6,$7,'pending')`,
      [hmrcId, id, invRow.contractor_name, `Week ${Math.ceil(Math.random() * 52)}`, incomeTax, employeeNI, incomeTax + employeeNI]
    );
    await query(
      `INSERT INTO payroll_liabilities (id, payroll_id, contractor_id, hmrc_tax, hmrc_ni, pension, status)
       VALUES ($1,$2,$3,$4,$5,$6,'OUTSTANDING')`,
      [genId("liab"), id, invRow.contractor_id, incomeTax, employeeNI, pension]
    );
    await pushAudit("payroll.completed", req.user?.name || "payroll_operator", {
      invoiceId,
      payrollId: id,
      net,
      disbursement: "blocked_until_hmrc",
      safeguardsPassed: true,
      dryRunVarianceFlag: Boolean(assessment.varianceReport.varianceFlag),
    });
    const created = await query("SELECT * FROM payrolls WHERE id=$1", [id]);
    res.json({ success: true, payroll: mapPayroll(created.rows[0]) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post("/api/payroll/dry-run", requireAuth, requireRole("payroll_operator"), async (req, res) => {
  try {
    const { invoiceId, options = {} } = req.body || {};
    if (!invoiceId) return res.status(400).json({ error: "invoiceId is required" });
    const report = await buildPayrollAssessment(invoiceId, options);
    res.json({ success: true, dryRun: true, report });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post("/api/payroll/:id/disburse", requireAuth, requireRole("payroll_operator"), requireIdempotency, async (req, res) => {
  try {
    const { id } = req.params;
    const { simulateFailure = false } = req.body || {};
    const payroll = await query("SELECT * FROM payrolls WHERE id=$1", [id]);
    if (!payroll.rows.length) return res.status(404).json({ error: "Payroll not found" });
    if (!["PAYOUT_PENDING", "PAYOUT_RETRYING"].includes(payroll.rows[0].status)) {
      return res.status(400).json({ error: "Payroll is not awaiting disbursement." });
    }
    const invoiceAssessment = await buildPayrollAssessment(payroll.rows[0].invoice_id, {});
    if (!invoiceAssessment.safeguards.ok) {
      return res.status(400).json({ error: "Disbursement blocked by pre-payroll safeguards.", report: invoiceAssessment });
    }
    if (simulateFailure) {
      await query(
        "UPDATE payrolls SET status='PAYOUT_FAILED', payout_attempts=payout_attempts+1, payout_failure_reason=$1 WHERE id=$2",
        ["Bank transfer failed: beneficiary account rejected.", id]
      );
      await pushAudit("salary.disbursement_failed", req.user?.name || "payroll_operator", { payrollId: id });
      const failed = await query("SELECT * FROM payrolls WHERE id=$1", [id]);
      return res.status(409).json({ success: false, error: "Disbursement failed and moved to retry queue.", payroll: mapPayroll(failed.rows[0]) });
    }
    const payoutRef = `SAL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000 + 1000)}`;
    await query(
      "UPDATE payrolls SET status='PAYOUT_COMPLETED', payment_date=$1, payout_reference=$2, payout_attempts=payout_attempts+1, payout_failure_reason=NULL WHERE id=$3",
      [new Date().toISOString().slice(0, 10), payoutRef, id]
    );
    await pushAudit("salary.disbursed", req.user?.name || "payroll_operator", { payrollId: id, contractorId: payroll.rows[0].contractor_id, net: payroll.rows[0].net, payoutRef });
    const updated = await query("SELECT * FROM payrolls WHERE id=$1", [id]);
    res.json({ success: true, payroll: mapPayroll(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payroll/:id/retry-disbursement", requireAuth, requireRole("payroll_operator"), requireIdempotency, async (req, res) => {
  try {
    const { id } = req.params;
    const payroll = await query("SELECT * FROM payrolls WHERE id=$1", [id]);
    if (!payroll.rows.length) return res.status(404).json({ error: "Payroll not found" });
    if (payroll.rows[0].status !== "PAYOUT_FAILED") return res.status(400).json({ error: "Only failed payouts can be retried." });
    await query("UPDATE payrolls SET status='PAYOUT_RETRYING' WHERE id=$1", [id]);
    const payoutRef = `SAL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000 + 1000)}`;
    await query(
      "UPDATE payrolls SET status='PAYOUT_COMPLETED', payment_date=$1, payout_reference=$2, payout_attempts=payout_attempts+1, payout_failure_reason=NULL WHERE id=$3",
      [new Date().toISOString().slice(0, 10), payoutRef, id]
    );
    await pushAudit("salary.disbursement_retried", req.user?.name || "payroll_operator", { payrollId: id, payoutRef });
    const updated = await query("SELECT * FROM payrolls WHERE id=$1", [id]);
    res.json({ success: true, payroll: mapPayroll(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payroll/batches/create", requireAuth, requireRole("payroll_operator"), requireIdempotency, async (req, res) => {
  try {
    const { periodKey } = req.body || {};
    const key = periodKey || new Date().toISOString().slice(0, 7);
    const eligible = await query("SELECT * FROM payrolls WHERE status='PAYOUT_PENDING'");
    if (!eligible.rows.length) return res.status(400).json({ error: "No pending salary payouts to batch." });
    const totalNet = eligible.rows.reduce((s, p) => s + Number(p.net), 0);
    const batchId = genId("batch");
    await query(
      `INSERT INTO payroll_batches (id, period_key, payroll_count, total_net, status, created_by)
       VALUES ($1,$2,$3,$4,'CREATED',$5)`,
      [batchId, key, eligible.rows.length, totalNet, req.user?.name || "payroll_operator"]
    );
    await query("UPDATE payrolls SET status='PAYOUT_RETRYING' WHERE status='PAYOUT_PENDING'");
    await pushAudit("salary.batch_created", req.user?.name || "payroll_operator", { batchId, periodKey: key, payrollCount: eligible.rows.length, totalNet });
    const created = await query("SELECT * FROM payroll_batches WHERE id=$1", [batchId]);
    res.json({ success: true, batch: created.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payroll/batches/:id/submit", requireAuth, requireRole("payroll_operator"), requireIdempotency, async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await query("SELECT * FROM payroll_batches WHERE id=$1", [id]);
    if (!batch.rows.length) return res.status(404).json({ error: "Batch not found" });
    if (batch.rows[0].status !== "CREATED") return res.status(400).json({ error: "Only created batches can be submitted." });
    const bankRef = `BACS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 900 + 100)}`;
    await query(
      "UPDATE payroll_batches SET status='SUBMITTED', submitted_at=datetime('now'), bank_reference=$1 WHERE id=$2",
      [bankRef, id]
    );
    await query(
      "UPDATE payrolls SET status='PAYOUT_COMPLETED', payment_date=$1, payout_reference=$2 WHERE status='PAYOUT_RETRYING'",
      [new Date().toISOString().slice(0, 10), bankRef]
    );
    await pushAudit("salary.batch_submitted", req.user?.name || "payroll_operator", { batchId: id, bankRef });
    res.json({ success: true, bankReference: bankRef });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payroll/periods/:periodKey/close", requireAuth, requireRole("payroll_operator"), requireIdempotency, async (req, res) => {
  try {
    const { periodKey } = req.params;
    const unresolvedPayouts = await query("SELECT COUNT(1) as count FROM payrolls WHERE status IN ('PAYOUT_PENDING','PAYOUT_FAILED','PAYOUT_RETRYING')");
    const unresolvedLiabilities = await query("SELECT COUNT(1) as count FROM payroll_liabilities WHERE status='OUTSTANDING'");
    if (Number(unresolvedPayouts.rows[0].count) > 0 || Number(unresolvedLiabilities.rows[0].count) > 0) {
      return res.status(400).json({ error: "Cannot close period while payouts/liabilities are outstanding." });
    }
    await query(
      `INSERT INTO payroll_periods (period_key, status, closed_by, closed_at, notes)
       VALUES ($1,'CLOSED',$2,datetime('now'),$3)
       ON CONFLICT(period_key) DO UPDATE SET status='CLOSED', closed_by=$2, closed_at=datetime('now'), notes=$3`,
      [periodKey, req.user?.name || "payroll_operator", "Period closed with all payouts and liabilities settled."]
    );
    await pushAudit("period.closed", req.user?.name || "payroll_operator", { periodKey });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payroll/liabilities/settle", requireAuth, requireRole("payroll_operator"), requireIdempotency, async (req, res) => {
  try {
    await query("UPDATE payroll_liabilities SET status='SETTLED', settled_at=datetime('now') WHERE status='OUTSTANDING'");
    await pushAudit("liabilities.settled", req.user?.name || "payroll_operator", {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/disputes/:id/resolve", requireAuth, requireRole("agency"), requireIdempotency, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query("UPDATE disputes SET status='resolved', resolved_at=datetime('now') WHERE id=$1", [id]);
    if (!result.changes) return res.status(404).json({ error: "Dispute not found" });
    await pushAudit("dispute.resolved", req.user?.name || "agency", { disputeId: id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/hmrc/:id/submit", requireAuth, requireRole("payroll_operator"), requireIdempotency, async (req, res) => {
  try {
    const { id } = req.params;
    const ref = `RTI-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
    const result = await query(
      "UPDATE hmrc_submissions SET status='submitted', submitted_at=datetime('now'), ref=$1 WHERE id=$2",
      [ref, id]
    );
    if (!result.changes) return res.status(404).json({ error: "Submission not found" });
    const hmrcRow = await query("SELECT payroll_id, contractor_name FROM hmrc_submissions WHERE id=$1", [id]);
    const payrollId = hmrcRow.rows[0]?.payroll_id;
    let moved = 0;
    if (payrollId) {
      const r = await query(
        "UPDATE payrolls SET status='PAYOUT_PENDING' WHERE id=$1 AND status IN ('COMPLIANCE_PENDING','PAYROLL_COMPLETED')",
        [payrollId]
      );
      moved = r.changes || 0;
    }
    // Fallback for older records where payroll_id may be null in hmrc_submissions.
    if (!moved) {
      const contractorName = hmrcRow.rows[0]?.contractor_name;
      if (contractorName) {
        const fallback = await query(
          `SELECT id FROM payrolls
           WHERE contractor_name=$1 AND status IN ('COMPLIANCE_PENDING','PAYROLL_COMPLETED')
           ORDER BY processed_at DESC
           LIMIT 1`,
          [contractorName]
        );
        if (fallback.rows.length) {
          await query(
            "UPDATE payrolls SET status='PAYOUT_PENDING' WHERE id=$1 AND status IN ('COMPLIANCE_PENDING','PAYROLL_COMPLETED')",
            [fallback.rows[0].id]
          );
        }
      }
    }
    await pushAudit("hmrc.submitted", req.user?.name || "payroll_operator", { submissionId: id, ref });

    let payrollOut = null;
    if (payrollId) {
      const pr = await query("SELECT * FROM payrolls WHERE id=$1", [payrollId]);
      payrollOut = pr.rows[0] || null;
    }
    if (!payrollOut && hmrcRow.rows[0]?.contractor_name) {
      const pr2 = await query(
        `SELECT * FROM payrolls
         WHERE contractor_name=$1 AND status IN ('PAYOUT_PENDING','PAYOUT_RETRYING','COMPLIANCE_PENDING')
         ORDER BY processed_at DESC LIMIT 1`,
        [hmrcRow.rows[0].contractor_name]
      );
      payrollOut = pr2.rows[0] || null;
    }

    res.json({ success: true, payroll: payrollOut ? mapPayroll(payrollOut) : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = Number(process.env.PORT || 4000);

async function runScheduledPayrollSweep() {
  const enabled = String(process.env.ENABLE_SCHEDULED_PAYROLL || "true").toLowerCase() !== "false";
  if (!enabled) return;
  const pendingInvoices = await query(
    `SELECT i.*
     FROM invoices i
     LEFT JOIN payrolls p ON p.invoice_id = i.id
     WHERE i.status='PAYMENT_RECEIVED' AND p.id IS NULL`
  );
  for (const inv of pendingInvoices.rows) {
    const contractor = await query("SELECT bank_verified FROM users WHERE id=$1", [inv.contractor_id]);
    if (!contractor.rows.length || !Number(contractor.rows[0].bank_verified)) continue;
    const leaveSummary = inv.leave_summary ? JSON.parse(inv.leave_summary) : {};
    const unpaidLeaveDays = Number(leaveSummary.unpaidLeaveDays || 0);
    const gross = Math.max(0, Number(inv.gross) - Math.round(unpaidLeaveDays * Number(inv.rate || 0)));
    const incomeTax = Math.round(gross * 0.2);
    const employeeNI = Math.round(gross * 0.06);
    const employerNI = Math.round(gross * 0.07);
    const pension = Math.round(gross * 0.03);
    const umbrellaFee = 250;
    const studentLoan = 0;
    const net = gross - incomeTax - employeeNI - umbrellaFee - pension - studentLoan;
    const payrollId = genId("pr");
    await query(
      `INSERT INTO payrolls
      (id, invoice_id, contractor_id, contractor_name, period, gross, income_tax, employee_ni, employer_ni, umbrella_fee, pension, student_loan, net, tax_code, status, payment_date, payslip_id, completed_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'1257L','COMPLIANCE_PENDING',NULL,$14,datetime('now'))`,
      [payrollId, inv.id, inv.contractor_id, inv.contractor_name, `${inv.week_start} – ${inv.week_end}`, gross, incomeTax, employeeNI, employerNI, umbrellaFee, pension, studentLoan, net, genId("ps")]
    );
    await query("UPDATE invoices SET work_record_state='PAYROLL_COMPLETED' WHERE id=$1", [inv.id]);
    await query(
      `INSERT INTO hmrc_submissions (id, payroll_id, type, contractor_name, period, tax, ni, total, status)
       VALUES ($1,$2,'FPS',$3,$4,$5,$6,$7,'pending')`,
      [genId("h"), payrollId, inv.contractor_name, `Week ${Math.ceil(Math.random() * 52)}`, incomeTax, employeeNI, incomeTax + employeeNI]
    );
    await pushAudit("payroll.scheduled_run", "system", { invoiceId: inv.id, payrollId });
  }
}

async function start() {
  await initDb();
  await ensureColumn("users", "bank_account_name", "bank_account_name TEXT");
  await ensureColumn("users", "bank_sort_code", "bank_sort_code TEXT");
  await ensureColumn("users", "bank_account_number", "bank_account_number TEXT");
  await ensureColumn("users", "bank_verified", "bank_verified INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("users", "mobile_number", "mobile_number TEXT");
  await ensureColumn("users", "mobile_verified", "mobile_verified INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("users", "mobile_otp_code", "mobile_otp_code TEXT");
  await ensureColumn("users", "mobile_otp_expires_at", "mobile_otp_expires_at TEXT");
  await ensureColumn("users", "personal_email", "personal_email TEXT");
  await ensureColumn("users", "address_line", "address_line TEXT");
  await ensureColumn("users", "city", "city TEXT");
  await ensureColumn("users", "postcode", "postcode TEXT");
  await ensureColumn("users", "country", "country TEXT");
  await ensureColumn("users", "date_of_birth", "date_of_birth TEXT");
  await ensureColumn("users", "skills", "skills TEXT");
  await ensureColumn("users", "resume_url", "resume_url TEXT");
  await ensureColumn("users", "profile_picture_url", "profile_picture_url TEXT");
  await ensureColumn("users", "bank_otp_code", "bank_otp_code TEXT");
  await ensureColumn("users", "bank_otp_expires_at", "bank_otp_expires_at TEXT");
  await ensureColumn("payrolls", "payout_reference", "payout_reference TEXT");
  await ensureColumn("payrolls", "payout_attempts", "payout_attempts INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("payrolls", "payout_failure_reason", "payout_failure_reason TEXT");
  await ensureColumn("hmrc_submissions", "payroll_id", "payroll_id TEXT");
  await ensureColumn("invoices", "is_draft", "is_draft INTEGER NOT NULL DEFAULT 1");
  await ensureColumn("invoices", "leave_summary", "leave_summary TEXT NOT NULL DEFAULT '{}'");
  await ensureColumn("invoices", "overtime_hours", "overtime_hours REAL NOT NULL DEFAULT 0");
  await ensureColumn("invoices", "overtime_amount", "overtime_amount REAL NOT NULL DEFAULT 0");
  await ensureColumn("deliverables", "accepted_by", "accepted_by TEXT");
  await ensureColumn("deliverables", "accepted_at", "accepted_at TEXT");
  await ensureColumn("deliverables", "progress", "progress REAL NOT NULL DEFAULT 0");
  await ensureColumn("deliverables", "estimated_hours", "estimated_hours REAL NOT NULL DEFAULT 0");
  await ensureColumn("deliverables", "actual_hours", "actual_hours REAL NOT NULL DEFAULT 0");
  await ensureColumn("deliverables", "milestones", "milestones TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn("deliverables", "attachments", "attachments TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn("deliverables", "client_rating", "client_rating REAL");
  await ensureColumn("deliverables", "contractor_notes", "contractor_notes TEXT");
  await ensureColumn("deliverables", "rejection_reason", "rejection_reason TEXT");
  await ensureColumn("deliverables", "last_progress_update", "last_progress_update TEXT");
  await ensureColumn("deliverables", "revision_count", "revision_count INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("deliverables", "change_requests", "change_requests TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn("deliverables", "profitability_margin", "profitability_margin REAL");
  await ensureColumn("deliverables", "completion_evidence", "completion_evidence TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn("deliverables", "quality_score", "quality_score REAL");
  await ensureTable(
    `CREATE TABLE IF NOT EXISTS deliverable_messages (
      id TEXT PRIMARY KEY,
      deliverable_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      message TEXT NOT NULL,
      attachments TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (deliverable_id) REFERENCES deliverables(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )`
  );
  await ensureTable(
    `CREATE TABLE IF NOT EXISTS deliverable_revisions (
      id TEXT PRIMARY KEY,
      deliverable_id TEXT NOT NULL,
      milestone_index INTEGER,
      revision_type TEXT NOT NULL,
      notes TEXT,
      attachments TEXT NOT NULL DEFAULT '[]',
      requested_by TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (deliverable_id) REFERENCES deliverables(id),
      FOREIGN KEY (requested_by) REFERENCES users(id)
    )`
  );
  await ensureTable(
    `CREATE TABLE IF NOT EXISTS milestone_evidence (
      id TEXT PRIMARY KEY,
      deliverable_id TEXT NOT NULL,
      milestone_index INTEGER NOT NULL DEFAULT 0,
      uploaded_by TEXT,
      notes TEXT,
      files TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (deliverable_id) REFERENCES deliverables(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    )`
  );
  await ensureTable(
    `CREATE TABLE IF NOT EXISTS deliverable_templates (
      id TEXT PRIMARY KEY,
      agency_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      default_milestones TEXT NOT NULL DEFAULT '[]',
      estimated_hours REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agency_id) REFERENCES users(id)
    )`
  );
  await ensureTable(
    `CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY,
      contractor_id TEXT NOT NULL,
      contractor_name TEXT NOT NULL,
      leave_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reason TEXT,
      submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      approved_at TEXT,
      approved_by TEXT,
      rejection_reason TEXT,
      FOREIGN KEY (contractor_id) REFERENCES users(id)
    )`
  );
  await ensureTable(
    `CREATE TABLE IF NOT EXISTS leave_balances (
      id TEXT PRIMARY KEY,
      contractor_id TEXT NOT NULL,
      contractor_name TEXT NOT NULL,
      leave_type TEXT NOT NULL,
      total_allowance REAL NOT NULL DEFAULT 0,
      used REAL NOT NULL DEFAULT 0,
      accrued REAL NOT NULL DEFAULT 0,
      carry_over REAL NOT NULL DEFAULT 0,
      remaining REAL NOT NULL DEFAULT 0,
      accrual_period TEXT NOT NULL DEFAULT 'annual',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(contractor_id, leave_type),
      FOREIGN KEY (contractor_id) REFERENCES users(id)
    )`
  );
  await ensureTable(
    `CREATE TABLE IF NOT EXISTS leave_balance_history (
      id TEXT PRIMARY KEY,
      contractor_id TEXT NOT NULL,
      leave_balance_id TEXT NOT NULL,
      leave_request_id TEXT,
      change_type TEXT NOT NULL,
      delta REAL NOT NULL,
      before_value REAL NOT NULL,
      after_value REAL NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contractor_id) REFERENCES users(id),
      FOREIGN KEY (leave_balance_id) REFERENCES leave_balances(id),
      FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id)
    )`
  );
  await reconcileLegacyPayrollStatuses();
  await reconcileSubmittedHmrcWithoutPayrollId();
  await hardenPasswords();
  await ensureDemoCredentials();
  await ensureDefaultLeaveBalances();
  await runScheduledPayrollSweep();
  server.listen(port, () => {
    console.log(`Backend running at http://localhost:${port}`);
    setInterval(() => {
      runScheduledPayrollSweep().catch((err) => console.error("Scheduled payroll sweep failed:", err.message));
    }, 10 * 60 * 1000);
  });
}

start().catch((err) => {
  console.error("Failed to start backend:", err);
  process.exit(1);
});
