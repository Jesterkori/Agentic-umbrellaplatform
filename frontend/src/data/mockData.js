export const CONTRACTS = [
  {
    id: "cnt-a",
    contractorId: "u1",
    label: "Contract A",
    title: "Senior React Developer",
    agency: "TechStaff Ltd",
    umbrella: "PaySafe Umbrella",
    rate: 450,
    startDate: "2025-01-06",
    endDate: "2025-06-30",
    status: "active",
    description: "Enterprise dashboard development — 6 month engagement",
  },
  {
    id: "cnt-b",
    contractorId: "u1",
    label: "Contract B",
    title: "Backend Node.js Developer",
    agency: "DevForce Agency",
    umbrella: "PaySafe Umbrella",
    rate: 500,
    startDate: "2025-03-01",
    endDate: "2025-08-31",
    status: "active",
    description: "API development for fintech platform",
  },
  {
    id: "cnt-c",
    contractorId: "u1",
    label: "Contract C",
    title: "Full Stack Consultant",
    agency: "TalentBridge UK",
    umbrella: "ContractPay",
    rate: 525,
    startDate: "2025-02-10",
    endDate: "2025-05-31",
    status: "completed",
    description: "E-commerce platform build — completed engagement",
  },
];

export const USERS = [
  { id: "u1", email: "contractor@demo.com", password: "demo123", role: "contractor", name: "Alex Johnson", agency: "TechStaff Ltd", umbrella: "PaySafe Umbrella", taxCode: "1257L", rate: 450 },
  { id: "u2", email: "agency@demo.com", password: "demo123", role: "agency", name: "Sarah Mitchell", agency: "TechStaff Ltd" },
  { id: "u3", email: "payroll@demo.com", password: "demo123", role: "payroll_operator", name: "James Carter", umbrella: "PaySafe Umbrella" },
];

export const CONTRACTORS = [
  { id: "u1", name: "Alex Johnson", initials: "AJ", color: "#E6F1FB", textColor: "#185FA5", umbrella: "PaySafe Umbrella", rate: 450, taxCode: "1257L", email: "alex@example.com", status: "Active" },
  { id: "c2", name: "Priya Kumar",  initials: "PK", color: "#FBEAF0", textColor: "#993556", umbrella: "PaySafe Umbrella", rate: 500, taxCode: "1100L", email: "priya@example.com", status: "Active" },
  { id: "c3", name: "Dan Osei",     initials: "DO", color: "#E1F5EE", textColor: "#0F6E56", umbrella: "PaySafe Umbrella", rate: 450, taxCode: "1257L", email: "dan@example.com",  status: "Active" },
  { id: "c4", name: "Maya Lee",     initials: "ML", color: "#FCEBEB", textColor: "#A32D2D", umbrella: "ContractPay",     rate: 450, taxCode: "BR",    email: "maya@example.com", status: "On hold" },
];

export const INITIAL_TIMESHEETS = [
  { id: "ts1", contractorId: "u1", contractorName: "Alex Johnson", weekStart: "2025-03-10", weekEnd: "2025-03-14", hours: 40, rate: 450, gross: 18000, status: "WORK_APPROVED", version: 1, submittedAt: "2025-03-15T09:00:00Z", approvedAt: "2025-03-16T11:00:00Z", approvedBy: "Sarah Mitchell", description: "Backend API development - Sprint 12", rejectionReason: null, versions: [] },
  { id: "ts2", contractorId: "u1", contractorName: "Alex Johnson", weekStart: "2025-03-17", weekEnd: "2025-03-21", hours: 38, rate: 450, gross: 17100, status: "WORK_SUBMITTED", version: 1, submittedAt: "2025-03-22T08:30:00Z", approvedAt: null, approvedBy: null, description: "Frontend integration and testing — Sprint 14", rejectionReason: null, versions: [] },
  { id: "ts3", contractorId: "u1", contractorName: "Alex Johnson", weekStart: "2025-03-03", weekEnd: "2025-03-07", hours: 35, rate: 450, gross: 15750, status: "WORK_REJECTED", version: 2, submittedAt: "2025-03-09T10:00:00Z", approvedAt: null, approvedBy: null, description: "Database optimisation work", rejectionReason: "Hours don't match project tracker. Please verify and resubmit.", versions: [{ version: 1, hours: 40, submittedAt: "2025-03-08T09:00:00Z" }] },
  { id: "ts4", contractorId: "c2", contractorName: "Priya Kumar", weekStart: "2025-03-17", weekEnd: "2025-03-21", hours: 40, rate: 500, gross: 20000, status: "WORK_SUBMITTED", version: 1, submittedAt: "2025-03-22T09:00:00Z", approvedAt: null, approvedBy: null, description: "React dashboard build — client portal", rejectionReason: null, versions: [] },
  { id: "ts5", contractorId: "c3", contractorName: "Dan Osei", weekStart: "2025-03-10", weekEnd: "2025-03-14", hours: 40, rate: 450, gross: 18000, status: "WORK_APPROVED", version: 2, submittedAt: "2025-03-15T08:00:00Z", approvedAt: "2025-03-16T10:00:00Z", approvedBy: "Sarah Mitchell", description: "API development — integration layer", rejectionReason: null, versions: [{ version: 1, hours: 40, submittedAt: "2025-03-14T17:00:00Z" }] },
  { id: "ts6", contractorId: "c4", contractorName: "Maya Lee", weekStart: "2025-03-10", weekEnd: "2025-03-14", hours: 32, rate: 450, gross: 14400, status: "WORK_REJECTED", version: 1, submittedAt: "2025-03-15T10:00:00Z", approvedAt: null, approvedBy: null, description: "QA testing — regression suite", rejectionReason: "Hours don't align with QA tracker. Please check and resubmit.", versions: [] },
];

