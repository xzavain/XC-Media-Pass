# MASTER BUILD PROMPT — XC Media Pass (Xzavain Cloud)

You are to build **XC Media Pass** — a production-grade, dual-portal (Admin/Staff + Customer) media-streaming operations platform for the brand **Xzavain Cloud**. It manages a fleet of Plex/Emby/Jellyfin media servers, a centralized multi-gateway (Stripe/PayPal) billing & subscription engine, a TMDB-powered discovery/release layer, a full support desk with Discord integration, a loyalty/referrals program, a knowledge base, project management, and deep performance/storage analytics.

Build it on the **Base44 platform** (backend-as-a-service: auth, database, integrations, hosting) using **React + Vite + Tailwind CSS + JavaScript**. The app must be pixel-for-pixel and function-for-function identical to the reference workspace. Follow every section below exactly.

---

## 0. GLOBAL RULES & BRAND

- Brand name: **Xzavain Cloud**. Product/login title: **XC Media Pass**. Footer text: `Xzavain Cloud · XC Media Pass`.
- Logo asset URL (use verbatim): `https://media.base44.com/images/public/6a44262b8115bfc7548e8a80/ffc6d373e_XzavainCloudNB.png` (sidebar, 8×8 rounded) and `https://media.base44.com/images/public/6a44262b8115bfc7548e8a80/49894cf6f_XzavainCloudNB.png` (login hero, 64×auto, with lime drop-shadow `drop-shadow-[0_0_25px_rgba(163,230,53,0.3)]`).
- **No Google/social login buttons anywhere.** Login is staff-only, email+password. Remove customer-facing registration entirely.
- **No demo/mock/seed data.** Use production data only. No sample entities.
- **Single Source of Truth (SSOT):** consolidate redundant data into central entities; never duplicate.
- **All financial math must dynamically reference the `BillingExpense` table** — never hardcode rates, costs, or fees.
- **Obsidian-slate (slate-950 / zinc-950) dark theme everywhere.** Deep black backgrounds, lime/emerald-green accents, high-contrast **white** typography (not grey tokens) in dark mode.
- **Windows-standard formatting:** file sizes in MB/GB only (e.g. `0.04 MB`, `450.5 MB`, `3.2 GB`, `1,204.6 GB`); dates as `MM/DD/YYYY hh:mm AM/PM`.
- Hide the Base44 editor badge via global CSS (`#base44-badge`, `.base44-badge`, `iframe[src*="base44"]` → `display:none; visibility:hidden; opacity:0; pointer-events:none`).
- Use the `@/` import alias everywhere (never relative `src/` paths). ESM only — never `require()`/`module.exports`.
- Every page/component is its own focused file (≤50 lines preferred), default-exported, named same as its file.
- Icons: `lucide-react` only, only icons that exist. shadcn/ui from `@/components/ui`. Tailwind classes as literal strings only (no dynamic `bg-${color}`).
- Let errors bubble up — no try/catch unless it's a user-facing form/auth flow (inline errors are the feature).
- `cn` from `@/lib/utils`; `createPageUrl` from `@/utils`. Never reimplement these.

---

## 1. ARCHITECTURE & TECH STACK

### Stack
- React 18 + Vite (ESM). Tailwind CSS + shadcn/ui (Radix primitives). `lucide-react` icons.
- State/data: `@tanstack/react-query` (QueryClientProvider with `queryClientInstance` from `@/lib/query-client`). Pre-initialized Base44 SDK client at `@/api/base44Client` (`export const base44`).
- Routing: `react-router-dom` v6 (`BrowserRouter` as `Router`, `Routes`, `Route`, `Navigate`, `useParams`, `Link`, `Outlet`).
- Charts: `recharts`. Rich text: `react-quill` (new). Markdown: `react-markdown`. Maps: `react-leaflet` + `leaflet`. Drag-drop: `@hello-pangea/dnd`. Dates: `date-fns` + `moment`. 3D: `three`. Animations: `framer-motion`. Confetti: `canvas-confetti`. PDF: `jspdf` + `html2canvas`.
- Installed packages you may use: React, tailwind, shadcn/ui, lucide-react, moment, recharts, react-quill-new, react-hook-form, react-router-dom, date-fns, lodash, react-markdown, framer-motion, three, react-leaflet, @hello-pangea/dnd, @tanstack/react-query, @stripe/react-stripe-js, @stripe/stripe-js, leaflet, canvas-confetti, html2canvas, jspdf, sonner, vaul, cmdk, embla-carousel-react, react-resizable-panels, next-themes, zod, @hookform/resolvers. Do NOT install anything else.

### Entry & Providers (`src/main.jsx`, `src/App.jsx`)
- `main.jsx`: `ReactDOM.createRoot(document.getElementById('root')).render(<App />)`, imports `@/index.css`.
- `App.jsx` wraps everything in: `AuthProvider` → `QueryClientProvider` (client=`queryClientInstance`) → `DebugProvider` → `<div className="relative z-10"><Router><ScrollToTop/><AuthenticatedApp/><DiagnosticDebugDrawer/></Router></div>` + `<Toaster />`.
- `AuthenticatedApp` reads `useAuth()`; while `isLoadingPublicSettings || isLoadingAuth` show a full-screen `bg-zinc-950` spinner (border-t-lime-500). If `authError.type === 'user_not_registered'` render `<UserNotRegisteredError/>`; if `auth_required` call `navigateToLogin()`. Otherwise render `<Routes>`.

### Auth (`src/lib/AuthContext.jsx`)
- `AuthProvider` state: `user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError, authChecked, appPublicSettings`.
- `checkAppState()`: build an axios client (`createAxiosClient` from `@base44/sdk/dist/utils/axios-client`) with `baseURL: /api/apps/public`, header `X-App-Id: appParams.appId`, token `appParams.token`. GET `/prod/public-settings/by-id/${appParams.appId}` → set `appPublicSettings`. If token present → `checkUserAuth()`; else set unauthenticated. On 403 with `extra_data.reason` → set `authError` (`auth_required` / `user_not_registered` / other).
- `checkUserAuth()`: `await base44.auth.me()` → set user+isAuthenticated; on 401/403 set `authError.auth_required`.
- `logout(shouldRedirect=true)`: `base44.auth.logout(window.location.href)` if redirect else `base44.auth.logout()`.
- `navigateToLogin()`: `base44.auth.redirectToLogin(window.location.href)`.
- `useAuth()` throws if used outside provider.
- App params (`src/lib/app-params.js`): reads `app_id, access_token, from_url, functions_version, app_base_url` from URL search params (snake-cased `base44_*` localStorage keys), `clear_access_token` purges tokens. Exported as `appParams`.
- `safeReturnTo()` (`src/lib/authReturnTo.js`): resolves `?returnTo=` to a same-origin path, strips app-bootstrap params (`access_token, clear_access_token, app_id, app_base_url, functions_version, from_url`), rejects `//` and backslash prefixes (open-redirect guard).

### Route Guards
- `ProtectedRoute` (`@/components/ProtectedRoute.jsx`): props `fallback`, `unauthenticatedElement`. Shows fallback while loading; `UserNotRegisteredError` on that error; else `unauthenticatedElement` if not authed; else `<Outlet/>`.
- `CustomerRoute` (`@/components/CustomerRoute.jsx`): full-screen lime spinner fallback; on auth error → `UserNotRegisteredError` or `<Navigate to="/login" replace/>`; if not authed → `/login`; admin/staff can also access customer pages (preview); renders `<Outlet/>`.
- `AdminRoute` (`@/components/AdminRoute.jsx`): same pattern but redirects to `/admin-login`; if `user.role` is not admin/staff → `<Navigate to="/customer/dashboard" replace/>`.

### Debug (`src/lib/DebugContext.jsx`)
- `DebugProvider` toggles `isDebugMode` via `Ctrl+Shift+D`, persisted to `localStorage` key `xc_debug_mode_enabled`. `useDebugContext()` returns `{isDebugMode, toggleDebugMode, setIsDebugMode}` (safe default if no provider). A `DiagnosticDebugDrawer` is mounted globally, context-gated (only visible in debug mode) — never hardcode telemetry overlays into modals.

### Routing map (`src/App.jsx`)
Auth routes: `/login` (Login), `/admin-login` (AdminLogin), `/forgot-password` (ForgotPassword), `/reset-password` (ResetPassword). Public: `/invite/:token` (InviteLanding), `/discord-callback` (DiscordCallback). Root `/` → `RoleRedirect` (admin/staff → `/admin/dashboard`; customer → `/customer/dashboard`; else `/login`).

Customer portal (wrapped: `CustomerRoute` → `MediaAuthProvider` → `CustomerLayout`):
`/customer/dashboard` (CustomerPortal), `/customer/store` (Store), `/customer/tickets` (CustomerTickets), `/customer/discover` (CustomerDiscover), `/customer/watchlist` (CustomerWatchlist), `/customer/diagnostics` (CustomerDiagnostics), `/customer/devices` (CustomerDevices), `/customer/releases` (CustomerReleases), `/customer/rewards` (CustomerRewards), `/customer/connect-servers` (CustomerIntegrations), `/customer/checkout/:token` (Checkout), `/customer/kb` (KnowledgeBase), `/customer/kb/book/:bookId`, `/customer/kb/page/:pageId`, `/customer/kb/shelf/:shelfId`.

