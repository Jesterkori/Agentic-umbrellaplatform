import { LEAVE_TYPES } from "../data/mockData";

// Simple date formatter to avoid import issues
const formatDate = (d) => {
  return d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
};

// Helper function to check if a date falls within a leave period
export function isDateOnLeave(date, approvedLeaveRequests) {
  const checkDate = new Date(date);
  return approvedLeaveRequests.some(leave => {
    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);
    return checkDate >= startDate && checkDate <= endDate;
  });
}

// Get leave details for a specific date
export function getLeaveForDate(date, approvedLeaveRequests) {
  const checkDate = new Date(date);
  return approvedLeaveRequests.find(leave => {
    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);
    return checkDate >= startDate && checkDate <= endDate;
  });
}

// Calculate working days in a date range (excluding weekends)
export function getWorkingDaysInDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Saturday or Sunday
      workingDays++;
    }
  }
  
  return workingDays;
}

// Analyze timesheet week for leave integration
export function analyzeTimesheetForLeave(timesheet, approvedLeaveRequests) {
  const weekStart = new Date(timesheet.weekStart);
  const weekEnd = new Date(timesheet.weekEnd);
  
  // Get all leave requests that overlap with this timesheet week
  const overlappingLeave = approvedLeaveRequests.filter(leave => {
    const leaveStart = new Date(leave.startDate);
    const leaveEnd = new Date(leave.endDate);
    return leaveStart <= weekEnd && leaveEnd >= weekStart;
  });

  // Calculate leave days within the timesheet week
  const leaveDetails = [];
  let totalLeaveDays = 0;
  let totalPaidLeaveDays = 0;
  let totalUnpaidLeaveDays = 0;

  overlappingLeave.forEach(leave => {
    const leaveStart = new Date(leave.startDate);
    const leaveEnd = new Date(leave.endDate);
    
    // Calculate overlap with timesheet week
    const overlapStart = leaveStart < weekStart ? weekStart : leaveStart;
    const overlapEnd = leaveEnd > weekEnd ? weekEnd : leaveEnd;
    
    // Count working days in the overlap period
    const leaveDaysInWeek = getWorkingDaysInDateRange(overlapStart, overlapEnd);
    
    const leaveType = LEAVE_TYPES[leave.leaveType];
    
    leaveDetails.push({
      leaveType: leave.leaveType,
      leaveTypeName: leaveType.name,
      days: leaveDaysInWeek,
      isPaid: leaveType.paid,
      color: leaveType.color,
      period: `${formatDate(overlapStart)} - ${formatDate(overlapEnd)}`
    });
    
    totalLeaveDays += leaveDaysInWeek;
    if (leaveType.paid) {
      totalPaidLeaveDays += leaveDaysInWeek;
    } else {
      totalUnpaidLeaveDays += leaveDaysInWeek;
    }
  });

  // Calculate expected working days for the week
  const expectedWorkingDays = getWorkingDaysInDateRange(weekStart, weekEnd);
  
  // Calculate actual worked days (submitted hours / standard daily hours)
  const standardDailyHours = 8; // Assuming 8-hour work day
  const actualWorkedDays = timesheet.hours / standardDailyHours;
  
  // Calculate the difference
  const unaccountedDays = expectedWorkingDays - totalLeaveDays - actualWorkedDays;

  return {
    totalLeaveDays,
    totalPaidLeaveDays,
    totalUnpaidLeaveDays,
    leaveDetails,
    expectedWorkingDays,
    actualWorkedDays,
    unaccountedDays,
    hasLeave: totalLeaveDays > 0,
    hasUnaccountedDays: Math.abs(unaccountedDays) > 0.1, // Allow small rounding differences
    overlappingLeave
  };
}

// Generate leave summary for invoice
export function generateLeaveSummary(timesheet, approvedLeaveRequests) {
  const analysis = analyzeTimesheetForLeave(timesheet, approvedLeaveRequests);
  
  if (!analysis.hasLeave) {
    return null;
  }

  return {
    totalLeaveDays: analysis.totalLeaveDays,
    paidLeaveDays: analysis.totalPaidLeaveDays,
    unpaidLeaveDays: analysis.totalUnpaidLeaveDays,
    leaveBreakdown: analysis.leaveDetails,
    totalWorkingDays: analysis.expectedWorkingDays,
    actualWorkedDays: analysis.actualWorkedDays,
    leaveRate: timesheet.rate, // Same rate as regular work for paid leave
    paidLeaveAmount: analysis.totalPaidLeaveDays * timesheet.rate,
    regularWorkAmount: analysis.actualWorkedDays * timesheet.rate
  };
}

// Validate timesheet against leave records
export function validateTimesheetAgainstLeave(timesheet, approvedLeaveRequests) {
  const analysis = analyzeTimesheetForLeave(timesheet, approvedLeaveRequests);
  const validations = [];
  
  if (analysis.hasUnaccountedDays) {
    if (analysis.unaccountedDays > 0) {
      validations.push({
        type: "warning",
        message: `${Math.abs(analysis.unaccountedDays).toFixed(1)} working day(s) not accounted for. Please check if leave was taken but not recorded.`
      });
    } else {
      validations.push({
        type: "info", 
        message: `${Math.abs(analysis.unaccountedDays).toFixed(1)} extra day(s) recorded. Please verify hours.`
      });
    }
  }
  
  if (analysis.hasLeave) {
    validations.push({
      type: "success",
      message: `${analysis.totalLeaveDays} leave day(s) found in this timesheet period.`
    });
  }
  
  return validations;
}