export const INITIAL_INVOICES = [
  { id: "inv0", timesheetId: "ts5", contractorId: "c3", invoiceNumber: "INV-2025-000", contractorName: "Dan Osei", agency: "TechStaff Ltd", umbrella: "PaySafe Umbrella", gross: 18000, status: "PAYMENT_RECEIVED", generatedAt: "2025-03-06T11:00:00Z", approvedAt: "2025-03-07T09:00:00Z", paidAt: "2025-03-07T14:00:00Z", paymentRef: "PAY-TL-20250307-001", weekStart: "2025-03-03", weekEnd: "2025-03-07", hours: 40, rate: 450 },
  { id: "inv1", timesheetId: "ts1", contractorId: "u1", invoiceNumber: "INV-2025-001", contractorName: "Alex Johnson", agency: "TechStaff Ltd", umbrella: "PaySafe Umbrella", gross: 18000, status: "INVOICE_APPROVED", generatedAt: "2025-03-16T11:05:00Z", approvedAt: "2025-03-17T09:00:00Z", paidAt: null, paymentRef: null, weekStart: "2025-03-10", weekEnd: "2025-03-14", hours: 40, rate: 450 },
];

export const INITIAL_PAYROLLS = [
  { id: "pr0", invoiceId: "inv0", contractorId: "c3", contractorName: "Dan Osei", period: "3 Mar – 7 Mar 2025", gross: 18000, incomeTax: 3600, employeeNI: 1080, employerNI: 1260, umbrellaFee: 250, pension: 540, studentLoan: 0, net: 11270, taxCode: "1257L", status: "PAYROLL_COMPLETED", processedAt: "2025-03-08T10:00:00Z", paymentDate: "2025-03-09", payslipId: "ps1748291003" },
  { id: "pr1", invoiceId: "inv1", contractorId: "u1", contractorName: "Alex Johnson", period: "10 Mar – 14 Mar 2025", gross: 18000, incomeTax: 3600, employeeNI: 1080, employerNI: 1260, umbrellaFee: 250, pension: 540, studentLoan: 0, net: 11270, taxCode: "1257L", status: "PAYROLL_COMPLETED", processedAt: "2025-03-19T10:00:00Z", paymentDate: "2025-03-20", payslipId: "ps1748291001" },
];

export const INITIAL_DISPUTES = [
  { id: "d1", type: "Payment mismatch", invoiceId: "inv1", invoiceNumber: "INV-2025-001", contractorName: "Alex Johnson", expected: 18000, received: 17900, shortfall: 100, status: "open", raisedAt: "2025-03-18T10:00:00Z", resolvedAt: null, notes: "Bank transfer reference matched but amount short by £100." },
  { id: "d2", type: "Hours mismatch", invoiceId: "inv0", invoiceNumber: "INV-2025-000", contractorName: "Dan Osei", expected: null, received: null, shortfall: null, status: "resolved", raisedAt: "2025-03-06T09:00:00Z", resolvedAt: "2025-03-07T14:00:00Z", notes: "Contractor resubmitted corrected hours. Resolved." },
];

