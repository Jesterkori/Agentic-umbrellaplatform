import { useState, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants";
import { LEAVE_TYPES } from "../../data/mockData";
import { Card, PageTitle, Badge, Btn, Input, Textarea, Modal, Table } from "../../components/UI";
import { fmt, fmtDate } from "../../utils/format";
import { getLeaveForDate } from "../../utils/leaveUtils";
import { animationStyles } from "../../utils/animations";

const STANDARD_DAY_HOURS = 8;

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}


function getMonthMatrix(monthValue) {
  if (!monthValue) return [];
  const [year, month] = monthValue.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startDay = first.getUTCDay();
  const firstGridDate = new Date(first);
  firstGridDate.setUTCDate(firstGridDate.getUTCDate() - startDay);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDate);
    date.setUTCDate(firstGridDate.getUTCDate() + index);
    const monthIndex = date.getUTCMonth() + 1;
    const isCurrentMonth = monthIndex === month;
    return {
      key: date.toISOString().slice(0, 10),
      date,
      dayNumber: date.getUTCDate(),
      label: date.toLocaleDateString("en-GB", { weekday: "short" }),
      monthLabel: date.toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
      isWeekend: date.getUTCDay() === 0 || date.getUTCDay() === 6,
      isCurrentMonth,
    };
  });
}

function getWeekRangeFromDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - day + 1);
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);
  return {
    start: monday.toISOString().slice(0, 10),
    end: friday.toISOString().slice(0, 10),
  };
}

function calculateWorkedHours(loginTime, logoutTime) {
  if (!loginTime || !logoutTime) return 0;
  const [loginHour, loginMinute] = loginTime.split(":").map(Number);
  const [logoutHour, logoutMinute] = logoutTime.split(":").map(Number);
  const loginMinutes = loginHour * 60 + loginMinute;
  const logoutMinutes = logoutHour * 60 + logoutMinute;
  if (Number.isNaN(loginMinutes) || Number.isNaN(logoutMinutes) || logoutMinutes <= loginMinutes) return 0;
  return (logoutMinutes - loginMinutes) / 60;
}

