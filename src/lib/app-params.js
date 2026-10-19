// Minimal stub replacing the Base44 bootstrap params module.
//
// The self-hosted rebuild no longer reads app bootstrap params from the URL or
// localStorage: the session token lives under `xcmp_token` (see
// src/api/base44Client.js) and app settings come from /api/settings/public.
// This module is kept only because src/pages/OAuthConsent.jsx still imports it;
// it exports an empty params object so those property reads stay harmless.
export const appParams = {};