export const INITIAL_HMRC = [
  { id: "h1", type: "FPS", contractorName: "Dan Osei", period: "Week 49", tax: 3600, ni: 1080, total: 4680, status: "submitted", submittedAt: "2025-03-09T10:00:00Z", ref: "RTI-20250309-001" },
  { id: "h2", type: "FPS", contractorName: "Alex Johnson", period: "Week 51", tax: 3600, ni: 1080, total: 4680, status: "submitted", submittedAt: "2025-03-20T10:00:00Z", ref: "RTI-20250320-001" },
  { id: "h3", type: "FPS", contractorName: "Alex Johnson", period: "Week 52", tax: 3420, ni: 1026, total: 4446, status: "pending", submittedAt: null, ref: null },
];

export const PAYMENT_HISTORY = [
  { ref: "PAY-TL-20250307-001", invoiceNumber: "INV-2025-000", contractorName: "Dan Osei", amount: 18000, date: "2025-03-07", status: "Reconciled" },
  { ref: "PAY-TL-20250218-001", invoiceNumber: "INV-2024-012", contractorName: "Priya Kumar", amount: 17100, date: "2025-02-18", status: "Reconciled" },
  { ref: "PAY-TL-20250204-001", invoiceNumber: "INV-2024-011", contractorName: "Alex Johnson", amount: 18000, date: "2025-02-04", status: "Reconciled" },
];

export const INITIAL_ASSIGNMENTS = [
  { id: "assign1", clientId: "client1", clientName: "Global Tech Solutions", title: "Senior React Developer - 6 month contract", submittedAt: "2025-03-20T10:00:00Z", status: "submitted", contractorId: null, contractorName: null, description: "Looking for experienced React developer for enterprise dashboard project." },
  { id: "assign2", clientId: "client2", clientName: "Finance Corp Ltd", title: "Full Stack Developer - Node.js + React", submittedAt: "2025-03-22T14:30:00Z", status: "assigned", contractorId: "c2", contractorName: "Priya Kumar", description: "Financial application development with modern stack." },
  { id: "assign3", clientId: "client3", clientName: "Healthcare Systems", title: "Python Backend Developer", submittedAt: "2025-03-25T09:15:00Z", status: "submitted", contractorId: null, contractorName: null, description: "Healthcare data processing backend development." },
  { id: "assign4", clientId: "client1", clientName: "Global Tech Solutions", title: "DevOps Engineer - AWS", submittedAt: "2025-03-26T16:45:00Z", status: "assigned", contractorId: "c3", contractorName: "Dan Osei", description: "AWS infrastructure management and CI/CD pipeline setup." },
];

export const INITIAL_DELIVERABLES = [
  { id: "del1", assignmentId: "assign2", assignmentTitle: "Full Stack Developer - Node.js + React", clientId: "client2", clientName: "Finance Corp Ltd", contractorId: null, contractorName: null, title: "User Authentication Module", description: "Implement secure login/logout functionality with JWT tokens and session management", priority: "high", status: "pending", submittedBy: "client", submittedAt: "2025-03-23T09:00:00Z", dueDate: "2025-04-15" },
  { id: "del2", assignmentId: "assign2", assignmentTitle: "Full Stack Developer - Node.js + React", clientId: "client2", clientName: "Finance Corp Ltd", contractorId: null, contractorName: null, title: "Dashboard Analytics", description: "Create interactive charts and graphs for financial data visualization", priority: "medium", status: "pending", submittedBy: "client", submittedAt: "2025-03-23T09:15:00Z", dueDate: "2025-04-20" },
  { id: "del3", assignmentId: "assign4", assignmentTitle: "DevOps Engineer - AWS", clientId: "client1", clientName: "Global Tech Solutions", contractorId: "c3", contractorName: "Dan Osei", title: "CI/CD Pipeline Setup", description: "Configure automated build and deployment pipeline using GitHub Actions", priority: "high", status: "completed", submittedBy: "client", submittedAt: "2025-03-27T10:00:00Z", dueDate: "2025-04-10", completedAt: "2025-04-08T15:30:00Z" },
  { id: "del4", assignmentId: "assign4", assignmentTitle: "DevOps Engineer - AWS", clientId: "client1", clientName: "Global Tech Solutions", contractorId: null, contractorName: null, title: "Infrastructure Documentation", description: "Document AWS architecture, security groups, and deployment procedures", priority: "low", status: "pending", submittedBy: "client", submittedAt: "2025-03-27T10:30:00Z", dueDate: "2025-04-25" },
  { id: "del5", assignmentId: "assign1", assignmentTitle: "Senior React Developer - 6 month contract", clientId: "client1", clientName: "Global Tech Solutions", contractorId: null, contractorName: null, title: "Component Library Setup", description: "Create reusable React component library with Storybook documentation", priority: "medium", status: "pending", submittedBy: "client", submittedAt: "2025-03-21T11:00:00Z", dueDate: "2025-05-01" },
];

