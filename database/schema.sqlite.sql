CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  agency TEXT,
  umbrella TEXT,
  tax_code TEXT,
  rate REAL,
  bank_account_name TEXT,
  bank_sort_code TEXT,
  bank_account_number TEXT,
  mobile_number TEXT,
  bank_otp_code TEXT,
  bank_otp_expires_at TEXT,
  bank_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timesheets (
  id TEXT PRIMARY KEY,
  contractor_id TEXT NOT NULL,
  contractor_name TEXT NOT NULL,
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,
  hours REAL NOT NULL,
  rate REAL NOT NULL,
  gross REAL NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at TEXT,
  approved_by TEXT,
  description TEXT,
  rejection_reason TEXT,
  versions TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  timesheet_id TEXT NOT NULL,
  contractor_id TEXT NOT NULL,
  contractor_name TEXT,
  agency TEXT,
  umbrella TEXT,
  invoice_number TEXT NOT NULL UNIQUE,
  week_start TEXT,
  week_end TEXT,
  hours REAL,
  rate REAL,
  gross REAL NOT NULL,
  status TEXT NOT NULL,
  work_record_state TEXT,
  amount_received REAL,
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at TEXT,
  paid_at TEXT,
  payment_ref TEXT,
  is_draft INTEGER NOT NULL DEFAULT 1,
  leave_summary TEXT NOT NULL DEFAULT '{}',
  overtime_hours REAL NOT NULL DEFAULT 0,
  overtime_amount REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (timesheet_id) REFERENCES timesheets(id)
);

CREATE TABLE IF NOT EXISTS leave_requests (
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
);

CREATE TABLE IF NOT EXISTS leave_balances (
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
);

CREATE TABLE IF NOT EXISTS leave_balance_history (
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
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  agency TEXT,
  contractor_id TEXT,
  contractor_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_at TEXT,
  due_date TEXT,
  FOREIGN KEY (contractor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS deliverables (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  agency_id TEXT,
  contractor_id TEXT,
  accepted_by TEXT,
  accepted_at TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  priority TEXT DEFAULT 'medium',
  progress REAL NOT NULL DEFAULT 0,
  estimated_hours REAL NOT NULL DEFAULT 0,
  actual_hours REAL NOT NULL DEFAULT 0,
  milestones TEXT NOT NULL DEFAULT '[]',
  attachments TEXT NOT NULL DEFAULT '[]',
  revision_count INTEGER NOT NULL DEFAULT 0,
  change_requests TEXT NOT NULL DEFAULT '[]',
  profitability_margin REAL NOT NULL DEFAULT 0,
  completion_evidence TEXT NOT NULL DEFAULT '[]',
  quality_score REAL NOT NULL DEFAULT 0,
  client_rating REAL,
  contractor_notes TEXT,
  rejection_reason TEXT,
  last_progress_update TEXT,
  due_date TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id),
  FOREIGN KEY (agency_id) REFERENCES users(id),
  FOREIGN KEY (contractor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS deliverable_revisions (
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
);

CREATE TABLE IF NOT EXISTS milestone_evidence (
  id TEXT PRIMARY KEY,
  deliverable_id TEXT NOT NULL,
  milestone_index INTEGER NOT NULL DEFAULT 0,
  uploaded_by TEXT,
  notes TEXT,
  files TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deliverable_id) REFERENCES deliverables(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS deliverable_templates (
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
);

CREATE TABLE IF NOT EXISTS deliverable_messages (
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
);

CREATE TABLE IF NOT EXISTS payrolls (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  contractor_id TEXT NOT NULL,
  gross REAL NOT NULL,
  income_tax REAL NOT NULL,
  employee_ni REAL NOT NULL,
  employer_ni REAL NOT NULL,
  umbrella_fee REAL NOT NULL,
  holiday_pay REAL DEFAULT 0,
  apprenticeship_levy REAL DEFAULT 0,
  employer_pension REAL DEFAULT 0,
  pension REAL NOT NULL,
  student_loan REAL NOT NULL,
  student_loan_type TEXT DEFAULT 'None',
  net REAL NOT NULL,
  tax_code TEXT,
  contractor_name TEXT,
  period TEXT,
  payment_date TEXT,
  payslip_id TEXT,
  payout_reference TEXT,
  payout_attempts INTEGER NOT NULL DEFAULT 0,
  payout_failure_reason TEXT,
  status TEXT NOT NULL,
  completed_at TEXT,
  processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  contractor_name TEXT,
  expected REAL,
  received REAL,
  shortfall REAL,
  status TEXT NOT NULL,
  raised_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  notes TEXT,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE TABLE IF NOT EXISTS hmrc_submissions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  contractor_name TEXT,
  period TEXT,
  tax REAL NOT NULL,
  ni REAL NOT NULL,
  total REAL NOT NULL,
  status TEXT NOT NULL,
  submitted_at TEXT,
  ref TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  actor TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS payroll_liabilities (
  id TEXT PRIMARY KEY,
  payroll_id TEXT NOT NULL,
  contractor_id TEXT NOT NULL,
  hmrc_tax REAL NOT NULL,
  hmrc_ni REAL NOT NULL,
  pension REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'OUTSTANDING',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settled_at TEXT,
  FOREIGN KEY (payroll_id) REFERENCES payrolls(id)
);

CREATE TABLE IF NOT EXISTS payroll_batches (
  id TEXT PRIMARY KEY,
  period_key TEXT NOT NULL,
  payroll_count INTEGER NOT NULL,
  total_net REAL NOT NULL,
  status TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TEXT,
  bank_reference TEXT
);

CREATE TABLE IF NOT EXISTS payroll_periods (
  period_key TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'OPEN',
  closed_by TEXT,
  closed_at TEXT,
  notes TEXT
);
