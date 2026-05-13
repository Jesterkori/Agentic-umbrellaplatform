import { createContext, useContext, useState, useEffect } from "react";
import { io } from "socket.io-client";
import { USERS, INITIAL_TIMESHEETS, INITIAL_INVOICES, INITIAL_PAYROLLS, INITIAL_DISPUTES, INITIAL_HMRC, INITIAL_ASSIGNMENTS, INITIAL_DELIVERABLES, LEAVE_TYPES, LEAVE_BALANCES, INITIAL_LEAVE_REQUESTS, CONTRACTS } from "../data/mockData";

const AppContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const BRANDING_STORAGE_KEY = "documentBrandingSettings";

const DEFAULT_DOCUMENT_BRANDING_SETTINGS = {
  legalEntityKey: "paysafe",
  legalEntities: {
    paysafe: {
      key: "paysafe",
      label: "PaySafe Umbrella",
      companyName: "PaySafe Umbrella Ltd",
      logoText: "OMB",
      logoDataUrl: "",
      primaryColor: "#0C8385",
      accentColor: "#085C66",
      addressLine1: "Unit 108, 7th Floor",
      addressLine2: "2 Pinfold Street",
      addressLine3: "The Balance Sheffield",
      postcode: "S12 GU",
      footerText: "Company Reg. Number: 15446929 | VAT Registration Number: 468850642",
    },
    ombrella: {
      key: "ombrella",
      label: "Ombrella Legal Entity",
      companyName: "Ombrella Contracting Ltd",
      logoText: "OMB",
      logoDataUrl: "",
      primaryColor: "#0E7F86",
      accentColor: "#1D4D89",
      addressLine1: "1 Finsbury Square",
      addressLine2: "London",
      addressLine3: "United Kingdom",
      postcode: "EC2A 1AE",
      footerText: "Registered in England and Wales | Payroll document issued electronically",
    },
  },
  clientOverrides: {},
};

function readBrandingSettings() {
  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY);
    if (!raw) return DEFAULT_DOCUMENT_BRANDING_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_DOCUMENT_BRANDING_SETTINGS,
      ...parsed,
      legalEntities: {
        ...DEFAULT_DOCUMENT_BRANDING_SETTINGS.legalEntities,
        ...(parsed.legalEntities || {}),
      },
      clientOverrides: {
        ...DEFAULT_DOCUMENT_BRANDING_SETTINGS.clientOverrides,
        ...(parsed.clientOverrides || {}),
      },
    };
  } catch {
    return DEFAULT_DOCUMENT_BRANDING_SETTINGS;
  }
}

