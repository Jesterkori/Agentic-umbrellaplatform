import { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants";
import { Card, PageTitle, Badge, Btn, Modal, Input } from "../../components/UI";
import { fmtDate } from "../../utils/format";

export function AgencyDeliverablesPage() {
  const {
    deliverables,
    contractors,
    loadAgencyDeliverables,
    loadAgencyContractors,
    assignDeliverableContractor,
    updateDeliverableProgress,
    deliverableWorkload,
  } = useApp();

  const [selected, setSelected] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [selectedContractor, setSelectedContractor] = useState("");
  const [progressModal, setProgressModal] = useState(null);
  const [progress, setProgress] = useState(0);
  const [actualHours, setActualHours] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadAgencyDeliverables();
    loadAgencyContractors();
  }, []);

  const activeByContractor = useMemo(() => deliverableWorkload?.byContractor || {}, [deliverableWorkload]);
  const workloadLimit = deliverableWorkload?.limit || 5;

  const onAssign = async () => {
    setError("");
    if (!selectedContractor) {
      setError("Please select a contractor.");
      return;
    }
    const currentLoad = Number(activeByContractor[selectedContractor] || 0);
    if (currentLoad >= workloadLimit) {
      setError(`Selected contractor already has ${workloadLimit} active deliverables.`);
      return;
    }
    const res = await assignDeliverableContractor(assignModal.id, selectedContractor);
    if (!res.success) {
      setError(res.error || "Unable to assign deliverable.");
      return;
    }
    setAssignModal(null);
    setSelectedContractor("");
    setMessage("Deliverable sent for contractor acceptance.");
    setTimeout(() => setMessage(""), 2500);
    await loadAgencyDeliverables();
  };

  const onUpdateProgress = async () => {
    const res = await updateDeliverableProgress(progressModal.id, {
      progress: Number(progress),
      actualHours: Number(actualHours),
      contractorNotes: progressModal.contractorNotes || "",
      milestones: progressModal.milestones || [],
      attachments: progressModal.attachments || [],
    });
    if (!res.success) {
      setError(res.error || "Unable to update progress.");
      return;
    }
    setProgressModal(null);
    setMessage("Progress updated.");
    setTimeout(() => setMessage(""), 2500);
  };

  return (
    <div>
      <PageTitle title="Agency Deliverables" subtitle="Assign work fairly, track progress, and prevent overload." />

      {message && <div style={{ padding: "10px 14px", background: C.green + "22", border: `1px solid ${C.green}44`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: C.green }}>{message}</div>}
      {error && <div style={{ padding: "10px 14px", background: C.red + "1c", border: `1px solid ${C.red}55`, borderRadius: "8px", marginBottom: "14px", fontSize: "13px", color: C.red }}>{error}</div>}

      <Card style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "12px", color: C.muted, marginBottom: "8px" }}>Contractor workload (active / {workloadLimit})</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
          {contractors.map(c => {
            const active = Number(activeByContractor[c.id] || 0);
            return (
              <div key={c.id} style={{ border: `1px solid ${C.border}`, borderRadius: "8px", padding: "8px 10px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px" }}>{c.name}</span>
                <span style={{ fontSize: "12px", color: active >= workloadLimit ? C.red : C.green }}>{active}/{workloadLimit}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Deliverable", "Priority", "Status", "Progress", "Due", "Contractor", "Actions"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.muted, fontWeight: "500", fontSize: "10px", letterSpacing: "0.06em" }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deliverables.map(d => (
                <tr key={d.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "10px" }}>{d.title}</td>
                  <td style={{ padding: "10px", color: d.priority === "high" ? C.red : d.priority === "medium" ? C.amber : C.green }}>{d.priority}</td>
                  <td style={{ padding: "10px" }}><Badge status={d.status} /></td>
                  <td style={{ padding: "10px" }}>{Number(d.progress || 0)}%</td>
                  <td style={{ padding: "10px" }}>{d.dueDate ? fmtDate(d.dueDate) : "-"}</td>
                  <td style={{ padding: "10px" }}>{d.contractorName || "Unassigned"}</td>
                  <td style={{ padding: "10px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <Btn size="sm" variant="ghost" onClick={() => setSelected(d)}>View</Btn>
                      {!d.contractorId && <Btn size="sm" onClick={() => { setAssignModal(d); setSelectedContractor(""); }}>Assign</Btn>}
                      {d.contractorId && d.status !== "completed" && (
                        <Btn size="sm" variant="success" onClick={() => {
                          setProgressModal(d);
                          setProgress(Number(d.progress || 0));
                          setActualHours(Number(d.actualHours || 0));
                        }}>Progress</Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title="Assign Deliverable">
        {assignModal && (
          <div style={{ display: "grid", gap: "12px" }}>
            <div style={{ fontSize: "12px", color: C.muted }}>Assign <strong>{assignModal.title}</strong> to a contractor (requires contractor acceptance).</div>
            <select value={selectedContractor} onChange={e => setSelectedContractor(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${C.border}`, background: C.bg, color: C.text }}>
              <option value="">Select contractor</option>
              {contractors.map(c => {
                const active = Number(activeByContractor[c.id] || 0);
                const disabled = active >= workloadLimit;
                return <option key={c.id} value={c.id} disabled={disabled}>{c.name} ({active}/{workloadLimit})</option>;
              })}
            </select>
            <div style={{ display: "flex", gap: "8px" }}>
              <Btn onClick={onAssign}>Assign</Btn>
              <Btn variant="ghost" onClick={() => setAssignModal(null)}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!progressModal} onClose={() => setProgressModal(null)} title="Update Progress">
        {progressModal && (
          <div style={{ display: "grid", gap: "10px" }}>
            <Input label="Progress %" type="number" min="0" max="100" value={progress} onChange={e => setProgress(e.target.value)} />
            <Input label="Actual Hours" type="number" min="0" value={actualHours} onChange={e => setActualHours(e.target.value)} />
            <div style={{ display: "flex", gap: "8px" }}>
              <Btn onClick={onUpdateProgress}>Save</Btn>
              <Btn variant="ghost" onClick={() => setProgressModal(null)}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Deliverable Details">
        {selected && (
          <div style={{ fontSize: "13px" }}>
            {["title", "status", "priority"].map(k => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}22` }}>
                <span style={{ color: C.muted }}>{k}</span>
                <span>{String(selected[k])}</span>
              </div>
            ))}
            <div style={{ marginTop: "8px", color: C.muted }}>Accepted: {selected.acceptedAt ? fmtDate(selected.acceptedAt) : "Pending"}</div>
            <div style={{ marginTop: "8px", color: C.muted }}>Progress: {Number(selected.progress || 0)}%</div>
            <div style={{ marginTop: "8px", color: C.muted }}>Estimated vs Actual: {Number(selected.estimatedHours || 0)}h / {Number(selected.actualHours || 0)}h</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
