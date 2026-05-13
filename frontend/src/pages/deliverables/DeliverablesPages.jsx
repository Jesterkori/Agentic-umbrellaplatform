import { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants";
import { Card, PageTitle, Badge, Btn, Input, Textarea, Modal, Table, MetricCard } from "../../components/UI";
import { fmt, fmtDate } from "../../utils/format";

const readFilesAsEvidence = async (fileList) => Promise.all(
  Array.from(fileList || []).map((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl: reader.result,
    });
    reader.onerror = () => reject(reader.error || new Error("Unable to read file"));
    reader.readAsDataURL(file);
  }))
);

export function AgencyDeliverablesPage() {
  const { deliverables, loadAgencyDeliverables, loadAgencyContractors, contractors, assignDeliverableContractor, getDeliverableProfitability } = useApp();
  const [selected, setSelected] = useState(null);
  const [selectedContractorId, setSelectedContractorId] = useState("");
  const [profitability, setProfitability] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadAgencyDeliverables();
    loadAgencyContractors();
  }, []);

  const completedCount = useMemo(() => deliverables.filter(d => d.status === "completed").length, [deliverables]);
  const changeRequestedCount = useMemo(() => deliverables.filter(d => d.status === "changes_requested").length, [deliverables]);
  const avgQuality = useMemo(() => {
    const scores = deliverables.map(d => Number(d.qualityScore || d.clientRating || 0)).filter(Boolean);
    if (!scores.length) return 0;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }, [deliverables]);

  const avgMargin = useMemo(() => {
    const margins = deliverables.map(d => Number(d.profitabilityMargin || 0)).filter(v => !Number.isNaN(v));
    if (!margins.length) return 0;
    return margins.reduce((sum, value) => sum + value, 0) / margins.length;
  }, [deliverables]);

  const openDeliverable = async (deliverable) => {
    setSelected(deliverable);
    setSelectedContractorId(deliverable.contractorId || deliverable.contractor_id || "");
    setError("");
    const res = await getDeliverableProfitability(deliverable.id);
    if (res.success) setProfitability(res.profitability);
    else setError(res.error || "Unable to load profitability.");
  };

  const onAssignContractor = async () => {
    if (!selected || !selectedContractorId) {
      setError("Choose a contractor first.");
      return;
    }
    const res = await assignDeliverableContractor(selected.id, selectedContractorId);
    if (!res.success) {
      setError(res.error || "Unable to assign contractor.");
      return;
    }
    setMessage("Contractor assigned.");
    setTimeout(() => setMessage(""), 2500);
    setSelected(res.deliverable);
    await loadAgencyDeliverables();
  };



  return (
    <div>
      <PageTitle title="Agency Deliverables" subtitle="Track profitability, quality, and workload indicators." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "12px", marginBottom: "16px" }}>
        <MetricCard label="Completed" value={completedCount} color={C.green} />
        <MetricCard label="Changes requested" value={changeRequestedCount} color={C.red} />
        <MetricCard label="Avg quality" value={avgQuality ? `${avgQuality.toFixed(1)}/5` : "—"} color={C.accent} />
        <MetricCard label="Avg margin" value={avgMargin ? `${avgMargin.toFixed(1)}%` : "—"} color={avgMargin < 0 ? C.red : C.blue} />
      </div>

      {message && <div style={{ padding: "10px 12px", borderRadius: "8px", border: `1px solid ${C.green}44`, background: C.green + "22", color: C.green, marginBottom: "10px" }}>{message}</div>}
      {error && <div style={{ padding: "10px 12px", borderRadius: "8px", border: `1px solid ${C.red}55`, background: C.red + "1c", color: C.red, marginBottom: "10px" }}>{error}</div>}
      <Card>
        <Table
          headers={["Client", "Deliverable", "Status", "Progress", "Profitability", "Quality", "Actions"]}
          rows={deliverables.map(d => [
            d.clientName,
            d.title,
            <Badge status={d.status} />,
            `${Number(d.progress || 0)}%`,
            d.profitabilityMargin != null ? `${Number(d.profitabilityMargin).toFixed(1)}%` : "—",
            d.qualityScore != null ? `${Number(d.qualityScore).toFixed(1)}/5` : (d.clientRating != null ? `${Number(d.clientRating).toFixed(1)}/5` : "—"),
            <Btn size="sm" variant="ghost" onClick={() => openDeliverable(d)}>View</Btn>,
          ])}
        />
      </Card>



      <Modal open={!!selected} onClose={() => setSelected(null)} title="Profitability & Metrics">
        {selected && (
          <div style={{ display: "grid", gap: "10px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700 }}>{selected.title}</div>
            <div style={{ fontSize: "12px", color: C.muted }}>Status: {selected.status} | Progress: {Number(selected.progress || 0)}%</div>
            <div style={{ fontSize: "12px", color: C.muted }}>Current contractor: {selected.contractorName || selected.contractor_name || "Unassigned"}</div>
            <div style={{ fontSize: "12px", color: C.muted }}>Revisions: {Number(selected.revisionCount || selected.revision_count || 0)}</div>
            <div style={{ display: "grid", gap: "8px", padding: "10px", borderRadius: "8px", border: `1px solid ${C.border}`, background: C.bg }}>
              <div style={{ fontSize: "12px", color: C.muted }}>Assign / reassign contractor</div>
              <select
                value={selectedContractorId}
                onChange={e => setSelectedContractorId(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.text }}
              >
                <option value="">Select contractor</option>
                {contractors.map(contractor => (
                  <option key={contractor.id} value={contractor.id}>{contractor.name} {contractor.email ? `(${contractor.email})` : ""}</option>
                ))}
              </select>
              <Btn onClick={onAssignContractor}>Assign Contractor</Btn>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
              <MetricCard label="Estimated hours" value={`${Number(selected.estimatedHours || 0)}h`} color={C.blue} />
              <MetricCard label="Actual hours" value={`${Number(selected.actualHours || 0)}h`} color={C.green} />
              <MetricCard label="Profitability margin" value={profitability ? `${profitability.profitabilityMargin}%` : (selected.profitabilityMargin != null ? `${Number(selected.profitabilityMargin).toFixed(1)}%` : "—")} color={C.accent} />
              <MetricCard label="Bonus" value={profitability ? fmt(profitability.bonus) : "—"} color={C.green} />
            </div>
            <div style={{ fontSize: "12px", color: C.muted }}>Use this to spot variance, bonus impact, and quality trends.</div>
          </div>
        )}
      </Modal>


    </div>
  );
}

