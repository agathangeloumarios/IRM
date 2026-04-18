"use client";

import { Search, Bell, Plus, Command, Mic } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function Topbar({ title, crumbs }: { title?: string; crumbs?: string[] }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/85 backdrop-blur-xl px-4 lg:px-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {crumbs?.map((c, i) => (
          <span key={c} className="flex items-center gap-2">
            {i > 0 && <span className="text-border">/</span>}
            <span className={i === crumbs.length - 1 ? "text-primary-foreground font-medium" : ""}>{c}</span>
          </span>
        ))}
      </div>

      <div className="flex-1" />

      <div className="relative w-full max-w-sm hidden md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search patients, procedures, reports..." className="pl-9 pr-16 bg-card/60" />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 text-[10px] font-mono text-muted-foreground">
          <Command className="h-3 w-3" />K
        </kbd>
      </div>

      <Button variant="ghost" size="icon" aria-label="Voice transcription">
        <Mic className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
        <Bell className="h-4 w-4" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary-foreground" />
      </Button>

      <Button variant="primary" size="sm" className="hidden md:inline-flex">
        <Plus className="h-4 w-4" />
        New Patient
      </Button>

      <div className="flex items-center gap-2 pl-2 border-l border-border ml-1">
        <Avatar>
          <AvatarFallback>DR</AvatarFallback>
        </Avatar>
        <div className="hidden xl:block">
          <div className="text-xs font-medium text-foreground">Dr. A. Reyes</div>
          <div className="text-[10px] text-muted-foreground">Interventional Radiologist</div>
        </div>
      </div>
    </header>
  );
}
