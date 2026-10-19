import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

const COMMON_ROLES = ["admin", "staff", "customer"];

export default function EditUserModal({ open, onClose, onSave, targetUser }) {
  const [role, setRole] = useState("customer");
  const [useCustomRole, setUseCustomRole] = useState(false);
  const [customRole, setCustomRole] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (targetUser) {
      const isCommon = COMMON_ROLES.includes(targetUser.role);
      setRole(isCommon ? targetUser.role : "custom");
      setUseCustomRole(!isCommon);
      setCustomRole(isCommon ? "" : targetUser.role || "");
    }
  }, [targetUser, open]);

  const handleRoleChange = (v) => {
    if (v === "custom") {
      setUseCustomRole(true);
      setRole("custom");
    } else {
      setUseCustomRole(false);
      setRole(v);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalRole = useCustomRole ? customRole.trim() : role;
    if (!finalRole) return;
    setSaving(true);
    try {
      await onSave(targetUser.id, { role: finalRole });
    } finally {
      setSaving(false);
    }
  };

  if (!targetUser) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={targetUser.full_name || ""} disabled className="bg-zinc-800 border-zinc-700 text-zinc-400" />
            <p className="text-xs text-zinc-500 mt-1">Name is set by the user and can't be edited here.</p>
          </div>
          <div>
            <Label>Email</Label>
            <Input value={targetUser.email || ""} disabled className="bg-zinc-800 border-zinc-700 text-zinc-400" />
            <p className="text-xs text-zinc-500 mt-1">Email can't be changed by an admin.</p>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={handleRoleChange}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="custom">Custom role...</SelectItem>
              </SelectContent>
            </Select>
            {useCustomRole && (
              <Input
                className="mt-2 bg-zinc-800 border-zinc-700 text-zinc-100"
                placeholder="e.g. manager"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                required
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}