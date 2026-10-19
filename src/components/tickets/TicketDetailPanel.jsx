import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TicketStatusBadge from "@/components/tickets/TicketStatusBadge";
import StatusTimeline from "@/components/tickets/StatusTimeline";
import CsatRating from "@/components/tickets/CsatRating";
import MacroPicker from "@/components/tickets/MacroPicker";
import PlatformBadge from "@/components/shared/PlatformBadge";
import ReactMarkdown from "react-markdown";
import { Loader2, Lock, Send, Paperclip, Image as ImageIcon, RotateCcw, CheckCircle2, User, Server } from "lucide-react";
import moment from "moment";
import AttachmentUploader from "@/components/tickets/AttachmentUploader";
import { sendDiscordNotification } from "@/lib/discordWebhook";

export default function TicketDetailPanel({ ticket, user, isStaff, staffList = [], onUpdated }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [posting, setPosting] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const loadNotes = useCallback(async () => {
    if (!ticket) return;
    setLoading(true);
    const list = await base44.entities.TicketNote.filter({ ticket_id: ticket.id }, "created_date");
    setNotes(isStaff ? list : list.filter((n) => !n.is_internal));
    setLoading(false);
  }, [ticket, isStaff]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  if (!ticket) return null;

  const logActivity = async (action, details) => {
    await base44.entities.ActivityLog.create({ action, ticket_id: ticket.id, details, username: user?.full_name || user?.email });
  };

  const handleStatusChange = async (status) => {
    await base44.entities.Ticket.update(ticket.id, { status });
    await logActivity("ticket_status_changed", `Status changed to ${status}`);
    sendDiscordNotification({ event: "ticket_status_changed", ticket: { ...ticket, status }, user }).catch(() => {});
    onUpdated?.();
  };

  const handleAssign = async (email) => {
    const staff = staffList.find((s) => s.email === email);
    await base44.entities.Ticket.update(ticket.id, { assigned_to_email: email, assigned_to_name: staff?.full_name || email });
    await logActivity("ticket_assigned", `Assigned to ${staff?.full_name || email}`);
    onUpdated?.();
  };

  const handleReopen = async () => {
    await base44.entities.Ticket.update(ticket.id, { status: "in_progress", csat_score: null });
    await logActivity("ticket_status_changed", `Reopened by ${user?.full_name || user?.email}`);
    onUpdated?.();
  };

  const handleResolve = async () => {
    await base44.entities.Ticket.update(ticket.id, { status: "resolved" });
    await logActivity("ticket_status_changed", `Marked as resolved by ${user?.full_name || user?.email}`);
    onUpdated?.();
  };

  const handlePostNote = async () => {
    if (!reply.trim()) return;
    setPosting(true);
    try {
      const noteData = {
        ticket_id: ticket.id,
        customer_id: ticket.customer_id,
        author_name: user?.full_name || user?.email,
        author_email: user?.email,
        sender_type: isStaff ? "staff" : "customer",
        note: reply,
        is_internal: isStaff ? internal : false,
        attachments,
        source: "web",
      };
      await base44.entities.TicketNote.create(noteData);
      await logActivity("ticket_note_added", `Note added to ticket "${ticket.subject}"`);
      if (!noteData.is_internal) sendDiscordNotification({ event: "ticket_reply", ticket, note: noteData, user }).catch(() => {});
      setReply(""); setInternal(false); setAttachments([]);
      await loadNotes();
    } finally {
      setPosting(false);
    }
  };

  const isResolved = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className="space-y-5">
      {/* Header + Timeline */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white truncate">{ticket.subject}</h2>
            {ticket.ticket_number && <p className="text-xs font-mono text-slate-500 mt-0.5">{ticket.ticket_number}</p>}
          </div>
          <TicketStatusBadge status={ticket.status} priority={ticket.priority} />
        </div>
        <StatusTimeline status={ticket.status} />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        {ticket.service && <PlatformBadge platform={ticket.service} />}
        {ticket.server_name && <span className="flex items-center gap-1"><Server className="w-3 h-3" /> {ticket.server_name}</span>}
        <span className="capitalize">{ticket.department}</span>
        <span>· {moment(ticket.created_date).format("MMM D, YYYY h:mm A")}</span>
        {ticket.assigned_to_name && <span>· Assigned: {ticket.assigned_to_name}</span>}
      </div>

      {/* Description */}
      <div className="text-sm text-slate-300 bg-slate-900/60 rounded-lg p-4 border border-slate-800">
        <ReactMarkdown>{ticket.description || ""}</ReactMarkdown>
      </div>

      {/* Attachments */}
      {ticket.attachments?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ticket.attachments.map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-slate-800/60 rounded-md px-2 py-1">
              {a.type?.startsWith("image/") ? <ImageIcon className="w-3 h-3" /> : <Paperclip className="w-3 h-3" />}
              {a.name}
            </a>
          ))}
        </div>
      )}

      {/* Staff controls */}
      {isStaff && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Status</label>
            <Select value={ticket.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting_on_customer">Awaiting Customer</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Assign to</label>
            <Select value={ticket.assigned_to_email || ""} onValueChange={handleAssign}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {staffList.map((s) => <SelectItem key={s.email} value={s.email}>{s.full_name || s.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Customer actions */}
      {!isStaff && !isResolved && (
        <Button onClick={handleResolve} className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
          <CheckCircle2 className="w-4 h-4" /> Mark as Resolved
        </Button>
      )}
      {!isStaff && isResolved && ticket.status !== "closed" && (
        <Button onClick={handleReopen} variant="outline" className="w-full border-slate-700 text-slate-200 gap-1.5">
          <RotateCcw className="w-4 h-4" /> Re-Open Ticket
        </Button>
      )}

      {/* CSAT */}
      {!isStaff && isResolved && (
        <CsatRating ticket={ticket} onRated={() => onUpdated?.()} />
      )}

      {/* Conversation */}
      <div className="pt-3 border-t border-slate-800 space-y-3">
        <h4 className="text-sm font-semibold text-slate-300">Conversation</h4>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
        ) : notes.length === 0 ? (
          <p className="text-xs text-slate-600">No replies yet.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => {
              const isStaffMsg = n.sender_type === "staff" || (isStaff && n.author_email !== ticket.customer_email && !n.is_internal);
              return (
                <div key={n.id} className={`flex gap-3 ${n.is_internal ? "opacity-90" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    n.is_internal ? "bg-amber-500/20" : isStaffMsg ? "bg-indigo-500/20" : "bg-slate-700"
                  }`}>
                    {n.is_internal ? <Lock className="w-4 h-4 text-amber-400" /> : <User className="w-4 h-4 text-slate-300" />}
                  </div>
                  <div className={`flex-1 min-w-0 rounded-lg border p-3 ${
                    n.is_internal ? "bg-amber-500/5 border-amber-500/20" : isStaffMsg ? "bg-indigo-500/5 border-indigo-500/20" : "bg-slate-900/60 border-slate-800"
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                        {n.author_name || n.author_email}
                        {isStaffMsg && !n.is_internal && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-medium">Staff</span>}
                        {n.is_internal && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">Internal</span>}
                      </span>
                      <span className="text-xs text-slate-600">{moment(n.created_date).fromNow()}</span>
                    </div>
                    <div className="text-sm text-slate-300 prose-sm max-w-none">
                      <ReactMarkdown>{n.note || ""}</ReactMarkdown>
                    </div>
                    {n.attachments?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {n.attachments.map((a, i) => (
                          <a key={i} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-slate-800/60 rounded-md px-2 py-1">
                            {a.type?.startsWith("image/") ? <ImageIcon className="w-3 h-3" /> : <Paperclip className="w-3 h-3" />}
                            {a.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply composer */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        {isStaff && (
          <div className="flex items-center gap-2">
            <MacroPicker onInsert={(text) => setReply((prev) => (prev ? `${prev}\n\n${text}` : text))} ticket={ticket} />
            <AttachmentUploader attachments={attachments} onChange={setAttachments} />
          </div>
        )}
        {!isStaff && <AttachmentUploader attachments={attachments} onChange={setAttachments} />}
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={isStaff ? "Write a reply or internal note... (Markdown supported)" : "Write a reply... (Markdown supported)"}
          rows={4}
          className="bg-slate-800 border-slate-700 text-slate-100"
        />
        <div className="flex items-center justify-between">
          {isStaff ? (
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-amber-500" />
              <Lock className="w-3 h-3 text-amber-400" /> Internal note (staff only)
            </label>
          ) : <span />}
          <Button onClick={handlePostNote} disabled={posting || !reply.trim()} size="sm" className={internal ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}>
            {posting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
            {internal ? "Post Internal Note" : "Send Reply"}
          </Button>
        </div>
      </div>
    </div>
  );
}