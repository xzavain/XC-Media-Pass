import { base44 } from "@/api/base44Client";

let cachedConfig = null;
let configPromise = null;

export async function getDiscordConfig({ force = false } = {}) {
  if (cachedConfig && !force) return cachedConfig;
  if (configPromise && !force) return configPromise;
  configPromise = base44.entities.DiscordBotConfig.list()
    .then((list) => {
      cachedConfig = list[0] || null;
      // Don't cache a missing config — allow re-fetch until one exists
      if (!cachedConfig) configPromise = null;
      return cachedConfig;
    })
    .catch(() => {
      configPromise = null;
      return null;
    });
  return configPromise;
}

function hexToInt(hex) {
  if (!hex) return 0xa3e635;
  return parseInt(hex.replace("#", ""), 16);
}

function buildEmbed(event, ticket, note, user, config) {
  const color = hexToInt(config.panel_embed_color);
  const base = {
    color,
    timestamp: new Date().toISOString(),
    footer: { text: config.bot_name || "Support Bot" },
  };

  switch (event) {
    case "ticket_created":
      return {
        ...base,
        title: "🎫 New Support Ticket",
        fields: [
          { name: "Subject", value: ticket?.subject || "—", inline: false },
          { name: "Customer", value: ticket?.customer_name || ticket?.customer_email || "Unknown", inline: true },
          { name: "Department", value: (ticket?.department || "—"), inline: true },
          { name: "Priority", value: (ticket?.priority || "—"), inline: true },
          { name: "Description", value: (ticket?.description || "").slice(0, 1024) || "—", inline: false },
        ],
      };
    case "ticket_reply":
      return {
        ...base,
        title: "💬 New Ticket Reply",
        fields: [
          { name: "Ticket", value: ticket?.subject || "—", inline: false },
          { name: "Author", value: note?.author_name || user?.full_name || "Someone", inline: true },
          { name: "Internal", value: note?.is_internal ? "Yes (staff only)" : "No", inline: true },
          { name: "Message", value: (note?.note || "").slice(0, 1024) || "—", inline: false },
        ],
      };
    case "ticket_status_changed":
      return {
        ...base,
        title: "🔄 Ticket Status Changed",
        fields: [
          { name: "Ticket", value: ticket?.subject || "—", inline: false },
          { name: "New Status", value: ticket?.status || "—", inline: true },
          { name: "Changed By", value: user?.full_name || user?.email || "System", inline: true },
        ],
      };
    case "ticket_assigned":
      return {
        ...base,
        title: "👤 Ticket Assigned",
        fields: [
          { name: "Ticket", value: ticket?.subject || "—", inline: false },
          { name: "Assigned To", value: ticket?.assigned_to_name || "Unassigned", inline: true },
          { name: "By", value: user?.full_name || user?.email || "System", inline: true },
        ],
      };
    default:
      return base;
  }
}

export async function sendDiscordNotification({ event, ticket, note, user }) {
  try {
    const config = await getDiscordConfig();
    if (!config || !config.is_active || !config.webhook_url) return;

    const enabledMap = {
      ticket_created: config.notify_on_create,
      ticket_reply: config.notify_on_reply,
      ticket_status_changed: config.notify_on_status_change,
      ticket_assigned: config.notify_on_assign,
    };
    if (enabledMap[event] === false) return;

    // Internal notes go to the staff log webhook if configured, not the main one
    const isInternal = event === "ticket_reply" && note?.is_internal;
    const webhook = isInternal && config.log_webhook_url ? config.log_webhook_url : config.webhook_url;

    const embed = buildEmbed(event, ticket, note, user, config);
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: config.bot_name || "Support Bot",
        avatar_url: config.avatar_url || undefined,
        embeds: [embed],
      }),
    });
  } catch {
    // Notifications are best-effort — never block ticket operations
  }
}