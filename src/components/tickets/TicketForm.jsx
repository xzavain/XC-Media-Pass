import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useMediaAuth } from "@/lib/MediaAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Server, Info } from "lucide-react";
import KbDeflector from "@/components/tickets/KbDeflector";
import DiagnosticAttachBox from "@/components/tickets/DiagnosticAttachBox";
import AttachmentUploader from "@/components/tickets/AttachmentUploader";
import { sendDiscordNotification } from "@/lib/discordWebhook";

const PRIORITY_SLA = { low: 168, medium: 72, normal: 72, high: 48, urgent: 24 };

export default function TicketForm({ user, onCreated, isStaff = false }) {
  const { accounts, nodes } = useMediaAuth();
  const [departments, setDepartments] = useState([]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [serverId, setServerId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [diagnosticSnapshot, setDiagnosticSnapshot] = useState(null);

  const userServers = useMemo(() => {
    return accounts.map((a) => {
      const node = nodes.find((n) => n.id === a.server_id);
      return {
        id: a.server_id,
        name: node?.node_name || a.server_id,
        service_type: a.service_type,
        region: node?.assigned_region || "",
      };
    });
  }, [accounts, nodes]);

  const hasActivePlan = userServers.length > 0;

  useEffect(() => {
    base44.entities.TicketDepartment.list("display_order", 20).then(setDepartments).catch(() => {});
    if (isStaff) base44.entities.User.list().then(setAllUsers);
  }, [isStaff]);

  useEffect(() => {
    if (departments.length > 0 && !departmentId) {
      const defaultDept = hasActivePlan
        ? departments.find((d) => d.slug === "technical") || departments[0]
        : departments.find((d) => d.is_public_pre_sales) || departments[0];
      setDepartmentId(defaultDept?.id || "");
    }
  }, [departments, hasActivePlan, departmentId]);

  const selectedDept = departments.find((d) => d.id === departmentId);
  const showServerField = selectedDept?.requires_server && hasActivePlan;

  useEffect(() => {
    if (showServerField && userServers.length === 1 && !serverId) {
      setServerId(userServers[0].id);
    }
    if (!showServerField) setServerId("");
  }, [showServerField, userServers, serverId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (showServerField && !serverId) { setError("Please select an affected server."); return; }
    if (isStaff && !customerId) { setError("Please select a customer for this ticket."); return; }
    setError("");
    setSubmitting(true);
    try {
      const targetUser = isStaff ? allUsers.find((u) => u.id === customerId) : user;
      const selectedServer = userServers.find((s) => s.id === serverId);
      const ticketNumber = `TICK-${Math.floor(10000 + Math.random() * 90000)}`;
      const slaHours = PRIORITY_SLA[priority] || 72;
      const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

      const ticket = await base44.entities.Ticket.create({
        subject, description,
        department: selectedDept?.slug || "support",
        department_id: departmentId,
        ticket_number: ticketNumber,
        priority,
        service: selectedServer?.service_type || "",
        server_id: serverId,
        server_name: selectedServer?.name || "",
        status: "open",
        sla_due_at: slaDueAt,
        customer_id: targetUser?.id || "",
        customer_name: targetUser?.full_name || "",
        customer_email: targetUser?.email || "",
        attachments,
        diagnostic_snapshot: diagnosticSnapshot,
      });
      await base44.entities.ActivityLog.create({
        action: "ticket_created",
        ticket_id: ticket.id,
        details: `Ticket "${subject}" created by ${user?.full_name || user?.email}`,
        username: user?.full_name || user?.email,
      });
      sendDiscordNotification({ event: "ticket_created", ticket, user }).catch(() => {});
      setSubject(""); setDescription(""); setServerId(""); setCustomerId(""); setAttachments([]); setDiagnosticSnapshot(null);
      onCreated?.(ticket);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-5 rounded-xl border border-slate-800 bg-slate-900/40">
      {isStaff && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Customer</label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100"><SelectValue placeholder="Select a customer" /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {allUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">Subject</label>
        <Input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Briefly describe your issue" className="bg-slate-800 border-slate-700 text-slate-100" />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">Department</label>
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100"><SelectValue placeholder="Select department" /></SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {showServerField ? (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5"><Server className="w-4 h-4" /> Select Affected Server</label>
          <Select value={serverId} onValueChange={setServerId}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100"><SelectValue placeholder="Select a server" /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {userServers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.service_type.charAt(0).toUpperCase() + s.service_type.slice(1)}{s.region ? ` - ${s.region}` : ""})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : selectedDept && !selectedDept.requires_server ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800/40 rounded-lg px-3 py-2 border border-slate-800">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          No server required. A member of our {selectedDept.is_public_pre_sales ? "onboarding" : "billing"} team will guide you.
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Priority</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">Description</label>
        <Textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide as much detail as possible. Markdown supported." rows={5} className="bg-slate-800 border-slate-700 text-slate-100" />
      </div>

      <KbDeflector subject={subject} description={description} />

      {showServerField && <DiagnosticAttachBox onAttach={setDiagnosticSnapshot} />}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">Attachments</label>
        <AttachmentUploader attachments={attachments} onChange={setAttachments} />
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto">
        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Submit Ticket
      </Button>
    </form>
  );
}