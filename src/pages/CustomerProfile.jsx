import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft } from "lucide-react";
import CustomerBillingCard from "@/components/crm/CustomerBillingCard";
import CustomerTicketsList from "@/components/crm/CustomerTicketsList";
import CustomerActivityTimeline from "@/components/crm/CustomerActivityTimeline";

export default function CustomerProfile() {
  const { customerId } = useParams();
  const [customer, setCustomer] = useState(null);
  const [planName, setPlanName] = useState("");
  const [tickets, setTickets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.BillingCustomer.get(customerId).then(async (c) => {
      setCustomer(c);
      const [plan, ticketList, logList] = await Promise.all([
        c.plan_id ? base44.entities.StorePlan.get(c.plan_id).catch(() => null) : Promise.resolve(null),
        base44.entities.Ticket.filter({ customer_email: c.email }, "-created_date"),
        base44.entities.ActivityLog.filter({ username: c.user_name }, "-created_date"),
      ]);
      setPlanName(plan?.name || "");
      setTickets(ticketList);
      setLogs(logList);
      setLoading(false);
    });
  }, [customerId]);

  if (loading) {
    return <div className="p-6 text-sm text-zinc-500">Loading…</div>;
  }

  if (!customer) {
    return <div className="p-6 text-sm text-zinc-500">Customer not found.</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link to="/crm" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back to CRM Hub
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-white">{customer.user_name}</h1>
        <p className="text-sm text-zinc-400">{customer.email}</p>
      </div>

      <CustomerBillingCard customer={customer} planName={planName} />
      <CustomerTicketsList tickets={tickets} />
      <CustomerActivityTimeline logs={logs} />
    </div>
  );
}