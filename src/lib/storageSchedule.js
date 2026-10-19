// Admin-configurable automatic refresh schedule for library storage totals.
// Stored in localStorage; 0 = manual only. The dashboard checks on load and
// every minute while open, refreshing in the background when the interval elapses.

const HOURS_KEY = "storage_schedule_hours";
const LAST_KEY = "storage_last_refresh";
const VALID = [0, 6, 12, 24];

export function getScheduleHours() {
  const v = Number(localStorage.getItem(HOURS_KEY));
  return VALID.includes(v) ? v : 0;
}

export function setScheduleHours(h) {
  localStorage.setItem(HOURS_KEY, String(h));
}

export function getLastRefresh() {
  return Number(localStorage.getItem(LAST_KEY)) || 0;
}

export function setLastRefresh(ts = Date.now()) {
  localStorage.setItem(LAST_KEY, String(ts));
}

export function isRefreshDue() {
  const h = getScheduleHours();
  if (!h) return false;
  return Date.now() - getLastRefresh() >= h * 3600 * 1000;
}