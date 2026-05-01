"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText, Sparkles, Lock, Unlock, FileDown, Loader2, Copy, Trash2,
  CheckCircle2, User, Stethoscope, Upload, RotateCcw, Wand2,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePatients } from "@/lib/patient-store";
import {
  useTemplates,
  resolveChrome, ResolvedChrome,
} from "@/lib/template-store";
import {
  applyPlaceholders,
  PLACEHOLDER_KEYS,
  type PlaceholderContext,
} from "@/lib/placeholders";
import type { Patient } from "@/lib/mock-data";

// ---- Per-patient edit persistence (keyed by templateId + patientId) --------

const EDITS_KEY = "irm:consultation-edits:v1";
const editKey = (tplId: string, patientId: string) => `${tplId}::${patientId}`;

function loadEdits(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(EDITS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveEdits(edits: Record<string, string>) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(EDITS_KEY, JSON.stringify(edits)); } catch {}
}

// ---- Greek formatting helpers ---------------------------------------------

const GR_DATE = (ymd: string) => {
  if (!ymd) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return ymd;
  return `${m[3]}-${m[2]}-${m[1]}`;
};

function buildPlaceholderContext(p: Patient): PlaceholderContext {
  const today = new Date();
  const todayGR = `${String(today.getDate()).padStart(2, "0")}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${today.getFullYear()}`;

  // Split fullName into first / last (best-effort). Upstream XML also splits these.
  const parts = p.fullName.trim().split(/\s+/);
  const last = parts.length > 1 ? parts.slice(-1)[0] : "";
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : p.fullName;

  // activity may be "4309 — Εμβολισμός Προστάτη"
  const [actId, ...actRest] = p.activity.split("—").map((s) => s.trim());
  const actName = actRest.join(" — ");

  return {
    BeneficiaryName: first,
    BeneficiaryLastName: last,
    BeneficiaryDOB: GR_DATE(p.dob),
    BeneficiaryDocId: p.docId,
    ReferralId: p.referralId,
    BeneficiaryGender: p.gender,
    VisitDateTime: GR_DATE(p.visitDate),
    ReportDate: todayGR,
    ReferralActivityId: actId || "",
    ReferralActivityName: actName || p.activity,
    ReferralDoctorName: p.referringDoctor,
  };
}

// ---- Print / PDF export ---------------------------------------------------

function openPrintWindow(html: string, title: string) {
  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) return;
  w.document.write(`<!doctype html>
<html><head><meta charset="utf-8" /><title>${title}</title>
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #f3f3f3; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #111; }
.a4 { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 18mm 18mm 22mm 18mm; position: relative; page-break-after: always; }
.a4:last-child { page-break-after: auto; }
.hdr { display: flex; align-items: center; gap: 14px; padding-bottom: 10px; border-bottom: 2px solid var(--accent, #111); }
.logo { width: 48px; height: 48px; border-radius: 8px; background: var(--accent, #F96903); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; overflow: hidden; }
.logo img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
.sig-img { max-height: 22mm; max-width: 56mm; margin: 0 auto 4px; display: block; }
.prac-name { font-size: 14px; font-weight: 700; letter-spacing: 0.02em; }
.prac-sub { font-size: 10px; color: #555; }
.tpl-title { margin-top: 14px; font-size: 20px; font-weight: 600; }
.meta { font-size: 10px; color: #666; margin-top: 2px; }
.body { margin-top: 16px; font-size: 12px; line-height: 1.65; white-space: pre-wrap; }
.sig { margin-top: 42px; display: flex; justify-content: flex-end; }
.sig-block { width: 60mm; text-align: center; font-size: 11px; }
.sig-line { border-top: 1px solid #111; padding-top: 4px; }
.sig-name { font-weight: 600; }
.sig-title { font-size: 10px; color: #555; }
.sig-script { font-family: 'Brush Script MT', 'Segoe Script', cursive; font-size: 22px; color: #1d3a8a; margin-bottom: 2px; }
.ftr { position: absolute; left: 18mm; right: 18mm; bottom: 10mm; border-top: 1px solid #ddd; padding-top: 6px; font-size: 9px; color: #888; display: flex; justify-content: space-between; }
@media print { body { background: #fff; } .a4 { margin: 0; box-shadow: none; } }
</style></head><body>${html}<script>window.onload=()=>{setTimeout(()=>{window.print();},250);};</script></body></html>`);
  w.document.close();
}

// ---------------------------------------------------------------------------

