"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, Search, Calendar, Clock, MapPin, User,
  CheckCircle2, Circle, XCircle, Copy, Pencil,
  ListChecks, Trash2, LayoutGrid, List,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Procedure, ProcedureStatus, MOCK_TODAY,
} from "@/lib/mock-data";
import { formatDate, formatTime } from "@/lib/utils";
import {
  useProcedures, copyProcedureToClipboard,
} from "@/lib/procedure-store";
import { ProcedureDialog } from "@/components/procedures/procedure-dialog";

const cols: {
  status: ProcedureStatus; label: string; iconClass: string; icon: any;
}[] = [
  { status: "scheduled",    label: "Scheduled",    iconClass: "text-warning",             icon: Circle },
  { status: "waiting-list", label: "Waiting List", iconClass: "text-primary-foreground",  icon: ListChecks },
  { status: "completed",    label: "Completed",    iconClass: "text-success",             icon: CheckCircle2 },
  { status: "cancelled",    label: "Cancelled",    iconClass: "text-destructive",         icon: XCircle },
];

const STATUS_BADGE: Record<ProcedureStatus, "success" | "warning" | "primary" | "destructive" | "outline"> = {
  scheduled: "warning",
  "waiting-list": "primary",
  completed: "success",
  cancelled: "destructive",
};