function formatWorkedHours(hours) {
  const rounded = Number(hours || 0);
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

function getDatesInRange(start, end) {
  const dates = [];
  const d = new Date(start + "T00:00:00Z");
  const endDate = new Date(end + "T00:00:00Z");
  while (d <= endDate) { dates.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return dates;
}

function buildCalendarRows(monthValue, dayEntries, leaveRequests, contractorId, approvedDateKeys = new Set(), rejectedDateKeys = new Set()) {
  const approvedLeaveRequests = leaveRequests.filter(
    (leave) => leave.contractorId === contractorId && leave.status === "approved"
  );

  return getMonthMatrix(monthValue).map((day) => {
    const leave = getLeaveForDate(day.key, approvedLeaveRequests);
    const entry = dayEntries[day.key] || { login: "", logout: "" };
    const workedHours = leave ? 0 : calculateWorkedHours(entry.login, entry.logout);
    const overtimeHours = (!leave && !day.isWeekend) ? Math.max(0, workedHours - STANDARD_DAY_HOURS) : 0;
    const leaveMeta = leave ? LEAVE_TYPES[leave.leaveType] : null;

    return {
      ...day,
      leave,
      leaveMeta,
      login: entry.login || "",
      logout: entry.logout || "",
      workedHours,
      overtimeHours,
      isApproved: approvedDateKeys.has(day.key),
      isRejected: rejectedDateKeys.has(day.key),
    };
  });
}

export function SubmitTimesheetPage() {
  const { user, submitTimesheet, leaveRequests, activeContract, timesheets } = useApp();
  const [monthValue, setMonthValue] = useState(getCurrentMonthValue());
  const [dayEntries, setDayEntries] = useState({});
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const contractKey = activeContract?.id || "default";
  const currentEntries = dayEntries[contractKey] || {};

  const approvedDateKeys = new Set();
  const rejectedDateKeys = new Set();
  timesheets.filter(ts => ts.contractorId === user.id).forEach(ts => {
    const dates = getDatesInRange(ts.weekStart, ts.weekEnd);
    if (ts.status === "WORK_APPROVED") dates.forEach(d => approvedDateKeys.add(d));
    if (ts.status === "WORK_REJECTED") dates.forEach(d => rejectedDateKeys.add(d));
  });

  const calendarDays = buildCalendarRows(monthValue, currentEntries, leaveRequests, user.id, approvedDateKeys, rejectedDateKeys);
  const effectiveRate = Number(activeContract?.rate || user.rate || 0);
  const monthDays = calendarDays.filter((day) => day.isCurrentMonth);
  const selectedWeekSeed = selectedDate || monthDays.find((day) => !day.isWeekend && !day.leave)?.key || monthDays[0]?.key || calendarDays[0]?.key;
  const weekRange = selectedWeekSeed ? getWeekRangeFromDate(selectedWeekSeed) : { start: "", end: "" };
  const weekDays = calendarDays.filter((day) => day.key >= weekRange.start && day.key <= weekRange.end);
  const totalHours = weekDays.reduce((sum, day) => sum + day.workedHours, 0);
  const totalOvertimeHours = weekDays.reduce((sum, day) => sum + day.overtimeHours, 0);
  const totalRegularHours = Math.max(0, totalHours - totalOvertimeHours);
  const leaveDays = weekDays.filter((day) => day.leave).length;
  const hourlyRate = effectiveRate / STANDARD_DAY_HOURS;
  const estimatedGross = totalHours * hourlyRate;
  const selectedDay = selectedDate ? calendarDays.find((day) => day.key === selectedDate) : calendarDays.find((day) => day.key === selectedWeekSeed);

  const updateDayEntry = (dateKey, field, value) => {
    setDayEntries((current) => ({
      ...current,
      [contractKey]: {
        ...(current[contractKey] || {}),
        [dateKey]: {
          ...((current[contractKey] || {})[dateKey] || { login: "", logout: "" }),
          [field]: value,
        },
      },
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    weekDays.forEach((day) => {
      if (day.leave || day.isWeekend) return;
      const hasLogin = Boolean(day.login);
      const hasLogout = Boolean(day.logout);
      // Only validate days where the user started filling something in
      if (hasLogin && !hasLogout) {
        errs[day.key] = "Logout time is required";
      } else if (!hasLogin && hasLogout) {
        errs[day.key] = "Login time is required";
      } else if (hasLogin && hasLogout && day.workedHours <= 0) {
        errs[day.key] = "Logout must be later than login";
      }
    });
    if (totalHours <= 0) errs.general = "Enter at least one worked day.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const descriptionLines = [
      notes.trim(),
      "Daily log:",
      ...weekDays.map((day) => {
        if (day.leave) {
          const leaveTypeName = LEAVE_TYPES[day.leave.leaveType]?.name || day.leave.leaveType;
          return `${day.label} ${fmtDate(day.key)} - Leave: ${leaveTypeName}`;
        }
        return `${day.label} ${fmtDate(day.key)} - ${day.login || "--:--"} to ${day.logout || "--:--"} (${formatWorkedHours(day.workedHours)}h)`;
      }),
      `Leave days: ${leaveDays}`,
    ].filter(Boolean);

    const res = await submitTimesheet({
      weekStart: weekRange.start,
      weekEnd: weekRange.end,
      hours: Number(totalHours.toFixed(2)),
      description: descriptionLines.join("\n"),
    });

    if (res.success) {
      setSuccess({ gross: estimatedGross, hours: totalHours, leaveDays, overtime: totalOvertimeHours });
      setNotes("");
    }
  };

  return (
    <div style={{ maxWidth: "1120px" }}>
      <style>{animationStyles}</style>
      <div style={{ animation: "riseIn 0.6s ease-out backwards" }}>
        <PageTitle title="Calendar Timesheet" subtitle="Pick a day, enter login/logout, and see leave markers on the month view." />
      </div>
      {activeContract && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: C.accent + "12", border: `1px solid ${C.accent}33`, borderRadius: "8px", marginBottom: "16px", fontSize: "12px", animation: "scaleIn 0.4s ease-out 0.05s backwards" }}>
          <span style={{ color: C.accent, fontWeight: 700 }}>{activeContract.label}</span>
          <span style={{ color: C.muted }}>·</span>
          <span style={{ color: C.text }}>{activeContract.title}</span>
          <span style={{ color: C.muted }}>·</span>
          <span style={{ color: C.muted }}>{activeContract.agency}</span>
          <span style={{ color: C.muted }}>·</span>
          <span style={{ color: C.accent, fontWeight: 600 }}>£{activeContract.rate}/day</span>
        </div>
      )}
      {success && (
        <div style={{ padding: "14px 18px", background: C.green + "22", border: `1px solid ${C.green}44`, borderRadius: "8px", marginBottom: "20px", fontSize: "13px", color: C.green, animation: "scaleIn 0.5s ease-out 0.1s backwards" }}>
          ✓ Timesheet submitted — {formatWorkedHours(success.hours)} total hours{success.overtime > 0 ? ` (${formatWorkedHours(success.overtime)}h overtime)` : ""}, {success.leaveDays} leave day(s), gross value {fmt(success.gross)}. Awaiting agency approval.
        </div>
      )}
      {errors.general && (
        <div style={{ padding: "10px 14px", background: C.red + "22", border: `1px solid ${C.red}44`, borderRadius: "8px", marginBottom: "16px", fontSize: "13px", color: C.red }}>
          {errors.general}
        </div>
      )}
      <Card style={{ animation: "scaleIn 0.5s ease-out 0.15s backwards" }}>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: "18px", alignItems: "start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "12px", letterSpacing: "0.08em", color: C.muted, marginBottom: "4px" }}>MONTH VIEW</div>
                  <h2 style={{ margin: 0, fontSize: "24px" }}>{new Date(`${monthValue}-01`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h2>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <Btn variant="ghost" size="sm" onClick={() => {
                    const [year, month] = monthValue.split("-").map(Number);
                    const prev = new Date(Date.UTC(year, month - 2, 1));
                    setMonthValue(`${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`);
                    setSelectedDate(null);
                  }}>‹</Btn>
                  <Input label="Month" type="month" value={monthValue} onChange={(e) => { setMonthValue(e.target.value); setSelectedDate(null); }} />
                  <Btn variant="ghost" size="sm" onClick={() => {
                    const [year, month] = monthValue.split("-").map(Number);
                    const next = new Date(Date.UTC(year, month, 1));
                    setMonthValue(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`);
                    setSelectedDate(null);
                  }}>›</Btn>
                </div>
              </div>

              <div style={{ marginBottom: "12px", fontSize: "12px", color: C.muted, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", gap: "8px" }}>
                {"SMTWTFS".split("").map((label, index) => <div key={index}>{label}</div>)}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "8px" }}>
                {calendarDays.map((day) => {
                  const leaveColor = day.leaveMeta?.color || C.amber;
                  const hasEntry = Boolean(day.login || day.logout || day.workedHours > 0);
                  const isSelected = selectedDay?.key === day.key;
                  const dots = [];
                  if (day.leave) dots.push({ color: leaveColor, label: day.leaveMeta?.name || "Leave" });
                  if (day.isApproved && hasEntry) dots.push({ color: C.green, label: "Hours approved" });
                  else if (day.isRejected && hasEntry) dots.push({ color: C.red, label: "Rejected" });
                  else if (hasEntry) dots.push({ color: C.amber, label: "Awaiting approval" });
                  if (day.overtimeHours > 0) dots.push({ color: C.blue, label: "Overtime" });
                  if (day.isWeekend) dots.push({ color: C.border, label: "Weekend" });

                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => setSelectedDate(day.key)}
                      style={{
                        border: isSelected ? `2px solid ${C.green}` : `1px solid ${day.isCurrentMonth ? C.border : C.border + "55"}`,
                        background: isSelected ? C.green + "16" : day.isCurrentMonth ? C.surface : C.bg,
                        borderRadius: "18px",
                        minHeight: "92px",
                        padding: "10px 10px 8px",
                        textAlign: "left",
                        position: "relative",
                        cursor: "pointer",
                        color: day.isCurrentMonth ? C.text : C.muted,
                        opacity: day.isCurrentMonth ? 1 : 0.45,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <span style={{ fontSize: "12px", color: C.muted }}>{day.dayNumber}</span>
                        {day.leave ? <span style={{ width: "10px", height: "10px", borderRadius: "999px", background: leaveColor, boxShadow: `0 0 0 3px ${leaveColor}22` }} /> : null}
                      </div>
                      <div style={{ display: "flex", justifyContent: "center", gap: "4px", minHeight: "12px", flexWrap: "wrap" }}>
                        {dots.slice(0, 3).map((dot, index) => (
                          <span key={index} title={dot.label} style={{ width: "6px", height: "6px", borderRadius: "999px", background: dot.color, display: "inline-block" }} />
                        ))}
                      </div>
                      {day.workedHours > 0 && (
                        <div style={{ position: "absolute", bottom: "8px", right: "10px", textAlign: "right" }}>
                          <div style={{ fontSize: "11px", color: day.isApproved ? C.green : day.isRejected ? C.red : C.amber, fontWeight: 700 }}>{formatWorkedHours(day.workedHours)}h</div>
                          {day.overtimeHours > 0 && (
                            <div style={{ fontSize: "10px", color: C.blue, fontWeight: 700 }}>+{formatWorkedHours(day.overtimeHours)}OT</div>
                          )}
                        </div>
                      )}
                      {day.leave && (
                        <div style={{ position: "absolute", bottom: "8px", left: "10px", fontSize: "11px", color: leaveColor, fontWeight: 700 }}>
                          Leave
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: "18px", display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "12px", color: C.muted }}>
                <Legend color={C.amber} label="Awaiting approval" />
                <Legend color={C.green} label="Hours approved" />
                <Legend color={C.red} label="Rejected" />
                <Legend color={C.blue} label="Overtime" />
                <Legend color={C.amber} label="Approved leave" />
                <Legend color={C.border} label="Weekend" />
              </div>
            </div>

            <Card style={{ background: C.bg, padding: "18px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "0.1em", color: C.muted, marginBottom: "6px" }}>DAY DETAILS</div>
              {selectedDay ? (
                <div>
                  <div style={{ fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>{fmtDate(selectedDay.key)}</div>
                  <div style={{ fontSize: "12px", color: C.muted, marginBottom: "14px" }}>{selectedDay.label}</div>

                  {selectedDay.leave ? (
                    <div style={{ padding: "12px", borderRadius: "12px", background: (selectedDay.leaveMeta?.color || C.amber) + "12", border: `1px solid ${(selectedDay.leaveMeta?.color || C.amber)}44`, marginBottom: "14px" }}>
                      <div style={{ fontWeight: 700, marginBottom: "4px" }}>{selectedDay.leaveMeta?.name || "Leave"}</div>
                      <div style={{ fontSize: "12px", color: C.muted }}>Approved leave from {fmtDate(selectedDay.leave.startDate)} to {fmtDate(selectedDay.leave.endDate)}</div>
                    </div>
                  ) : null}

                  <TimePicker
                    label="Login"
                    value={selectedDay.login}
                    onChange={(v) => updateDayEntry(selectedDay.key, "login", v)}
                    error={errors[selectedDay.key]}
                    disabled={selectedDay.isWeekend || !!selectedDay.leave}
                  />
                  <TimePicker
                    label="Logout"
                    value={selectedDay.logout}
                    onChange={(v) => updateDayEntry(selectedDay.key, "logout", v)}
                    disabled={selectedDay.isWeekend || !!selectedDay.leave}
                  />

                  <div style={{ padding: "12px 14px", borderRadius: "12px", background: C.surface, border: `1px solid ${selectedDay.overtimeHours > 0 ? C.blue + "66" : C.border}`, marginBottom: "14px" }}>
                    <div style={{ fontSize: "11px", color: C.muted, marginBottom: "4px" }}>WORKED HOURS</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                      <div style={{ fontSize: "28px", fontWeight: 700, color: selectedDay.leave ? C.amber : C.green }}>{formatWorkedHours(selectedDay.workedHours)}h</div>
                      {selectedDay.overtimeHours > 0 && (
                        <div style={{ fontSize: "14px", fontWeight: 700, color: C.blue }}>+{formatWorkedHours(selectedDay.overtimeHours)}h OT</div>
                      )}
                    </div>
                    <div style={{ fontSize: "12px", color: C.muted }}>Daily rate equivalent: {fmt(hourlyRate)}/hour</div>
                    {selectedDay.overtimeHours > 0 && (
                      <div style={{ marginTop: "6px", fontSize: "11px", color: C.blue }}>
                        {formatWorkedHours(STANDARD_DAY_HOURS)}h standard · {formatWorkedHours(selectedDay.overtimeHours)}h overtime
                      </div>
                    )}
                  </div>

                  <Textarea
                    label="Notes"
                    placeholder="Optional note for this month…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px", marginBottom: "14px", fontSize: "12px" }}>
                    <InfoPill label="Week hours" value={`${formatWorkedHours(totalHours)}h`} />
                    <InfoPill label="Leave days" value={`${leaveDays}`} />
                    <InfoPill label="Regular" value={`${formatWorkedHours(totalRegularHours)}h`} />
                    <InfoPill label="Overtime" value={`${formatWorkedHours(totalOvertimeHours)}h`} highlight={totalOvertimeHours > 0} />
                    <InfoPill label="Period" value={`${fmtDate(weekRange.start)} - ${fmtDate(weekRange.end)}`} />
                    <InfoPill label="Gross" value={fmt(estimatedGross)} />
                  </div>

                  <Btn type="submit" size="lg" fullWidth>Submit Calendar Timesheet</Btn>
                </div>
              ) : null}
            </Card>
          </div>

          <div style={{ marginTop: "18px", fontSize: "12px", color: C.muted }}>
            Total for selected week: {formatWorkedHours(totalHours)}h · Regular: {formatWorkedHours(totalRegularHours)}h
            {totalOvertimeHours > 0 && <span style={{ color: C.blue }}> · Overtime: {formatWorkedHours(totalOvertimeHours)}h</span>}
            {" "}· Approved leave days: {leaveDays}
          </div>
        </form>
      </Card>
    </div>
  );
}

export function ViewTimesheetsPage() {
  const { user, timesheets, resubmitTimesheet, editTimesheet, deleteTimesheet } = useApp();
  const myTs = timesheets.filter(t => t.contractorId === user.id);
  const [selected, setSelected] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSuccess, setEditSuccess] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [actionError, setActionError] = useState("");

  const openEdit = (ts) => {
    setActionError("");
    setEditForm({ hours: ts.hours, description: ts.description, weekStart: ts.weekStart, weekEnd: ts.weekEnd });
    setEditModal(ts);
    setEditSuccess(false);
  };

  const submitEdit = async () => {
    const action = editModal.status === "WORK_REJECTED" ? resubmitTimesheet : editTimesheet;
    const res = await action(editModal.id, editForm, editModal.version);
    if (res.success) {
      setActionError("");
      setEditSuccess(true);
      setTimeout(() => setEditModal(null), 1200);
    } else {
      setActionError(res.error || "Unable to update timesheet.");
    }
  };

  const confirmDelete = async () => {
    const res = await deleteTimesheet(deleteModal.id);
    if (res.success) {
      setActionError("");
      setDeleteModal(null);
    } else {
      setActionError(res.error || "Unable to delete timesheet.");
    }
  };

  return (
    <div>
      <PageTitle title="My Timesheets" subtitle="Track all your submitted work records" />
      {actionError && (
        <div style={{ padding: "10px 14px", background: C.red + "22", border: `1px solid ${C.red}44`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: C.red }}>
          {actionError}
        </div>
      )}
      <Card>
        <Table
          headers={["Period", "Hours", "Gross", "Status", "Submitted", "Actions"]}
          rows={myTs.map(ts => [
            `${fmtDate(ts.weekStart)} – ${fmtDate(ts.weekEnd)}`,
            `${ts.hours}h`,
            fmt(ts.gross),
            <Badge status={ts.status} />,
            fmtDate(ts.submittedAt),
            <div style={{ display: "flex", gap: "8px" }}>
              <Btn size="sm" variant="ghost" onClick={() => setSelected(ts)}>View</Btn>
              {ts.status === "WORK_SUBMITTED" && <Btn size="sm" variant="primary" onClick={() => openEdit(ts)}>Edit</Btn>}
              {ts.status === "WORK_REJECTED" && <Btn size="sm" variant="primary" onClick={() => openEdit(ts)}>Resubmit</Btn>}
              {(ts.status === "WORK_REJECTED" || ts.status === "WORK_SUBMITTED") && <Btn size="sm" variant="danger" onClick={() => { setActionError(""); setDeleteModal(ts); }}>Delete</Btn>}
            </div>
          ])}
        />
        {!myTs.length && <div style={{ padding: "20px", color: C.muted, fontSize: "13px" }}>No timesheets submitted yet.</div>}
      </Card>

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Timesheet Details">
        {selected && (
          <div style={{ fontSize: "13px" }}>
            <Row label="Period" value={`${fmtDate(selected.weekStart)} – ${fmtDate(selected.weekEnd)}`} />
            <Row label="Hours" value={`${selected.hours}h`} />
            <Row label="Rate" value={fmt(selected.rate)} />
            <Row label="Gross" value={fmt(selected.gross)} />
            <Row label="Status" value={<Badge status={selected.status} />} />
            <Row label="Version" value={`v${selected.version}`} />
            <Row label="Submitted" value={fmtDate(selected.submittedAt)} />
            {selected.approvedAt && <Row label="Approved by" value={selected.approvedBy} />}
            {selected.rejectionReason && (
              <div style={{ marginTop: "12px", padding: "10px", background: C.red + "11", borderRadius: "6px", color: C.red, fontSize: "12px" }}>
                <strong>Rejection reason:</strong> {selected.rejectionReason}
              </div>
            )}
            <div style={{ marginTop: "12px", padding: "10px", background: C.bg, borderRadius: "6px", fontSize: "12px", color: C.muted }}>
              {selected.description}
            </div>
            {selected.versions.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <div style={{ fontSize: "11px", color: C.muted, marginBottom: "6px" }}>VERSION HISTORY</div>
                {selected.versions.map(v => (
                  <div key={v.version} style={{ fontSize: "12px", color: C.muted }}>v{v.version}: {v.hours}h — {fmtDate(v.submittedAt)}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit/resubmit modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={editModal?.status === "WORK_REJECTED" ? "Resubmit Timesheet" : "Edit Submitted Timesheet"}>
        {editModal && (
          editSuccess ? (
            <div style={{ textAlign: "center", padding: "20px", color: C.green, fontSize: "14px" }}>✓ Timesheet updated successfully!</div>
          ) : (
            <div>
              {editModal.status === "WORK_REJECTED" && (
                <div style={{ padding: "10px", background: C.red + "11", borderRadius: "6px", color: C.red, fontSize: "12px", marginBottom: "16px" }}>
                  Rejection reason: {editModal.rejectionReason}
                </div>
              )}
              <Input label="Week Start" type="date" value={editForm.weekStart}
                onChange={e => setEditForm(f => ({ ...f, weekStart: e.target.value }))} />
              <Input label="Week End" type="date" value={editForm.weekEnd}
                onChange={e => setEditForm(f => ({ ...f, weekEnd: e.target.value }))} />
              <Input label="Corrected Hours" type="number" value={editForm.hours}
                onChange={e => setEditForm(f => ({ ...f, hours: e.target.value }))} />
              <Textarea label="Updated Description" value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
              <div style={{ display: "flex", gap: "10px" }}>
                <Btn onClick={submitEdit}>Resubmit</Btn>
                <Btn variant="ghost" onClick={() => setEditModal(null)}>Cancel</Btn>
              </div>
            </div>
          )
        )}
      </Modal>

      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Timesheet">
        {deleteModal && (
          <div>
            <div style={{ fontSize: "13px", color: C.muted, marginBottom: "14px" }}>
              Delete timesheet for {fmtDate(deleteModal.weekStart)} – {fmtDate(deleteModal.weekEnd)}? This action cannot be undone.
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <Btn variant="danger" onClick={confirmDelete}>Delete</Btn>
              <Btn variant="ghost" onClick={() => setDeleteModal(null)}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function TimesheetApprovalsPage() {
  const { timesheets, approveTimesheet, rejectTimesheet } = useApp();
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [filter, setFilter] = useState("WORK_SUBMITTED");

  const filtered = filter === "all" ? timesheets : timesheets.filter(t => t.status === filter);

  const doReject = async () => {
    if (!rejectReason.trim()) return;
    await rejectTimesheet(rejectModal.id, rejectReason, rejectModal.version);
    setRejectModal(null); setRejectReason("");
  };

  return (
    <div>
      <PageTitle title="Timesheet Approvals" subtitle="Review and action contractor submissions" />

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {["WORK_SUBMITTED", "WORK_APPROVED", "WORK_REJECTED", "all"].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: "6px 14px", borderRadius: "20px", border: `1px solid ${filter === s ? C.accent : C.border}`,
            background: filter === s ? C.accent + "22" : "transparent", color: filter === s ? C.accent : C.muted,
            fontSize: "12px", cursor: "pointer",
          }}>
            {s === "all" ? "All" : s.replace("WORK_", "")}
          </button>
        ))}
      </div>

      <Card>
        <Table
          headers={["Contractor", "Period", "Hours", "Gross", "Description", "Status", "Actions"]}
          rows={filtered.map(ts => [
            ts.contractorName,
            `${fmtDate(ts.weekStart)} – ${fmtDate(ts.weekEnd)}`,
            `${ts.hours}h`,
            fmt(ts.gross),
            <span style={{ color: C.muted, fontSize: "12px" }}>{ts.description?.slice(0, 40)}…</span>,
            <Badge status={ts.status} />,
            ts.status === "WORK_SUBMITTED" ? (
              <div style={{ display: "flex", gap: "6px" }}>
                <Btn size="sm" variant="success" onClick={() => approveTimesheet(ts.id, ts.version)}>Approve</Btn>
                <Btn size="sm" variant="danger" onClick={() => { setRejectModal(ts); setRejectReason(""); }}>Reject</Btn>
              </div>
            ) : <span style={{ color: C.muted, fontSize: "12px" }}>—</span>
          ])}
        />
        {!filtered.length && <div style={{ padding: "20px", color: C.muted, fontSize: "13px" }}>No timesheets in this state.</div>}
      </Card>

      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Timesheet">
        {rejectModal && (
          <div>
            <div style={{ fontSize: "13px", color: C.muted, marginBottom: "16px" }}>
              Rejecting: {rejectModal.contractorName} — {fmtDate(rejectModal.weekStart)} to {fmtDate(rejectModal.weekEnd)}
            </div>
            <Textarea label="Rejection Reason (required)" placeholder="Explain why this timesheet is being rejected…"
              value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            <div style={{ display: "flex", gap: "10px" }}>
              <Btn variant="danger" onClick={doReject} disabled={!rejectReason.trim()}>Confirm Rejection</Btn>
              <Btn variant="ghost" onClick={() => setRejectModal(null)}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function TimePicker({ label, value, onChange, disabled, error }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selHour = value ? Number(value.split(":")[0]) : null;
  const selMin  = value ? Number(value.split(":")[1]) : null;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hours   = Array.from({ length: 16 }, (_, i) => i + 6); // 06–21
  const minutes = [0, 15, 30, 45];

  const pick = (h, m) => { onChange(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`); setOpen(false); };

  return (
    <div ref={ref} style={{ marginBottom: "16px", position: "relative" }}>
      {label && <label style={{ display: "block", fontSize: "12px", color: C.muted, marginBottom: "6px" }}>{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: "100%", padding: "10px 14px", background: C.bg,
          border: `1px solid ${error ? C.red : open ? C.accent : C.border}`,
          borderRadius: "8px", color: value ? C.text : C.muted,
          fontSize: "14px", cursor: disabled ? "default" : "pointer",
          textAlign: "left", fontFamily: "inherit", boxSizing: "border-box",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          opacity: disabled ? 0.5 : 1, transition: "border-color 0.15s",
        }}
      >
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{value || "-- : --"}</span>
        <span style={{ fontSize: "13px", opacity: 0.5 }}>⏱</span>
      </button>
      {error && <div style={{ fontSize: "11px", color: C.red, marginTop: "4px" }}>{error}</div>}

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: "14px",
          padding: "14px", boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          display: "flex", gap: "12px",
        }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: C.muted, marginBottom: "8px" }}>HOUR</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px" }}>
              {hours.map(h => (
                <button key={h} type="button" onClick={() => pick(h, selMin ?? 0)}
                  style={{
                    padding: "7px 0", borderRadius: "7px", border: "none",
                    background: selHour === h ? C.accent : C.bg,
                    color: selHour === h ? "#fff" : C.text,
                    fontSize: "12px", cursor: "pointer", fontFamily: "inherit",
                    fontVariantNumeric: "tabular-nums", transition: "background 0.1s",
                  }}
                >{String(h).padStart(2, "0")}</button>
              ))}
            </div>
          </div>
          <div style={{ width: "1px", background: C.border, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: C.muted, marginBottom: "8px" }}>MIN</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {minutes.map(m => (
                <button key={m} type="button" onClick={() => pick(selHour ?? 9, m)}
                  style={{
                    padding: "7px 16px", borderRadius: "7px", border: "none",
                    background: selMin === m ? C.accent : C.bg,
                    color: selMin === m ? "#fff" : C.text,
                    fontSize: "12px", cursor: "pointer", fontFamily: "inherit",
                    fontVariantNumeric: "tabular-nums", transition: "background 0.1s",
                  }}
                >{String(m).padStart(2, "0")}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}22`, fontSize: "13px" }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: color, display: "inline-block" }} />
      <span>{label}</span>
    </div>
  );
}

function InfoPill({ label, value, highlight }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: "10px", background: C.surface, border: `1px solid ${highlight ? C.blue + "66" : C.border}` }}>
      <div style={{ fontSize: "10px", color: highlight ? C.blue : C.muted, letterSpacing: "0.08em", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "13px", fontWeight: 700, color: highlight ? C.blue : "inherit" }}>{value}</div>
    </div>
  );
}
