// Centralized KB permission checks - admins and staff manage content, everyone authenticated can view published pages.
export function canManageKb(user) {
  return user?.role === "admin" || user?.role === "staff";
}

export function canSeeDraft(user, page) {
  if (canManageKb(user)) return true;
  return page?.author_email === user?.email;
}