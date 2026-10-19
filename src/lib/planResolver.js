import { base44 } from "@/api/base44Client";

// Builds a (serverId, username) -> StorePlan resolver by bridging
// ServerUser (platform username/email) -> BillingCustomer (email/plan_id) -> StorePlan.
export async function loadPlanResolver() {
  const [serverUsers, customers, plans] = await Promise.all([
    base44.entities.ServerUser.list(),
    base44.entities.BillingCustomer.list(),
    base44.entities.StorePlan.list(),
  ]);

  const plansById = Object.fromEntries(plans.map((p) => [p.id, p]));
  const customerByEmail = Object.fromEntries(customers.map((c) => [c.email.toLowerCase(), c]));
  const serverUsersByKey = Object.fromEntries(
    serverUsers.map((su) => [`${su.server_id}::${su.username.toLowerCase()}`, su])
  );

  return function resolvePlan(serverId, username) {
    const su = serverUsersByKey[`${serverId}::${(username || "").toLowerCase()}`];
    const customer = su?.email ? customerByEmail[su.email.toLowerCase()] : null;
    return customer ? plansById[customer.plan_id] : null;
  };
}