import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, ChevronDown, LogOut, Menu, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const LOGO_URL = "/assets/xc-logo-sidebar.png";

export default function SidebarShell({ navGroups, subtitle, logoutPath }) {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isGroupOpen = (title) => openGroups[title] !== false;
  const toggleGroup = (title) => setOpenGroups((prev) => ({ ...prev, [title]: !isGroupOpen(title) }));

  return (
    <TooltipProvider>
      <div className="relative z-10 flex h-screen bg-transparent text-zinc-100 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 z-30 flex items-center justify-between px-4 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-sm">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 text-zinc-300">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="Xzavain Cloud" className="w-6 h-6 rounded-md object-contain bg-zinc-950" />
            <span className="font-heading font-semibold text-sm">Xzavain Cloud</span>
          </div>
          <div className="w-9" />
        </div>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setMobileOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed md:relative top-0 left-0 h-full flex flex-col border-r border-zinc-800/60 bg-zinc-950 md:bg-zinc-900/50 backdrop-blur-sm z-50
          transition-transform md:transition-all duration-300
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
          w-64 ${collapsed ? "md:w-16" : "md:w-60"}
        `}>
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-4 h-16 border-b border-zinc-800/60">
            <div className="relative flex-shrink-0">
              <img src={LOGO_URL} alt="Xzavain Cloud" className="w-8 h-8 rounded-lg object-contain bg-zinc-950" />
              <span className="logo-pulse absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-lime-400" />
            </div>
            {!collapsed && (
              <span className="font-heading font-semibold text-sm tracking-tight truncate leading-tight">
                Xzavain Cloud<br />{subtitle}
              </span>
            )}
            <button onClick={() => setMobileOpen(false)} className="md:hidden ml-auto p-1 text-zinc-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 min-h-0 overflow-y-auto py-4 px-2 space-y-3">
            {navGroups.map((group) => (
              <div key={group.title || "flat"}>
                {group.title && !collapsed && (
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {group.title}
                    <ChevronDown className={`w-3 h-3 transition-transform ${isGroupOpen(group.title) ? "" : "-rotate-90"}`} />
                  </button>
                )}
                {(collapsed || isGroupOpen(group.title)) && (
                  <div className="space-y-1 mt-1">
                    {group.items.map(({ icon: Icon, label, path }) => {
                      const isActive = location.pathname === path || location.pathname.startsWith(path + "/");
                      return (
                        <Tooltip key={path} delayDuration={0}>
                          <TooltipTrigger asChild>
                            <Link
                              to={path}
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                                ${isActive
                                  ? "bg-lime-500/10 text-lime-400 border border-lime-500/20"
                                  : "text-zinc-200 hover:text-white hover:bg-zinc-800/50 border border-transparent"
                                }`}
                            >
                              <Icon className="w-4 h-4 flex-shrink-0" />
                              {!collapsed && <span className="truncate">{label}</span>}
                            </Link>
                          </TooltipTrigger>
                          {collapsed && (
                            <TooltipContent side="right" className="bg-zinc-800 text-zinc-200 border-zinc-700">
                              {label}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="flex-shrink-0 px-2 py-3 border-t border-zinc-800/60 space-y-1">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => base44.auth.logout(logoutPath)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/50 w-full transition-all"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span>Sign Out</span>}
                </button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" className="bg-zinc-800 text-zinc-200 border-zinc-700">
                  Sign Out
                </TooltipContent>
              )}
            </Tooltip>
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors z-10"
          >
            {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-14 md:pt-0">
          <div className="min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}