INSERT INTO users (id, email, password_hash, role, name, agency, umbrella, tax_code, rate)
VALUES
  ('u1', 'contractor@demo.com', 'demo123', 'contractor', 'Alex Johnson', 'TechStaff Ltd', 'PaySafe Umbrella', '1257L', 450),
  ('u2', 'agency@demo.com', 'demo123', 'agency', 'Sarah Mitchell', 'TechStaff Ltd', NULL, NULL, NULL),
  ('u3', 'payroll@demo.com', 'demo123', 'payroll_operator', 'James Carter', NULL, 'PaySafe Umbrella', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO timesheets (
  id, contractor_id, contractor_name, week_start, week_end, hours, rate, gross, status, version,
  submitted_at, approved_at, approved_by, description, rejection_reason, versions
)
VALUES
  ('ts1', 'u1', 'Alex Johnson', '2025-03-10', '2025-03-14', 40, 450, 18000, 'WORK_APPROVED', 1,
   '2025-03-15T09:00:00Z', '2025-03-16T11:00:00Z', 'Sarah Mitchell', 'Backend API development - Sprint 12', NULL, '[]'::jsonb),
  ('ts2', 'u1', 'Alex Johnson', '2025-03-17', '2025-03-21', 38, 450, 17100, 'WORK_SUBMITTED', 1,
   '2025-03-22T08:30:00Z', NULL, NULL, 'Frontend integration and testing', NULL, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO invoices (
  id, timesheet_id, contractor_id, contractor_name, agency, umbrella, invoice_number, week_start, week_end, hours, rate,
  gross, status, work_record_state, generated_at, approved_at, paid_at, payment_ref, amount_received
)
VALUES
  ('inv1', 'ts1', 'u1', 'Alex Johnson', 'TechStaff Ltd', 'PaySafe Umbrella', 'INV-2025-001', '2025-03-10', '2025-03-14', 40, 450,
   18000, 'INVOICE_APPROVED', 'WORK_APPROVED', '2025-03-16T11:05:00Z', '2025-03-17T09:00:00Z', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
