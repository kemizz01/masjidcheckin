"use client";

// ===========================================================================
// MasjidCheckIn — Admin Panel
//
// A mobile-first admin dashboard with four tabs:
//   1. Dashboard  — recent attendance logs (joined with users).
//   2. Jamaah     — registered users grid + face registration form.
//   3. Scenes     — mosque reference photos + blacklist management.
//   4. Settings   — mosque coordinates & geofence radius form.
//
// ⚠️  This page is currently **unprotected**.  In production, wrap it with
//     a middleware or Auth.js / Supabase Auth check.
// ===========================================================================

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Settings,
  Users,
} from "lucide-react";

import ThemeToggle from "@/components/ThemeToggle";
import LogsTable from "@/components/admin/LogsTable";
import UsersGrid from "@/components/admin/UsersGrid";
import SceneManager from "@/components/admin/SceneManager";
import SettingsForm from "@/components/admin/SettingsForm";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Tab definitions                                                    */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "users",     label: "Jamaah",    icon: Users },
  { id: "scenes",    label: "Scenes",    icon: Building2 },
  { id: "settings",  label: "Settings",  icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  return (
    <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col">
      {/* ================================================================
       *  HEADER
       * ================================================================ */}
      <header className="glass-heavy sticky top-0 z-20 flex items-center gap-3 px-3 py-3">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-gold"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 font-display text-lg tracking-wide text-foreground">
          Admin Panel
        </h1>
        <ThemeToggle />
      </header>

      {/* ================================================================
       *  TAB BAR  (horizontal, scrollable on narrow screens)
       * ================================================================ */}
      <nav
        className="sticky top-[56px] z-10 -mx-4 flex gap-1 overflow-x-auto px-4 pb-2 pt-3 no-scrollbar sm:mx-0"
        aria-label="Admin tabs"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gold/15 text-gold ring-1 ring-gold/25"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ================================================================
       *  TAB CONTENT
       * ================================================================ */}
      <main className="flex-1 px-4 pb-12 pt-4">
        {activeTab === "dashboard" && <LogsTable />}
        {activeTab === "users" && <UsersGrid />}
        {activeTab === "scenes" && <SceneManager />}
        {activeTab === "settings" && <SettingsForm />}
      </main>
    </div>
  );
}