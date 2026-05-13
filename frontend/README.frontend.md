# PayPlatform — Full Contractor Payroll System

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Contractor | contractor@demo.com | demo123 |
| Agency | agency@demo.com | demo123 |
| Payroll Operator | payroll@demo.com | demo123 |

---

## Full End-to-End Workflow

1. **Contractor** submits timesheet
2. **Agency** approves timesheet → invoice auto-generated
3. **Agency** approves invoice → marks payment received
4. **Payroll Operator** runs payroll → payslip generated + HMRC RTI queued
5. **Contractor** views payslip and net pay

---

## Features by Role

### Contractor (7 pages)
- Dashboard — stats, recent timesheets, latest payroll breakdown
- Submit Timesheet — with live gross preview
- My Timesheets — all statuses, version history, resubmit rejected
- Invoices — view own invoice history
- Payroll — full gross-to-net breakdown per run
- Payslips — view & download payslips (retained 7 years)
- Change Password

### Agency (8 pages)
- Dashboard — live pipeline, activity timeline, pending approvals
- Timesheet Approvals — filter by status, approve/reject with modal, view details, version history
- Contractors — roster with avatars, rates, tax codes, profile modal
- Invoices — approve invoices, mark payment received, view full invoice detail
- Payment History — all outgoing payments with reconciliation status
- Disputes — active mismatch exceptions with resolve workflow
- Reports — monthly/contractor spend breakdown, export buttons
- Settings — agency profile, bank details, notification preferences

### Payroll Operator (8 pages)
- Dashboard — queue, HMRC status, recent runs
- Payroll Queue — shows only PAYMENT_RECEIVED invoices with hard-gate warning
- Run Payroll — select invoice, configure tax/NI/pension/fee, live breakdown, process
- Payroll Records — full history with payslip viewer
- All Payslips — view and resend any contractor payslip
- HMRC Submissions — RTI queue, submit button, submission history
- Tax Calculator — fully interactive, adjust any variable, live net pay update
- Settings — umbrella details, fee config, tax year thresholds

---

## Project Structure

```
src/
├── App.jsx                        # Root router + sidebar shell + badge counts
├── main.jsx
├── context/
│   └── AppContext.jsx              # Global state — auth, timesheets, invoices, payroll, disputes, HMRC
├── data/
│   └── mockData.js                 # Seed data — users, contractors, timesheets, invoices, payroll, disputes, HMRC
├── components/
│   └── UI.jsx                      # Shared components — Card, Badge, Table, Modal, Btn, Input, StatCard...
└── pages/
    ├── Dashboard.jsx               # Contractor dashboard
    ├── auth/
    │   └── AuthPages.jsx           # Login, Register, ChangePassword
    ├── timesheet/
    │   └── TimesheetPages.jsx      # Submit, ViewTimesheets
    ├── agency/
    │   └── AgencyPages.jsx         # All 8 agency pages
    ├── invoice/
    │   └── InvoicePages.jsx        # Contractor invoice list
    └── payroll/
        └── PayrollPages.jsx        # All payroll pages for both operator and contractor
```