export const MONTHLY_SPEND = [
  { month: "March 2025", total: 53100 },
  { month: "February 2025", total: 34200 },
  { month: "January 2025", total: 36000 },
];

// Leave management data
export const LEAVE_TYPES = {
  ANNUAL: { name: "Annual Leave", paid: true, allowance: 28, requiresApproval: true, color: "#3dba7e" },
  SICK: { name: "Sick Leave", paid: true, allowance: 0, requiresApproval: true, requiresProof: true, color: "#e8a93a" },
  MATERNITY: { name: "Maternity Leave", paid: true, allowance: 52, requiresApproval: true, color: "#4fa3e8" },
  PATERNITY: { name: "Paternity Leave", paid: true, allowance: 2, requiresApproval: true, color: "#4fa3e8" },
  UNPAID: { name: "Unpaid Leave", paid: false, allowance: 0, requiresApproval: true, color: "#6b6880" }
};

export const LEAVE_BALANCES = [
  { id: "lb1", contractorId: "u1", contractorName: "Alex Johnson", leaveType: "ANNUAL", totalAllowance: 28, used: 5, remaining: 23, accrualPeriod: "annual" },
  { id: "lb2", contractorId: "u1", contractorName: "Alex Johnson", leaveType: "SICK", totalAllowance: 0, used: 2, remaining: -2, accrualPeriod: "rolling" },
  { id: "lb3", contractorId: "c2", contractorName: "Priya Kumar", leaveType: "ANNUAL", totalAllowance: 28, used: 8, remaining: 20, accrualPeriod: "annual" },
  { id: "lb4", contractorId: "c3", contractorName: "Dan Osei", leaveType: "ANNUAL", totalAllowance: 28, used: 3, remaining: 25, accrualPeriod: "annual" },
  { id: "lb5", contractorId: "c4", contractorName: "Maya Lee", leaveType: "ANNUAL", totalAllowance: 28, used: 12, remaining: 16, accrualPeriod: "annual" },
];

export const INITIAL_LEAVE_REQUESTS = [
  {
    id: "lr1",
    contractorId: "u1",
    contractorName: "Alex Johnson",
    leaveType: "ANNUAL",
    startDate: "2025-04-15",
    endDate: "2025-04-17",
    days: 3,
    status: "pending",
    reason: "Family vacation",
    submittedAt: "2025-04-10T09:00:00Z",
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null
  },
  {
    id: "lr-demo",
    contractorId: "u1",
    contractorName: "Alex Johnson",
    leaveType: "UNPAID",
    startDate: "2025-03-12",
    endDate: "2025-03-13",
    days: 2,
    status: "approved",
    reason: "Personal emergency",
    submittedAt: "2025-03-10T09:00:00Z",
    approvedAt: "2025-03-10T14:00:00Z",
    approvedBy: "Sarah Mitchell",
    rejectionReason: null
  },
  {
    id: "lr2",
    contractorId: "c2",
    contractorName: "Priya Kumar",
    leaveType: "SICK",
    startDate: "2025-04-08",
    endDate: "2025-04-09",
    days: 2,
    status: "approved",
    reason: "Flu symptoms",
    submittedAt: "2025-04-08T07:30:00Z",
    approvedAt: "2025-04-08T11:00:00Z",
    approvedBy: "Sarah Mitchell",
    rejectionReason: null,
    supportingDocument: "doctor_note_2025_04_08.pdf"
  },
  {
    id: "lr3",
    contractorId: "c3",
    contractorName: "Dan Osei",
    leaveType: "ANNUAL",
    startDate: "2025-03-25",
    endDate: "2025-03-26",
    days: 2,
    status: "approved",
    reason: "Personal appointments",
    submittedAt: "2025-03-20T14:00:00Z",
    approvedAt: "2025-03-21T09:30:00Z",
    approvedBy: "Sarah Mitchell",
    rejectionReason: null
  },
  {
    id: "lr4",
    contractorId: "u1",
    contractorName: "Alex Johnson",
    leaveType: "UNPAID",
    startDate: "2025-04-22",
    endDate: "2025-04-23",
    days: 2,
    status: "rejected",
    reason: "Extended personal time",
    submittedAt: "2025-04-05T10:00:00Z",
    approvedAt: null,
    approvedBy: null,
    rejectionReason: "Insufficient notice period. Please provide at least 2 weeks notice for unpaid leave."
  }
];