export default function ProceduresPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { procedures, setStatus, deleteProcedure } = useProcedures();

  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Procedure | null>(null);
  const [presetPatientId, setPresetPatientId] = useState<string | undefined>();
  const [presetStatus, setPresetStatus] = useState<ProcedureStatus | undefined>();
  type ViewMode = "card" | "list";
  const [view, setView] = useState<ViewMode>("card");

  // Deep-link: /procedures?patient=<id>[&status=waiting-list]
  useEffect(() => {
    const pid = sp?.get("patient");
    const ps = sp?.get("status") as ProcedureStatus | null;
    if (pid) {
      setEditing(null);
      setPresetPatientId(pid);
      setPresetStatus(ps === "scheduled" || ps === "waiting-list" ? ps : "scheduled");
      setDialogOpen(true);
      const u = new URL(window.location.href);
      u.searchParams.delete("patient");
      u.searchParams.delete("status");
      router.replace(u.pathname + (u.search ? `?${u.searchParams.toString()}` : ""));
    }
  }, [sp, router]);

  const grouped = useMemo(() => {
    const filtered = procedures.filter(
      (p) =>
        !q ||
        p.patientName.toLowerCase().includes(q.toLowerCase()) ||
        p.type.toLowerCase().includes(q.toLowerCase()) ||
        (p.patientMrn || "").toLowerCase().includes(q.toLowerCase())
    );
    return cols.map((c) => ({
      ...c,
      items: filtered
        .filter((p) => p.status === c.status)
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    }));
  }, [q, procedures]);

  const openCreate = (status: ProcedureStatus = "scheduled") => {
    setEditing(null);
    setPresetPatientId(undefined);
    setPresetStatus(status);
    setDialogOpen(true);
  };

  const openEdit = (p: Procedure) => {
    setEditing(p);
    setPresetPatientId(undefined);
    setPresetStatus(undefined);
    setDialogOpen(true);
  };

  const handleCopy = async (p: Procedure) => {
    const ok = await copyProcedureToClipboard(p);
    setToast(ok ? `Copied ${p.patientName}` : "Copy failed");
    setTimeout(() => setToast(null), 1600);
  };

  return (
    <PageShell
      title="IR Procedures"
      subtitle="Schedule, waiting list, and completed procedures · auto-synced with the dashboard"
      actions={
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, MRN, type…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 w-[260px]"
            />
          </div>
          <div className="flex items-center rounded-md border border-border bg-card/60 p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`rounded p-1.5 transition ${view === "list" ? "bg-primary-foreground/10 text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("card")}
              className={`rounded p-1.5 transition ${view === "card" ? "bg-primary-foreground/10 text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Card / Kanban view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => openCreate("waiting-list")}>
            <ListChecks className="h-4 w-4" /> Add to Waiting List
          </Button>
          <Button variant="primary" size="sm" onClick={() => openCreate("scheduled")}>
            <Plus className="h-4 w-4" /> Schedule Procedure
          </Button>
        </>
      }
    >
      {toast && (
        <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs text-success inline-block">
          {toast}
        </div>
      )}

      {/* List view */}
      {view === "list" && (() => {
        const all = procedures
          .filter((p) => !q || p.patientName.toLowerCase().includes(q.toLowerCase()) || p.type.toLowerCase().includes(q.toLowerCase()) || (p.patientMrn || "").toLowerCase().includes(q.toLowerCase()))
          .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
        return (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">#</th>
                    <th className="px-4 py-3 text-left font-medium">Patient</th>
                    <th className="px-4 py-3 text-left font-medium">MRN</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Room</th>
                    <th className="px-4 py-3 text-left font-medium">Date &amp; Time</th>
                    <th className="px-4 py-3 text-left font-medium">Duration</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {all.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground text-xs">
                        No procedures found.
                      </td>
                    </tr>
                  )}
                  {all.map((p) => (
                    <tr key={p.id} className="hover:bg-card/60 transition group">
                      <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">
                        {p.id.toUpperCase().slice(0, 8)}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="text-left font-medium text-foreground hover:text-primary-foreground transition"
                        >
                          {p.patientName}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                        {p.patientMrn || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs">{p.type}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.room}</td>
                      <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                        {formatDate(p.scheduledAt, { month: "short", day: "2-digit" })} · {formatTime(p.scheduledAt)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.durationMin}m</td>
                      <td className="px-4 py-2.5">
                        <Select
                          value={p.status}
                          onValueChange={(v) => setStatus(p.id, v as ProcedureStatus)}
                        >
                          <SelectTrigger className="h-6 px-2 text-[10px] w-[118px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="waiting-list">Waiting List</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit" onClick={() => openEdit(p)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Copy" onClick={() => handleCopy(p)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="Delete"
                            onClick={() => { if (confirm(`Delete procedure for ${p.patientName}?`)) deleteProcedure(p.id); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })()}

      {/* Card / Kanban view */}
      {view === "card" && (
        <>

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
                <Button
                  variant="ghost" size="icon" className="h-6 w-6"
                  title={`New ${col.label}`}
                  onClick={() => openCreate(col.status)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
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
                    className="group rounded-md border border-border bg-card/60 p-3 hover:border-muted-foreground/40 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[10px] font-mono text-muted-foreground">
                        #{p.id.toUpperCase().slice(0, 14)}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost" size="icon" className="h-5 w-5"
                          title="Edit"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-5 w-5 text-destructive"
                          title="Delete"
                          onClick={() => {
                            if (confirm(`Delete procedure for ${p.patientName}?`)) {
                              deleteProcedure(p.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="mt-1.5 text-left w-full text-sm font-medium text-foreground leading-snug hover:text-primary-foreground transition"
                    >
                      {p.type}
                    </button>
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <User className="h-3 w-3" /> {p.patientName}
                      {p.patientMrn && (
                        <span className="font-mono text-[10px] text-muted-foreground/80">· {p.patientMrn}</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(p.scheduledAt, { month: "short", day: "2-digit" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatTime(p.scheduledAt)}
                      </span>
                      <span>{p.durationMin}m</span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <Badge variant="outline" className="gap-1">
                        <MapPin className="h-2.5 w-2.5" /> {p.room}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Select
                          value={p.status}
                          onValueChange={(v) => setStatus(p.id, v as ProcedureStatus)}
                        >
                          <SelectTrigger className="h-6 px-2 text-[10px] w-[118px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="waiting-list">Waiting List</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]"
                          onClick={() => handleCopy(p)}
                          title="Copy details to clipboard"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
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
            <div className="mt-1 text-xs text-muted-foreground">IR-Suite 1 &amp; 2 · auto-synced with Appointments</div>
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
                      new Date(p.scheduledAt).getUTCHours() === hr &&
                      p.status !== "cancelled"
                  );
                  if (!hit) return <div key={i} className="h-10 rounded border border-dashed border-border/70" />;
                  const variant = STATUS_BADGE[hit.status];
                  return (
                    <button
                      key={i}
                      onClick={() => openEdit(hit)}
                      className={`h-10 rounded px-2 py-1 border text-[10px] truncate flex flex-col justify-center text-left ${
                        variant === "primary" ? "bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground" :
                        variant === "success" ? "bg-success/10 border-success/30 text-success" :
                        variant === "destructive" ? "bg-destructive/10 border-destructive/30 text-destructive" :
                        "bg-warning/10 border-warning/30 text-warning"
                      }`}
                    >
                      <div className="font-medium truncate">{hit.type}</div>
                      <div className="opacity-70 truncate">{hit.patientName}</div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

        </>
      )}

      <ProcedureDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        procedure={editing}
        presetPatientId={presetPatientId}
        presetStatus={presetStatus}
      />
    </PageShell>
  );
}