export function AppProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("authToken") || "");
  const [user, setUser] = useState(null);
  const [timesheets, setTimesheets] = useState(INITIAL_TIMESHEETS);
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);
  const [payrolls, setPayrolls] = useState(INITIAL_PAYROLLS);
  const [disputes, setDisputes] = useState(INITIAL_DISPUTES);
  const [hmrcSubmissions, setHmrcSubmissions] = useState(INITIAL_HMRC);
  const [auditLogs, setAuditLogs] = useState([]);
  const [payrollLiabilities, setPayrollLiabilities] = useState([]);
  const [payrollBatches, setPayrollBatches] = useState([]);
  const [payrollPeriods, setPayrollPeriods] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [assignments, setAssignments] = useState(INITIAL_ASSIGNMENTS);
  const [leaveRequests, setLeaveRequests] = useState(INITIAL_LEAVE_REQUESTS);
  const [leaveBalances, setLeaveBalances] = useState(LEAVE_BALANCES);
  const [deliverableMessages, setDeliverableMessages] = useState({});
  const [deliverableWorkload, setDeliverableWorkload] = useState({ byContractor: {}, limit: 5 });
  const [deliverableTemplates, setDeliverableTemplates] = useState([]);
  const [documentBrandingSettings, setDocumentBrandingSettings] = useState(readBrandingSettings);
  const [activeContractId, setActiveContractId] = useState(null);

  const allContracts = user ? CONTRACTS.filter(c => c.contractorId === user.id) : [];
  const activeContract = allContracts.find(c => c.id === activeContractId) || allContracts.find(c => c.status === "active") || allContracts[0] || null;

  const socket = io("http://localhost:4000");

  useEffect(() => {
    socket.on('invoice:created', (newInvoice) => {
      setInvoices(prev => [...prev, newInvoice]);
    });

    socket.on('invoice:updated', (updatedInvoice) => {
      setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
    });

    socket.on('timesheet:updated', (updatedTimesheet) => {
      setTimesheets(prev => prev.map(ts => ts.id === updatedTimesheet.id ? updatedTimesheet : ts));
    });

    socket.on('leave:request_updated', (updatedRequest) => {
      setLeaveRequests(prev => {
        const idx = prev.findIndex(r => r.id === updatedRequest.id);
        if (idx < 0) return [updatedRequest, ...prev];
        const next = [...prev];
        next[idx] = updatedRequest;
        return next;
      });
    });

    socket.on('leave:balance_updated', (updatedBalance) => {
      setLeaveBalances(prev => {
        const idx = prev.findIndex(b => b.id === updatedBalance.id);
        if (idx < 0) return [updatedBalance, ...prev];
        const next = [...prev];
        next[idx] = updatedBalance;
        return next;
      });
    });

    socket.on('deliverable:updated', (updatedDeliverable) => {
      setDeliverables(prev => {
        const idx = prev.findIndex(d => d.id === updatedDeliverable.id);
        if (idx < 0) return [updatedDeliverable, ...prev];
        const next = [...prev];
        next[idx] = updatedDeliverable;
        return next;
      });
    });

    socket.on('deliverable:message_added', (message) => {
      setDeliverableMessages(prev => ({
        ...prev,
        [message.deliverableId]: [...(prev[message.deliverableId] || []), message],
      }));
    });

    return () => {
      socket.off('invoice:created');
      socket.off('invoice:updated');
      socket.off('timesheet:updated');
      socket.off('leave:request_updated');
      socket.off('leave:balance_updated');
      socket.off('deliverable:updated');
      socket.off('deliverable:message_added');
    };
  }, []);

  const api = async (path, options = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "X-Idempotency-Key": `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ...(options.headers || {}),
      },
      ...options,
    });

    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text || "{}");
    } catch {
      data = { error: text };
    }

    if (!res.ok) throw new Error(data.error || text || "Request failed");
    return data;
  };

  const saveDocumentBrandingSettings = (next) => {
    setDocumentBrandingSettings(next);
    try {
      localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore localStorage write errors in private mode or restricted contexts.
    }
  };

  const updateDocumentBrandingSettings = (updater) => {
    const next = typeof updater === "function" ? updater(documentBrandingSettings) : updater;
    saveDocumentBrandingSettings(next);
  };

  const loadBootstrap = async () => {
    const data = await api("/bootstrap");
    setTimesheets(data.timesheets || []);
    setInvoices(data.invoices || []);
    setPayrolls(data.payrolls || []);
    setDisputes(data.disputes || []);
    setHmrcSubmissions(data.hmrcSubmissions || []);
    setPayrollLiabilities(data.payrollLiabilities || []);
    setPayrollBatches(data.payrollBatches || []);
    setPayrollPeriods(data.payrollPeriods || []);
    setLeaveRequests(data.leaveRequests || []);
    setLeaveBalances(data.leaveBalances || []);
    setAuditLogs(data.auditLogs || []);
  };

  const submitLeaveRequest = async (payload) => {
    try {
      const data = await api("/leave/requests", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setLeaveRequests(prev => [data.leaveRequest, ...prev]);
      return { success: true, leaveRequest: data.leaveRequest };
    } catch (err) {
      return { success: false, error: err.message || "Unable to submit leave request" };
    }
  };

  const approveLeaveRequest = async (leaveRequestId) => {
    try {
      const data = await api(`/leave/requests/${leaveRequestId}/approve`, { method: "POST" });
      setLeaveRequests(prev => prev.map(r => (r.id === leaveRequestId ? data.leaveRequest : r)));
      if (data.leaveBalance) {
        setLeaveBalances(prev => {
          const idx = prev.findIndex(b => b.id === data.leaveBalance.id);
          if (idx < 0) return [data.leaveBalance, ...prev];
          const next = [...prev];
          next[idx] = data.leaveBalance;
          return next;
        });
      }
      await loadBootstrap();
      return { success: true, leaveRequest: data.leaveRequest };
    } catch (err) {
      return { success: false, error: err.message || "Unable to approve leave request" };
    }
  };

  const rejectLeaveRequest = async (leaveRequestId, reason) => {
    try {
      const data = await api(`/leave/requests/${leaveRequestId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setLeaveRequests(prev => prev.map(r => (r.id === leaveRequestId ? data.leaveRequest : r)));
      return { success: true, leaveRequest: data.leaveRequest };
    } catch (err) {
      return { success: false, error: err.message || "Unable to reject leave request" };
    }
  };

  const loadAgencyContractors = async () => {
    try {
      const data = await api("/agency/contractors");
      setContractors(data.contractors || []);
    } catch (_err) {
      setContractors([]);
    }
  };

  const loadAgencyAssignments = async () => {
    try {
      const data = await api("/agency/assignments");
      setAssignments(data.assignments || []);
    } catch (_err) {
      setAssignments([]);
    }
  };

  
  
  const assignContractorToAssignment = async (assignmentId, contractorId) => {
    try {
      const data = await api(`/agency/assignments/${assignmentId}/assign`, {
        method: "POST",
        body: JSON.stringify({ contractorId }),
      });
      setAssignments(prev => prev.map(a => a.id === assignmentId ? data.assignment : a));
      return { success: true, assignment: data.assignment };
    } catch (err) {
      return { success: false, error: err.message || "Unable to assign contractor" };
    }
  };

  // Deliverables functions
  const [deliverables, setDeliverables] = useState(INITIAL_DELIVERABLES);

  const createDeliverable = async (payload) => {
    try {
      const data = await api("/client/deliverables", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setDeliverables(prev => [data.deliverable, ...prev]);
      return { success: true, deliverable: data.deliverable };
    } catch (err) {
      return { success: false, error: err.message || "Unable to create deliverable" };
    }
  };

  const loadAgencyDeliverables = async () => {
    try {
      const data = await api("/agency/deliverables");
      setDeliverables(data.deliverables || []);
      setDeliverableWorkload({ byContractor: data.workloadByContractor || {}, limit: data.workloadLimit || 5 });
    } catch (_err) {
      setDeliverables([]);
      setDeliverableWorkload({ byContractor: {}, limit: 5 });
    }
  };

  const loadClientDeliverables = async () => {
    try {
      const data = await api("/client/deliverables");
      setDeliverables(data.deliverables || []);
    } catch (_err) {
      setDeliverables([]);
    }
  };

  const loadContractorDeliverables = async () => {
    try {
      const data = await api("/contractor/deliverables");
      setDeliverables(data.deliverables || []);
    } catch (_err) {
      setDeliverables([]);
    }
  };

  const loadDeliverableTemplates = async () => {
    try {
      const data = await api("/deliverables/templates");
      setDeliverableTemplates(data.templates || []);
      return { success: true, templates: data.templates || [] };
    } catch (err) {
      setDeliverableTemplates([]);
      return { success: false, error: err.message || "Unable to load templates" };
    }
  };

  const updateDeliverableStatus = async (deliverableId, status) => {
    try {
      const data = await api(`/deliverables/${deliverableId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      setDeliverables(prev => prev.map(d => d.id === deliverableId ? data.deliverable : d));
      return { success: true, deliverable: data.deliverable };
    } catch (err) {
      return { success: false, error: err.message || "Unable to update deliverable status" };
    }
  };

  const assignDeliverableContractor = async (deliverableId, contractorId) => {
    try {
      const data = await api(`/agency/deliverables/${deliverableId}/assign`, {
        method: "PUT",
        body: JSON.stringify({ contractorId }),
      });
      setDeliverables(prev => prev.map(d => d.id === deliverableId ? data.deliverable : d));
      return { success: true, deliverable: data.deliverable };
    } catch (err) {
      return { success: false, error: err.message || "Unable to assign contractor" };
    }
  };

  const acceptDeliverableAssignment = async (deliverableId) => {
    try {
      const data = await api(`/contractor/deliverables/${deliverableId}/accept`, { method: "POST" });
      setDeliverables(prev => prev.map(d => d.id === deliverableId ? data.deliverable : d));
      return { success: true, deliverable: data.deliverable };
    } catch (err) {
      return { success: false, error: err.message || "Unable to accept deliverable" };
    }
  };

  const rejectDeliverableAssignment = async (deliverableId, reason) => {
    try {
      const data = await api(`/contractor/deliverables/${deliverableId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setDeliverables(prev => prev.map(d => d.id === deliverableId ? data.deliverable : d));
      return { success: true, deliverable: data.deliverable };
    } catch (err) {
      return { success: false, error: err.message || "Unable to reject deliverable" };
    }
  };

  const updateDeliverableProgress = async (deliverableId, payload) => {
    try {
      const data = await api(`/deliverables/${deliverableId}/progress`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setDeliverables(prev => prev.map(d => d.id === deliverableId ? data.deliverable : d));
      return { success: true, deliverable: data.deliverable };
    } catch (err) {
      return { success: false, error: err.message || "Unable to update progress" };
    }
  };

  const completeDeliverableMilestone = async (deliverableId, milestoneIndex) => {
    try {
      const data = await api(`/deliverables/${deliverableId}/milestones/${milestoneIndex}/complete`, {
        method: "PUT",
      });
      setDeliverables(prev => prev.map(d => d.id === deliverableId ? data.deliverable : d));
      return { success: true, deliverable: data.deliverable };
    } catch (err) {
      return { success: false, error: err.message || "Unable to complete milestone" };
    }
  };

  const approveDeliverableMilestone = async (deliverableId, milestoneIndex) => {
    try {
      const data = await api(`/deliverables/${deliverableId}/milestones/${milestoneIndex}/approve`, {
        method: "POST",
      });
      setDeliverables(prev => prev.map(d => d.id === deliverableId ? data.deliverable : d));
      return { success: true, deliverable: data.deliverable };
    } catch (err) {
      return { success: false, error: err.message || "Unable to approve milestone" };
    }
  };

  const submitDeliverableEvidence = async (deliverableId, payload) => {
    try {
      const data = await api(`/deliverables/${deliverableId}/evidence`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setDeliverables(prev => prev.map(d => d.id === deliverableId ? data.deliverable : d));
      return { success: true, deliverable: data.deliverable, evidence: data.evidence };
    } catch (err) {
      return { success: false, error: err.message || "Unable to submit evidence" };
    }
  };

  const requestDeliverableChanges = async (deliverableId, payload) => {
    try {
      const data = await api(`/deliverables/${deliverableId}/change-request`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setDeliverables(prev => prev.map(d => d.id === deliverableId ? data.deliverable : d));
      return { success: true, deliverable: data.deliverable, changeRequest: data.changeRequest };
    } catch (err) {
      return { success: false, error: err.message || "Unable to request changes" };
    }
  };

  const getDeliverableProfitability = async (deliverableId) => {
    try {
      const data = await api(`/deliverables/${deliverableId}/profitability`);
      return { success: true, profitability: data.profitability };
    } catch (err) {
      return { success: false, error: err.message || "Unable to load profitability" };
    }
  };

  const createDeliverableTemplate = async (payload) => {
    try {
      const data = await api("/deliverables/templates", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return { success: true, template: data.template };
    } catch (err) {
      return { success: false, error: err.message || "Unable to create template" };
    }
  };

  const loadDeliverableMessages = async (deliverableId) => {
    try {
      const data = await api(`/deliverables/${deliverableId}/messages`);
      setDeliverableMessages(prev => ({ ...prev, [deliverableId]: data.messages || [] }));
      return { success: true, messages: data.messages || [] };
    } catch (err) {
      return { success: false, error: err.message || "Unable to load messages" };
    }
  };

  const sendDeliverableMessage = async (deliverableId, message, attachments = []) => {
    try {
      const data = await api(`/deliverables/${deliverableId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message, attachments }),
      });
      setDeliverableMessages(prev => ({
        ...prev,
        [deliverableId]: [...(prev[deliverableId] || []), data.message],
      }));
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.message || "Unable to send message" };
    }
  };

  const rateDeliverable = async (deliverableId, rating) => {
    try {
      const data = await api(`/deliverables/${deliverableId}/rate`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      });
      setDeliverables(prev => prev.map(d => d.id === deliverableId ? data.deliverable : d));
      return { success: true, deliverable: data.deliverable };
    } catch (err) {
      return { success: false, error: err.message || "Unable to rate deliverable" };
    }
  };

  const pushAudit = (event, metadata = {}) => {
    const actor = user?.name || "system";
    setAuditLogs(prev => [{
      id: "audit-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      event,
      actor,
      at: new Date().toISOString(),
      metadata,
    }, ...prev]);
  };

  const login = async (email, password) => {
    try {
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setToken(data.token || "");
      localStorage.setItem("authToken", data.token || "");
      setUser(data.user);
      await loadBootstrap();
      if (data.user?.role === "agency") {
        await Promise.all([loadAgencyContractors(), loadAgencyAssignments()]);
      } else {
        setContractors([]);
        setAssignments([]);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || "Invalid email or password" };
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const data = await api("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password, role }) });
      setToken(data.token || "");
      localStorage.setItem("authToken", data.token || "");
      setUser(data.user);
      await loadBootstrap();
      if (data.user?.role === "agency") {
        await Promise.all([loadAgencyContractors(), loadAgencyAssignments()]);
      } else {
        setContractors([]);
        setAssignments([]);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || "Registration failed" };
    }
  };

  const doLogout = () => {
    setUser(null);
    setToken("");
    setContractors([]);
    setAssignments([]);
    localStorage.removeItem("authToken");
  };

  const changePassword = (current) => {
    const found = USERS.find(u => u.id === user.id && u.password === current);
    if (!found) return { success: false, error: "Current password is incorrect" };
    return { success: true };
  };

  const submitTimesheet = async (data) => {
    if (!user || user.role !== "contractor") {
      return { success: false, error: "Only contractors can submit timesheets." };
    }
    try {
      const res = await api("/timesheets", {
        method: "POST",
        body: JSON.stringify({
          contractorId: user.id,
          contractorName: user.name,
          weekStart: data.weekStart,
          weekEnd: data.weekEnd,
          hours: Number(data.hours),
          rate: user.rate,
          description: data.description,
        }),
      });
      setTimesheets(prev => [res.timesheet, ...prev]);
      return { success: true, id: res.timesheet.id };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const resubmitTimesheet = async (id, data, expectedVersion) => {
    try {
      const res = await api(`/timesheets/${id}/resubmit`, {
        method: "POST",
        body: JSON.stringify({ ...data, expectedVersion }),
      });
      setTimesheets(prev => prev.map(ts => (ts.id === id ? res.timesheet : ts)));
      return { success: true, timesheet: res.timesheet };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const editTimesheet = async (id, data, expectedVersion) => {
    try {
      const res = await api(`/timesheets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...data, expectedVersion }),
      });
      setTimesheets(prev => prev.map(ts => (ts.id === id ? res.timesheet : ts)));
      return { success: true, timesheet: res.timesheet };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteTimesheet = async (id) => {
    try {
      await api(`/timesheets/${id}`, { method: "DELETE" });
      setTimesheets(prev => prev.filter(ts => ts.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const approveTimesheet = async (id, expectedVersion) => {
    try {
      const res = await api(`/timesheets/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ approvedBy: user?.name || "agency", expectedVersion }),
      });
      setTimesheets(prev => prev.map(ts => (ts.id === id ? res.timesheet : ts)));
      setInvoices(prev => [res.invoice, ...prev]);
      return { success: true, timesheet: res.timesheet };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const rejectTimesheet = async (id, reason, expectedVersion) => {
    try {
      const res = await api(`/timesheets/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason, expectedVersion }),
      });
      setTimesheets(prev => prev.map(ts => (ts.id === id ? res.timesheet : ts)));
      return { success: true, timesheet: res.timesheet };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const approveInvoice = async (id) => {
    try {
      const res = await api(`/invoices/${id}/approve`, { method: "POST" });
      setInvoices(prev => prev.map(inv => (inv.id === id ? res.invoice : inv)));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const markPaymentReceived = async (id, payment = {}) => {
    try {
      const res = await api(`/invoices/${id}/payment`, {
        method: "POST",
        body: JSON.stringify(payment),
      });
      if (res.invoice) setInvoices(prev => prev.map(inv => (inv.id === id ? res.invoice : inv)));
      return { success: true };
    } catch (err) {
      await loadBootstrap();
      return { success: false, error: err.message };
    }
  };

  const processPayroll = async (invoiceId, options = {}) => {
    try {
      const res = await api("/payroll/process", {
        method: "POST",
        body: JSON.stringify({ invoiceId, options }),
      });
      setPayrolls(prev => [res.payroll, ...prev]);
      await loadBootstrap();
      return { success: true, payroll: res.payroll };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const disburseSalary = async (payrollId) => {
    try {
      const res = await api(`/payroll/${payrollId}/disburse`, { method: "POST" });
      await loadBootstrap();
      return { success: true, payroll: res.payroll };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const retryDisbursement = async (payrollId) => {
    try {
      const res = await api(`/payroll/${payrollId}/retry-disbursement`, { method: "POST" });
      await loadBootstrap();
      return { success: true, payroll: res.payroll };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const createPayoutBatch = async (periodKey) => {
    try {
      await api("/payroll/batches/create", { method: "POST", body: JSON.stringify({ periodKey }) });
      await loadBootstrap();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const submitPayoutBatch = async (batchId) => {
    try {
      await api(`/payroll/batches/${batchId}/submit`, { method: "POST" });
      await loadBootstrap();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const settleLiabilities = async () => {
    try {
      await api("/payroll/liabilities/settle", { method: "POST" });
      await loadBootstrap();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const closePayrollPeriod = async (periodKey) => {
    try {
      await api(`/payroll/periods/${periodKey}/close`, { method: "POST" });
      await loadBootstrap();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateBankDetails = async (payload) => {
    try {
      const res = await api("/me/bank-details", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setUser(res.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const sendBankOtp = async () => {
    try {
      const res = await api("/me/bank-details/send-otp", { method: "POST" });
      return { success: true, message: res.message, otp: res.otp };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const verifyBankOtp = async (otp) => {
    try {
      const res = await api("/me/bank-details/verify-otp", {
        method: "POST",
        body: JSON.stringify({ otp }),
      });
      setUser(res.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateProfile = async (payload) => {
    try {
      const res = await api("/me/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setUser(res.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const sendMobileOtp = async () => {
    try {
      const res = await api("/me/mobile/send-otp", { method: "POST" });
      return { success: true, message: res.message, otp: res.otp };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const verifyMobileOtp = async (otp) => {
    try {
      const res = await api("/me/mobile/verify-otp", {
        method: "POST",
        body: JSON.stringify({ otp }),
      });
      setUser(res.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const resolveDispute = async (id) => {
    try {
      await api(`/disputes/${id}/resolve`, { method: "POST" });
      setDisputes(prev => prev.map(d => (d.id === id ? { ...d, status: "resolved", resolvedAt: new Date().toISOString() } : d)));
    } catch (_err) {}
  };

  const submitHmrc = async (id) => {
    try {
      const data = await api(`/hmrc/${id}/submit`, { method: "POST" });
      await loadBootstrap();
      if (data.payroll) {
        setPayrolls((prev) => {
          const idx = prev.findIndex((p) => p.id === data.payroll.id);
          if (idx < 0) return [data.payroll, ...prev];
          const next = [...prev];
          next[idx] = data.payroll;
          return next;
        });
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return (
    <AppContext.Provider value={{
      user, login, register, logout: doLogout, changePassword,
      timesheets, submitTimesheet, resubmitTimesheet, editTimesheet, deleteTimesheet, approveTimesheet, rejectTimesheet,
      invoices, approveInvoice, markPaymentReceived,
      payrolls, processPayroll, disburseSalary, retryDisbursement,
      disputes, resolveDispute,
      hmrcSubmissions, submitHmrc,
      payrollLiabilities, payrollBatches, payrollPeriods,
      createPayoutBatch, submitPayoutBatch, settleLiabilities, closePayrollPeriod,
      updateBankDetails, sendBankOtp, verifyBankOtp,
      updateProfile, sendMobileOtp, verifyMobileOtp,
      auditLogs,
      loadBootstrap,
      contractors, loadAgencyContractors,
      deliverables, setDeliverables, createDeliverable, loadAgencyDeliverables, loadClientDeliverables, loadContractorDeliverables, updateDeliverableStatus,
      assignDeliverableContractor, acceptDeliverableAssignment, rejectDeliverableAssignment, updateDeliverableProgress,
      completeDeliverableMilestone, approveDeliverableMilestone, submitDeliverableEvidence, requestDeliverableChanges, getDeliverableProfitability, createDeliverableTemplate,
      deliverableMessages, loadDeliverableMessages, sendDeliverableMessage,
      deliverableWorkload, rateDeliverable, deliverableTemplates, loadDeliverableTemplates,
      leaveRequests, setLeaveRequests, leaveBalances, LEAVE_TYPES,
      submitLeaveRequest, approveLeaveRequest, rejectLeaveRequest,
      documentBrandingSettings, updateDocumentBrandingSettings,
      allContracts, activeContract, setActiveContractId,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
