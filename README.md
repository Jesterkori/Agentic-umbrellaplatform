# Agentic Umbrella Platform

A full-stack B2B/B2B2C payroll platform connecting **Agencies**, **Umbrella Companies**, and **Contractors** in a unified workflow — from onboarding and contract management through timesheets, invoicing, and payroll processing.

---

## Team Members

| Name                      | USN          |
|---------------------------|--------------|
| Sharanabasaveshwara M Kori | 1AP22CS042   |
| Akito A Ayemi             | 1AP22CS042   |
| Varun Quanth              | 1GA22CS184   |
| Maruthi N                 | —            |
| Nisarga                   | —            |
| Harshith                  | —            |
| Soumya                    | —            |
| Yamuna                    | —            |

---

## Project Description

The Agentic Umbrella Platform is a multi-role SaaS payroll management system designed for the contractor economy. It digitises and automates the complete contractor lifecycle:

- **Agencies** post contracts, onboard contractors, and approve timesheets
- **Umbrella Companies** manage payroll processing, generate invoices, and handle compliance
- **Contractors** log work hours, manage leave, track earnings, and view payslips

The platform implements a full state machine for work records:
`Work Submitted → Work Approved → Invoice Generated → Payroll Processed → Completed`

---

## Key Features

- Role-based access control (Agency / Umbrella Company / Contractor)
- JWT authentication with protected routes per role
- Multi-contract support — contractors can hold and switch between multiple contracts
- Weekly timesheet entry with custom time picker UI
- Monthly calendar view with colour-coded approval status (Awaiting / Approved / Rejected / Overtime)
- Agency timesheet approval workflow with real-time status updates
- Leave request management with calendar integration
- Invoice generation with overtime calculation
- Payroll processing and payslip export (PDF)
- Real-time notifications via Socket.io

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React 18, Vite, Context API       |
| Backend   | Node.js, Express.js               |
| Database  | SQLite                            |
| Auth      | JWT (JSON Web Tokens)             |
| Realtime  | Socket.io                         |
| PDF       | jsPDF                             |

---

## Setup & Execution

### Prerequisites
- Node.js v18 or higher
- npm

### 1. Clone the repository

```bash
git clone https://github.com/Jesterkori/Agentic-umbrellaplatform.git
cd Agentic-umbrellaplatform
```

### 2. Setup the Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` folder (use `.env.example` as reference):

```bash
cp .env.example .env
```

Start the backend server:

```bash
npm run dev
```

The backend runs on `http://localhost:5000` by default.

### 3. Setup the Frontend

Open a new terminal:

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` folder (use `.env.example` as reference):

```bash
cp .env.example .env
```

Start the frontend dev server:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173` by default.

### 4. Database

The SQLite database is auto-created on first backend run. To manually initialise or seed:

```bash
cd backend
node src/migrate.js
```

---

## Project Structure

```
payroll-platform/
├── backend/
│   ├── src/
│   │   ├── server.js       # Express server entry point
│   │   ├── db.js           # SQLite connection
│   │   └── migrate.js      # Database migration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Routing and navigation
│   │   ├── context/        # Global state (AppContext)
│   │   ├── pages/          # All page components by role
│   │   ├── components/     # Shared UI components
│   │   ├── data/           # Mock data
│   │   └── utils/          # Utility functions
│   └── package.json
└── database/
    ├── schema.sql          # Database schema
    └── seed.sql            # Sample data
```
