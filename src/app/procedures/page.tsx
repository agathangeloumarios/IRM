"use client";

import { useMemo, useState } from "react";
import {
  Plus, Search, Calendar, Clock, MapPin, User,
  CheckCircle2, PlayCircle, Circle, XCircle, Copy, MoreHorizontal,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { procedures, ProcedureStatus, MOCK_TODAY } from "@/lib/mock-data";
import { formatDate, formatTime } from "@/lib/utils";

const cols: { status: ProcedureStatus; label: string; iconClass: string; icon: any }[] = [
  { status: "scheduled",   label: "Scheduled",   iconClass: "text-warning",            icon: Circle },
  { status: "in-progress", label: "In Progress", iconClass: "text-primary-foreground", icon: PlayCircle },
  { status: "completed",   label: "Completed",   iconClass: "text-success",            icon: CheckCircle2 },
  { status: "cancelled",   label: "Cancelled",   iconClass: "text-destructive",        icon: XCircle },
];

export default function ProceduresPage() {
  const [q, setQ] = useState("");
  const grouped = useMemo(() => {
    const filtered = procedures.filter(
      (p) =>
        !q ||
        p.patientName.toLowerCase().includes(q.toLowerCase()) ||
        p.type.toLowerCase().includes(q.toLowerCase())
    );
    return cols.map((c) => ({
      ...c,
      items: filtered.filter((p) => p.status === c.status),
    }));
  }, [q]);

  return (
    <PageShell
      title="IR Procedures"
      subtitle="Multi-status workflow with auto-appointment sync and patient info copy"
      actions={
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search procedures..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 w-[240px]"
            />
          </div>
          <Button variant="outline" size="sm"><Calendar className="h-4 w-4" /> Week View</Button>
          <Button variant="primary" size="sm"><Plus className="h-4 w-4" /> Schedule Procedure</Button>
        </>
      }
    >
      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {grouped.map((col) => {
          const Icon = col.icon;
          return (
            <Card key={col.status} className="flex flex-col">
              <CardHeader className="flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-3.5 w-3.5 ${col.iconClass}`} />
                  <CardTitle className="text-xs">{col.label}</CardTitle>
                  <span className="rounded-sm border border-border bg-card/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {col.items.length}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6"><Plus className="h-3.5 w-3.5" /></Button>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                {col.items.length === 0 && (
                  <div className="rounded-md border border-dashed border-border p-6 text-center text-[11px] text-muted-foreground">
                    No {col.label.toLowerCase()}
                  </div>
                )}
                {col.items.map((p) => (
                  <div
                    key={p.id}
                    className="group rounded-md border border-border bg-card/60 p-3 hover:border-muted-foreground/40 transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[10px] font-mono text-muted-foreground">#{p.id.toUpperCase()}</div>
                      <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="mt-1.5 text-sm font-medium text-foreground leading-snug">{p.type}</div>
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <User className="h-3 w-3" /> {p.patientName}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(p.scheduledAt, { month: "short", day: "2-digit" })}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(p.scheduledAt)}</span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <Badge variant="outline" className="gap-1">
                        <MapPin className="h-2.5 w-2.5" /> {p.room}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px]">
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Today's Schedule</CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">IR-Suite 1 & 2 · auto-synced with Appointments</div>
          </div>
          <Tabs defaultValue="day">
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[760px] p-5 space-y-2">
            {/* Time header */}
            <div className="grid grid-cols-[120px_repeat(10,1fr)] gap-1 pb-2 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <div>Room</div>
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="text-center">{String(8 + i).padStart(2, "0")}:00</div>
              ))}
            </div>
            {["IR-Suite 1", "IR-Suite 2"].map((room) => (
              <div key={room} className="grid grid-cols-[120px_repeat(10,1fr)] gap-1 items-center py-2">
                <div className="text-xs font-medium text-foreground">{room}</div>
                {Array.from({ length: 10 }, (_, i) => {
                  const hr = 8 + i;
                  const hit = procedures.find(
                    (p) =>
                      p.room === room &&
                      p.scheduledAt.slice(0, 10) === MOCK_TODAY &&
                      new Date(p.scheduledAt).getUTCHours() === hr
                  );
                  if (!hit) return <div key={i} className="h-10 rounded border border-dashed border-border/70" />;
                  const variant =
                    hit.status === "completed" ? "success" :
                    hit.status === "in-progress" ? "primary" : "warning";
                  return (
                    <div
                      key={i}
                      className={`h-10 rounded px-2 py-1 border text-[10px] truncate flex flex-col justify-center ${
                        variant === "primary" ? "bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground" :
                        variant === "success" ? "bg-success/10 border-success/30 text-success" :
                        "bg-warning/10 border-warning/30 text-warning"
                      }`}
                    >
                      <div className="font-medium truncate">{hit.type}</div>
                      <div className="opacity-70 truncate">{hit.patientName}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
