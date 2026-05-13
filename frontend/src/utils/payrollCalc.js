/**
 * Mirrors backend `/api/payroll/process` gross-to-net logic for preview.
 * All monetary components use integer pence-style rounding on percentages.
 */
export function computeGrossToNet(invoiceGross, options = {}) {
  const g = Number(invoiceGross) || 0;
  
  // Umbrella margin
  const umbrellaFee = Math.max(0, Number(options.umbrellaFee) || 0);
  
  // Setup Employer Costs
  const employerNiRate = (options.employerNiRate != null ? Number(options.employerNiRate) : 0.138); 
  const appLevyRate = options.hasApprenticeshipLevy ? 0.005 : 0;
  const holidayPayRate = options.accruePaidLeave ? 0.1207 : 0;
  const employerPension = Math.max(0, Number(options.employerPension) || 0); // fixed £
  
  // Tax / Employee Deductions
  const taxRate = clamp(Number(options.taxRate) || 0.20, 0, 0.60);
  const employeeNiRate = clamp(Number(options.niRate) || 0.08, 0, 0.15); 
  let sipp = Math.max(0, Number(options.sipp) || 0); // fixed £
  let studentLoan = Math.max(0, Number(options.studentLoan) || 0); // fixed £
  let employeePensionRate = clamp(Number(options.pensionRate) || 0, 0, 1);

  // 1. Calculate Available to Pay after Umbrella Fee
  const availableToPay = Math.max(0, g - umbrellaFee);

  // 2. Derive Taxable Gross (Linear approximation to avoid complex goal seek)
  // Taxable Gross + Employers NI (13.8%) + App Levy (0.5%) + Holiday Pay (12.07%) = Available To Pay
  const multiplier = 1 + holidayPayRate + employerNiRate + appLevyRate;
  const estimatedGross = availableToPay / multiplier;

  const holidayPay = Math.round(estimatedGross * holidayPayRate);
  const employerNI = Math.round(estimatedGross * employerNiRate);
  const apprenticeshipLevy = Math.round(estimatedGross * appLevyRate);
  
  // 3. Final Taxable Gross Payment (absorbs any rounding pennies)
  const taxableGross = Math.max(0, availableToPay - holidayPay - employerNI - apprenticeshipLevy - employerPension);
  
  // 4. Employee Deductions
  const incomeTax = Math.round(taxableGross * taxRate);
  const employeeNI = Math.round(taxableGross * employeeNiRate);
  const employeePension = Math.round(taxableGross * employeePensionRate);
  
  const totalDeductions = incomeTax + employeeNI + employeePension + studentLoan + sipp;

  // 5. Net Pay
  const net = taxableGross - totalDeductions;

  return {
    gross: taxableGross,
    umbrellaFee,
    holidayPay,
    employerNI,
    apprenticeshipLevy,
    employerPension,
    incomeTax,
    employeeNI,
    pension: employeePension,
    studentLoan,
    sipp,
    net,
    hmrcEmployeeTotal: incomeTax + employeeNI
  };
}

function clamp(n, lo, hi) {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}
