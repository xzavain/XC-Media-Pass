import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";

export default function CustomerForm({ plans, onCreated }) {
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [billDate, setBillDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PayPal");
  const [billedPrice, setBilledPrice] = useState("");
  const [planId, setPlanId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!planId) return;
    setSaving(true);
    try {
      await base44.entities.BillingCustomer.create({
        user_name: userName,
        email,
        status,
        bill_date: billDate,
        payment_method: paymentMethod,
        billed_price: parseFloat(billedPrice) || 0,
        plan_id: planId,
      });
      setUserName(""); setEmail(""); setBillDate(""); setBilledPrice(""); setPlanId("");
      onCreated?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row flex-wrap gap-3 p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
      <Input required placeholder="Customer name" value={userName} onChange={(e) => setUserName(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100 flex-1 min-w-[140px]" />
      <Input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100 flex-1 min-w-[160px]" />
      <Select value={planId} onValueChange={setPlanId}>
        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 sm:w-44"><SelectValue placeholder="Plan" /></SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          {plans.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input required type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100 sm:w-40" />
      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 sm:w-28"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          <SelectItem value="PayPal">PayPal</SelectItem>
          <SelectItem value="Stripe">Stripe</SelectItem>
        </SelectContent>
      </Select>
      <Input required type="number" step="0.01" placeholder="Billed price" value={billedPrice} onChange={(e) => setBilledPrice(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100 sm:w-32" />
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 sm:w-32"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          <SelectItem value="ACTIVE">ACTIVE</SelectItem>
          <SelectItem value="INACTIVE">INACTIVE</SelectItem>
          <SelectItem value="CANCELED">CANCELED</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" disabled={saving} className="bg-lime-600 hover:bg-lime-700 text-white">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
      </Button>
    </form>
  );
}