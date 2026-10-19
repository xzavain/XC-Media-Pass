import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Clock, Trash2, Copy, Check, Search, Filter, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import PlatformBadge from "@/components/shared/PlatformBadge";
import StatusBadge from "@/components/shared/StatusBadge";
import ExtendTrialModal from "@/components/trials/ExtendTrialModal";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

export default function Trials() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [extendTarget, setExtendTarget] = useState(null);
  const { toast } = useToast();

  useEffect(() => { loadInvitations(); }, []);

  const loadInvitations = async () => {
    try {
      const data = await base44.entities.Invitation.list("-created_date", 100);
      setInvitations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (inv) => {
    try {
      await base44.entities.Invitation.update(inv.id, { status: "revoked" });
      await base44.entities.ActivityLog.create({
        action: "invite_revoked",
        invitation_id: inv.id,
        server_id: inv.server_id,
        username: inv.username || inv.email,
        platform: inv.platform,
        details: `Invite revoked for ${inv.username || inv.email || "user"}`,
      });
      toast({ title: "Invite revoked" });
      loadInvitations();
    } catch (err) {
      toast({ title: "Failed to revoke", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (inv) => {
    try {
      await base44.entities.Invitation.delete(inv.id);
      await base44.entities.ActivityLog.create({
        action: "user_removed",
        invitation_id: inv.id,
        server_id: inv.server_id,
        username: inv.username || inv.email,
        platform: inv.platform,
        details: `User removed: ${inv.username || inv.email || "unknown"}`,
      });
      toast({ title: "Invitation deleted" });
      loadInvitations();
    } catch (err) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    }
  };

  const copyToken = (inv) => {
    const link = `${window.location.origin}/invite/${inv.token}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied" });
  };

  const filtered = invitations.filter(inv => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        inv.username?.toLowerCase().includes(q) ||
        inv.email?.toLowerCase().includes(q) ||
        inv.server_name?.toLowerCase().includes(q) ||
        inv.token?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getTimeRemaining = (expiresAt) => {
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100">Active Trials</h1>
        <p className="text-sm text-zinc-500 mt-1">Monitor and manage all user invitations</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search by username, email, or server..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-zinc-900/50 border-zinc-800 text-zinc-200 pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-zinc-900/50 border-zinc-800 text-zinc-200">
            <Filter className="w-4 h-4 mr-2 text-zinc-500" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {!filtered.length ? (
        <div className="border border-dashed border-zinc-800 rounded-xl p-12 text-center">
          <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-zinc-300 font-medium">No invitations found</h3>
          <p className="text-sm text-zinc-500 mt-1">
            {search || statusFilter !== "all" ? "Try adjusting your filters" : "Create your first invite to get started"}
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
          {/* Header - Desktop */}
          <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 border-b border-zinc-800/60 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            <div className="col-span-3">User</div>
            <div className="col-span-2">Server</div>
            <div className="col-span-1">Platform</div>
            <div className="col-span-2">Expiry</div>
            <div className="col-span-1">Time Left</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-zinc-800/40">
            {filtered.map(inv => (
              <div key={inv.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 px-5 py-3 items-center hover:bg-zinc-800/20 transition-colors">
                <div className="col-span-3">
                  <p className="text-sm text-zinc-200 font-medium">
                    {inv.username || inv.email || "Unclaimed"}
                  </p>
                  {inv.email && inv.username && (
                    <p className="text-xs text-zinc-500">{inv.email}</p>
                  )}
                  <p className="text-xs text-zinc-600 lg:hidden mt-0.5">{inv.server_name}</p>
                </div>
                <div className="col-span-2 hidden lg:block">
                  <p className="text-sm text-zinc-400">{inv.server_name}</p>
                </div>
                <div className="col-span-1 hidden lg:block">
                  <PlatformBadge platform={inv.platform} />
                </div>
                <div className="col-span-2 hidden lg:block">
                  <p className="text-sm text-zinc-400">
                    {moment(inv.expires_at).format("MMM D, YYYY")}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {moment(inv.expires_at).format("h:mm A")}
                  </p>
                </div>
                <div className="col-span-1 hidden lg:block">
                  <span className={`text-sm font-medium ${
                    inv.status === "active" && new Date(inv.expires_at) > new Date()
                      ? "text-emerald-400"
                      : "text-zinc-500"
                  }`}>
                    {inv.status === "active" ? getTimeRemaining(inv.expires_at) : "—"}
                  </span>
                </div>
                <div className="col-span-1">
                  <StatusBadge status={inv.status} />
                </div>
                <div className="col-span-2 flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => copyToken(inv)} className="text-zinc-500 hover:text-zinc-300 h-8 w-8 p-0">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-300 h-8 w-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-zinc-800 border-zinc-700" align="end">
                      <DropdownMenuItem
                        onClick={() => setExtendTarget(inv)}
                        className="text-zinc-300 focus:bg-zinc-700 focus:text-zinc-100"
                      >
                        <Clock className="w-4 h-4 mr-2" /> Extend Trial
                      </DropdownMenuItem>
                      {inv.status === "active" && (
                        <DropdownMenuItem
                          onClick={() => handleRevoke(inv)}
                          className="text-amber-400 focus:bg-amber-500/10 focus:text-amber-300"
                        >
                          <Users className="w-4 h-4 mr-2" /> Revoke Access
                        </DropdownMenuItem>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={e => e.preventDefault()}
                            className="text-rose-400 focus:bg-rose-500/10 focus:text-rose-300"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-zinc-100">Delete this invitation?</AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-400">
                              This will permanently remove this invitation record.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(inv)} className="bg-rose-600 hover:bg-rose-700 text-white">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ExtendTrialModal
        open={!!extendTarget}
        onOpenChange={open => !open && setExtendTarget(null)}
        invitation={extendTarget}
        onExtended={loadInvitations}
      />
    </div>
  );
}