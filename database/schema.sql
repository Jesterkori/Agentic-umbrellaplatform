CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  agency TEXT,
  umbrella TEXT,
  tax_code TEXT,
  rate NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timesheets (
  id TEXT PRIMARY KEY,
  contractor_id TEXT NOT NULL,
  contractor_name TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  hours NUMERIC(10,2) NOT NULL,
  rate NUMERIC(10,2) NOT NULL,
  gross NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  description TEXT,
  rejection_reason TEXT,
  versions JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  timesheet_id TEXT NOT NULL REFERENCES timesheets(id),
  contractor_id TEXT NOT NULL,
  contractor_name TEXT,
  agency TEXT,
  umbrella TEXT,
  invoice_number TEXT NOT NULL UNIQUE,
  week_start DATE,
  week_end DATE,
  hours NUMERIC(10,2),
  rate NUMERIC(10,2),
  gross NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL,
  work_record_state TEXT,
  amount_received NUMERIC(12,2),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_ref TEXT,
  is_draft BOOLEAN NOT NULL DEFAULT TRUE,
  leave_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  overtime_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  overtime_amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY,
  contractor_id TEXT NOT NULL REFERENCES users(id),
  contractor_name TEXT NOT NULL,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id TEXT PRIMARY KEY,
  contractor_id TEXT NOT NULL REFERENCES users(id),
  contractor_name TEXT NOT NULL,
  leave_type TEXT NOT NULL,
  total_allowance NUMERIC(10,2) NOT NULL DEFAULT 0,
  used NUMERIC(10,2) NOT NULL DEFAULT 0,
  accrued NUMERIC(10,2) NOT NULL DEFAULT 0,
  carry_over NUMERIC(10,2) NOT NULL DEFAULT 0,
  remaining NUMERIC(10,2) NOT NULL DEFAULT 0,
  accrual_period TEXT NOT NULL DEFAULT 'annual',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(contractor_id, leave_type)
);

CREATE TABLE IF NOT EXISTS leave_balance_history (
  id TEXT PRIMARY KEY,
  contractor_id TEXT NOT NULL REFERENCES users(id),
  leave_balance_id TEXT NOT NULL REFERENCES leave_balances(id),
  leave_request_id TEXT REFERENCES leave_requests(id),
  change_type TEXT NOT NULL,
  delta NUMERIC(10,2) NOT NULL,
  before_value NUMERIC(10,2) NOT NULL,
  after_value NUMERIC(10,2) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES users(id),
  agency TEXT,
  contractor_id TEXT,
  contractor_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,
  due_date DATE
);

CREATE TABLE IF NOT EXISTS deliverables (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES users(id),
  agency_id TEXT REFERENCES users(id),
  contractor_id TEXT REFERENCES users(id),
  accepted_by TEXT REFERENCES users(id),
  accepted_at TIMESTAMPTZ,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  priority TEXT DEFAULT 'medium',
  progress NUMERIC(5,2) NOT NULL DEFAULT 0,
  estimated_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  actual_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  revision_count INTEGER NOT NULL DEFAULT 0,
  change_requests JSONB NOT NULL DEFAULT '[]'::jsonb,
  profitability_margin NUMERIC(6,2) NOT NULL DEFAULT 0,
  completion_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  quality_score NUMERIC(3,2) NOT NULL DEFAULT 0,
  client_rating NUMERIC(3,2),
  contractor_notes TEXT,
  rejection_reason TEXT,
  last_progress_update TIMESTAMPTZ,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliverable_revisions (
  id TEXT PRIMARY KEY,
  deliverable_id TEXT NOT NULL REFERENCES deliverables(id),
  milestone_index INTEGER,
  revision_type TEXT NOT NULL,
  notes TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  requested_by TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS milestone_evidence (
  id TEXT PRIMARY KEY,
  deliverable_id TEXT NOT NULL REFERENCES deliverables(id),
  milestone_index INTEGER NOT NULL DEFAULT 0,
  uploaded_by TEXT REFERENCES users(id),
  notes TEXT,
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliverable_templates (
  id TEXT PRIMARY KEY,
  agency_id TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  default_milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliverable_messages (
  id TEXT PRIMARY KEY,
  deliverable_id TEXT NOT NULL REFERENCES deliverables(id),
  sender_id TEXT NOT NULL REFERENCES users(id),
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  message TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payrolls (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  contractor_id TEXT NOT NULL,
  gross NUMERIC(12,2) NOT NULL,
  income_tax NUMERIC(12,2) NOT NULL,
  employee_ni NUMERIC(12,2) NOT NULL,
  employer_ni NUMERIC(12,2) NOT NULL,
  umbrella_fee NUMERIC(12,2) NOT NULL,
  pension NUMERIC(12,2) NOT NULL,
  student_loan NUMERIC(12,2) NOT NULL,
  net NUMERIC(12,2) NOT NULL,
  tax_code TEXT,
  contractor_name TEXT,
  period TEXT,
  payment_date DATE,
  payslip_id TEXT,
  status TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  invoice_number TEXT NOT NULL,
  contractor_name TEXT,
  expected NUMERIC(12,2),
  received NUMERIC(12,2),
  shortfall NUMERIC(12,2),
  status TEXT NOT NULL,
  raised_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS hmrc_submissions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  contractor_name TEXT,
  period TEXT,
  tax NUMERIC(12,2) NOT NULL,
  ni NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL,
  submitted_at TIMESTAMPTZ,
  ref TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  actor TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