Admin portal (wrapped: `AdminRoute` → `AdminLayout`):
Overview: `/admin/dashboard`, `/admin/sessions`, `/admin/analytics`, `/admin/stats`, `/admin/stats/activity`, `/admin/stats/users`, `/admin/stats/leaderboard`, `/admin/performance`, `/admin/performance/devices`, `/admin/performance/bandwidth`.
Media Servers: `/admin/servers`, `/admin/server-users`, `/admin/server-users/:userId`, `/admin/client-service`, `/admin/create-invite`, `/admin/trials`, `/admin/audit`, `/admin/storage`, `/admin/nodes`.
Customers & Support: `/admin/crm`, `/admin/crm/:customerId`, `/admin/support`, `/admin/discord-settings`.
Billing Engine (new): `/billing/calendar` (BillingCalendar), `/billing/subscriptions` (BillingSubscriptions), `/billing/categories` (CategoryManager), `/billing/gateways` (PaymentGateways), `/billing/reports` (RevenueAnalytics).
Billing (legacy): `/admin/billing` (BillingDashboard), `/admin/billing/migration` (MigrationPipeline), `/admin/billing/communications` (CommunicationCenter), `/admin/billing-calendar` (BillingCalendar), `/admin/financial-analytics` (FinancialAnalytics), `/admin/billing/templates` (EmailTemplates).
Content & Store: `/admin/content` (ContentManager), `/admin/unified-library` (UnifiedLibrary), `/admin/releases` (AdminReleases), `/admin/store-plans` (StorePlans), `/admin/rewards` (AdminRewards).
Knowledge & Projects: `/admin/kb`, `/admin/kb/assets`, `/admin/kb/shelf/:shelfId`, `/admin/kb/migration` (BookStackMigration), `/admin/kb/book/:bookId`, `/admin/kb/page/:pageId`, `/admin/kb/editor/:pageId`, `/admin/projects`, `/admin/projects/:projectId` (ProjectBoard), `/admin/projects/:projectId/timeline`.
System: `/admin/api-docs`, `/admin/users` (UserManagement), `/admin/departments`, `/admin/checkout/:token`.
Also `/admin/create-invite`, `/admin/trials`, `/admin/audit`, `/admin/storage`.

Legacy redirects: keep old paths working with `<Navigate>`/`ParamRedirect` (e.g. `/portal`→`/customer/dashboard`, `/store`→`/customer/store`, `/servers`→`/admin/servers`, `/billing`→`/admin/billing`, `/kb/...`→`RoleParamRedirect` to admin or customer KB by role). `*` → `PageNotFound`.

`<Routes>` may contain ONLY `<Route>` children. Layout wrappers use `<Route element={<Layout/>}>` with nested `<Route>` and the layout renders `<Outlet/>`.

---

## 2. UI/UX & DESIGN SYSTEM

### Theme tokens (`src/index.css`)
Define `:root` (light, unused in practice) and `.dark` (active). Use HSL channel triples for `hsl(var(--token))`.

`.dark` values (the real theme):
- `--background: 240 6% 4%` · `--foreground: 0 0% 98%`
- `--card: 240 5% 6%` · `--card-foreground: 0 0% 98%`
- `--popover: 240 5% 8%` · `--popover-foreground: 0 0% 98%`
- `--primary: 84 81% 44%` (lime) · `--primary-foreground: 0 0% 8%`
- `--secondary: 240 4% 12%` · `--secondary-foreground: 0 0% 98%`
- `--muted: 240 4% 12%` · `--muted-foreground: 0 0% 96%`
- `--accent: 240 4% 12%` · `--accent-foreground: 0 0% 98%`
- `--destructive: 0 62.8% 55%` · `--destructive-foreground: 0 0% 98%`
- `--border: 240 4% 14%` · `--input: 240 4% 14%` · `--ring: 84 81% 44%`
- charts: `--chart-1: 220 70% 50%`, `--chart-2: 160 60% 45%`, `--chart-3: 30 80% 55%`, `--chart-4: 280 65% 60%`, `--chart-5: 340 75% 55%`
- sidebar: `--sidebar-background: 240 5.9% 10%`, `--sidebar-foreground: 0 0% 96%`, `--sidebar-primary: 84 81% 44%`, `--sidebar-accent: 240 3.7% 15.9%`, `--sidebar-border: 240 3.7% 15.9%`, `--sidebar-ring: 84 81% 44%`
- fonts: `--font-heading/--font-body/--font-display: ui-sans-serif, system-ui, sans-serif`; `--font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, ...`.
- `--radius: 0.5rem`.

Base layer: `* { @apply border-border outline-ring/50; }` and `body { @apply bg-background text-foreground font-body; }`.

### High-contrast white typography override (CRITICAL)
In `.dark`, force grey zinc text to pure white:
```
.dark .text-zinc-300, .dark .text-zinc-400, .dark .text-zinc-500, .dark .text-zinc-600, .dark .text-zinc-700 { color: #ffffff; }
.dark .placeholder\:text-zinc-400::placeholder, .dark .placeholder\:text-zinc-500::placeholder, .dark .placeholder\:text-zinc-600::placeholder { color: rgba(255,255,255,0.55); }
```

### Tailwind config (`tailwind.config.js`)
`darkMode: ["class"]`, content `["./index.html","./src/**/*.{ts,tsx,js,jsx}"]`. Extend colors mapping to `hsl(var(--*))` for background/foreground/card/popover/primary/secondary/muted/accent/destructive/border/input/ring/chart-1..5/sidebar.*. fontFamily heading/body/display/mono → `['var(--font-*)']`. borderRadius lg/md/sm from `--radius`. Add `accordion-down/up` keyframes+animation. Plugin: `tailwindcss-animate`.

### Background animations (CSS keyframes in index.css, classes applied in components)
Define and use these keyframes/classes verbatim:
- `grid-pulse` (opacity 0.05↔0.13 over 6s) → `.animate-grid-pulse`
- `scan-y` (translateY -10vh→110vh, opacity in/out) → `.animate-scan-y` (8s linear)
- `scan-x` (translateX -10vw→110vw) → `.animate-scan-x` (11s linear)
- `corner-flicker` (opacity 0.3↔0.6 with a dip at 50%) → `.animate-corner-flicker` (5s)
- `glow-pulse` → `.animate-glow-pulse` (12s)
- `glow-drift-a` (16s), `glow-drift-b` (20s), `glow-drift-c` (14s) — drifting translate/scale/opacity for green orbs → `.animate-glow-drift-a/b/c`
- `logo-glow` (box-shadow lime pulse) → `.logo-pulse` (2s)
- `map-dot-pulse` → `.map-stream-dot` (16px lime ring) + `.map-stream-dot-core` (8px lime core). `.stream-marker-icon { background:transparent; border:none; }`

### TechGlowBackground (`src/components/TechGlowBackground.jsx`) — login background
`pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black` containing:
1. Pulsing grid: `animate-grid-pulse`, `backgroundImage: linear-gradient(rgba(163,230,53,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(163,230,53,0.5) 1px,transparent 1px)`, `backgroundSize: 44px 44px`, radial mask `ellipse at center, black 35%, transparent 75%`.
2. Horizontal scan beam: `h-px bg-gradient-to-r from-transparent via-lime-400/60 to-transparent animate-scan-y`.
3. Vertical scan beam: `w-px bg-gradient-to-b from-transparent via-emerald-400/50 to-transparent animate-scan-x`.
4. Corner accents: `top-10 left-10 w-24 h-24 border-l-2 border-t-2 border-lime-500/30 animate-corner-flicker`; `bottom-10 right-10 ... border-r-2 border-b-2 border-emerald-500/30` with `animationDelay: 2s`.
5. Three drifting glow orbs: `w-[32rem] h-[32rem] rounded-full bg-lime-500/30 blur-[90px] animate-glow-drift-a`; `w-[26rem] bg-emerald-500/25 blur-[80px] animate-glow-drift-b`; `w-[20rem] bg-lime-400/20 blur-[70px] animate-glow-drift-c`.

### DashboardBackground (`src/components/DashboardBackground.jsx`) — admin background
`pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black` (aria-hidden). Same pulsing grid (rgba 0.6, mask 40%→85%), plus a **dot-matrix layer**: `backgroundImage: radial-gradient(rgba(163,230,53,0.45) 1px, transparent 1px)`, `backgroundSize: 14px 14px`, `opacity-50`, diagonal mask `linear-gradient(135deg, black 0%, transparent 35%, transparent 65%, black 100%)`. Scan beams, corner accents (top-right + bottom-right), and three drifting glows positioned `top-[30%] left-[65%] w-[34rem]`, `top-[75%] left-[35%] w-[28rem]`, `top-1/2 left-1/2 w-[20rem]`. **Muted intensity — content legibility over animation.**

