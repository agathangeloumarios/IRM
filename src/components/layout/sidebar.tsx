"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, Activity, FileText, ClipboardList, BarChart3,
  Archive, FolderOpen, Settings, ChevronsUpDown, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string };

const groups: { label: string; items: Item[] }[] = [
  {
    label: "Clinical",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/patients", label: "Patients", icon: Users, badge: "1,248" },
      { href: "/procedures", label: "IR Procedures", icon: Activity },
      { href: "/reports", label: "Discharge Reports", icon: FileText },
      { href: "/consultation-reports", label: "Consultation Reports", icon: ClipboardList },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/archive", label: "Archive", icon: Archive },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/files", label: "File Manager", icon: FolderOpen },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-[#181614] h-screen sticky top-0">
      {/* Practice switcher */}
      <div className="p-3">
        <button className="w-full flex items-center gap-3 rounded-md border border-border bg-card/60 px-3 py-2.5 hover:bg-card transition focus-ring">
          <div className="h-8 w-8 rounded-md bg-primary-foreground/15 border border-primary-foreground/30 flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">IR</span>
          </div>
          <div className="flex-1 text-left">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Practice</div>
            <div className="text-sm font-medium text-foreground">Solo IR · Bay Area</div>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {groups.map((group) => (
          <div key={group.label} className="mt-4">
            <div className="px-3 pb-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "relative group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-ring",
                        active
                          ? "bg-primary text-primary-foreground border border-primary-foreground/30"
                          : "text-card-foreground hover:text-foreground hover:bg-card/70"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-active"
                          className="absolute inset-0 rounded-md bg-primary-foreground/10"
                          transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        />
                      )}
                      <Icon className={cn("h-4 w-4 relative z-10", active && "text-primary-foreground")} />
                      <span className="relative z-10 flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="relative z-10 text-[10px] text-muted-foreground font-mono">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-md border border-success/20 bg-success/5 p-2.5">
          <ShieldCheck className="h-4 w-4 text-success" />
          <div className="flex-1">
            <div className="text-xs font-medium text-foreground">HIPAA Secured</div>
            <div className="text-[10px] text-muted-foreground">AES-256 · Audit On</div>
          </div>
          <Badge variant="success">LIVE</Badge>
        </div>
      </div>
    </aside>
  );
}
