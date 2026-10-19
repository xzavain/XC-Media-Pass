// Local persistence for the File Manager: pinned "Quick Access" folders and column widths.

const QUICK_ACCESS_KEY = "mediapass_quick_access_v1";
const COLUMN_WIDTHS_KEY = "mediapass_column_widths_v1";

export const DEFAULT_COLUMN_WIDTHS = { poster: 56, name: 380, type: 160, size: 110, dateModified: 190 };

export function getQuickAccess() {
  try {
    return JSON.parse(localStorage.getItem(QUICK_ACCESS_KEY)) || [];
  } catch {
    return [];
  }
}

export function isPinned(serverUrl, path) {
  return getQuickAccess().some((p) => p.serverUrl === serverUrl && p.path === path);
}

export function togglePin(entry) {
  const list = getQuickAccess();
  const idx = list.findIndex((p) => p.serverUrl === entry.serverUrl && p.path === entry.path);
  let updated;
  if (idx >= 0) {
    updated = list.filter((_, i) => i !== idx);
  } else {
    updated = [...list, entry];
  }
  localStorage.setItem(QUICK_ACCESS_KEY, JSON.stringify(updated));
  return updated;
}

export function getColumnWidths() {
  try {
    return { ...DEFAULT_COLUMN_WIDTHS, ...(JSON.parse(localStorage.getItem(COLUMN_WIDTHS_KEY)) || {}) };
  } catch {
    return DEFAULT_COLUMN_WIDTHS;
  }
}

export function saveColumnWidths(widths) {
  localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(widths));
}

const VIEW_MODE_KEY = "mediapass_view_mode_v1";

export function getViewMode() {
  return localStorage.getItem(VIEW_MODE_KEY) || "details";
}

export function saveViewMode(mode) {
  localStorage.setItem(VIEW_MODE_KEY, mode);
}