export function ClientDeliverablesPage() {
  const {
    deliverables,
    loadClientDeliverables,
    createDeliverable,
    rateDeliverable,
    requestDeliverableChanges,
    approveDeliverableMilestone,
    submitDeliverableEvidence,
    deliverableMessages,
    loadDeliverableMessages,
    sendDeliverableMessage,
    deliverableTemplates,
    loadDeliverableTemplates,
  } = useApp();

  const [selected, setSelected] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newMessage, setNewMessage] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [changeNotes, setChangeNotes] = useState("");
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [evidenceFilesText, setEvidenceFilesText] = useState("spec.pdf\nscreenshots.png");
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    estimatedHours: 0,
    milestonesText: "Design\nBuild\nTesting",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadClientDeliverables();
    loadDeliverableTemplates();
  }, []);

  const selectedMessages = selected ? (deliverableMessages[selected.id] || []) : [];

  const onCreate = async () => {
    setError("");
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    const milestones = form.milestonesText
      .split("\n")
      .map(x => x.trim())
      .filter(Boolean)
      .map(name => ({ name, completed: false, completedAt: null }));

    const res = await createDeliverable({
      title: form.title,
      description: form.description,
      priority: form.priority,
      dueDate: form.dueDate,
      estimatedHours: Number(form.estimatedHours || 0),
      milestones,
      attachments: [],
      templateId: selectedTemplateId || null,
    });
    if (!res.success) {
      setError(res.error || "Unable to create deliverable.");
      return;
    }
    setCreateModal(false);
    setSelectedTemplateId("");
    setForm({ title: "", description: "", priority: "medium", dueDate: "", estimatedHours: 0, milestonesText: "Design\nBuild\nTesting" });
    setMessage("Deliverable created.");
    setTimeout(() => setMessage(""), 2500);
    await loadClientDeliverables();
  };

  const onRate = async () => {
    if (!selected) return;
    const res = await rateDeliverable(selected.id, Number(newRating));
    if (!res.success) {
      setError(res.error || "Unable to submit rating.");
      return;
    }
    setMessage("Rating saved.");
    setTimeout(() => setMessage(""), 2500);
    await loadClientDeliverables();
    setSelected(res.deliverable);
  };

  const onOpenDetails = async (d) => {
    setSelected(d);
    setNewMessage("");
    setChangeReason("");
    setChangeNotes("");
    setEvidenceNotes("");
    setEvidenceFiles([]);
    await loadDeliverableMessages(d.id);
  };

  const onApproveMilestone = async (index) => {
    if (!selected) return;
    const res = await approveDeliverableMilestone(selected.id, index);
    if (!res.success) {
      setError(res.error || "Unable to approve milestone.");
      return;
    }
    setMessage("Milestone approved.");
    setTimeout(() => setMessage(""), 2500);
    setSelected(res.deliverable);
    await loadClientDeliverables();
  };

  const onRequestChanges = async () => {
    if (!selected) return;
    const res = await requestDeliverableChanges(selected.id, {
      reason: changeReason || "Changes requested",
      changes: changeNotes.split("\n").map(x => x.trim()).filter(Boolean),
    });
    if (!res.success) {
      setError(res.error || "Unable to request changes.");
      return;
    }
    setChangeReason("");
    setChangeNotes("");
    setMessage("Change request submitted.");
    setTimeout(() => setMessage(""), 2500);
    setSelected(res.deliverable);
  };

  const onSubmitEvidence = async (index) => {
    if (!selected) return;
    const filePayloads = evidenceFiles.length ? await readFilesAsEvidence(evidenceFiles) : [];
    const res = await submitDeliverableEvidence(selected.id, {
      milestoneIndex: index,
      notes: evidenceNotes,
      evidenceFiles: [...filePayloads, ...evidenceFilesText.split("\n").map(x => x.trim()).filter(Boolean)],
    });
    if (!res.success) {
      setError(res.error || "Unable to submit evidence.");
      return;
    }
    setEvidenceNotes("");
    setEvidenceFiles([]);
    setMessage("Evidence submitted.");
    setTimeout(() => setMessage(""), 2500);
    setSelected(res.deliverable);
  };

  const onSendMessage = async () => {
    if (!selected || !newMessage.trim()) return;
    const res = await sendDeliverableMessage(selected.id, newMessage.trim());
    if (!res.success) {
      setError(res.error || "Unable to send message.");
      return;
    }
    setNewMessage("");
  };

  return (
    <div>
      <PageTitle title="Client Deliverables" subtitle="Track progress, communicate, and rate quality." />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ fontSize: "12px", color: C.muted }}>Live progress and acceptance visibility for all deliverables.</div>
        <Btn onClick={() => setCreateModal(true)}>Create Deliverable</Btn>
      </div>
      {message && <div style={{ padding: "10px 12px", borderRadius: "8px", border: `1px solid ${C.green}44`, background: C.green + "22", color: C.green, marginBottom: "10px" }}>{message}</div>}
      {error && <div style={{ padding: "10px 12px", borderRadius: "8px", border: `1px solid ${C.red}55`, background: C.red + "1c", color: C.red, marginBottom: "10px" }}>{error}</div>}

      <Card>
        <Table
          headers={["Deliverable", "Status", "Progress", "Contractor", "Due", "Rating", "Actions"]}
          rows={deliverables.map(d => [
            d.title,
            <Badge status={d.status} />,
            `${Number(d.progress || 0)}%`,
            d.contractorName || "Unassigned",
            d.dueDate ? fmtDate(d.dueDate) : "-",
            d.clientRating != null ? `${d.clientRating}/5` : "Not rated",
            <Btn size="sm" variant="ghost" onClick={() => onOpenDetails(d)}>View</Btn>,
          ])}
        />
      </Card>

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Deliverable">
        <div style={{ display: "grid", gap: "10px" }}>
          <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <div>
            <label style={{ display: "block", fontSize: "12px", color: C.muted, marginBottom: "6px" }}>Template</label>
            <select
              value={selectedTemplateId}
              onChange={e => {
                const nextId = e.target.value;
                setSelectedTemplateId(nextId);
                const template = deliverableTemplates.find(item => item.id === nextId);
                if (template) {
                  const templateMilestones = (template.defaultMilestones || template.default_milestones || []).map(item => item.name || item).filter(Boolean).join("\n");
                  setForm(f => ({
                    ...f,
                    estimatedHours: Number(template.estimatedHours || template.estimated_hours || f.estimatedHours || 0),
                    milestonesText: templateMilestones || f.milestonesText,
                  }));
                }
              }}
              style={{ width: "100%", padding: "10px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.text }}
            >
              <option value="">No template</option>
              {deliverableTemplates.map(template => <option key={template.id} value={template.id}>{template.title}</option>)}
            </select>
          </div>
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Input label="Estimated Hours" type="number" value={form.estimatedHours} onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))} />
          <Input label="Due Date" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          <Textarea label="Milestones (one per line)" value={form.milestonesText} onChange={e => setForm(f => ({ ...f, milestonesText: e.target.value }))} />
          <div style={{ display: "flex", gap: "8px" }}>
            <Btn onClick={onCreate}>Create</Btn>
            <Btn variant="ghost" onClick={() => setCreateModal(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Deliverable Details">
        {selected && (
          <div>
            <div style={{ fontSize: "13px", marginBottom: "8px" }}><strong>{selected.title}</strong></div>
            <div style={{ fontSize: "12px", color: C.muted, marginBottom: "8px" }}>Accepted: {selected.acceptedAt ? fmtDate(selected.acceptedAt) : "Pending"}</div>
            <div style={{ fontSize: "12px", color: C.muted, marginBottom: "8px" }}>Progress: {Number(selected.progress || 0)}% | Estimated/Actual: {Number(selected.estimatedHours || 0)}h / {Number(selected.actualHours || 0)}h</div>
            <div style={{ marginBottom: "10px", padding: "10px", background: C.surface, borderRadius: "8px" }}>{selected.description || "No description"}</div>

            {selected.milestones?.length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", color: C.muted, marginBottom: "6px" }}>Milestones</div>
                <div style={{ display: "grid", gap: "8px" }}>
                  {selected.milestones.map((milestone, index) => (
                    <div key={index} style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${C.border}`, background: milestone.approved ? C.green + "10" : milestone.completed ? C.accent + "10" : C.bg }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                        <div>
                          <strong>{milestone.name}</strong>
                          <div style={{ fontSize: "11px", color: C.muted }}>
                            {milestone.completed ? `Completed ${milestone.completedAt ? fmtDate(milestone.completedAt) : ""}` : "Not completed"}
                            {milestone.approved ? ` · Approved ${milestone.approvedAt ? fmtDate(milestone.approvedAt) : ""}` : ""}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {milestone.completed && !milestone.approved && <Btn size="sm" variant="success" onClick={() => onApproveMilestone(index)}>Approve</Btn>}
                          {!milestone.completed && <span style={{ fontSize: "11px", color: C.muted, alignSelf: "center" }}>Awaiting contractor completion</span>}
                          <Btn size="sm" variant="ghost" onClick={() => onSubmitEvidence(index)}>Evidence</Btn>
                        </div>
                      </div>
                      {milestone.evidence?.length > 0 && (
                        <div style={{ marginTop: "8px", fontSize: "11px", color: C.muted }}>
                          Evidence items: {milestone.evidence.length}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gap: "8px", padding: "10px", borderRadius: "8px", background: C.bg, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: "12px", color: C.muted }}>Upload evidence</div>
              <input type="file" multiple onChange={e => setEvidenceFiles(Array.from(e.target.files || []))} style={{ fontSize: "12px" }} />
              <Input label="Evidence files (one per line, filenames/urls)" value={evidenceFilesText} onChange={e => setEvidenceFilesText(e.target.value)} />
              <Textarea label="Evidence notes" value={evidenceNotes} onChange={e => setEvidenceNotes(e.target.value)} />
            </div>

            <div style={{ display: "grid", gap: "8px", padding: "10px", borderRadius: "8px", background: C.bg, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: "12px", color: C.muted }}>Request changes</div>
              <Input label="Reason" value={changeReason} onChange={e => setChangeReason(e.target.value)} />
              <Textarea label="Change notes (one per line)" value={changeNotes} onChange={e => setChangeNotes(e.target.value)} />
              <Btn variant="danger" onClick={onRequestChanges}>Request Changes</Btn>
            </div>

            <div style={{ fontSize: "12px", marginBottom: "6px", color: C.muted }}>Messages</div>
            <div style={{ maxHeight: "140px", overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: "8px", padding: "8px", marginBottom: "8px" }}>
              {selectedMessages.map(m => (
                <div key={m.id} style={{ marginBottom: "6px", fontSize: "12px" }}>
                  <strong>{m.senderName}</strong>: {m.message}
                </div>
              ))}
              {!selectedMessages.length && <div style={{ fontSize: "12px", color: C.muted }}>No messages yet.</div>}
            </div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <Input placeholder="Send message" value={newMessage} onChange={e => setNewMessage(e.target.value)} />
              <Btn onClick={onSendMessage}>Send</Btn>
            </div>

            {selected.status === "completed" && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <Input label="Rate 1-5" type="number" min="1" max="5" value={newRating} onChange={e => setNewRating(e.target.value)} />
                <Btn onClick={onRate}>Submit Rating</Btn>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export function ContractorDeliverablesPage() {
  const {
    deliverables,
    loadContractorDeliverables,
    acceptDeliverableAssignment,
    rejectDeliverableAssignment,
    updateDeliverableProgress,
    completeDeliverableMilestone,
    submitDeliverableEvidence,
    deliverableMessages,
    loadDeliverableMessages,
    sendDeliverableMessage,
  } = useApp();

  const [selected, setSelected] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [actualHours, setActualHours] = useState(0);
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [evidenceFilesText, setEvidenceFilesText] = useState("screenshots.png\noutput.log");
  const [evidenceFiles, setEvidenceFiles] = useState([]);

  useEffect(() => {
    loadContractorDeliverables();
  }, []);

  const activeCount = useMemo(
    () => deliverables.filter(d => ["accepted", "in_progress", "pending_acceptance"].includes(d.status)).length,
    [deliverables]
  );

  const selectedMessages = selected ? (deliverableMessages[selected.id] || []) : [];

  const openDetails = async (d) => {
    setSelected(d);
    setProgress(Number(d.progress || 0));
    setActualHours(Number(d.actualHours || 0));
    setRejectionReason("");
    setNewMessage("");
    setEvidenceNotes("");
    setEvidenceFiles([]);
    await loadDeliverableMessages(d.id);
  };

  const onAccept = async (d) => {
    const res = await acceptDeliverableAssignment(d.id);
    if (!res.success) {
      setError(res.error || "Unable to accept.");
      return;
    }
    setMessage("Deliverable accepted.");
    setTimeout(() => setMessage(""), 2500);
    await loadContractorDeliverables();
    setSelected(res.deliverable);
  };

  const onReject = async (d) => {
    const res = await rejectDeliverableAssignment(d.id, rejectionReason || "Not available");
    if (!res.success) {
      setError(res.error || "Unable to reject.");
      return;
    }
    setMessage("Deliverable rejected and returned for reassignment.");
    setTimeout(() => setMessage(""), 2500);
    await loadContractorDeliverables();
    setSelected(null);
  };

  const onSaveProgress = async () => {
    if (!selected) return;
    const res = await updateDeliverableProgress(selected.id, {
      progress: Number(progress),
      actualHours: Number(actualHours),
      contractorNotes: selected.contractorNotes || "",
      attachments: selected.attachments || [],
    });
    if (!res.success) {
      setError(res.error || "Unable to update progress.");
      return;
    }
    setMessage("Progress saved.");
    setTimeout(() => setMessage(""), 2500);
    await loadContractorDeliverables();
    setSelected(res.deliverable);
  };

  const onCompleteMilestone = async (index) => {
    if (!selected) return;
    const res = await completeDeliverableMilestone(selected.id, index);
    if (!res.success) {
      setError(res.error || "Unable to complete milestone.");
      return;
    }
    setMessage("Milestone completed.");
    setTimeout(() => setMessage(""), 2500);
    await loadContractorDeliverables();
    setSelected(res.deliverable);
  };

  const onSubmitEvidence = async (index) => {
    if (!selected) return;
    const filePayloads = evidenceFiles.length ? await readFilesAsEvidence(evidenceFiles) : [];
    const res = await submitDeliverableEvidence(selected.id, {
      milestoneIndex: index,
      notes: evidenceNotes,
      evidenceFiles: [...filePayloads, ...evidenceFilesText.split("\n").map(x => x.trim()).filter(Boolean)],
    });
    if (!res.success) {
      setError(res.error || "Unable to submit evidence.");
      return;
    }
    setEvidenceNotes("");
    setEvidenceFiles([]);
    setMessage("Evidence submitted.");
    setTimeout(() => setMessage(""), 2500);
    await loadContractorDeliverables();
    setSelected(res.deliverable);
  };

  const onSendMessage = async () => {
    if (!selected || !newMessage.trim()) return;
    const res = await sendDeliverableMessage(selected.id, newMessage.trim());
    if (!res.success) {
      setError(res.error || "Unable to send message.");
      return;
    }
    setNewMessage("");
  };

  return (
    <div>
      <PageTitle title="My Deliverables" subtitle="Accept assignments, update progress, and collaborate." />
      <div style={{ fontSize: "12px", color: C.muted, marginBottom: "10px" }}>Active workload: {activeCount}/5</div>
      {message && <div style={{ padding: "10px 12px", borderRadius: "8px", border: `1px solid ${C.green}44`, background: C.green + "22", color: C.green, marginBottom: "10px" }}>{message}</div>}
      {error && <div style={{ padding: "10px 12px", borderRadius: "8px", border: `1px solid ${C.red}55`, background: C.red + "1c", color: C.red, marginBottom: "10px" }}>{error}</div>}

      <Card>
        <Table
          headers={["Client", "Deliverable", "Status", "Progress", "Due", "Actions"]}
          rows={deliverables.map(d => [
            d.clientName,
            d.title,
            <Badge status={d.status} />,
            `${Number(d.progress || 0)}%`,
            d.dueDate ? fmtDate(d.dueDate) : "-",
            <Btn size="sm" variant="ghost" onClick={() => openDetails(d)}>Open</Btn>,
          ])}
        />
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Deliverable Workspace">
        {selected && (
          <div style={{ display: "grid", gap: "10px" }}>
            <div style={{ fontSize: "13px" }}><strong>{selected.title}</strong></div>
            <div style={{ fontSize: "12px", color: C.muted }}>Status: {selected.status} | Accepted: {selected.acceptedAt ? fmtDate(selected.acceptedAt) : "Pending"}</div>
            <div style={{ fontSize: "12px", color: C.muted }}>Revisions: {Number(selected.revisionCount || selected.revision_count || 0)}</div>

            {selected.milestones?.length > 0 && (
              <div style={{ display: "grid", gap: "8px" }}>
                <div style={{ fontSize: "12px", color: C.muted }}>Milestones</div>
                {selected.milestones.map((milestone, index) => (
                  <div key={index} style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${C.border}`, background: milestone.completed ? C.green + "10" : C.bg }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <div>
                        <strong>{milestone.name}</strong>
                        <div style={{ fontSize: "11px", color: C.muted }}>
                          {milestone.completed ? `Completed ${milestone.completedAt ? fmtDate(milestone.completedAt) : ""}` : "Not completed"}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {!milestone.completed && <Btn size="sm" onClick={() => onCompleteMilestone(index)}>Mark Complete</Btn>}
                        <Btn size="sm" variant="ghost" onClick={() => onSubmitEvidence(index)}>Submit Evidence</Btn>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selected.status === "pending_acceptance" && (
              <div style={{ display: "grid", gap: "8px" }}>
                <Textarea label="Reason (optional if rejecting)" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <Btn onClick={() => onAccept(selected)}>Accept</Btn>
                  <Btn variant="danger" onClick={() => onReject(selected)}>Reject</Btn>
                </div>
              </div>
            )}

            {["accepted", "in_progress"].includes(selected.status) && (
              <>
                <Input label="Progress %" type="number" min="0" max="100" value={progress} onChange={e => setProgress(e.target.value)} />
                <Input label="Actual Hours" type="number" min="0" value={actualHours} onChange={e => setActualHours(e.target.value)} />
                <Textarea label="Evidence notes" value={evidenceNotes} onChange={e => setEvidenceNotes(e.target.value)} />
                <input type="file" multiple onChange={e => setEvidenceFiles(Array.from(e.target.files || []))} style={{ fontSize: "12px" }} />
                <Input label="Evidence files (one per line)" value={evidenceFilesText} onChange={e => setEvidenceFilesText(e.target.value)} />
                <Btn onClick={onSaveProgress}>Save Progress</Btn>
              </>
            )}

            <div style={{ fontSize: "12px", color: C.muted }}>Messages</div>
            <div style={{ maxHeight: "140px", overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: "8px", padding: "8px" }}>
              {selectedMessages.map(m => (
                <div key={m.id} style={{ marginBottom: "6px", fontSize: "12px" }}>
                  <strong>{m.senderName}</strong>: {m.message}
                </div>
              ))}
              {!selectedMessages.length && <div style={{ fontSize: "12px", color: C.muted }}>No messages yet.</div>}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <Input placeholder="Send update" value={newMessage} onChange={e => setNewMessage(e.target.value)} />
              <Btn onClick={onSendMessage}>Send</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
