import React from "react";
import { LayoutDashboard, ShoppingBag, Ticket, BookOpen, Compass, Bookmark, HeartPulse, Smartphone, CalendarDays, Trophy, Link2 } from "lucide-react";
import SidebarShell from "./SidebarShell";

const navGroups = [
  {
    title: null,
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/customer/dashboard" },
      { icon: Compass, label: "Discover", path: "/customer/discover" },
      { icon: CalendarDays, label: "Releases", path: "/customer/releases" },
      { icon: Trophy, label: "Rewards", path: "/customer/rewards" },
      { icon: Bookmark, label: "Watchlist", path: "/customer/watchlist" },
      { icon: ShoppingBag, label: "Store", path: "/customer/store" },
      { icon: Ticket, label: "My Tickets", path: "/customer/tickets" },
      { icon: BookOpen, label: "Knowledge Base", path: "/customer/kb" },
      { icon: HeartPulse, label: "Diagnostics", path: "/customer/diagnostics" },
      { icon: Smartphone, label: "Stream Manager", path: "/customer/devices" },
      { icon: Link2, label: "Connect Media Servers", path: "/customer/connect-servers" },
    ],
  },
];

export default function CustomerLayout() {
  return <SidebarShell navGroups={navGroups} subtitle="Customer Portal" logoutPath="/login" />;
}