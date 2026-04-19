"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Filter, Upload, Plus, ShieldCheck, FileCode2,
  Phone, AlertTriangle, CheckCircle2, ChevronRight, CalendarPlus,
  LayoutGrid, List,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PATIENT_TEMPLATE_FIELDS, Patient, PatientStatus } from "@/lib/mock-data";
import { formatDate, initials } from "@/lib/utils";
import { usePatients } from "@/lib/patient-store";
import { XmlImportDialog } from "@/components/patients/xml-import-dialog";
import { PatientDetailDialog } from "@/components/patients/patient-detail-dialog";
import { useRouter } from "next/navigation";

const statusVariant: Record<PatientStatus, "success" | "warning" | "outline" | "primary"> = {
  active: "success",
  inactive: "warning",
  completed: "primary",
  archived: "outline",
};

type ViewMode = "list" | "card";

export default function PatientsPage() {
  const { patients, template } = usePatients();
  const activePatients = useMemo(() => patients.filter((p) => p.status !== "archived"), [patients]);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [view, setView] = useState<ViewMode>("list");

  const counts = useMemo(() => {
    const c = { all: activePatients.length, active: 0, inactive: 0, completed: 0 };
    for (const p of activePatients) {
      if (p.status in c) (c as any)[p.status]++;
    }
    return c;
  }, [activePatients]);

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    return activePatients.filter((p) => {
      const matchQ =
        !query ||
        p.fullName.toLowerCase().includes(query) ||
        p.mrn.toLowerCase().includes(query) ||
        p.docId.toLowerCase().includes(query) ||
        p.referralId.toLowerCase().includes(query) ||
        p.activity.toLowerCase().includes(query);
      const matchTab = tab === "all" || p.status === tab;
      const matchGender = genderFilter === "all" || p.gender === genderFilter;
      return matchQ && matchTab && matchGender;
    });
  }, [q, tab, genderFilter, activePatients]);

  const templateSource = patients.find((p) => p.isTemplateSource);

  return (
    <PageShell
      title="Patients"
      subtitle="Patient records · 11-field Greek template · XML referral import · status-driven archiving"
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import XML
          </Button>
          <Button variant="primary" size="sm" disabled>
            <Plus className="h-4 w-4" /> New Patient
          </Button>
        </>
      }
    >
      {/* Template info banner */}
      <Card className="border-primary-foreground/20">
        <CardContent className="p-4 flex items-start gap-4">
          <div className="h-9 w-9 rounded-md bg-primary-foreground/10 border border-primary-foreground/30 flex items-center justify-center shrink-0">
            <FileCode2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-sm font-medium text-foreground">Enforced Field Template Active</div>
              <Badge variant="primary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Locked</Badge>
              <Badge variant="success">XML Validation On</Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {templateSource ? (
                <>
                  Template derived from patient{" "}
                  <span className="text-primary-foreground font-medium">
                    {templateSource.fullName} ({templateSource.mrn})
                  </span>
                  {" · "}All subsequent imports validated against this structure.
                </>
              ) : (
                "Import the first XML or add a patient — the template will lock on that structure."
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PATIENT_TEMPLATE_FIELDS.map((f) => (
                <span
                  key={f.key}
                  className="rounded border border-border bg-card/60 px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                  title={`XML · ${f.xml}`}
                >
                  {f.label}
                </span>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import
          </Button>
        </CardContent>
      </Card>

      {/* Filter bar + view toggle */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
            <TabsTrigger value="inactive">Inactive ({counts.inactive})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({counts.completed})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, MRN, ΑΔΤ, referral, activity..."
              className="pl-9"
            />
          </div>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All gender</SelectItem>
              <SelectItem value="Α">Άνδρας (Α)</SelectItem>
              <SelectItem value="Θ">Θήλυ (Θ)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
          {/* View toggle */}
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`px-2.5 py-1.5 transition ${view === "list" ? "bg-primary-foreground/10 text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-card"}`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("card")}
              className={`px-2.5 py-1.5 border-l border-border transition ${view === "card" ? "bg-primary-foreground/10 text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-card"}`}
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── CARD VIEW ── */}
      {view === "card" && (
        <>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <AlertTriangle className="h-6 w-6 opacity-50" />
              <span className="text-sm">No patients match your filters</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filtered.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group rounded-md border border-border bg-card/60 p-4 hover:border-muted-foreground/40 transition cursor-pointer flex flex-col gap-3"
                  onClick={() => setSelected(p)}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-md bg-secondary border border-secondary-foreground/20 flex items-center justify-center text-xs font-semibold text-secondary-foreground shrink-0">
                      {initials(p.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">{p.fullName}</span>
                        {p.isTemplateSource && (
                          <Badge variant="primary" className="gap-1 py-0">
                            <ShieldCheck className="h-2.5 w-2.5" /> Template
                          </Badge>
                        )}
                        {p.source === "xml" && (
                          <Badge variant="outline" className="py-0 gap-1">
                            <FileCode2 className="h-2.5 w-2.5" /> XML
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">{p.mrn}</div>
                    </div>
                    <Badge variant={statusVariant[p.status]} className="capitalize shrink-0">{p.status}</Badge>
                  </div>

                  {/* Grid of key fields */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <div><span className="text-muted-foreground">ΑΔΤ </span><span className="text-foreground font-mono">{p.docId || "—"}</span></div>
                    <div><span className="text-muted-foreground">DOB </span><span className="text-foreground">{p.dob || "—"}</span></div>
                    <div><span className="text-muted-foreground">Φύλο </span><span className="text-foreground">{p.gender || "—"}</span></div>
                    <div><span className="text-muted-foreground">Εξετ. </span><span className="text-foreground">{p.visitDate ? formatDate(p.visitDate, { month: "short", day: "2-digit" }) : "—"}</span></div>
                    {p.phone && (
                      <div className="col-span-2 flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-foreground">{p.phone}</span>
                      </div>
                    )}
                    <div className="col-span-2 text-muted-foreground truncate" title={p.activity}>
                      {p.activity}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between gap-2 border-t border-border pt-2 mt-auto">
                    <div className="text-[10px] text-muted-foreground truncate">{p.referringDoctor || "—"}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] shrink-0"
                      title="Schedule procedure"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/procedures?patient=${encodeURIComponent(p.id)}&status=scheduled`);
                      }}
                    >
                      <CalendarPlus className="h-3.5 w-3.5" /> Schedule
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Showing {filtered.length} of {activePatients.length} patients
          </div>
        </>
      )}

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">MRN</th>
                    <th className="px-4 py-3 text-left font-medium">Ονοματεπώνυμο</th>
                    <th className="px-4 py-3 text-left font-medium">ΑΔΤ</th>
                    <th className="px-4 py-3 text-left font-medium">Αρ. Παραπεμπτικού</th>
                    <th className="px-4 py-3 text-left font-medium">Δραστηριότητα</th>
                    <th className="px-4 py-3 text-left font-medium">Παραπ. Ιατρός</th>
                    <th className="px-4 py-3 text-left font-medium">Ημ. Εξετ.</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="hover:bg-card/40 transition-colors cursor-pointer"
                      onClick={() => setSelected(p)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{p.mrn}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-md bg-secondary border border-secondary-foreground/20 flex items-center justify-center text-[10px] font-semibold text-secondary-foreground">
                            {initials(p.fullName)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-foreground">{p.fullName}</span>
                              {p.isTemplateSource && (
                                <Badge variant="primary" className="gap-1 py-0">
                                  <ShieldCheck className="h-2.5 w-2.5" /> Template
                                </Badge>
                              )}
                              {p.source === "xml" && (
                                <Badge variant="outline" className="py-0 gap-1">
                                  <FileCode2 className="h-2.5 w-2.5" /> XML
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                              <span>{p.gender || "—"}</span>
                              <span className="text-border">·</span>
                              <span>DOB {p.dob || "—"}</span>
                              {p.phone && (
                                <>
                                  <span className="text-border">·</span>
                                  <span className="inline-flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{p.phone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{p.docId || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{p.referralId || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate">{p.activity}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.referringDoctor || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.visitDate ? formatDate(p.visitDate) : "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[p.status]} className="capitalize">{p.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px]"
                            title="Schedule a procedure for this patient"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/procedures?patient=${encodeURIComponent(p.id)}&status=scheduled`);
                            }}
                          >
                            <CalendarPlus className="h-3.5 w-3.5" /> Schedule
                          </Button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <AlertTriangle className="h-6 w-6 opacity-50" />
                          <div>No patients match your filters</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <div className="text-xs text-muted-foreground">
                Showing {filtered.length} of {activePatients.length} patients
                {template && (
                  <> · Source: <span className="font-mono text-foreground capitalize">{template.source}</span></>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm" disabled>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <XmlImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <PatientDetailDialog
        patient={selected}
        open={!!selected}
        onOpenChange={(v) => { if (!v) setSelected(null); }}
      />
    </PageShell>
  );
}
