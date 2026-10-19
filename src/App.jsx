import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useParams } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { DebugProvider } from '@/lib/DebugContext';
import DiagnosticDebugDrawer from '@/components/debug/DiagnosticDebugDrawer';

import Login from '@/pages/Login';
import AdminLogin from '@/pages/AdminLogin';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

import CustomerRoute from '@/components/CustomerRoute';
import { MediaAuthProvider } from '@/lib/MediaAuthContext';
import AdminRoute from '@/components/AdminRoute';
import CustomerLayout from '@/components/layout/CustomerLayout';
import AdminLayout from '@/components/layout/AdminLayout';

// Customer pages
import CustomerPortal from '@/pages/CustomerPortal';
import Store from '@/pages/Store';
import CustomerTickets from '@/pages/CustomerTickets';
import Checkout from '@/pages/Checkout';
import CustomerDiscover from '@/pages/CustomerDiscover';
import CustomerWatchlist from '@/pages/CustomerWatchlist';
import CustomerDiagnostics from '@/pages/CustomerDiagnostics';
import CustomerDevices from '@/pages/CustomerDevices';
import CustomerReleases from '@/pages/CustomerReleases';
import CustomerRewards from '@/pages/CustomerRewards';
import CustomerIntegrations from '@/pages/CustomerIntegrations';

// Admin pages
import Dashboard from '@/pages/Dashboard';
import Servers from '@/pages/Servers';
import CreateInvite from '@/pages/CreateInvite';
import Trials from '@/pages/Trials';
import ApiDocs from '@/pages/ApiDocs';
import AuditDashboard from '@/pages/AuditDashboard';
import StorageDashboard from '@/pages/StorageDashboard';
import UserManagement from '@/pages/UserManagement';
import ServerUsers from '@/pages/ServerUsers';
import ServerUserProfile from '@/pages/ServerUserProfile';
import Sessions from '@/pages/Sessions';
import Analytics from '@/pages/Analytics';
import Stats from '@/pages/Stats';
import StatsActivity from '@/pages/StatsActivity';
import StatsUsers from '@/pages/StatsUsers';
import StatsLeaderboard from '@/pages/StatsLeaderboard';
import Performance from '@/pages/Performance';
import PerformanceDevices from '@/pages/PerformanceDevices';
import PerformanceBandwidth from '@/pages/PerformanceBandwidth';
import AdminTickets from '@/pages/AdminTickets';
import DiscordSettings from '@/pages/DiscordSettings';
import DepartmentSettings from '@/pages/DepartmentSettings';
import BillingDashboard from '@/pages/BillingDashboard';
import MigrationPipeline from '@/pages/MigrationPipeline';
import EmailTemplates from '@/pages/EmailTemplates';
import CommunicationCenter from '@/pages/CommunicationCenter';
import BillingCalendar from '@/pages/BillingCalendar';
import FinancialAnalytics from '@/pages/FinancialAnalytics';
import StorePlans from '@/pages/StorePlans';
import Projects from '@/pages/Projects';
import ProjectBoard from '@/pages/ProjectBoard';
import ProjectTimeline from '@/pages/ProjectTimeline';
import ContentManager from '@/pages/ContentManager';
import UnifiedLibrary from '@/pages/UnifiedLibrary';
import CRMHub from '@/pages/CRMHub';
import CustomerProfile from '@/pages/CustomerProfile';
import ClientService from '@/pages/ClientService';
import AdminNodes from '@/pages/AdminNodes';
import AdminReleases from '@/pages/AdminReleases';
import AdminRewards from '@/pages/AdminRewards';
import BillingSubscriptions from '@/pages/BillingSubscriptions';
import CategoryManager from '@/pages/CategoryManager';
import PaymentGateways from '@/pages/PaymentGateways';
import RevenueAnalytics from '@/pages/RevenueAnalytics';