export default function ConsultationReportsPage() {
  const { patients } = usePatients();
  const {
    templates, lockTemplate, duplicateTemplate, deleteTemplate,
  } = useTemplates();

  const activePatients = useMemo(
    () => patients.filter((p) => p.status === "active"),
    [patients]
  );

  const consultTemplates = useMemo(
    () => templates.filter((t) => t.category === "consultation"),
    [templates]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    consultTemplates.length > 0 ? [consultTemplates[0].id] : []
  );
  const [patientId, setPatientId] = useState<string>(
    activePatients[0]?.id ?? ""
  );
  const [filling, setFilling] = useState(false);
  const [progress, setProgress] = useState(0);
  // Per-patient edits: key = `${templateId}::${patientId}` -> edited body.
  // This is how every patient gets an individualized report while templates stay clean.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [activePreviewId, setActivePreviewId] = useState<string | null>(
    consultTemplates[0]?.id ?? null
  );

  // Hydrate edits from localStorage on mount, persist on change.
  useEffect(() => { setEdits(loadEdits()); }, []);
  useEffect(() => { saveEdits(edits); }, [edits]);

  const selectedTemplates = consultTemplates.filter((t) =>
    selectedIds.includes(t.id)
  );
  const selectedPatient =
    activePatients.find((p) => p.id === patientId) || activePatients[0];

  const toggleSelected = (id: string) => {
    setSelectedIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
    setActivePreviewId(id);
  };

  const aiAutoFill = async () => {
    if (!selectedPatient || selectedTemplates.length === 0) return;
    setFilling(true);
    setProgress(0);
    const ctx = buildPlaceholderContext(selectedPatient);

    const total = 12;
    for (let i = 0; i <= total; i++) {
      await new Promise((r) => setTimeout(r, 90));
      setProgress(Math.round((i / total) * 100));
    }

    const next: Record<string, string> = { ...edits };
    for (const t of selectedTemplates) {
      next[editKey(t.id, selectedPatient.id)] = applyPlaceholders(t.body, ctx);
    }
    setEdits(next);
    setFilling(false);
    if (!activePreviewId || !selectedIds.includes(activePreviewId)) {
      setActivePreviewId(selectedTemplates[0].id);
    }
  };

  const currentPreviewTpl =
    selectedTemplates.find((t) => t.id === activePreviewId) ||
    selectedTemplates[0];

  const bodyFor = (tplId: string) => {
    const tpl = consultTemplates.find((t) => t.id === tplId);
    if (!tpl) return "";
    if (!selectedPatient) return tpl.body;
    return edits[editKey(tpl.id, selectedPatient.id)] ?? tpl.body;
  };

  const currentBody = currentPreviewTpl ? bodyFor(currentPreviewTpl.id) : "";
  const currentIsEdited =
    !!currentPreviewTpl &&
    !!selectedPatient &&
    edits[editKey(currentPreviewTpl.id, selectedPatient.id)] !== undefined;

  const updateBody = (value: string) => {
    if (!currentPreviewTpl || !selectedPatient) return;
    setEdits((e) => ({
      ...e,
      [editKey(currentPreviewTpl.id, selectedPatient.id)]: value,
    }));
  };

  const resetToTemplate = () => {
    if (!currentPreviewTpl || !selectedPatient) return;
    setEdits((e) => {
      const next = { ...e };
      delete next[editKey(currentPreviewTpl.id, selectedPatient.id)];
      return next;
    });
  };

  const normalizePlaceholders = () => {
    if (!currentPreviewTpl || !selectedPatient) return;
    const ctx = buildPlaceholderContext(selectedPatient);
    updateBody(applyPlaceholders(currentBody, ctx));
  };

  const unresolved = currentBody
    ? PLACEHOLDER_KEYS.filter((k) =>
        new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}|\\[\\s*${k}\\s*\\]|<\\s*${k}\\s*>|\\$${k}\\b`).test(currentBody)
      )
    : [];

  const exportPdf = () => {
    if (selectedTemplates.length === 0) return;
    const pages = selectedTemplates
      .map((t) => renderA4Html(bodyFor(t.id), t.name, resolveChrome(t.chrome)))
      .join("\n");
    openPrintWindow(pages, `Consultation Reports · ${selectedPatient?.fullName ?? ""}`);
  };

  const exportSinglePdf = () => {
    if (!currentPreviewTpl) return;
    const html = renderA4Html(currentBody, currentPreviewTpl.name, resolveChrome(currentPreviewTpl.chrome));
    openPrintWindow(html, `${currentPreviewTpl.name} · ${selectedPatient?.fullName ?? ""}`);
  };

  return (
    <PageShell
      title="Consultation Reports"
      subtitle="Template-based reports · Word import · AI completion · Placeholder normalization · PDF export"
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = "/files")}
          >
            <Upload className="h-4 w-4" /> Manage Templates
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={exportPdf}
            disabled={selectedTemplates.length === 0 || !selectedPatient}
          >
            <FileDown className="h-4 w-4" />
            Export {selectedTemplates.length > 1 ? `${selectedTemplates.length} PDFs` : "PDF"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4">
        {/* Left column: templates + patient */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Templates ({consultTemplates.length})</span>
                <Badge variant="outline">{selectedIds.length} selected</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1.5 max-h-[520px] overflow-y-auto">
              {consultTemplates.length === 0 && (
                <div className="p-4 text-xs text-muted-foreground text-center">
                  No consultation templates yet. Upload one in{" "}
                  <a className="underline" href="/files">File Manager</a>.
                </div>
              )}
              {consultTemplates.map((t) => {
                const active = selectedIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    className={cn(
                      "rounded-md border p-3 transition-colors",
                      active
                        ? "border-primary-foreground/40 bg-primary-foreground/5"
                        : "border-border hover:border-muted"
                    )}
                  >
                    <button
                      onClick={() => toggleSelected(t.id)}
                      className="w-full text-left focus-ring"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={active}
                            readOnly
                            className="accent-primary"
                          />
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="text-sm font-medium text-foreground truncate">
                            {t.name}
                          </div>
                        </div>
                        {t.locked ? (
                          <Badge variant="success" className="gap-1">
                            <Lock className="h-2.5 w-2.5" /> Locked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Unlock className="h-2.5 w-2.5" /> Draft
                          </Badge>
                        )}
                      </div>
                    </button>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() => lockTemplate(t.id, !t.locked)}
                      >
                        {t.locked ? (
                          <><Unlock className="h-3 w-3" /> Unlock</>
                        ) : (
                          <><Lock className="h-3 w-3" /> Lock</>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() => {
                          const dup = duplicateTemplate(t.id);
                          if (dup) toggleSelected(dup.id);
                        }}
                      >
                        <Copy className="h-3 w-3" /> Duplicate
                      </Button>
                      {!t.locked && t.source !== "seed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] text-danger hover:text-danger"
                          onClick={() => {
                            deleteTemplate(t.id);
                            setSelectedIds((s) => s.filter((x) => x !== t.id));
                          }}
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Active Patient</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="mb-1 block">Select from Patients list</Label>
                <Select
                  value={patientId}
                  onValueChange={setPatientId}
                  disabled={activePatients.length === 0}
                >
                  <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                  <SelectContent>
                    {activePatients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.fullName} — {p.mrn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activePatients.length === 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    No active patients. Add or activate patients in{" "}
                    <a className="underline" href="/patients">Patients</a>.
                  </div>
                )}
              </div>

              {selectedPatient && (
                <div className="rounded-md border border-border bg-card/60 p-3 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <User className="h-3.5 w-3.5" /> {selectedPatient.fullName}
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-muted-foreground">
                    <span className="font-mono">{selectedPatient.mrn}</span>
                    <span>ΑΔΤ {selectedPatient.docId}</span>
                    <span>ΓΕΝ {GR_DATE(selectedPatient.dob)}</span>
                    <span>{selectedPatient.gender}</span>
                    <span className="col-span-2 truncate">{selectedPatient.activity}</span>
                    <span className="col-span-2 flex items-center gap-1">
                      <Stethoscope className="h-3 w-3" /> {selectedPatient.referringDoctor}
                    </span>
                  </div>
                </div>
              )}

              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={aiAutoFill}
                disabled={filling || !selectedPatient || selectedTemplates.length === 0}
              >
                {filling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {filling
                  ? "AI is filling..."
                  : `AI Auto-Fill ${selectedTemplates.length > 1 ? `· ${selectedTemplates.length} templates` : ""}`}
              </Button>
              {filling && <Progress value={progress} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Available Placeholders</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-[11px]">
              {[
                ["Ονοματεπώνυμο", "BeneficiaryName BeneficiaryLastName"],
                ["Ημ. Γέννησης", "BeneficiaryDOB"],
                ["ΑΔΤ", "BeneficiaryDocId"],
                ["Αρ. Παραπεμπτικού", "ReferralId"],
                ["Φύλο", "BeneficiaryGender"],
                ["Ημ. Εξετ.", "VisitDateTime"],
                ["Ημ. Γνωμάτευσης", "ReportDate (today)"],
                ["Δραστηριότητα", "ReferralActivityId ReferralActivityName"],
                ["Παραπ. Ιατρός", "ReferralDoctorName"],
              ].map(([label, keys]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded border border-border bg-card/60 px-2 py-1"
                >
                  <span className="text-muted-foreground">{label}:</span>
                  <span className="font-mono text-foreground text-[10px] truncate ml-2">
                    {keys}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column: A4 live preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <CardTitle>Live A4 Preview</CardTitle>
                  <div className="mt-1 text-xs text-muted-foreground">
                    210mm × 297mm · practice logo, header, doctor signature &amp; footer
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTemplates.length > 1 && (
                    <div className="flex rounded-md border border-border overflow-hidden">
                      {selectedTemplates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setActivePreviewId(t.id)}
                          className={cn(
                            "px-2.5 py-1 text-[11px]",
                            activePreviewId === t.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-card"
                          )}
                        >
                          {t.name.length > 22 ? t.name.slice(0, 22) + "…" : t.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportSinglePdf}
                    disabled={!currentPreviewTpl}
                  >
                    <FileDown className="h-4 w-4" /> Export This
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filling && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>Extracting patient data · resolving placeholders · composing</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {currentPreviewTpl ? (
                <div className="flex justify-center overflow-x-auto bg-muted/30 rounded-md p-4">
                  <A4Preview
                    body={currentBody}
                    templateName={currentPreviewTpl.name}
                    chrome={resolveChrome(currentPreviewTpl.chrome)}
                  />
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Select at least one template to preview.
                </div>
              )}

              <div className="flex items-center gap-2 text-xs pt-2">
                {unresolved.length === 0 ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    <span className="text-muted-foreground">
                      All placeholders resolved · template integrity verified
                    </span>
                  </>
                ) : (
                  <span className="text-warning">
                    {unresolved.length} unresolved placeholder{unresolved.length === 1 ? "" : "s"}: {unresolved.join(", ")}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Prominent editable report-preview.md (per-patient) */}
          {currentPreviewTpl && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      report-preview.md
                      {currentIsEdited && (
                        <Badge variant="warning" className="gap-1">Edited · {selectedPatient?.fullName}</Badge>
                      )}
                      {currentPreviewTpl.locked && (
                        <Badge variant="success" className="gap-1"><Lock className="h-2.5 w-2.5" /> Locked</Badge>
                      )}
                    </CardTitle>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Individualized draft for this patient · edits are saved locally and flow into the A4 preview &amp; PDF export.
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={normalizePlaceholders}
                      disabled={!selectedPatient || currentPreviewTpl.locked}
                    >
                      <Wand2 className="h-4 w-4" /> Normalize
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetToTemplate}
                      disabled={!currentIsEdited}
                    >
                      <RotateCcw className="h-4 w-4" /> Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => lockTemplate(currentPreviewTpl.id, !currentPreviewTpl.locked)}
                    >
                      {currentPreviewTpl.locked
                        ? <><Unlock className="h-4 w-4" /> Unlock</>
                        : <><Lock className="h-4 w-4" /> Lock</>}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={currentBody}
                  readOnly={currentPreviewTpl.locked || !selectedPatient}
                  onChange={(e) => updateBody(e.target.value)}
                  className="min-h-[380px] font-mono text-xs leading-relaxed"
                  placeholder={!selectedPatient ? "Select a patient to start editing..." : ""}
                />
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{currentBody.length} chars · {currentBody.split(/\n/).length} lines</span>
                  <span>Template: {currentPreviewTpl.name}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}

// ===========================================================================
// A4 preview component (on-screen) — visually mirrors the print output.
// ===========================================================================

function A4Preview({
  body, templateName, chrome: c,
}: { body: string; templateName: string; chrome: ResolvedChrome }) {
  const title = c.titleOverride?.trim() || templateName;
  return (
    <div
      className="shadow-2xl bg-white text-[#111] relative"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "18mm 18mm 22mm 18mm",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      {c.showHeader && (
        <div
          className="flex items-center gap-3 pb-2 border-b-2"
          style={{ borderColor: c.accentColor }}
        >
          {c.showLogo && (
            <div
              className="w-12 h-12 rounded-lg text-white flex items-center justify-center font-bold text-lg overflow-hidden"
              style={{ background: c.accentColor }}
            >
              {c.practiceLogoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.practiceLogoDataUrl} alt="logo" className="w-full h-full object-contain bg-white" />
              ) : (
                c.practiceLogoText
              )}
            </div>
          )}
          <div className="flex-1">
            <div className="text-sm font-bold tracking-wide">{c.practiceName}</div>
            <div className="text-[10px] text-gray-600">{c.practiceAddress}</div>
            <div className="text-[10px] text-gray-600">
              {c.practicePhone} · {c.practiceEmail}
            </div>
          </div>
          <div className="text-right text-[10px] text-gray-600">
            <div className="font-semibold text-gray-800">{c.doctorName}</div>
            <div>{c.doctorTitles}</div>
            <div>{c.doctorLicense}</div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="text-xl font-semibold">{title}</div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          Generated {new Date().toLocaleString("el-GR")}
        </div>
      </div>

      <div
        className="mt-4 text-[12px] leading-[1.65] whitespace-pre-wrap"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {body}
      </div>

      {c.showSignature && (
        <div className="mt-10 flex justify-end">
          <div className="w-[60mm] text-center text-[11px]">
            {c.signatureImageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.signatureImageDataUrl} alt="signature" className="max-h-[22mm] max-w-[56mm] mx-auto mb-1" />
            ) : (
              <div
                className="text-[22px] mb-0.5"
                style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive", color: c.accentColor }}
              >
                {c.signatureText}
              </div>
            )}
            <div className="border-t border-black pt-1">
              <div className="font-semibold">{c.doctorName}</div>
              <div className="text-[10px] text-gray-600">{c.doctorTitles}</div>
            </div>
          </div>
        </div>
      )}

      {c.showFooter && (
        <div className="absolute left-0 right-0 px-[18mm] bottom-[10mm] border-t border-gray-300 pt-1.5 flex justify-between text-[9px] text-gray-500">
          <span>{c.footerLeft || `${c.practiceName} · Confidential medical record`}</span>
          <span>{c.footerRight || `Page 1 of 1 · ${new Date().toLocaleDateString("el-GR")}`}</span>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Static HTML generator for print window (mirrors A4Preview layout)
// ===========================================================================

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderA4Html(body: string, templateName: string, c: ResolvedChrome): string {
  const title = c.titleOverride?.trim() || templateName;
  const logo = c.showLogo
    ? (c.practiceLogoDataUrl
        ? `<div class="logo"><img src="${c.practiceLogoDataUrl}" alt="logo" /></div>`
        : `<div class="logo">${escapeHtml(c.practiceLogoText)}</div>`)
    : "";
  const header = c.showHeader
    ? `<div class="hdr">
    ${logo}
    <div style="flex:1;">
      <div class="prac-name">${escapeHtml(c.practiceName)}</div>
      <div class="prac-sub">${escapeHtml(c.practiceAddress)}</div>
      <div class="prac-sub">${escapeHtml(c.practicePhone)} · ${escapeHtml(c.practiceEmail)}</div>
    </div>
    <div style="text-align:right;font-size:10px;color:#555;">
      <div style="font-weight:600;color:#222;">${escapeHtml(c.doctorName)}</div>
      <div>${escapeHtml(c.doctorTitles)}</div>
      <div>${escapeHtml(c.doctorLicense)}</div>
    </div>
  </div>`
    : "";
  const signatureMark = c.signatureImageDataUrl
    ? `<img class="sig-img" src="${c.signatureImageDataUrl}" alt="signature" />`
    : `<div class="sig-script" style="color:${c.accentColor};">${escapeHtml(c.signatureText)}</div>`;
  const signature = c.showSignature
    ? `<div class="sig">
    <div class="sig-block">
      ${signatureMark}
      <div class="sig-line">
        <div class="sig-name">${escapeHtml(c.doctorName)}</div>
        <div class="sig-title">${escapeHtml(c.doctorTitles)}</div>
      </div>
    </div>
  </div>`
    : "";
  const footer = c.showFooter
    ? `<div class="ftr">
    <span>${escapeHtml(c.footerLeft || `${c.practiceName} · Confidential medical record`)}</span>
    <span>${escapeHtml(c.footerRight || `Page 1 of 1 · ${new Date().toLocaleDateString("el-GR")}`)}</span>
  </div>`
    : "";
  return `<div class="a4" style="--accent:${c.accentColor};">
  ${header}
  <div class="tpl-title">${escapeHtml(title)}</div>
  <div class="meta">Generated ${escapeHtml(new Date().toLocaleString("el-GR"))}</div>
  <div class="body">${escapeHtml(body)}</div>
  ${signature}
  ${footer}
</div>`;
}
