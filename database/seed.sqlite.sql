INSERT OR IGNORE INTO users (id, email, password_hash, role, name, agency, umbrella, tax_code, rate)
VALUES
  ('u1', 'contractor@demo.com', 'demo123', 'contractor', 'Alex Johnson', 'TechStaff Ltd', 'PaySafe Umbrella', '1257L', 450),
  ('u2', 'agency@demo.com', 'demo123', 'agency', 'Sarah Mitchell', 'TechStaff Ltd', NULL, NULL, NULL),
  ('u3', 'payroll@demo.com', 'demo123', 'payroll_operator', 'James Carter', NULL, 'PaySafe Umbrella', NULL, NULL),
  ('u4', 'client@demo.com', 'demo123', 'client', 'Priya Raman', 'Acme Client Ltd', NULL, NULL, NULL);

INSERT OR IGNORE INTO timesheets (
  id, contractor_id, contractor_name, week_start, week_end, hours, rate, gross, status, version,
  submitted_at, approved_at, approved_by, description, rejection_reason, versions
)
VALUES
  ('ts1', 'u1', 'Alex Johnson', '2025-03-10', '2025-03-14', 40, 450, 18000, 'WORK_APPROVED', 1,
   '2025-03-15T09:00:00Z', '2025-03-16T11:00:00Z', 'Sarah Mitchell', 'Backend API development - Sprint 12', NULL, '[]'),
  ('ts2', 'u1', 'Alex Johnson', '2025-03-17', '2025-03-21', 38, 450, 17100, 'WORK_SUBMITTED', 1,
   '2025-03-22T08:30:00Z', NULL, NULL, 'Frontend integration and testing', NULL, '[]');

INSERT OR IGNORE INTO invoices (
  id, timesheet_id, contractor_id, contractor_name, agency, umbrella, invoice_number, week_start, week_end, hours, rate,
  gross, status, work_record_state, generated_at, approved_at, paid_at, payment_ref, amount_received
)
VALUES
  ('inv1', 'ts1', 'u1', 'Alex Johnson', 'TechStaff Ltd', 'PaySafe Umbrella', 'INV-2025-001', '2025-03-10', '2025-03-14', 40, 450,
   18000, 'INVOICE_APPROVED', 'WORK_APPROVED', '2025-03-16T11:05:00Z', '2025-03-17T09:00:00Z', NULL, NULL, NULL);

INSERT OR IGNORE INTO leave_balances (
  id, contractor_id, contractor_name, leave_type, total_allowance, used, accrued, carry_over, remaining, accrual_period
)
VALUES
  ('lb1', 'u1', 'Alex Johnson', 'ANNUAL', 28, 5, 4.5, 0, 23, 'annual'),
  ('lb2', 'u1', 'Alex Johnson', 'SICK', 0, 2, 0, 0, -2, 'rolling');

INSERT OR IGNORE INTO leave_requests (
  id, contractor_id, contractor_name, leave_type, start_date, end_date, days, status, reason, submitted_at, approved_at, approved_by, rejection_reason
)
VALUES
  ('lr1', 'u1', 'Alex Johnson', 'ANNUAL', '2025-04-15', '2025-04-17', 3, 'pending', 'Family vacation', '2025-04-10T09:00:00Z', NULL, NULL, NULL),
  ('lr-demo', 'u1', 'Alex Johnson', 'UNPAID', '2025-03-12', '2025-03-13', 2, 'approved', 'Personal emergency', '2025-03-10T09:00:00Z', '2025-03-10T14:00:00Z', 'Sarah Mitchell', NULL);
