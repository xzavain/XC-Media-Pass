import React, { useState, useEffect } from "react";
import { UserPlus, Loader2, ShieldCheck, User as UserIcon, Mail, Pencil } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import EditUserModal from "@/components/users/EditUserModal";

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      base44.entities.User.list().then(setUsers).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    try {
      await base44.users.inviteUser(email, role);
      toast({ title: "Invitation sent", description: `${email} has been invited as ${role}.` });
      setEmail("");
      setRole("user");
      const refreshed = await base44.entities.User.list();
      setUsers(refreshed);
    } catch (err) {
      toast({ title: "Failed to invite user", description: err.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleSaveUser = async (userId, data) => {
    try {
      await base44.entities.User.update(userId, data);
      const refreshed = await base44.entities.User.list();
      setUsers(refreshed);
      toast({ title: "User updated" });
      setEditingUser(null);
    } catch (err) {
      toast({ title: "Failed to update user", description: err.message, variant: "destructive" });
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center h-full text-zinc-500 text-sm">
        Only admins can manage users.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Staff Users</h1>
        <p className="text-sm text-zinc-500">Invite new staff or admins. Registration is disabled — access is invite-only.</p>
      </div>

      <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            type="email"
            required
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-zinc-100 pl-9"
          />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="user">Staff</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" disabled={inviting} className="bg-violet-600 hover:bg-violet-700 text-white">
          {inviting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
          Invite
        </Button>
      </form>

      <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/60 text-xs text-zinc-500 uppercase">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Name</th>
              <th className="text-left px-4 py-2.5 font-semibold">Email</th>
              <th className="text-left px-4 py-2.5 font-semibold">Role</th>
              <th className="text-right px-4 py-2.5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-600 text-xs">Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-600 text-xs">No users yet.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2.5 flex items-center gap-2 text-zinc-200">
                    <UserIcon className="w-3.5 h-3.5 text-zinc-500" /> {u.full_name || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border ${u.role === "admin" ? "bg-lime-500/10 text-lime-400 border-lime-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}>
                      {u.role === "admin" && <ShieldCheck className="w-3 h-3" />}
                      {u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : "Staff"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => setEditingUser(u)}>
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <EditUserModal
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleSaveUser}
        targetUser={editingUser}
      />
    </div>
  );
}