### SidebarShell (`src/components/layout/SidebarShell.jsx`)
Props: `navGroups, subtitle, logoutPath`. Collapsible (w-64 ↔ md:w-16) sidebar + mobile drawer.
- Mobile top bar (md:hidden, h-14, bg-zinc-950/90 backdrop-blur) with menu button + logo + "Xzavain Cloud".
- Sidebar: `bg-zinc-950 md:bg-zinc-900/50 backdrop-blur-sm border-r border-zinc-800/60`. Logo block h-16 with `logo-pulse` lime dot. Nav scrollable, groups collapsible (chevron rotate). Active link: `bg-lime-500/10 text-lime-400 border border-lime-500/20`; inactive: `text-zinc-200 hover:text-white hover:bg-zinc-800/50 border-transparent`. Collapsed mode shows tooltips (TooltipProvider). Footer: Sign Out button → `base44.auth.logout(logoutPath)`. Collapse toggle button at `-right-3 top-20`.

### AdminLayout nav groups (exact)
Overview (Dashboard, Live Sessions, Analytics, Stats Center, Performance) · Media Servers (Servers, Server Users, Client Service, Create Invite, Active Trials, Audit, Storage, Node Diagnostics) · Customers & Support (CRM Hub, Support Desk, Discord Bot) · Billing Engine (Billing Calendar, Subscriptions, Categories & Plans, Payment Gateways, Revenue Analytics) · Billing (Billing Engine, Migration Pipeline, Communications, Billing Calendar, Financial Analytics) · Content & Store (Content Manager, Unified Library, Release Management, Store Plans, Rewards & Loyalty) · Knowledge & Projects (Knowledge Base, BookStack Migration, Projects) · System (API Docs, Staff Users, Departments) · Customer View (Customer Dashboard external link). Renders `<DashboardBackground/>` + `<SidebarShell navGroups={adminNavGroups} subtitle="Admin Hub" logoutPath="/admin-login"/>`.

### CustomerLayout nav (single group, no title)
Dashboard, Discover, Releases, Rewards, Watchlist, Store, My Tickets, Knowledge Base, Diagnostics, Stream Manager, Connect Media Servers. `<SidebarShell navGroups={navGroups} subtitle="Customer Portal" logoutPath="/login"/>` (no DashboardBackground — customer portal uses plain dark bg).

### Login page (`src/pages/Login.jsx`)
Full-screen `bg-black` with `<TechGlowBackground/>`. Centered max-w-md card: logo (64×auto, lime drop-shadow) + `XC Media Pass` h1 (text-3xl white). Card: `bg-black/40 backdrop-blur-xl rounded-2xl shadow-2xl shadow-lime-500/10 border border-lime-500/20 p-8`. Inputs: `h-12 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-lime-400/40` with left Mail/Lock icons. Submit: `bg-lime-500 hover:bg-lime-400 text-black shadow-lg shadow-lime-500/20`. On submit: `base44.auth.loginViaEmailPassword` → `base44.auth.me()` → `User.update(me.id,{role:"admin"})` → `window.location.href="/admin/dashboard"`. Forgot password link (lime). Footer `Xzavain Cloud · XC Media Pass`. **No Google button.**

### AdminLogin (`src/pages/AdminLogin.jsx`)
Uses `AuthLayout` (icon Shield, title "Admin & Staff Sign In", subtitle "Authorized personnel only", footer link to customer `/login`). Same login flow (sets role admin, redirects to `/admin/dashboard`).

### Component styling conventions
- Cards/panels: `bg-zinc-900/50 border border-zinc-800/60 rounded-xl`.
- Modals/dialogs: `bg-zinc-900 border-zinc-800 text-zinc-100`.
- Inputs: `bg-zinc-950/50 border-zinc-700 text-zinc-100`.
- Badges: colored `bg-{color}-500/10 text-{color}-400 border-{color}-500/20`.
- Status colors: active=emerald, past_due/amber, canceled/rose, trialing/sky, paused/slate.
- Buttons: lime-600 hover:lime-700 text-white for primary actions; outline zinc-700 for secondary.
- Loading: `Loader2 animate-spin text-lime-400`.
- Empty states: centered zinc-500 text with icon.

### Knowledge Base content styling (`.kb-content` + `.ql-editor`)
Style images (max-width, rounded), links (lime underline), `pre` (zinc-900 bg), blockquotes (lime left border). Callout boxes: `.callout.info/success/warning/danger` with colored left border + tinted bg. Collapsible `<details>/<summary>` with rotating `▶` marker (lime). Mirror identical styles into `.ql-editor` for WYSIWYG preview. Quill toolbar: `bg-zinc-800/80`, strokes zinc-400.

---

## 3. DATABASE & PERSISTENCE (Base44 Entities)

Create every entity below as a JSON schema in `base44/entities/<Name>.jsonc`. Every record has built-in `id, created_date, updated_date, created_by_id` (never declare these). Apply the RLS rules exactly as specified per entity. Use `null` for "public read" (any authenticated user), `user_condition.role` gates for role-based access, and `data.<field> = "{{user.id}}"` / `"{{user.email}}"` for ownership rules.

### Core server management
- **MediaServer**: name, platform (plex/jellyfin/emby), url, api_key, status (connected/disconnected/error, default disconnected), libraries [{id,name,type}], last_synced, users_last_synced. Required: name, platform, url, api_key. RLS: admin-only all ops.
- **ServerUser**: server_id, server_name, platform, platform_user_id, username, email, friendly_name, libraries [{id,name}], is_suspended (bool), suspended_libraries_backup [{id,name}], trust_score (0-100, default 100), notes. Required: server_id, platform, platform_user_id, username. RLS: create/update/delete admin-only; read = own email OR admin.
- **Invitation**: token, server_id, server_name, platform, allowed_libraries [{id,name}], duration_type (1_day/2_days/1_week/custom), duration_hours, expires_at, status (pending/active/expired/revoked), username, email, platform_user_id, activated_at, notes, max_uses (default 1), use_count (default 0). Required: token, server_id, platform, duration_type, duration_hours. RLS: create admin; read/update = own email OR admin; delete admin.
- **Server** (fleet node, public-facing): name, service_type (plex/emby/jellyfin/downloader_sabnzbd/downloader_qbittorrent/backend_api), region, ping_target_url, status (operational/degraded/maintenance/offline), uptime_percentage, maintenance_window. Required: name, service_type, status. RLS: create admin; read public; update admin/staff; delete admin.
- **ServerAlert**: server_id, is_all_servers (bool), severity (info/warning/critical/maintenance), title, message, is_active (bool), start_time, end_time. Required: severity, title, message. RLS: create/update admin/staff; read public; delete admin.
- **AdminManagedNodes**: node_name, service_type (plex/emby/jellyfin), public_ping_endpoint, public_speedtest_endpoint, internal_api_endpoint, admin_api_token, assigned_region, is_public_for_diagnostics (bool, default true), node_health_status (operational/degraded/maintenance/offline), max_concurrent_limit (default 4). Required: node_name, service_type, node_health_status. RLS: create admin; read public; update admin/staff; delete admin.
- **ActivityLog**: action (enum: invite_created, invite_activated, trial_extended, trial_expired, user_removed, user_suspended, server_connected, server_disconnected, invite_revoked, ticket_created, ticket_status_changed, ticket_assigned, ticket_note_added), invitation_id, server_id, ticket_id, details, username, platform. Required: action, details. RLS: admin-only all ops.

