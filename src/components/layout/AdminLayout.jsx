import React from "react";
import {
  LayoutDashboard, Server, Link2, Users, FileText, UserCheck,
  Activity, BarChart3, LifeBuoy, Ticket, Building2, Wallet, CalendarDays,
  BookOpen, ShoppingBag, FolderKanban, Clapperboard, Contact, HeadphonesIcon,
  HardDrive, Gauge, Bot, LineChart, Database, Megaphone, ExternalLink, HeartPulse, Trophy,
  Tags, CreditCard, ListFilter, Library,
} from "lucide-react";
import SidebarShell from "./SidebarShell";
import DashboardBackground from "@/components/DashboardBackground";

const adminNavGroups = [
  {
    title: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
      { icon: Activity, label: "Live Sessions", path: "/admin/sessions" },
      { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
      { icon: LineChart, label: "Stats Center", path: "/admin/stats" },
      { icon: Gauge, label: "Performance", path: "/admin/performance" },
    ],
  },
  {
    title: "Media Servers",
    items: [
      { icon: Server, label: "Servers", path: "/admin/servers" },
      { icon: UserCheck, label: "Server Users", path: "/admin/server-users" },
      { icon: HeadphonesIcon, label: "Client Service", path: "/admin/client-service" },
      { icon: Link2, label: "Create Invite", path: "/admin/create-invite" },
      { icon: Users, label: "Active Trials", path: "/admin/trials" },
      { icon: FolderKanban, label: "Audit", path: "/admin/audit" },
      { icon: HardDrive, label: "Storage", path: "/admin/storage" },
      { icon: HeartPulse, label: "Node Diagnostics", path: "/admin/nodes" },
    ],
  },
  {
    title: "Customers & Support",
    items: [
      { icon: Contact, label: "CRM Hub", path: "/admin/crm" },
      { icon: LifeBuoy, label: "Support Desk", path: "/admin/support" },
      { icon: Bot, label: "Discord Bot", path: "/admin/discord-settings" },
    ],
  },
  {
    title: "Billing Engine",
    items: [
      { icon: CalendarDays, label: "Billing Calendar", path: "/billing/calendar" },
      { icon: ListFilter, label: "Subscriptions", path: "/billing/subscriptions" },
      { icon: Tags, label: "Categories & Plans", path: "/billing/categories" },
      { icon: CreditCard, label: "Payment Gateways", path: "/billing/gateways" },
      { icon: BarChart3, label: "Revenue Analytics", path: "/billing/reports" },
    ],
  },
  {
    title: "Billing",
    items: [
      { icon: Wallet, label: "Billing Engine", path: "/admin/billing" },
      { icon: Database, label: "Migration Pipeline", path: "/admin/billing/migration" },
      { icon: Megaphone, label: "Communications", path: "/admin/billing/communications" },
      { icon: CalendarDays, label: "Billing Calendar", path: "/admin/billing-calendar" },
      { icon: BarChart3, label: "Financial Analytics", path: "/admin/financial-analytics" },
    ],
  },
  {
    title: "Content & Store",
    items: [
      { icon: Clapperboard, label: "Content Manager", path: "/admin/content" },
      { icon: Library, label: "Unified Library", path: "/admin/unified-library" },
      { icon: CalendarDays, label: "Release Management", path: "/admin/releases" },
      { icon: ShoppingBag, label: "Store Plans", path: "/admin/store-plans" },
      { icon: Trophy, label: "Rewards & Loyalty", path: "/admin/rewards" },
    ],
  },
  {
    title: "Knowledge & Projects",
    items: [
      { icon: BookOpen, label: "Knowledge Base", path: "/admin/kb" },
      { icon: Database, label: "BookStack Migration", path: "/admin/kb/migration" },
      { icon: FolderKanban, label: "Projects", path: "/admin/projects" },
    ],
  },
  {
    title: "System",
    items: [
      { icon: FileText, label: "API Docs", path: "/admin/api-docs" },
      { icon: Users, label: "Staff Users", path: "/admin/users" },
      { icon: Building2, label: "Departments", path: "/admin/departments" },
    ],
  },
  {
    title: "Customer View",
    items: [
      { icon: ExternalLink, label: "Customer Dashboard", path: "/customer/dashboard" },
    ],
  },
];

export default function AdminLayout() {
  return (
    <>
      <DashboardBackground />
      <SidebarShell navGroups={adminNavGroups} subtitle="Admin Hub" logoutPath="/admin-login" />
    </>
  );
}