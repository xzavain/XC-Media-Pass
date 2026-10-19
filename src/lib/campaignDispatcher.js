// Campaign dispatch engine — resolves recipients, applies shortcodes,
// sends via SendEmail (for registered users) or Discord webhook, and
// records per-recipient results back onto the campaign.

import { base44 } from "@/api/base44Client";
import { applyShortcodes, buildTemplateContext } from "./emailShortcodes";

export function resolveRecipients(campaign, customers) {
  switch (campaign.target_audience) {
    case "active":
      return customers.filter((c) => c.status === "ACTIVE");
    case "inactive":
      return customers.filter((c) => c.status === "INACTIVE" || c.status === "CANCELED");
    case "migrated":
      return customers.filter((c) => c.source && c.source !== "direct");
    case "not_welcomed":
      return customers.filter((c) => !c.welcome_email_sent);
    case "custom":
      return customers.filter((c) => campaign.target_emails?.includes(c.email));
    default:
      return customers;
  }
}

async function sendDiscordWebhook(webhookUrl, content) {
  if (!webhookUrl) throw new Error("No Discord webhook URL configured");
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Discord webhook failed: ${res.status}`);
}

// Dispatch a campaign to all resolved recipients. Updates the campaign
// record with sent/failed counts and a per-recipient result log.
// If template category is "welcome", marks recipients as welcomed on success.
export async function dispatchCampaign(campaign, template, customers, plans, discordConfig) {
  const recipients = resolveRecipients(campaign, customers);
  const results = [];
  let sent = 0;
  let failed = 0;

  for (const customer of recipients) {
    const plan = plans.find((p) => p.id === customer.plan_id);
    const ctx = buildTemplateContext(customer, plan);
    const subject = applyShortcodes(template.subject, ctx);
    const body = applyShortcodes(template.body, ctx);

    try {
      if (campaign.channel === "email") {
        await base44.integrations.Core.SendEmail({ to: customer.email, subject, body });
      } else if (campaign.channel === "discord") {
        await sendDiscordWebhook(discordConfig?.webhook_url, body);
      }
      results.push({ email: customer.email, status: "success" });
      sent += 1;

      if (template.category === "welcome") {
        await base44.entities.BillingCustomer.update(customer.id, { welcome_email_sent: true });
      }
    } catch (err) {
      results.push({ email: customer.email, status: "failed", error: err.message || "Unknown error" });
      failed += 1;
    }
  }

  await base44.entities.CommunicationCampaign.update(campaign.id, {
    status: failed === 0 ? "sent" : sent === 0 ? "failed" : "partial",
    sent_count: sent,
    failed_count: failed,
    total_recipients: recipients.length,
    dispatched_at: new Date().toISOString(),
    result_log: results,
  });

  return { sent, failed, total: recipients.length, results };
}