"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Save, Palette, Building2, Stethoscope, ShieldCheck, Bell, Keyboard,
  Check, Paintbrush,
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

const practiceSchema = z.object({
  name: z.string().min(2, "Practice name is required"),
  npi: z.string().regex(/^\d{10}$/, "NPI must be 10 digits"),
  address: z.string().min(5, "Address required"),
  phone: z.string().min(7, "Phone required"),
  email: z.string().email("Valid email required"),
});
type PracticeForm = z.infer<typeof practiceSchema>;

const accents = [
  { name: "Orange", value: "#F96903", active: true },
  { name: "Green", value: "#06E575" },
  { name: "Blue", value: "#297DFF" },
  { name: "Purple", value: "#AC47FC" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Rose", value: "#F43F5E" },
];

const procTypes = [
  "Uterine Fibroid Embolization",
  "TACE - Liver",
  "Peripheral Angioplasty",
  "Prostate Artery Embolization",
  "Varicocele Embolization",
  "Biliary Drainage",
  "Angiogram",
  "Biopsy - Core Needle",
];

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PracticeForm>({
    resolver: zodResolver(practiceSchema),
    defaultValues: {
      name: "Solo IR · Bay Area",
      npi: "1234567890",
      address: "450 Sutter St, Suite 1200, San Francisco, CA 94108",
      phone: "+1 (415) 555-0100",
      email: "reception@solo-ir.example",
    },
  });

  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 600));
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
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
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Procedure Types</CardTitle>
                <CardDescription>Customize available procedure types and their defaults.</CardDescription>
              </div>
              <Button variant="primary" size="sm"><Paintbrush className="h-4 w-4" /> Add Type</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {procTypes.map((p, i) => (
                <div key={p} className="flex items-center justify-between rounded-md border border-border bg-card/60 p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-muted-foreground w-6">#{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <div className="text-sm font-medium text-foreground">{p}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Default duration: {60 + i * 10} min · CPT: 37{240 + i}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Active</Badge>
                    <Switch defaultChecked />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
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
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
