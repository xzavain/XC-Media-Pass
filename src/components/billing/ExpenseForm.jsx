import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";

export default function ExpenseForm({ onCreated }) {
  const [name, setName] = useState("");
  const [expenseType, setExpenseType] = useState("server_cost");
  const [scope, setScope] = useState("XC Echo");
  const [monthlyCost, setMonthlyCost] = useState("");
  const [feePercent, setFeePercent] = useState("");
  const [feeFixed, setFeeFixed] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PayPal");
  const [saving, setSaving] = useState(false);

  const isFee = expenseType === "processor_fee";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.BillingExpense.create({
        name,
        expense_type: expenseType,
        scope,
        monthly_cost: parseFloat(monthlyCost) || 0,
        fee_percent: isFee ? parseFloat(feePercent) || 0 : 0,
        fee_fixed: isFee ? parseFloat(feeFixed) || 0 : 0,
        payment_method: isFee ? paymentMethod : "",
      });
      setName(""); setMonthlyCost(""); setFeePercent(""); setFeeFixed("");
      onCreated?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row flex-wrap gap-3 p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
      <Input required placeholder="Expense name" value={name} onChange={(e) => setName(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100 flex-1 min-w-[140px]" />
      <Select value={expenseType} onValueChange={setExpenseType}>
        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 sm:w-44"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          <SelectItem value="processor_fee">Processor Fee</SelectItem>
          <SelectItem value="server_cost">Server Cost</SelectItem>
          <SelectItem value="shared_overhead">Shared Overhead</SelectItem>
          <SelectItem value="live_tv_credit_cost">Live TV Credit Cost</SelectItem>
        </SelectContent>
      </Select>
      <Select value={scope} onValueChange={setScope}>
        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 sm:w-32"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          <SelectItem value="XC Echo">XC Echo</SelectItem>
          <SelectItem value="XC Foxtrot">XC Foxtrot</SelectItem>
          <SelectItem value="Live TV">Live TV</SelectItem>
          <SelectItem value="All XC">All XC</SelectItem>
          <SelectItem value="All">All</SelectItem>
        </SelectContent>
      </Select>
      {isFee ? (
        <>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 sm:w-28"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="PayPal">PayPal</SelectItem>
              <SelectItem value="Stripe">Stripe</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" step="0.01" placeholder="Fee %" value={feePercent} onChange={(e) => setFeePercent(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100 sm:w-24" />
          <Input type="number" step="0.01" placeholder="Fee $" value={feeFixed} onChange={(e) => setFeeFixed(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100 sm:w-24" />
        </>
      ) : (
        <Input required type="number" step="0.01" placeholder={expenseType === "live_tv_credit_cost" ? "$ / credit" : "Monthly cost"} value={monthlyCost} onChange={(e) => setMonthlyCost(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100 sm:w-32" />
      )}
      <Button type="submit" disabled={saving} className="bg-lime-600 hover:bg-lime-700 text-white">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
      </Button>
    </form>
  );
}