// Predefined messages an admin can send to a user when stopping their stream.
// Used by the kill-session dialogs so admins can either type a custom message
// or pick one of these standard notices.
export const PREDEFINED_KILL_MESSAGES = [
  {
    label: "4K Transcoding Restriction",
    message:
      "4K transcoding is not permitted on Xzavain Cloud to optimize server performance. Please adjust your playback settings to direct play or a lower resolution.",
  },
  {
    label: "Server Maintenance",
    message:
      "Xzavain Cloud is undergoing scheduled infrastructure maintenance. Your stream has been temporarily stopped; please try reconnecting shortly.",
  },
  {
    label: "Device Limit Enforced",
    message:
      "You have reached the maximum active device limit allowed under your current Xzavain Cloud access plan. Please close an active stream elsewhere to continue.",
  },
];