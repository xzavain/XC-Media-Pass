import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2 } from "lucide-react";
import moment from "moment";

export default function DepartmentSettings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [departments, setDepartments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [key, setKey] = useState("support");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => {
    Promise.all([
      base44.entities.Department.list("-created_date"),
      base44.entities.ActivityLog.filter({}, "-created_date", 30),
    ]).then(([d, l]) => {
      setDepartments(d);
      setLogs(l.filter((log) => log.action.startsWith("ticket_")));
      setLoading(false);
    });
  };

  useEffect(() => { if (isAdmin) load(); else setLoading(false); }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center h-full text-zinc-500 text-sm">
        Only admins can manage departments.
      </div>
    );
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await base44.entities.Department.create({ name, key, description, active: true });
      setName(""); setDescription("");
      load();
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (dept) => {
    await base44.entities.Department.update(dept.id, { active: !dept.active });
    load();
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100">Department Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage ticket routing departments and audit ticket activity</p>
      </div>

      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
        <Input required placeholder="Department name" value={name} onChange={(e) => setName(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100 flex-1" />
        <Select value={key} onValueChange={setKey}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="support">Support</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100 flex-1" />
        <Button type="submit" disabled={creating} className="bg-lime-600 hover:bg-lime-700 text-white">
          {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Add
        </Button>
      </form>

      <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/60 text-xs text-zinc-500 uppercase">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Name</th>
              <th className="text-left px-4 py-2.5 font-semibold">Key</th>
              <th className="text-left px-4 py-2.5 font-semibold">Description</th>
              <th className="text-left px-4 py-2.5 font-semibold">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-600 text-xs">Loading…</td></tr>
            ) : departments.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-600 text-xs">No departments yet.</td></tr>
            ) : (
              departments.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2.5 text-zinc-200">{d.name}</td>
                  <td className="px-4 py-2.5 text-zinc-400 capitalize">{d.key}</td>
                  <td className="px-4 py-2.5 text-zinc-400">{d.description || "—"}</td>
                  <td className="px-4 py-2.5">
                    <Switch checked={d.active} onCheckedChange={() => toggleActive(d)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-200 mb-3">Ticket Activity Log</h2>
        <div className="rounded-xl border border-zinc-800/60 divide-y divide-zinc-800/40">
          {logs.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">No ticket activity yet.</p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <span className="text-zinc-300">{l.details}</span>
                <span className="text-xs text-zinc-600">{moment(l.created_date).fromNow()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}