// KB pages (shared between customer and admin)
import KnowledgeBase from '@/pages/KnowledgeBase';
import KbBookPage from '@/pages/KbBookPage';
import KbPageView from '@/pages/KbPageView';
import KbPageEditor from '@/pages/KbPageEditor';
import KbAssets from '@/pages/KbAssets';
import KbShelfPage from '@/pages/KbShelfPage';
import BookStackMigration from '@/pages/BookStackMigration';

import InviteLanding from '@/pages/InviteLanding';
import DiscordCallback from '@/pages/DiscordCallback';

// Redirects to the correct portal based on role
const RoleRedirect = () => {
  const { user } = useAuth();
  if (user?.role === "admin" || user?.role === "staff") return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === "customer") return <Navigate to="/customer/dashboard" replace />;
  return <Navigate to="/login" replace />;
};

// Redirects old dynamic routes to new prefixed routes, preserving URL params
const ParamRedirect = ({ to }) => {
  const params = useParams();
  let dest = to;
  Object.keys(params).forEach((key) => {
    dest = dest.replace(`:${key}`, params[key]);
  });
  return <Navigate to={dest} replace />;
};

// Role-aware redirect for shared routes (e.g. KB) — sends to the correct portal
const RoleParamRedirect = ({ adminTo, customerTo }) => {
  const { user } = useAuth();
  const params = useParams();
  const isAdmin = user?.role === "admin" || user?.role === "staff";
  let dest = isAdmin ? adminTo : customerTo;
  Object.keys(params).forEach((key) => {
    dest = dest.replace(`:${key}`, params[key]);
  });
  return <Navigate to={dest} replace />;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-4 border-zinc-700 border-t-lime-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Public invite landing */}
      <Route path="/invite/:token" element={<InviteLanding />} />
      <Route path="/discord-callback" element={<DiscordCallback />} />

      {/* Root redirect — sends to the correct portal based on role */}
      <Route path="/" element={<RoleRedirect />} />

      {/* ─── Customer Portal ─── */}
      <Route element={<CustomerRoute />}>
        <Route element={<MediaAuthProvider />}>
        <Route element={<CustomerLayout />}>
          <Route path="/customer" element={<Navigate to="/customer/dashboard" replace />} />
          <Route path="/customer/dashboard" element={<CustomerPortal />} />
          <Route path="/customer/store" element={<Store />} />
          <Route path="/customer/tickets" element={<CustomerTickets />} />
          <Route path="/customer/discover" element={<CustomerDiscover />} />
          <Route path="/customer/watchlist" element={<CustomerWatchlist />} />
          <Route path="/customer/diagnostics" element={<CustomerDiagnostics />} />
          <Route path="/customer/devices" element={<CustomerDevices />} />
          <Route path="/customer/releases" element={<CustomerReleases />} />
          <Route path="/customer/rewards" element={<CustomerRewards />} />
          <Route path="/customer/connect-servers" element={<CustomerIntegrations />} />
          <Route path="/customer/checkout/:token" element={<Checkout />} />
          <Route path="/customer/kb" element={<KnowledgeBase />} />
          <Route path="/customer/kb/book/:bookId" element={<KbBookPage />} />
          <Route path="/customer/kb/page/:pageId" element={<KbPageView />} />
          <Route path="/customer/kb/shelf/:shelfId" element={<KbShelfPage />} />
        </Route>
        </Route>
      </Route>

      {/* ─── Admin / Staff Portal ─── */}
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/servers" element={<Servers />} />
          <Route path="/admin/server-users" element={<ServerUsers />} />
          <Route path="/admin/server-users/:userId" element={<ServerUserProfile />} />
          <Route path="/admin/sessions" element={<Sessions />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/stats" element={<Stats />} />
          <Route path="/admin/stats/activity" element={<StatsActivity />} />
          <Route path="/admin/stats/users" element={<StatsUsers />} />
          <Route path="/admin/stats/leaderboard" element={<StatsLeaderboard />} />
          <Route path="/admin/performance" element={<Performance />} />
          <Route path="/admin/performance/devices" element={<PerformanceDevices />} />
          <Route path="/admin/performance/bandwidth" element={<PerformanceBandwidth />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/support" element={<AdminTickets />} />
          <Route path="/admin/discord-settings" element={<DiscordSettings />} />
          <Route path="/admin/departments" element={<DepartmentSettings />} />
          <Route path="/admin/billing" element={<BillingDashboard />} />
          <Route path="/admin/billing/migration" element={<MigrationPipeline />} />
          <Route path="/admin/billing/templates" element={<EmailTemplates />} />
          <Route path="/admin/billing/communications" element={<CommunicationCenter />} />
          <Route path="/admin/billing-calendar" element={<BillingCalendar />} />
          <Route path="/admin/financial-analytics" element={<FinancialAnalytics />} />
          <Route path="/admin/crm" element={<CRMHub />} />
          <Route path="/admin/crm/:customerId" element={<CustomerProfile />} />
          <Route path="/admin/client-service" element={<ClientService />} />
          <Route path="/admin/nodes" element={<AdminNodes />} />
          <Route path="/admin/releases" element={<AdminReleases />} />
          <Route path="/admin/rewards" element={<AdminRewards />} />
          <Route path="/billing/calendar" element={<BillingCalendar />} />
          <Route path="/billing/subscriptions" element={<BillingSubscriptions />} />
          <Route path="/billing/categories" element={<CategoryManager />} />
          <Route path="/billing/gateways" element={<PaymentGateways />} />
          <Route path="/billing/reports" element={<RevenueAnalytics />} />
          <Route path="/admin/create-invite" element={<CreateInvite />} />
          <Route path="/admin/trials" element={<Trials />} />
          <Route path="/admin/audit" element={<AuditDashboard />} />
          <Route path="/admin/storage" element={<StorageDashboard />} />
          <Route path="/admin/api-docs" element={<ApiDocs />} />
          <Route path="/admin/content" element={<ContentManager />} />
          <Route path="/admin/unified-library" element={<UnifiedLibrary />} />
          <Route path="/admin/store-plans" element={<StorePlans />} />
          <Route path="/admin/projects" element={<Projects />} />
          <Route path="/admin/projects/:projectId" element={<ProjectBoard />} />
          <Route path="/admin/projects/:projectId/timeline" element={<ProjectTimeline />} />
          <Route path="/admin/kb" element={<KnowledgeBase />} />
          <Route path="/admin/kb/assets" element={<KbAssets />} />
          <Route path="/admin/kb/shelf/:shelfId" element={<KbShelfPage />} />
          <Route path="/admin/kb/migration" element={<BookStackMigration />} />
          <Route path="/admin/kb/book/:bookId" element={<KbBookPage />} />
          <Route path="/admin/kb/page/:pageId" element={<KbPageView />} />
          <Route path="/admin/kb/editor/:pageId" element={<KbPageEditor />} />
          <Route path="/admin/checkout/:token" element={<Checkout />} />
        </Route>
      </Route>

      {/* ─── Legacy route redirects (keeps old internal links working) ─── */}
      <Route path="/customer/settings/integrations" element={<Navigate to="/customer/connect-servers" replace />} />
      <Route path="/portal" element={<Navigate to="/customer/dashboard" replace />} />
      <Route path="/store" element={<Navigate to="/customer/store" replace />} />
      <Route path="/my-tickets" element={<Navigate to="/customer/tickets" replace />} />
      <Route path="/browse" element={<Navigate to="/customer/discover" replace />} />
      <Route path="/checkout/:token" element={<ParamRedirect to="/customer/checkout/:token" />} />
      <Route path="/servers" element={<Navigate to="/admin/servers" replace />} />
      <Route path="/server-users" element={<Navigate to="/admin/server-users" replace />} />
      <Route path="/server-users/:userId" element={<ParamRedirect to="/admin/server-users/:userId" />} />
      <Route path="/sessions" element={<Navigate to="/admin/sessions" replace />} />
      <Route path="/analytics" element={<Navigate to="/admin/analytics" replace />} />
      <Route path="/stats" element={<Navigate to="/admin/stats" replace />} />
      <Route path="/stats/activity" element={<Navigate to="/admin/stats/activity" replace />} />
      <Route path="/stats/users" element={<Navigate to="/admin/stats/users" replace />} />
      <Route path="/stats/leaderboard" element={<Navigate to="/admin/stats/leaderboard" replace />} />
      <Route path="/performance" element={<Navigate to="/admin/performance" replace />} />
      <Route path="/performance/devices" element={<Navigate to="/admin/performance/devices" replace />} />
      <Route path="/performance/bandwidth" element={<Navigate to="/admin/performance/bandwidth" replace />} />
      <Route path="/users" element={<Navigate to="/admin/users" replace />} />
      <Route path="/support" element={<Navigate to="/admin/support" replace />} />
      <Route path="/discord-settings" element={<Navigate to="/admin/discord-settings" replace />} />
      <Route path="/departments" element={<Navigate to="/admin/departments" replace />} />
      <Route path="/billing" element={<Navigate to="/admin/billing" replace />} />
      <Route path="/billing/migration" element={<Navigate to="/admin/billing/migration" replace />} />
      <Route path="/billing/templates" element={<Navigate to="/admin/billing/templates" replace />} />
      <Route path="/billing/communications" element={<Navigate to="/admin/billing/communications" replace />} />
      <Route path="/billing-calendar" element={<Navigate to="/admin/billing-calendar" replace />} />
      <Route path="/financial-analytics" element={<Navigate to="/admin/financial-analytics" replace />} />
      <Route path="/crm" element={<Navigate to="/admin/crm" replace />} />
      <Route path="/crm/:customerId" element={<ParamRedirect to="/admin/crm/:customerId" />} />
      <Route path="/client-service" element={<Navigate to="/admin/client-service" replace />} />
      <Route path="/create-invite" element={<Navigate to="/admin/create-invite" replace />} />
      <Route path="/trials" element={<Navigate to="/admin/trials" replace />} />
      <Route path="/audit" element={<Navigate to="/admin/audit" replace />} />
      <Route path="/storage" element={<Navigate to="/admin/storage" replace />} />
      <Route path="/api-docs" element={<Navigate to="/admin/api-docs" replace />} />
      <Route path="/content" element={<Navigate to="/admin/content" replace />} />
      <Route path="/store-plans" element={<Navigate to="/admin/store-plans" replace />} />
      <Route path="/projects" element={<Navigate to="/admin/projects" replace />} />
      <Route path="/projects/:projectId" element={<ParamRedirect to="/admin/projects/:projectId" />} />
      <Route path="/projects/:projectId/timeline" element={<ParamRedirect to="/admin/projects/:projectId/timeline" />} />
      <Route path="/kb" element={<RoleParamRedirect adminTo="/admin/kb" customerTo="/customer/kb" />} />
      <Route path="/kb/assets" element={<Navigate to="/admin/kb/assets" replace />} />
      <Route path="/kb/shelf/:shelfId" element={<RoleParamRedirect adminTo="/admin/kb/shelf/:shelfId" customerTo="/customer/kb/shelf/:shelfId" />} />
      <Route path="/kb/migration" element={<Navigate to="/admin/kb/migration" replace />} />
      <Route path="/kb/book/:bookId" element={<RoleParamRedirect adminTo="/admin/kb/book/:bookId" customerTo="/customer/kb/book/:bookId" />} />
      <Route path="/kb/page/:pageId" element={<RoleParamRedirect adminTo="/admin/kb/page/:pageId" customerTo="/customer/kb/page/:pageId" />} />
      <Route path="/kb/editor/:pageId" element={<ParamRedirect to="/admin/kb/editor/:pageId" />} />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <DebugProvider>
          <div className="relative z-10">
            <Router>
              <ScrollToTop />
              <AuthenticatedApp />
              <DiagnosticDebugDrawer />
            </Router>
          </div>
          <Toaster />
        </DebugProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App