### Billing — NEW engine (Billing Engine group)
- **PaymentGatewayAccount**: provider (stripe/paypal), account_name, is_active (bool), api_keys {publishable_key, secret_key, webhook_secret, client_id, client_secret, mode (live/sandbox), webhook_id}, last_synced_at, sync_status (idle/in_progress/success/failed, default idle), error_message. Required: provider, account_name. RLS: admin create/update/delete; admin+staff read.
- **SubscriptionCategory**: name, slug, color_hex (default #3B82F6), description, match_tokens [string] (substring/regex auto-classify tokens), display_order (number). Required: name. RLS: admin create/update/delete; admin+staff read.
- **SubscriptionPlan**: category_id, plan_name, normalized_identifier (matching token), default_amount, billing_interval (monthly/quarterly/semi_annual/yearly). Required: plan_name. RLS: admin create/update/delete; admin+staff read.
- **SubscriptionCustomer**: gateway_account_id, external_customer_id, name, email, phone, metadata (object). Required: name. RLS: admin create/update/delete; admin+staff read.
- **Subscription**: gateway_account_id, customer_id, category_id, plan_id, external_subscription_id, raw_product_name, amount (number), currency (default USD), billing_interval (default month), status (active/past_due/canceled/trialing/paused), current_period_start, next_billing_date (indexed for calendar), cancel_at_period_end (bool), last_synced_at. Required: raw_product_name, status. RLS: admin create/update/delete; admin+staff read.
- **SyncLog**: gateway_account_id, status (started/completed/failed), records_pulled, records_updated, error_details, trigger (manual/automated/import). Required: status. RLS: admin create/update/delete; admin+staff read.

### Billing — legacy/operational
- **BillingCustomer**: user_name, email, status (ACTIVE/INACTIVE/CANCELED/PENDING_MIGRATION), bill_date, payment_method (PayPal/Stripe/Manual), billed_price, plan_id (→StorePlan), billing_cycle (monthly/quarterly/yearly/weekly), addon_product_ids [], source (direct/stripe/paypal), source_customer_id, original_signup_date, migration_status (not_applicable/pending/imported/activated/failed), welcome_email_sent (bool), contact_phone, address_*, custom_fields (object), admin_notes. Required: user_name, email, status, bill_date, payment_method, billed_price, plan_id. RLS: create admin/staff; read/update = own email OR admin/staff; delete admin.
- **StorePlan**: name, description, category, platform (plex/jellyfin/emby/other), price, billing_interval (monthly/yearly), features [], visibility (public/hidden), checkout_token, stripe_price_id, is_active, server (XC Echo/XC Foxtrot/Live TV), live_tv_credits, library_map [{server_id, library_ids[]}], max_concurrent_streams (0=unlimited), block_4k_transcode (bool). Required: name, category, price, checkout_token. RLS: admin create/update/delete; read public.
- **AddonProduct**: name, description, price, billing_cycle (one_time/monthly/yearly), category, platform, features [], max_concurrent_streams, live_tv_credits, visibility, is_active, stripe_price_id, display_order. Required: name, price, billing_cycle. RLS: admin create/update/delete; read public.
- **BillingExpense**: name, expense_type (processor_fee/server_cost/shared_overhead/live_tv_credit_cost), scope (XC Echo/XC Foxtrot/Live TV/All XC/All), monthly_cost, fee_percent, fee_fixed, payment_method. Required: name, expense_type, scope. RLS: admin-only all ops. **All financial math derives from this table.**
- **PaymentHistory**: billing_customer_id, customer_email, customer_name, processor (stripe/paypal/manual), amount, currency, status (success/failed/refunded/pending/disputed), transaction_id, invoice_number, payment_date, failure_reason, plan_name, billing_cycle, raw_metadata (object), imported_from_migration (bool). Required: customer_email, processor, amount, status, payment_date. RLS: create admin/staff; read = own email OR admin/staff; update/delete admin.
- **SubscriptionMigration**: source (stripe/paypal), source_customer_id, source_subscription_id, customer_email, customer_name, original_plan_name, original_price, original_currency, billing_cycle, signup_date, next_billing_date, status (pending/imported/activated/failed/skipped), imported_customer_id (→BillingCustomer), mapped_plan_id (→StorePlan), raw_metadata, error_message, migrated_at, migrated_by_name/email, batch_id. Required: source, source_customer_id, customer_email, status. RLS: admin/staff create/read/update; delete admin.
- **EmailTemplate**: name, subject, body, category (welcome/billing/migration/broadcast/discord/custom), channel (email/discord), supported_shortcodes [], is_active, created_by_name/email. Required: name, subject, body, channel. RLS: admin/staff create/read/update; delete admin.
- **CommunicationCampaign**: name, template_id, channel, target_audience (all/active/inactive/migrated/not_welcomed/custom), target_emails [], status (draft/scheduled/sending/sent/failed/partial), scheduled_at, sent_count, failed_count, total_recipients, discord_channel_id, dispatched_at, result_log [{email,status,error}], created_by_name/email. Required: name, template_id, channel, target_audience, status. RLS: admin/staff create/read/update; delete admin.

### Support / Tickets
- **Ticket**: subject, description, department (support/billing/pre_sales/technical/feature_request), department_id (→TicketDepartment), ticket_number (e.g. TICK-84920), service, server_id, server_name, status (open/pending/in_progress/waiting_on_customer/resolved/closed), priority (low/medium/normal/high/urgent), customer_id, customer_name, customer_email, assigned_to_email/name, assigned_agent_id, source (web/discord), discord_channel_id, attachments [{name,url,type}], sla_due_at, csat_score (1-5), diagnostic_snapshot (object). Required: subject, description, department, status. RLS: create public; read/update = own customer_id OR admin/staff; delete admin.
- **TicketNote**: ticket_id, customer_id, author_name, author_email, sender_type (customer/staff/system_bot), sender_avatar, note, is_internal (bool), attachments [], source (web/discord). Required: ticket_id, note. RLS: create public; read = own author_email OR own customer_id OR admin/staff; update admin/staff; delete admin.
- **TicketDepartment**: name, slug, requires_server (bool), is_public_pre_sales (bool), description, display_order. Required: name. RLS: admin create/update/delete; read public.
- **TicketMacro**: title, department_id, shortcut_key, content (markdown with {{template}} tags). Required: title, content. RLS: admin/staff create/read/update; delete admin.
- **CannedReply**: (legacy canned replies) similar to macros. RLS: admin/staff.
- **Department**: name, key (support/billing), description, active (bool). Required: name, key. RLS: admin create/update/delete; read public.

### Customer identity, devices, watchlist, rewards
- **UserUniversalMediaIdentity**: user_id, plex_connected/plex_username/plex_email/plex_user_uuid/plex_auth_token, emby_connected/emby_username/emby_user_guid/emby_access_token, jellyfin_connected/jellyfin_username/jellyfin_user_id/jellyfin_access_token, last_sync_timestamp. Required: user_id. RLS: create public; read/update = own user_id OR admin/staff; delete = own OR admin.
- **LinkedMediaAccount**: user_id, service_type (plex/emby/jellyfin), server_id, server_url, external_user_id, auth_token, plex_username, plex_email, stream_limit (default 2), last_sync_timestamp. Required: user_id, service_type, server_url, auth_token. RLS: create public; read/update = own OR admin/staff; delete = own OR admin.
- **UserWatchlist**: user_id, media_release_id (→MediaRelease), notify_theatrical (bool), notify_digital_vod (bool default true), notify_server_import (bool default true), sync_plex/emby/jellyfin (bool default true). Required: user_id, media_release_id. RLS: create public; read/update = own OR admin/staff; delete = own OR admin.
- **DeviceSession**, **SessionKillLog**, **ActiveSession**: customer device/session tracking + kill audit. RLS: own user OR admin/staff.
- **UserBillingCredit**: user_id, current_wallet_balance (default 0), last_invoice_deduction (default 0). Required: user_id. RLS: create public; read/update = own OR admin/staff; delete admin.
- **ReferralProgram**: user_id, referral_code (e.g. STREAM-ALEX-99), referral_link, total_referred_users, total_credit_earned, pending_credit_balance, lifetime_credit_applied. Required: user_id, referral_code. RLS: create public; read/update = own OR admin/staff; delete admin.
- **ReferralTransaction**: referrer_user_id, referred_user_id, referred_email, referred_plan_name, referred_plan_value, credit_amount, credit_type (one_time_credit_adjustment), status (pending_hold_period/credited_to_balance/invoiced_applied/revoked_chargeback), payout_eligibility_date, invoice_number. Required: referrer_user_id, referred_user_id, credit_amount, status. RLS: create admin/staff; read = own referrer OR admin/staff; update admin/staff; delete admin.
- **UserCommunityProfile**: user_id, discord_user_id/username/avatar_url, current_tier_id (→LoyaltyTier), is_discord_synced (bool), unlocked_badge_ids []. Required: user_id. RLS: create public; read/update = own OR admin/staff; delete = own OR admin.
- **LoyaltyTier**: tier_name, tier_rank, min_active_months, min_successful_referrals, perk_summary, badge_icon_asset, discord_role_id/name, gradient_colors, discord_bot_token (stored on rank 0), discord_guild_id (stored on rank 0). Required: tier_name. RLS: admin create/update/delete; read public.
- **DiscordBotConfig**: bot_name, avatar_url, status_activity, status_type (playing/listening/watching/competing), webhook_url, log_webhook_url, panel_channel_id, support_role_id, agent_role_ids [], auto_create_channels (bool), panel_embed_title/description/color (default #a3e635), panel_button_label/emoji, notify_on_create/reply/status_change/assign (bools), is_active (bool), discord_client_id, discord_redirect_uri. Required: bot_name. RLS: admin create/update/delete; read public.
- **NotificationPreference**, **AdminNotificationChannel**: user/server notification settings. RLS: own OR admin/staff.

### Content, releases, discovery
- **MediaRelease**: tmdb_id, media_type (movie/tv_show), season_number, title, tagline, overview, poster_path, backdrop_path, genres [], runtime_minutes, certification, theatrical_release_date, digital_vod_release_date, physical_disc_release_date, estimated_server_arrival_date, server_import_status (unannounced/monitored/downloading/imported_live), target_servers [], trailer_youtube_key, studio. Required: tmdb_id, media_type, title. RLS: create/update admin/staff; read public; delete admin.
- **ContentItem**: title, description, content_type (movie/show/episode/other), category, tags [], thumbnail_url, file_url, status (draft/published), is_free (bool), allowed_plan_ids [], uploaded_by_name/email. Required: title, content_type, status. RLS: admin create/update/delete; read public.

### Performance & analytics
- **PerformanceSnapshot**: server_id, server_name, platform, captured_at, concurrent_streams, peak_bitrate, total_bandwidth_kb, local_bandwidth_kb, remote_bandwidth_kb, transcode_count, direct_play_count, active_users, codec_breakdown (object), resolution_breakdown (object), device_distribution (object), cpu_percent, ram_percent, network_io_kbps. Required: server_id, platform, captured_at. RLS: admin-only all ops.
- **DeviceTelemetry**: server_id, server_name, platform, username, device, player, client_app, client_version, ip_address, geo (object), transcode_decision, resolution, codec, bitrate, compatibility_score, streaming_profile, last_seen, is_active (bool). Required: server_id, platform, device, last_seen. RLS: admin-only all ops.
- **BandwidthBreakdown**: server_id, server_name, platform, dimension (user/media), label, total_bandwidth_kb, stream_count, peak_bitrate, last_updated. Required: server_id, dimension, label, last_updated. RLS: admin-only all ops.
- **PlaybackSession**: server_id, server_name, platform, session_key, play_session_id, username, title, device, player, ip_address, state (playing/paused/buffering), transcode_decision, progress_percent, started_at, ended_at, bitrate, video_codec, audio_codec, resolution, container, audio_channels, subtitle, play_method, transcode_reason, client_app, client_version, elapsed_seconds, duration_seconds, source_resolution, source_video_codec, source_bitrate. Required: server_id, platform, session_key, username. RLS: admin-only all ops.
- **ResourceMetric**: server_id, server_name, platform, cpu_percent, ram_percent, session_count. Required: server_id, platform, cpu_percent, ram_percent. RLS: admin-only all ops.
- **LibrarySnapshot**: server_id, server_name, platform, library_id, library_name, item_count, storage_bytes. Required: server_id, platform, library_id, item_count, storage_bytes. RLS: admin-only all ops.
- **UserViolation**, **UserTermination**: server-user compliance records. RLS: admin/staff.

### Knowledge base (BookStack-pattern)
- **KbShelf**: shelf (top-level). **KbBook**: book_id (→shelf), name, slug, description, cover_url, tags [], order. **KbChapter**: book_id, name, slug, description, order. **KbPage**: book_id, chapter_id (optional), title, slug, content (HTML), content_url, markdown_content, status (draft/published), is_template (bool), priority, tags [], order, author_name/email, version, view_count. Required: book_id, title, status. RLS: create/update admin/staff; read public; delete admin.
- **KbPageRevision**: page_id, content, edited_by_name/email, edited_at. **KbAsset**: name, file_url, uploaded_by_name/email. **KbMigrationLog**: BookStack import tracking.

### Projects
- **Project**: name, description, status (active/archived), visibility (public/private), member_emails [], created_by_name/email. Required: name. RLS: create admin; read = admin OR (staff AND (public OR member_emails includes email)); update/delete admin.
- **ProjectBoard**: project_id, name, type (status/assignee/milestone/priority), order. **ProjectColumn**: project_id, name, order. Required: project_id, name. RLS: admin/staff create/read/update; delete admin.
- **ProjectTask**: project_id, column_id, title, description (HTML), work_package_type (feature/bug/task/milestone/phase), priority (low/medium/high/critical), order, start_date, due_date, dates_required (bool), assignee_emails [], assignee_names [], story_points, estimated_hours, spent_hours, parent_task_id, milestone, checklist [{text,done}], linked_ticket_ids [], depends_on [], tags [], created_by_name/email. Required: project_id, column_id, title. RLS: admin/staff create/read/update; delete admin.
- **TaskActivity**: task_id, action, actor_name/email, details, created_at. **TaskAttachment**: task_id, name, url, type. **TaskTimeEntry**: task_id, user_id, hours, description, logged_at. RLS: admin/staff.

### User
Built-in **User** entity (never create). Read-only: id, created_date, full_name, email. Editable: role (admin/staff/user; the app also uses "customer" conceptually). Cannot insert User records — invite via `base44.users.inviteUser(email, role)`.

---

## 4. API INTEGRATIONS & WEBHOOKS

All third-party API calls run **client-side** (no backend functions on the current plan). Document each integration's endpoints, auth, data pulled, and sync frequency exactly.

### A. Media Server APIs (`src/lib/mediaServerApi.js`)
Unified adapter pattern: `getApiForPlatform(platform)` → `PlexAPI | JellyfinAPI | EmbyAPI`.

**JellyfinAPI & EmbyAPI** (identical; header `X-Emby-Token: apiKey`):
- `testConnection`: GET `/System/Info`.
- `getLibraries`: GET `/Library/VirtualFolders` → map `{id: ItemId, guid: Guid, name: Name, type: CollectionType}`.
- `createUser`: POST `/Users/New` {Name, Password}.
- `setUserPolicy(baseUrl, apiKey, userId, libraryIds)`: GET `/Users/{userId}` → merge existing Policy, set `EnableAllFolders:false, EnabledFolders:libraryIds`, POST `/Users/{userId}/Policy`. **Non-destructive — preserves all other permissions.** 404 → "user no longer exists" error.
- `deleteUser`: DELETE `/Users/{userId}`.
- `setDisabled(baseUrl, apiKey, userId, disabled, libraryIds)`: POST `/Users/{userId}/Policy` with `{IsAdministrator:false, IsHidden:true, IsDisabled:disabled, EnableAllFolders:false, EnabledFolders:libraryIds, EnableRemoteAccess:!disabled, EnableMediaPlayback:!disabled}`.
- `resetPassword`: POST `/Users/{userId}/Password` {ResetPassword:false, NewPw}.
- `getUsers`: GET `/Users`.
- `getUsersWithLibraries(baseUrl, apiKey, serverLibraries)`: maps each user's `Policy.EnabledFolders` (or all if `EnableAllFolders`) against the fresh server library list → `{platform_user_id, username, email:"", libraries}`.
- `getSessions`: GET `/Sessions`.
- `sendMessage`: POST `/Sessions/{sessionId}/Message` {Header:"Message from Admin", Text, TimeoutMs:10000}.
- `stopSession`: POST `/Sessions/{sessionId}/Playing/Stop`.
- `getLibraryStats`: GET `/Items?ParentId={lib}&Recursive=true&Fields=MediaSources&IncludeItemTypes=Movie,Episode,Audio&Limit=5000` → sum `MediaSources[0].Size`.

**PlexAPI** (header `X-Plex-Token`; plex.tv v2 needs `X-Plex-Product:"MediaPass"`, `X-Plex-Version:"1.0"`, `X-Plex-Client-Identifier:"mediapass-app"`):
- `testConnection`: GET `/`.
- `getLibraries`: GET `/library/sections` → `MediaContainer.Directory` → `{id:String(key), name:title, type}`.
- `inviteUser`: POST `https://plex.tv/api/v2/shared_servers` {machineIdentifier, invitedEmail, librarySectionIds:[Number], settings:{allowSync:false,...}}.
- `removeUser`: DELETE `https://plex.tv/api/v2/shared_servers/{sharedUserId}`.
- `getSharedUsers`: GET `https://plex.tv/api/users` → **XML** parsed via DOMParser → Users with Server[] {id, machineIdentifier, allLibraries, numLibraries}.
- `getMachineId`: GET `/` → `MediaContainer.machineIdentifier`.
- `getUsersWithLibraries(baseUrl, token, serverLibraries, machineId)`: enumerate legacy users → find server matching machineId → for each, GET `https://plex.tv/api/v2/shared_servers/{sharedServerId}` (concurrency 8) → `libraries[].key` → map to serverLibraries. `platform_user_id = sharedServerId` (used by update/remove).
- `suspendSharedUser`: `updateSharedLibraries(token, sharedServerId, [])`.
- `updateSharedLibraries`: PUT `https://plex.tv/api/v2/shared_servers/{id}` {librarySectionIds:[Number]}.
- `getSessions`: GET `/status/sessions` → `MediaContainer.Metadata`.
- `terminateSession`: GET `/status/sessions/terminate?sessionId={key}&reason={reason}`.
- `getLibraryStats`: GET `/library/sections/{id}/all` → sum part sizes.

**Helpers**: `generateInviteToken()` (crypto.getRandomValues 32 bytes hex), `calculateExpiry(durationType, customHours)` (1_day/2_days/1_week/custom), `durationToHours`.

### B. Session normalization (`src/lib/sessionsApi.js`)
- `getActiveSessions(server)`: Plex → `normalizePlex`; Emby/Jellyfin → `normalizeJellyfinEmby`. Normalized fields: server_id, server_name, platform, artwork_url, session_key, play_session_id, username, title, device, player, ip_address, state, transcode_decision, progress_percent, bitrate, video_codec, audio_codec, resolution, container, audio_channels, subtitle, play_method, transcode_reason, client_app, client_version, elapsed_seconds, duration_seconds, source_resolution, source_video_codec, source_bitrate. Emby/Jellyfin filter to `s.NowPlayingItem` only; ticks → seconds (/10000000); artwork built from `{base}/Items/{posterId}/Images/Primary?...&api_key=`. Plex artwork `{base}{thumb}?X-Plex-Token=`.
- `killSession(server, session, message)`: Plex → `terminateSession`; Emby/Jellyfin → `sendMessage` (best-effort) then `stopSession`, falling back to `play_session_id` if the primary id fails.

### C. Server-user sync (`src/lib/serverUsersApi.js`)
`syncServerUsers(server)`: fetch **fresh libraries** from server (write back to MediaServer), call `getUsersWithLibraries`, then upsert into ServerUser matching by `platform_user_id` → email → username (reconnects removed+re-added users). **Delete stale records** no longer on the server. Update `users_last_synced`.

### D. Client-service lifecycle (`src/lib/clientServiceApi.js`)
- `suspendServerUser`: Plex → `suspendSharedUser`; Emby/Jellyfin → `setDisabled(true,[])`. Update ServerUser `{is_suspended:true, suspended_libraries_backup: libraries, libraries:[]}` + ActivityLog `user_suspended`.
- `reactivateServerUser`: restore `suspended_libraries_backup` libraries. Plex → `updateSharedLibraries`; else `setDisabled(false, libs)`.
- `terminateServerUser`: Plex → `removeUser`; else `deleteUser`. ActivityLog `user_removed` + delete ServerUser.
- `changeServerUserPassword`: Emby/Jellyfin only (Plex throws "managed by Plex account").
- `dropServerUserSessions`: `getActiveSessions` → match username (lowercase) → `killSession` each with admin message.

### E. Server refresh & mixed-content handling (`src/lib/serverRefresh.js`)
`refreshServer(server)`: re-fetch latest MediaServer record, test connection. **Plex http:// on https app**: resolve secure `*.plex.direct` URL via `https://plex.tv/api/v2/resources?includeHttps=1` (match hostname dashed + port). `diagnoseNetworkFailure`: detect mixed-content block, or no-cors probe to distinguish "host unreachable" vs "CORS refused". Update status/libraries/last_synced.

### F. Audit / file-system browsing (`src/lib/auditApi.js`)
READ-ONLY. In-memory caches (10-min TTL): `plexSectionCache`, `embyPropsCache`.
- Emby: `embyGetLibraries` (`/Library/VirtualFolders`), `embyGetItems` (`/Items?ParentId&Fields=Path,MediaSources,OriginalTitle,DateCreated&Recursive&IncludeItemTypes=Movie,Episode,Audio`), `embyBrowseDirectory` (`/Environment/DirectoryContents?IncludeFiles&IncludeDirectories&path=`), `embyGetFileProperties` (`/Items?Path=&Fields=...&Recursive&Limit=1` → container/size/bitrate/video/audio streams), `embyGetDrives` (`/Environment/Drives`), `embyGetLibraryPaths` (Locations[]).
- Plex: `plexGetLibraries` (`/library/sections`), `plexGetItems` (`/library/sections/{id}/all` or `/search?query=`), `plexBrowseDirectory` (`/services/browse/{base64path}?includeFiles=1` — base64 of UTF-8 path; dirs in `MediaContainer.Path`, files in `MediaContainer.File`), `plexEnrichFileSizes` (background-fill sizes by matching library section), `plexGetLibraryPaths` (Location[].path + sectionId/sectionType), `plexFindItemByPath` (cached per-section item map).
- `detectIssues(path)`: non-ascii, invalid-chars, network-path, missing-path.

### G. Storage sizing (`src/lib/storageApi.js`, `folderInfoMap.js`)
- `plexGetLibrarySizes` / `embyGetLibrarySizes`: paginate all items (Plex page 2000 with `X-Plex-Container-Start/Size`; Emby page 20000 with StartIndex/Limit), sum part/MediaSource sizes. Bounded concurrency (2-3) via `mapWithLimit`. Dedupe by id (keep largest totalSize). Show libraries use `type=4` (episodes), artist `type=10`.
- `buildFolderInfoMap(server)`: pull every indexed file (path/size/date/artwork) once, roll each file's size+date up through all ancestor folders (recursive cumulative size, latest date). `pathKey` normalizes (unify separators, lowercase Windows paths). 10-min cache + in-flight dedupe. `mergeEntryInfo` enriches browse entries.

### H. TMDB discovery & releases (`src/lib/tmdbConfig.js`, `mediaDiscoveryApi.js`, `releaseApi.js`, `trailerApi.js`)
- `TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY` (env-managed, never hardcoded). `TMDB_API_BASE = "https://api.themoviedb.org/3"`. Image base `https://image.tmdb.org/t/p`. Helpers: `posterUrl(path, "w500")`, `backdropUrl(path, "w1280")`, `profileUrl`, `stillUrl`.
- Genre maps cached in localStorage (`tmdb_movie_genres`/`tmdb_tv_genres`) with single-flight promises.
- **Feeds** (per-feed stale-while-revalidate, 6h TTL, localStorage `discover_feed_v5_*`): `top_movies` (`/trending/movie/week`), `top_tv` (`/trending/tv/week`), `recently_released` (`/movie/now_playing?region=US`), `critically_acclaimed` (`/movie/top_rated`). Each returns top 6 items with genres + streaming_providers fetched in background (non-blocking) via `/watch/providers` (US flatrate/rent/buy union). `clearDiscoverFeedsCache` purges old versions.
- **Detail** (7-day cache `discover_detail_v3_*`): `/movie/{id}?append_to_response=credits,videos,release_dates,watch/providers,similar` (or `/tv/{id}?...content_ratings...`). Extract US certification, providers, official YouTube trailer, cast (12), directors/creators, similar (8), seasons (TV). `fetchSeasonEpisodes`.
- **Releases** (`releaseApi.js`): `searchTmdbAll` (movie+tv), `fetchTmdbDetails` (certification, trailer, cast, crew, director, studio), `daysUntil`, `groupReleasesByTime` (thisWeek/nextWeek/thisMonth/nextMonth/future), `getCalendarDays` (42-cell grid), `ingestUpcomingReleases` (4-month rolling: `/discover/movie` + `/movie/upcoming` + `/discover/tv`, top 40 movies + 20 TV, fetch digital release dates (type 4) for top 20, trailers for top 20), person endpoints.
- **Trailers** (`trailerApi.js`): `fetchTrailerVideos` with 7-day in-memory cache, ranking (Official Trailer > Trailer > Teaser > Featurette > Clip > BTS), language fallback to no-language if <2 YouTube entries.

### I. Universal identity & OAuth (`src/lib/universalIdentityApi.js`)
- `getOrCreateUniversalIdentity(user)`, `getAdminNodes(serviceType)`, `getDiagnosticNodes`, `mapNodeToServerShape`, `buildAccountListFromIdentity(identity, nodes)` → pseudo LinkedMediaAccount[] for deviceSessionApi reuse.
- **Plex OAuth PIN flow**: `createPlexPin` (POST `https://plex.tv/api/v2/pins?strong=true`), `pollPlexPin`, `getPlexAuthUrl(pinCode)` (`https://app.plex.tv/auth#?clientID=mediapass-app&code=...`), `getPlexIdentity` (GET `https://plex.tv/api/v2/user`).
- **Emby/Jellyfin auth**: `authenticateEmby`/`authenticateJellyfin` → POST `{base}/Users/AuthenticateByName` {Username, Pw} with `X-Emby-Authorization: MediaBrowser Client="MediaPass", Device="Web", DeviceId="mediapass-app", Version="1.0"`.

### J. Customer device sessions (`src/lib/deviceSessionApi.js`)
- `fetchAccountSessions(account)`: Plex → `normalizePlex`; Emby/Jellyfin → `normalizeEmbyJellyfin` (filter to account.external_user_id). Fields: session_key, service_type, server_id, device_name, client_app/version, ip_address, playback_state, media_title/type, poster_url, resolution_badge (4K if ≥2160 else `${height}p`), duration_ms, progress_percent, bitrate, video_codec.
- `enrichWithGeo` (best-effort), `killDeviceSession`, `resetMediaPassword` (Emby/Jellyfin), `revokePlexToken` (DELETE `https://plex.tv/api/v2/tokens/{token}`), `revokeAllJellyfinTokens` (DELETE `/Sessions?UserId=`), `passwordStrength` (0-4), `formatRuntime` (HH:MM:SS), `countryFlagEmoji`.

### K. Watchlist sync (`src/lib/watchlistSyncApi.js`, `watchlistSync.js`)
- **Inbound ingestion** (enabled): `ingestPlexWatchlist` (paginate `https://discover.provider.plex.tv/library/sections/watchlist/all?includeGuids=1`), `ingestEmbyFavorites` (`/emby/Users/{userId}/Items?Filters=IsFavorite`), `ingestJellyfinFavorites` (same with `X-Emby-Authorization`). Parse provider GUIDs (imdb/tmdb/tvdb) → `resolveToTmdb` (try movie then tv endpoints, fallback to `/find/{id}?external_source=imdb_id|tvdb_id`).
- `additiveUnionMerge`: **NEVER remove** existing items — only append new (dedupe by `tmdb_id-media_type`, new items status `plan_to_watch`).
- `runInboundSync(identity, nodes, currentWatchlist)`: orchestrates all three, returns per-service counts + merged watchlist.
- `testServiceConnection` per platform.
- **Outward write-back** (`WRITEBACK_ENABLED = false` — disabled until inbound verified): `appendToPlexWatchlist` (resolve ratingKey via `/library/metadata/matches?guid=tmdb://` then PUT `/actions/addToWatchlist`), `appendToEmbyFavorites`/`appendToJellyfinFavorites` (POST `/Users/{userId}/FavoriteItems/{itemId}`).
- **Single-item removal** (never bulk): `removeFromPlexWatchlist` (PUT `/actions/removeFromWatchlist`), `removeFromEmbyFavorites`/`removeFromJellyfinFavorites` (DELETE FavoriteItems).
- `dispatchWatchlistSync` (gated by WRITEBACK_ENABLED) + `sendDiscordWebhook` (rich embed with poster/backdrop/trailer link, event titles theatrical_today/vod_dropped/imported_to_server, @everyone/@here/role mentions).

### L. Discord (`src/lib/discordWebhook.js`, `discordOAuthApi.js`)
- `getDiscordConfig` (cached DiscordBotConfig[0]). `sendDiscordNotification({event, ticket, note, user})`: builds embed (color from `panel_embed_color` hex→int), events: ticket_created/ticket_reply/ticket_status_changed/ticket_assigned. Respects per-event notify flags. Internal notes → `log_webhook_url` if configured. Best-effort (never blocks ticket ops).
- **OAuth**: `getDiscordOAuthConfig` (client_id from DiscordBotConfig, bot_token+guild_id from LoyaltyTier rank 0). `initiateDiscordOAuth` (state=uuid in sessionStorage, popup `https://discord.com/api/oauth2/authorize?...scope=identify guilds guilds.join`). `handleDiscordCallback` (validate state, GET `/users/@me`, PUT guild member via Bot token). `assignDiscordRole`/`removeDiscordRole` (Bot API).

### M. Diagnostics (`src/lib/diagnosticsApi.js`)
- `pingUrl(url, 6)`: no-cors fetch with cache-busting, drop warm-up sample, compute avg + jitter (stddev).
- `measureThroughput(bytes=25MB)`: stream Cloudflare `https://speed.cloudflare.com/__down?bytes=` → mbps = `(bytes*8)/(elapsed*1e6)`.
- `detectIspAndGeo`: `https://ipwho.is/` → ip/asn/isp/city/region/country.
- `evaluateConnection(mbps, jitter)`: ≥80+low jitter → "Ideal for 4K Direct Play" (emerald); ≥30 → "Adequate for 1080p" (amber); else "Unstable/ISP Throttling" (rose).
- `buildDiagnosticReport`: plain-text clipboard report (server edge, network, ISP/geo, active sessions).

### N. Geo (`src/lib/geoApi.js`)
`getLocation(ip)`: skip private IPs (10./192.168./169.254./127./172.16-31./::1); try `ipwho.is/{ip}` then fallback `ipapi.co/{ip}/json/`; in-memory cache; returns lat/lon/city/region/country/country_code/postal/asn/org/isp.

### O. Performance sync (`src/lib/performanceSync.js`)
6-hour throttle (`SYNC_INTERVAL_MS`), 10-min auto-check cooldown. Classifiers: `classifyCodec` (H264/HEVC/AV1/VP9/other), `classifyResolution` (4K/1080p/720p/SD/other), `classifyDevice` (apple_tv/roku/steam_deck/android_tv/ios/web/other), `compatibilityScore` (direct play=100, else by resolution), `streamingProfile`. `syncPerformance({force})`: for each MediaServer with url+api_key, fetch sessions, skip if last snapshot <6h (unless forced), accumulate codec/res/device breakdowns + peak bitrate + local/remote bandwidth (private-IP detection) + transcode/direct counts, upsert DeviceTelemetry (mark unseen inactive, enrich geo for public IPs), upsert BandwidthBreakdown (user & media dimensions, cumulative), pull latest ResourceMetric for CPU/RAM, create PerformanceSnapshot.

### P. Billing engine (`src/lib/billingApi.js`, `billingClassify.js`, `billingCalculations.js`)
- `parseCsv` (client-side, quoted-cell aware), `importRows(rows, gatewayAccountId, categories, plans)`: dedupe customers by email, classify each row's `raw_product_name` via `classifyProduct` (match_tokens substring/regex) → category_id, `matchPlan` (longest normalized_identifier substring) → plan_id, upsert by `external_subscription_id` (bulkUpdate) or create (bulkCreate). Returns `{created_customers, created_subs, updated_subs, errors}`.
- `toCsv`/`downloadFile` export, `STATUS_COLORS` map.
- **Classification engine**: `classifyProduct(rawName, categories)` — for each category's match_tokens, detect regex (`[[\\^$.|?*+()]`) vs substring, case-insensitive. `matchPlan` — sort plans by `normalized_identifier` length desc, first substring match. `resolveCategory` — keep existing valid category else classify.
- **Financial math** (all from BillingExpense): `getProcessorFee` (fee_percent*billed_price + fee_fixed, matched by payment_method). `scopeMatchesPlan` (All=true, "All XC"=not Live TV, else exact server). `computeCustomerBilling` → netRevenue, allocatedCost (live_tv_credit_cost = monthly_cost*plan.live_tv_credits; others = monthly_cost / active-scope-user-count), finalProfit. `computeMonthlyTrends` (6-month, bucket by bill_date). `computeDashboardStats`.

### Q. Migration pipeline (`src/lib/migrationApi.js`)
Read-only import from Stripe & PayPal (WHMCS fully removed). `parseStripeSubscriptions`/`parsePaypalSubscriptions` (JSON), `parsePaymentLogsCsv`, `ingestMigrationBatch` (staged, silent, no emails), `activateMigration` (create/update BillingCustomer, map to StorePlan, mark activated), `generateBatchId`.

### R. Campaigns & email (`src/lib/campaignDispatcher.js`, `emailShortcodes.js`)
- Shortcodes use `*key*` format: `*name*, *email*, *full_name*, *plan*, *price*, *bill_date*, *billing_cycle*, *portal_link*, *store_link*, *support_link*`. `applyShortcodes`, `buildTemplateContext(customer, plan)`.
- `resolveRecipients` (active/inactive/migrated/not_welcomed/custom). `dispatchCampaign`: per recipient apply shortcodes → SendEmail (registered) or Discord webhook → record result_log, update campaign status (sent/failed/partial), mark welcomed if welcome template.

### S. Stream enforcement (`src/lib/streamLimiter.js`, `transcodeGuardian.js`, `planResolver.js`)
- `loadPlanResolver()`: bridge ServerUser (username/email) → BillingCustomer (email→plan_id) → StorePlan. Returns `resolvePlan(serverId, username)`.
- `enforceConcurrentStreamLimits(sessions, serversById)`: group by server+username, resolve plan, if `max_concurrent_streams` exceeded keep longest-running, kill newest overflow. **Client-side only — runs while admin views Sessions/Dashboard.**
- `enforceTranscodeGuardian`: kill 4K transcoding sessions for plans with `block_4k_transcode` (height ≥2000 from `WxH` or "4k").

### T. Unified library catalog (`src/lib/libraryCatalogApi.js`)
`fetchUnifiedCatalog()`: fetch all servers' libraries (Plex `/library/sections/{id}/all`, Emby/Jellyfin `/Items?ParentId&Recursive&IncludeItemTypes=Movie,Series`), normalize to common shape, `deduplicateCatalog` by `title|year` (pick richest item, attach servers[] + server_count), sort alphabetically.

### U. Rewards (`src/lib/rewardsApi.js`)
`generateReferralCode` (STREAM-NAME-123), `getOrCreateReferralProgram/Wallet/CommunityProfile`, `calculateUserTier` (min_active_months & min_successful_referrals), `getNextTier`, `calculateProgress`, `obfuscateEmail`, `formatCurrency`, `calculateActiveMonths`.

### V. Other libs
- `concurrency.js`: `mapWithLimit(items, limit, fn)` bounded async map.
- `qualityBucket.js`: resolution string → 4K/1080p/720p/SD/Unknown.
- `killMessages.js`: predefined kill messages (4K Transcoding Restriction, Server Maintenance, Device Limit Enforced).
- `streamingNetworks.js`: ~90 streaming-network catalog (id/name/color/textColor) + matchers.
- `customerCsv.js`: BillingCustomer CSV export/import (plan_name↔plan_id), template.
- `projectUtils.js`: work-package types, priorities, board types, `getStaffList`, `checklistProgress`, avatar color/initials.
- `statsAggregation.js`: `inferMediaType`, `computeGlobalMetrics`, `bucketByHour/Day/DayOfWeek/HourOfDay`, `computePlatform/CodecStats`, `computeUserStats` (per-user engagement).
- `formatBytes.js`: MB/GB-only sizing + Windows date format + file icon/type maps.
- `sessionLogger/resourceLogger/libraryLogger.js`, `librarySnapshotCache.js`, `storageSchedule.js`, `fileManagerStorage.js`: persistence/logging helpers.

### Webhooks
- Stripe/PayPal webhook endpoints are **stubbed** (require Builder+ backend functions). Each PaymentGatewayAccount exposes a webhook URL `https://xcmediapass.base44.app/functions/<functionName>` for the provider dashboard; live ingestion is deferred until backend functions are enabled.
- Discord webhooks fire on ticket events (create/reply/status/assign) and release events (theatrical/VOD/import) via the libs above.

---

## 5. CORE FEATURES & COMPLEX LOGIC (per module)

### Admin Dashboard (`Dashboard.jsx`)
Real-time overview. Polls active sessions across all MediaServers on an interval (10s), records ActivityLog + ResourceMetric snapshots, updates expired Invitations. Renders server status summary, now-playing panel, resource gauges, revenue trend chart, session activity chart, recent activity feed, recent trials. Uses `DashboardBackground`.

### Servers (`Servers.jsx`)
Fleet node registry: add/edit/remove AdminManagedNodes, view connected MediaServers + telemetry, broadcast ServerAlerts (per-node or all-servers, severity/title/message). `refreshServer` on each with mixed-content/CORS diagnosis.

### Server Users (`ServerUsers.jsx` + profile)
`syncServerUsers` per server → list with library-access editing (non-destructive policy merge), suspend/reactivate/terminate, change password (Emby/Jellyfin), drop active sessions. Profile page (`ServerUserProfile`) with sections: UserInfo, Statistics, DeviceIntelligence, Locations (map), RecentActivity, Violations, TerminationHistory. trust_score 0-100.

### Sessions (`Sessions.jsx`)
Live sessions across all servers (normalized), grouped display, kill single/bulk with predefined/custom messages, geo-enriched map (`SessionsMap` with `map-stream-dot`), `enforceConcurrentStreamLimits` + `enforceTranscodeGuardian` run on each poll.

### Analytics / Stats / Performance
- Analytics: bandwidth trend, quality breakdown, compatibility matrix, transcode hotspots, resource trend, library intelligence, sharing flags.
- Stats Center (activity/users/leaderboard): `statsAggregation` over PlaybackSession — daily volume, concurrent streams, day-of-week, hour-of-day, codec badges, client badges, user engagement list, podium.
- Performance: snapshots (PerformanceSnapshot), device telemetry table, codec/resolution breakdown, throughput, bandwidth breakdown (user/media), resource gauges, stream bitrate distribution, client distribution, concurrent streams chart.

### CRM Hub (`CRMHub.jsx`) + Customer Profile
Searchable BillingCustomer list enriched with StorePlan names. Profile: billing card, activity timeline, tickets list. `loadPlanResolver` bridges server users → customers → plans.

### Support Desk (`AdminTickets.jsx`)
Kanban board (by status) + list, ticket detail drawer with notes (customer vs internal), canned replies/macros, assign, status timeline, SLA, CSAT, diagnostic snapshot, KB deflector, customer context sidebar. Discord sync (create channel, notify). `sendDiscordNotification` on events.

### Billing Engine (new — 5 pages)
- **PaymentGateways**: CRUD PaymentGatewayAccount (Stripe: publishable/secret/webhook_secret; PayPal: client_id/secret/mode/webhook_id), per-account webhook URL copy, sync-status, "live API requires Builder+" notice.
- **CategoryManager**: CRUD SubscriptionCategory (color, match_tokens) + SubscriptionPlan (normalized_identifier, default_amount, interval). Seed XC Foxtrot / XC Echo / Live TV. Manual override queue for unclassified subscriptions.
- **BillingSubscriptions**: SubscriptionCustomer + Subscription table, search/filter, **CSV import** (`importRows` parses client-side, auto-classifies on import), gateway/category/status filters.
- **BillingCalendar**: month grid with colored renewal chips per category, aggregate pills (MRR/active/canceled), date slide-over drawer, revenue intake bar (daily/weekly/monthly realization rate). Indexed on `next_billing_date`.
- **RevenueAnalytics**: category donut, account-distribution bars, churn counts, CSV/JSON export.

### Billing (legacy — keep working)
- **BillingDashboard**: BillingCustomer table, expenses manager (BillingExpense), financial trend chart, profit badges. All math via `billingCalculations` from BillingExpense.
- **MigrationPipeline**: read-only Stripe/PayPal import (paste JSON), staged silent ingestion, map to StorePlan + activate, payment history CSV. **No WHMCS.**
- **EmailTemplates** + **CommunicationCenter**: template editor (shortcodes), campaign builder (target_audience), `dispatchCampaign`.
- **FinancialAnalytics**: 6-month trends, expense allocation, per-customer profit.

### Content & Store
- **ContentManager**: ContentItem CRUD (draft/published, plan-gated, is_free).
- **UnifiedLibrary**: `fetchUnifiedCatalog` + `deduplicateCatalog` across all servers, detail view with server availability.
- **AdminReleases**: MediaRelease admin (TMDB importer, Discord channel manager, release list, server import status). `ingestUpcomingReleases` 4-month rolling.
- **StorePlans**: StorePlan CRUD (library_map, max_concurrent_streams, block_4k_transcode, stripe_price_id, checkout_token), AddonProduct manager.
- **AdminRewards**: LoyaltyTier config (ranks, thresholds, Discord roles, gradient), referral oversight, tier→role mapper.

### Knowledge Base (BookStack-pattern)
Shelves → Books → Chapters → Pages. WYSIWYG (`react-quill` with custom callout/details blots in `quillBlots.js`) + Markdown. Page picker, asset picker/uploader, revision history, template pages, tags. `BookStackMigration` import tool. KB shared between admin (`/admin/kb`) and customer (`/customer/kb`) via `RoleParamRedirect`.

### Projects (`Projects.jsx`, `ProjectBoard.jsx`, `ProjectTimeline.jsx`)
Kanban (status/assignee/milestone/priority boards via `@hello-pangea/dnd`), task form (work package type, priority, story points, dates, checklist, linked tickets, dependencies), time tracking (TaskTimeEntry), activity feed, Gantt timeline, ticket linker, board switcher. Private projects gated by member_emails.

### Customer Portal
- **CustomerPortal**: dashboard (active subscriptions, wallet, referrals, recent releases, server alerts).
- **CustomerDiscover**: TMDB feeds (trending carousels), filter bar, network picker, media detail modal (cast, similar, seasons, where-to-stream badges, trailer), onboarding modal.
- **CustomerReleases**: release calendar/timeline, hero, watchlist drawer, person profile drawer, trailer player.
- **CustomerWatchlist**: `runInboundSync` (Plex/Emby/Jellyfin → additive merge), search/filter/sort, single-item un-favorite/un-watchlist, sync diagnostics, auto-sync banner.
- **Store**: StorePlan cards (public), addon store, checkout token flow → Checkout page (Stripe).
- **CustomerTickets**: submit ticket (department-aware, server-required gating, diagnostic attach, KB deflector), view own tickets, reply.
- **CustomerDiagnostics**: ServerHealthGrid, NetworkDiagnosticTool (ping/throughput/ISP), active stream inspector, telemetry gauge, diagnostic report copy.
- **CustomerDevices** (Stream Manager): account sessions, concurrency meter, kill stream, idle devices, security panel, audit log drawer, linked account setup.
- **CustomerIntegrations**: Plex OAuth button, Emby/Jellyfin connect modal → writes UserUniversalMediaIdentity.
- **CustomerRewards**: loyalty track, wallet balance, referral ledger, how-it-works, Discord connect/sync.

### Invite flow
`CreateInvite` → Invitation with secure token + expiry → `/invite/:token` (InviteLanding) → activate (create platform user, set libraries, mark activated, ActivityLog). `Trials` manages expiring invitations.

---

## 6. KNOWN CONSTRAINTS & DEAD ENDS (do not retry)
- **No backend functions / scheduled cron / server-side secrets** on the current plan (Builder+ required). All Stripe/PayPal live API ingestion, webhook endpoints, and 60-min automated cron are **stubbed with clear notices**. Performance sync runs from the dashboard poll loop + manual refresh (6h throttle) — not a true server cron.
- Plex `shared_servers` v2 list endpoint returns 405; use legacy `/api/users` (XML) + per-user v2 GET for library keys.
- Hardcoded `http://` Plex URLs are blocked by mixed-content; resolve `*.plex.direct` HTTPS via plex.tv resources.
- Private/local IPs don't resolve via geo APIs (skip them).
- Watchlist write-back is **disabled** (`WRITEBACK_ENABLED=false`) until inbound sync is verified — inbound only, additive, never destructive.
- LLM-based discovery feed generation was too slow/unreliable — use direct TMDB API calls.
- Canvas blur for backgrounds created static unnatural blur — use layered SVG/CSS gradients + blur utilities instead.

## 7. BUILD ORDER
1. Install/configure stack, tokens, tailwind, index.css design system, backgrounds, SidebarShell, layouts, auth (AuthContext + guards + Login/AdminLogin + ForgotPassword/ResetPassword).
2. Create all entities with exact schemas + RLS.
3. Build `lib/` API layer (mediaServerApi, sessionsApi, serverUsersApi, auditApi, storageApi, folderInfoMap, mediaDiscoveryApi, releaseApi, trailerApi, tmdbConfig, diagnosticsApi, deviceSessionApi, universalIdentityApi, watchlistSyncApi, discordWebhook, discordOAuthApi, rewardsApi, billingApi, billingClassify, billingCalculations, campaignDispatcher, emailShortcodes, performanceSync, statsAggregation, planResolver, streamLimiter, transcodeGuardian, concurrency, qualityBucket, geoApi, serverRefresh, libraryCatalogApi, customerCsv, projectUtils, formatBytes, fileUtils, killMessages, streamingNetworks, migrationApi).
4. Build admin pages → customer pages → KB → projects → billing engine.
5. Wire App.jsx routes + legacy redirects, mount DebugProvider + DiagnosticDebugDrawer + Toaster.
6. Verify `npx vite build` compiles clean (ESM, no require, all imports resolve, no dynamic Tailwind classes).

**The result must be a working, dark-themed, lime-accented, dual-portal media-ops platform indistinguishable from the XC Media Pass reference.**