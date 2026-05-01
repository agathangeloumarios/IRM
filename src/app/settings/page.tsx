"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Save, Palette, Building2, Stethoscope, ShieldCheck, Bell, Keyboard,
  Check, Paintbrush, Plus, Pencil, Trash2, X,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useProcedureTypes } from "@/lib/procedure-types-store";
import { ProcedureType } from "@/lib/mock-data";

const practiceSchema = z.object({
  name: z.string().min(2, "Practice name is required"),
  npi: z.string(),
  address: z.string().min(5, "Address required"),
  phone: z.string().min(7, "Phone required"),
  email: z.string().email("Valid email required"),
});
type PracticeForm = z.infer<typeof practiceSchema>;

const PRACTICE_SETTINGS_KEY = "irm:settings:practice:v1";

const PRACTICE_DEFAULTS: PracticeForm = {
  name: "Solo IR · Bay Area",
  npi: "1234567890",
  address: "450 Sutter St, Suite 1200, San Francisco, CA 94108",
  phone: "+1 (415) 555-0100",
  email: "reception@solo-ir.example",
};

const accents = [
  { name: "Orange", value: "#F96903", active: true },
  { name: "Green", value: "#06E575" },
  { name: "Blue", value: "#297DFF" },
  { name: "Purple", value: "#AC47FC" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Rose", value: "#F43F5E" },
];

function ProcedureTypesPanel() {
  const { types, addType, updateType, deleteType, toggleActive } = useProcedureTypes();

  const [draft, setDraft] = React.useState({ name: "", duration: 60, cpt: "" });
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState<{ name: string; duration: number; cpt: string }>({ name: "", duration: 60, cpt: "" });

  const canAdd = draft.name.trim().length >= 2 && draft.duration > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    addType({
      name: draft.name,
      defaultDurationMin: draft.duration,
      cpt: draft.cpt,
      active: true,
    });
    setDraft({ name: "", duration: 60, cpt: "" });
  };

  const startEdit = (t: ProcedureType) => {
    setEditingId(t.id);
    setEditDraft({ name: t.name, duration: t.defaultDurationMin, cpt: t.cpt || "" });
  };

  const commitEdit = () => {
    if (!editingId) return;
    updateType(editingId, {
      name: editDraft.name.trim(),
      defaultDurationMin: editDraft.duration,
      cpt: editDraft.cpt.trim() || undefined,
    });
    setEditingId(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Procedure Types</CardTitle>
        <CardDescription>
          Customize available procedure types, default durations, and CPT codes. Used across the Schedule Procedure dialog.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add new */}
        <div className="rounded-md border border-border bg-card/60 p-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_110px_110px_auto] gap-2">
            <Input
              placeholder="Procedure name (e.g. Thyroid Ablation)"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <Input
              type="number" min={15} step={15}
              placeholder="min"
              value={draft.duration}
              onChange={(e) => setDraft({ ...draft, duration: Number(e.target.value) || 0 })}
            />
            <Input
              placeholder="CPT"
              value={draft.cpt}
              onChange={(e) => setDraft({ ...draft, cpt: e.target.value })}
            />
            <Button variant="primary" size="sm" onClick={handleAdd} disabled={!canAdd}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {types.length === 0 && (
            <div className="rounded-md border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              No procedure types yet.
            </div>
          )}
          {types.map((t, i) => {
            const editing = editingId === t.id;
            return (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-card/60 p-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-[10px] font-mono text-muted-foreground w-6 shrink-0">
                    #{String(i + 1).padStart(2, "0")}
                  </span>
                  {!editing ? (
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{t.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Default duration: {t.defaultDurationMin} min
                        {t.cpt ? ` · CPT: ${t.cpt}` : ""}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-[1fr_90px_90px] gap-2 flex-1">
                      <Input
                        value={editDraft.name}
                        onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                      />
                      <Input
                        type="number" min={15} step={15}
                        value={editDraft.duration}
                        onChange={(e) => setEditDraft({ ...editDraft, duration: Number(e.target.value) || 0 })}
                      />
                      <Input
                        value={editDraft.cpt}
                        onChange={(e) => setEditDraft({ ...editDraft, cpt: e.target.value })}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!editing ? (
                    <>
                      <Badge variant={t.active ? "success" : "outline"}>
                        {t.active ? "Active" : "Disabled"}
                      </Badge>
                      <Switch
                        checked={t.active}
                        onCheckedChange={(v) => toggleActive(t.id, !!v)}
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(t)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        title="Delete"
                        onClick={() => {
                          if (confirm(`Delete procedure type "${t.name}"?`)) deleteType(t.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Cancel" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="primary" size="sm" className="h-7" onClick={commitEdit}>
                        <Save className="h-3.5 w-3.5" /> Save
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{ ok: boolean; deleted: number; error?: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PracticeForm>({
    resolver: zodResolver(practiceSchema),
    defaultValues: PRACTICE_DEFAULTS,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRACTICE_SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PracticeForm>;
      reset({ ...PRACTICE_DEFAULTS, ...parsed });
    } catch {
      // Ignore malformed saved state and keep defaults.
    }
  }, [reset]);

  const onSubmit = async (values: PracticeForm) => {
    localStorage.setItem(PRACTICE_SETTINGS_KEY, JSON.stringify(values));
    await new Promise((r) => setTimeout(r, 600));
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  };

  const purgeRedactedPatients = async () => {
    setPurging(true);
    setPurgeResult(null);
    try {
      const res = await fetch("/api/admin/patients/purge-redacted", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; deleted?: number; error?: string };
      if (!res.ok || !data.ok) {
        setPurgeResult({ ok: false, deleted: 0, error: data.error || "purge_failed" });
        return;
      }
      setPurgeResult({ ok: true, deleted: data.deleted || 0 });
    } catch {
      setPurgeResult({ ok: false, deleted: 0, error: "network_error" });
    } finally {
      setPurging(false);
    }
  };

  return (
    <PageShell
      title="Settings"
      subtitle="System configuration · theme · practice profile · procedure types · preferences"
      actions={
        <Button variant="primary" size="sm" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
          <Save className="h-4 w-4" />
          {saved ? "Saved" : "Save Changes"}
          {saved && <Check className="h-3.5 w-3.5 text-success" />}
        </Button>
      }
    >
      <Tabs defaultValue="practice" className="space-y-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="practice"><Building2 className="h-3.5 w-3.5" /> Practice</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="h-3.5 w-3.5" /> Appearance</TabsTrigger>
          <TabsTrigger value="procedures"><Stethoscope className="h-3.5 w-3.5" /> Procedure Types</TabsTrigger>
          <TabsTrigger value="security"><ShieldCheck className="h-3.5 w-3.5" /> Security & HIPAA</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
          <TabsTrigger value="shortcuts"><Keyboard className="h-3.5 w-3.5" /> Shortcuts</TabsTrigger>
        </TabsList>

        {/* Practice info */}
        <TabsContent value="practice">
          <Card>
            <CardHeader>
              <CardTitle>Practice Information</CardTitle>
              <CardDescription>These details appear on reports, invoices, and printed documents.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label>Practice Name</Label>
                  <Input {...register("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>NPI Number</Label>
                  <Input {...register("npi")} />
                  {errors.npi && <p className="text-xs text-destructive">{errors.npi.message}</p>}
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Address</Label>
                  <Input {...register("address")} />
                  {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input {...register("phone")} />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" {...register("email")} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme Accent</CardTitle>
              <CardDescription>Select the primary accent color used across the interface.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {accents.map((a) => (
                  <button
                    key={a.value}
                    className={cn(
                      "group rounded-md border p-3 flex flex-col items-center gap-2 transition",
                      a.active ? "border-primary-foreground/40 bg-primary-foreground/5" : "border-border hover:border-muted"
                    )}
                  >
                    <div
                      className="h-10 w-full rounded"
                      style={{ background: `linear-gradient(135deg, ${a.value}, ${a.value}55)` }}
                    />
                    <div className="flex items-center gap-1 text-xs text-foreground">
                      {a.name}
                      {a.active && <Check className="h-3 w-3 text-success" />}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Display</CardTitle>
              <CardDescription>Interface density, motion, and rendering preferences.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {[
                { label: "Dark Mode", desc: "Always on — optimized for radiology reading environments.", on: true },
                { label: "Reduce Motion", desc: "Minimize animation for accessibility and reading rooms.", on: false },
                { label: "High Contrast", desc: "Increase separation between text and background.", on: false },
                { label: "Compact Density", desc: "Show more rows per screen in tables and lists.", on: true },
              ].map((row, i) => (
                <div key={row.label} className={cn("flex items-center justify-between py-4", i === 0 && "pt-0")}>
                  <div>
                    <div className="text-sm text-foreground font-medium">{row.label}</div>
                    <div className="text-xs text-muted-foreground">{row.desc}</div>
                  </div>
                  <Switch defaultChecked={row.on} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Procedure types */}
        <TabsContent value="procedures">
          <ProcedureTypesPanel />
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>HIPAA Compliance</CardTitle>
                <CardDescription>All PHI is encrypted at rest and in transit. Audit logging is always on.</CardDescription>
              </div>
              <Badge variant="success" className="gap-1"><ShieldCheck className="h-3 w-3" /> Compliant</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { l: "AES-256 Encryption", v: "At rest & in transit" },
                  { l: "Audit Trail", v: "6-year retention" },
                  { l: "Access Control", v: "Role-based · MFA enforced" },
                  { l: "Session Timeout", v: "15 minutes idle" },
                  { l: "BAA on File", v: "Signed · up to date" },
                  { l: "Data Residency", v: "US-West · SOC 2 Type II" },
                ].map((s) => (
                  <div key={s.l} className="rounded-md border border-border bg-card/60 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
                    <div className="mt-1 text-sm text-foreground font-medium">{s.v}</div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">Admin Data Purge</div>
                  <div className="text-xs text-muted-foreground">
                    Remove all redacted patient records immediately from persistence.
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={purgeRedactedPatients}
                  disabled={purging}
                >
                  <Trash2 className="h-4 w-4" />
                  {purging ? "Purging..." : "Purge Redacted Data"}
                </Button>
              </div>

              {purgeResult && (
                <div className={cn(
                  "rounded-md border px-3 py-2 text-xs",
                  purgeResult.ok
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-destructive/40 bg-destructive/10 text-destructive",
                )}>
                  {purgeResult.ok
                    ? `Purge complete. Deleted ${purgeResult.deleted} record(s).`
                    : `Purge failed: ${purgeResult.error || "unknown_error"}`}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Access & Authentication</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {[
                { label: "Require MFA on Login", desc: "TOTP or WebAuthn", on: true },
                { label: "Auto-lock After Idle", desc: "Lock screen after 15 minutes of inactivity", on: true },
                { label: "IP Allowlist", desc: "Restrict access to known clinical networks", on: false },
                { label: "Biometric Unlock", desc: "Touch ID / Face ID on supported devices", on: true },
              ].map((row, i) => (
                <div key={row.label} className={cn("flex items-center justify-between py-4", i === 0 && "pt-0")}>
                  <div>
                    <div className="text-sm text-foreground font-medium">{row.label}</div>
                    <div className="text-xs text-muted-foreground">{row.desc}</div>
                  </div>
                  <Switch defaultChecked={row.on} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
            <CardContent className="divide-y divide-border">
              {[
                "New patient imported", "Procedure status changed", "Report locked/signed",
                "Duplicate record detected", "Archive auto-run completed", "Daily practice summary",
              ].map((n, i) => (
                <div key={n} className={cn("flex items-center justify-between py-3", i === 0 && "pt-0")}>
                  <div className="text-sm text-foreground">{n}</div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">In-app</span><Switch defaultChecked={i % 2 === 0} /></div>
                    <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Email</span><Switch defaultChecked={i % 3 === 0} /></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shortcuts */}
        <TabsContent value="shortcuts">
          <Card>
            <CardHeader><CardTitle>Keyboard Shortcuts</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { k: "⌘ K", d: "Open global search" },
                { k: "⌘ N", d: "New patient" },
                { k: "⌘ ⇧ P", d: "New procedure" },
                { k: "⌘ R", d: "Generate report" },
                { k: "G then D", d: "Go to Dashboard" },
                { k: "G then P", d: "Go to Patients" },
                { k: "G then A", d: "Go to Analytics" },
                { k: "?", d: "Show all shortcuts" },
              ].map((s) => (
                <div key={s.k} className="flex items-center justify-between rounded-md border border-border bg-card/60 px-3 py-2">
                  <span className="text-sm text-foreground">{s.d}</span>
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {s.k}
                  </kbd>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
