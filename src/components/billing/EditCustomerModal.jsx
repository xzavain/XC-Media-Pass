import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function EditCustomerModal({ customer, plans, open, onOpenChange, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm({
        user_name: customer.user_name,
        email: customer.email,
        status: customer.status,
        bill_date: customer.bill_date,
        payment_method: customer.payment_method,
        billed_price: customer.billed_price,
        plan_id: customer.plan_id,
      });
    }
  }, [customer]);

  if (!form) return null;

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.BillingCustomer.update(customer.id, {
        ...form,
        billed_price: parseFloat(form.billed_price) || 0,
      });
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-zinc-400">Name</Label>
            <Input value={form.user_name} onChange={(e) => set("user_name")(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
          </div>
          <div>
            <Label className="text-xs text-zinc-400">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
          </div>
          <div>
            <Label className="text-xs text-zinc-400">Plan</Label>
            <Select value={form.plan_id} onValueChange={set("plan_id")}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-zinc-400">Bill Date</Label>
              <Input type="date" value={form.bill_date} onChange={(e) => set("bill_date")(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Billed Price</Label>
              <Input type="number" step="0.01" value={form.billed_price} onChange={(e) => set("billed_price")(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-zinc-400">Payment Method</Label>
              <Select value={form.payment_method} onValueChange={set("payment_method")}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="PayPal">PayPal</SelectItem>
                  <SelectItem value="Stripe">Stripe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Status</Label>
              <Select value={form.status} onValueChange={set("status")}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                  <SelectItem value="CANCELED">CANCELED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="border-zinc-700" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-lime-600 hover:bg-lime-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}