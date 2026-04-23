"use client";

/**
 * Discharge Reports
 * -----------------
 * Structured IR Discharge Note workflow:
 *   - Discharge-category templates (incl. IR Discharge Note cloned from
 *     DischargeNote_Template.docx — Department, Manager, Consultant, sections 1–8)
 *   - Per-patient edits persisted to localStorage
 *   - Paste-demographics parser (label: value pairs → predefined fields)
 *   - AI auto-fill with placeholder normalization ([F] / {{F}} / <F> / $F)
 *   - Template-source patient gets a protected badge (read-only preview)
 *   - Live A4 preview, lock toggle, PDF export via print
 */

import { useEffect, useMemo, useState } from "react";
import {
  FileText, Sparkles, Lock, Unlock, FileDown, Copy, Trash2,
  CheckCircle2, Upload, RotateCcw, Wand2, ClipboardPaste,
  ShieldCheck, Plus, LayoutList, Code2,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { usePatients } from "@/lib/patient-store";
import {
  useTemplates, applyPlaceholders, PlaceholderContext, PLACEHOLDER_KEYS,
  resolveChrome, ResolvedChrome, TemplateChrome, ReportTemplate,
} from "@/lib/template-store";
import { IR_DISCHARGE_NOTE_BODY } from "@/lib/template-seeds";
import {
  parseStructuredBody, isFormBody, DischargeFormEditor,
  ChromeKey, Block, NUM_SECTION_RE, SUB_SECTION_RE, KV_RE,
} from "@/lib/template-parser";
import type { Patient } from "@/lib/mock-data";

// ---------------------------------------------------------------------------
// Persistence: per-patient edits (template × patient → body).
// ---------------------------------------------------------------------------

const EDITS_KEY = "irm:discharge-edits:v1";
const DEMO_KEY  = "irm:discharge-demographics:v1";
const editKey = (tplId: string, patientId: string) => `${tplId}::${patientId}`;

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function saveJson(key: string, v: unknown) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const GR_DATE = (ymd: string) => {
  if (!ymd) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return ymd;
  return `${m[3]}-${m[2]}-${m[1]}`;
};

// ---------------------------------------------------------------------------
// Paste-demographics parser
// ---------------------------------------------------------------------------

/**
 * Maps canonical field labels from the IR Discharge template to placeholder keys.
 * Labels are matched case/whitespace-insensitively. Regex values let a single
 * field accept multiple label variants (e.g. "ID/Passport", "ID / Passport No").
 */
const DEMO_FIELD_MAP: { patterns: RegExp[]; key: keyof PlaceholderContext }[] = [
  { key: "PatientName",           patterns: [/^patient\s*name$/i, /^name$/i] },
  { key: "HIOCode",               patterns: [/^hio\s*code$/i] },
  { key: "PassportNo",            patterns: [/^id\s*[\/\-]\s*passport(?:\s*no\.?)?$/i, /^passport(?:\s*no\.?)?$/i, /^id\s*no\.?$/i] },
  { key: "HospitalId",            patterns: [/^hospital\s*id$/i] },
  { key: "DateOfBirth",           patterns: [/^date\s*of\s*birth$/i, /^dob$/i, /^birth\s*date$/i] },
  { key: "Occupation",            patterns: [/^occupation$/i] },
  { key: "Gender",                patterns: [/^gender$/i, /^sex$/i] },
  { key: "Address",               patterns: [/^address$/i] },
  { key: "Telephone",             patterns: [/^telephone$/i, /^phone$/i, /^tel\.?$/i, /^mobile$/i] },
  { key: "AdmissionWeight",       patterns: [/^admission\s*weight(?:\s*\(.*\))?$/i] },
  { key: "VentilationHours",      patterns: [/^ventilation\s*hours$/i] },
  { key: "AdmissionVia",          patterns: [/^admission\s*via$/i] },
  { key: "AdmissionDate",         patterns: [/^admission\s*date$/i] },
  { key: "DischargeDate",         patterns: [/^discharge\s*date$/i] },
  { key: "LeaveDays",             patterns: [/^leave\s*days$/i] },
  { key: "ReferralDoctor",        patterns: [/^referral\s*doctor$/i, /^referring\s*doctor$/i] },
  { key: "ClinicalNote",          patterns: [/^clinical\s*note$/i] },
  { key: "Pacemaker",             patterns: [/^pacemaker$/i] },
  { key: "Delivery",              patterns: [/^delivery$/i] },
  { key: "PatientClinicalStatus", patterns: [/^patient\s*clinical\s*status(?:\s*on\s*admission)?$/i, /^clinical\s*status$/i] },
  { key: "PrimaryDiagnosis",      patterns: [/^primary\s*diagnosis$/i] },
  { key: "SecondaryDiagnosis",    patterns: [/^secondary\s*diagnosis$/i] },
  { key: "Therapy",               patterns: [/^therapy$/i, /^therapy\s*[–-]\s*clinical\s*procedures$/i] },
  { key: "SurgicalFindings",      patterns: [/^surgical\s*findings$/i] },
  { key: "LabExamGroups",         patterns: [/^laboratory\s*examinations?\s*groups$/i, /^lab\s*groups$/i] },
  { key: "LabExamDetails",        patterns: [/^laboratory\s*examinations?\s*details$/i, /^lab\s*details$/i] },
  { key: "HistopathologyExaminations", patterns: [/^histopathology(?:\s*examinations?)?$/i] },
  { key: "Attachments",           patterns: [/^attachments?$/i] },
  { key: "Anaesthetist",          patterns: [/^anaesthetist$/i, /^anesthetist$/i] },
  { key: "AnaesthesiaType",       patterns: [/^anaesthesia\s*type$/i, /^anesthesia\s*type$/i] },
  { key: "DischargeMode",         patterns: [/^(?:a\.?\s*)?mode(?:\s*\/\s*type)?$/i, /^discharge\s*mode$/i] },
  { key: "DischargeStatus",       patterns: [/^(?:b\.?\s*)?status(?:\s*\/\s*condition)?$/i, /^discharge\s*status$/i] },
  { key: "Therapeutics",          patterns: [/^therapeutically(?:\s*[–-].*)?$/i, /^medicines?(?:\s*and\s*advices?)?$/i] },
  { key: "NextVisit",             patterns: [/^next\s*visit$/i] },
  { key: "EpisodeNo",             patterns: [/^episode\s*no\.?$/i, /^episode\s*number$/i] },
];

/** Parse a copy-pasted block of `label: value` pairs into a partial context. */
function parseDemographics(raw: string): {
  values: Partial<PlaceholderContext>;
  matched: (keyof PlaceholderContext)[];
  unmatched: string[];
} {
  const values: Partial<PlaceholderContext> = {};
  const matched: (keyof PlaceholderContext)[] = [];
  const unmatched: string[] = [];
  if (!raw) return { values, matched, unmatched };

  const lines = raw.split(/\r?\n/);
  let pendingKey: keyof PlaceholderContext | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { pendingKey = null; continue; }

    const m = /^([^:]{1,80}):\s*(.*)$/.exec(trimmed);
    if (!m) {
      if (pendingKey) {
        values[pendingKey] = ((values[pendingKey] ?? "") + "\n" + trimmed).trim();
      } else {
        unmatched.push(trimmed);
      }
      continue;
    }

    const label = m[1].trim();
    const value = m[2].trim();
    const entry = DEMO_FIELD_MAP.find((f) => f.patterns.some((re) => re.test(label)));
    if (entry) {
      values[entry.key] = value;
      matched.push(entry.key);
      pendingKey = value === "" ? entry.key : null;
    } else {
      unmatched.push(label);
      pendingKey = null;
    }
  }
  return { values, matched, unmatched };
}

// ---------------------------------------------------------------------------
// Placeholder context — merges patient record + pasted demographics + defaults
// ---------------------------------------------------------------------------

const DEPARTMENT_DEFAULTS = {
  Department: "Interventional Radiology",
  DepartmentManager: "Agathangelou Marios",
  ConsultantDoctor: "Agathangelou Marios",
};

function buildPlaceholderContext(
  p: Patient | undefined,
  demographics: Partial<PlaceholderContext>,
): PlaceholderContext {
  const today = new Date();
  const todayGR = `${String(today.getDate()).padStart(2, "0")}-${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}-${today.getFullYear()}`;

  const parts = (p?.fullName ?? "").trim().split(/\s+/);
  const last  = parts.length > 1 ? parts.slice(-1)[0] : "";
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : (p?.fullName ?? "");

  const [actId, ...actRest] = (p?.activity ?? "").split("—").map((s) => s.trim());
  const actName = actRest.join(" — ");

  // Patient-derived defaults — overridden by any pasted demographic values.
  const fromPatient: PlaceholderContext = p ? {
    BeneficiaryName:      first,
    BeneficiaryLastName:  last,
    BeneficiaryDOB:       GR_DATE(p.dob),
    BeneficiaryDocId:     p.docId,
    ReferralId:           p.referralId,
    BeneficiaryGender:    p.gender,
    VisitDateTime:        GR_DATE(p.visitDate),
    ReportDate:           todayGR,
    ReferralActivityId:   actId || "",
    ReferralActivityName: actName || (p.activity ?? ""),
    ReferralDoctorName:   p.referringDoctor,
    // Discharge mirrors
    PatientName:      p.fullName,
    PassportNo:       p.docId,
    HospitalId:       p.mrn,
    DateOfBirth:      GR_DATE(p.dob),
    Gender:           p.gender,
    Telephone:        p.phone,
    ReferralDoctor:   p.referringDoctor,
  } : {};

  return {
    ...DEPARTMENT_DEFAULTS,
    ...fromPatient,
    ReportDate: todayGR,
    ...demographics,
  };
}

// ---------------------------------------------------------------------------
// Print / PDF
// ---------------------------------------------------------------------------

function openPrintWindow(html: string, title: string) {
  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) return;
  w.document.write(`<!doctype html>
<html><head><meta charset="utf-8" /><title>${title}</title>
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #f3f3f3; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #111; }
.a4 { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 10mm 12mm 16mm 12mm; position: relative; page-break-after: always; }
.a4:last-child { page-break-after: auto; }

/* ---- Header (matches Nicosia Polyclinic discharge form) ---- */
.hdr { display: grid; grid-template-columns: 1fr 1.4fr 1fr; align-items: start; gap: 8px; padding-bottom: 4px; }
.hdr-left { display: flex; align-items: center; gap: 6px; }
.logo { width: 34px; height: 34px; border-radius: 50%; background: var(--accent, #1d3a8a); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; overflow: hidden; flex-shrink: 0; }
.logo img { width: 100%; height: 100%; object-fit: contain; background: #fff; border-radius: 50%; }
.logo-text { font-size: 8.5px; font-weight: 700; color: var(--accent, #1d3a8a); letter-spacing: .04em; line-height: 1.1; }
.hdr-center { text-align: center; }
.hdr-center .prac-name { font-size: 11.5px; font-weight: 700; }
.hdr-center .doc-title { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; margin-top: 1px; }
.hdr-right { text-align: right; font-size: 9px; color: #111; line-height: 1.45; }
.hdr-right b { color: #111; }

/* sub-row: License | Episode No | Print Date */
.sub-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 9px; padding: 3px 0 6px; }
.sub-row .cell { text-align: left; }
.sub-row .cell.center { text-align: center; }
.sub-row .cell.right { text-align: right; }
.sub-row b { font-weight: 700; }

/* ---- Form body: bordered table-like cells ---- */
.form { border: 1px solid #000; }
.form-row { border-top: 1px solid #000; padding: 4px 6px; min-height: 14px; }
.form-row:first-child { border-top: 0; }
.form-row.cols-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding: 0; }
.form-row.cols-3 > .form-cell { padding: 4px 6px; border-left: 1px solid #000; }
.form-row.cols-3 > .form-cell:first-child { border-left: 0; }

.sec-num { font-weight: 700; font-size: 10.5px; }
.sec-num u { text-decoration: underline; }
.sec-sub { font-weight: 700; font-size: 10.5px; margin-top: 2px; }

.kv-row { display: grid; gap: 0; padding: 1px 0; font-size: 10.5px; }
.kv-row.c1 { grid-template-columns: 1fr; }
.kv-row.c2 { grid-template-columns: 1fr 1fr; column-gap: 12px; }
.kv-row.c3 { grid-template-columns: 1fr 1fr 1fr; column-gap: 12px; }
.kv-cell .lbl { color: #111; }
.kv-cell .val { color: #111; font-weight: 500; }
.kv-cell .val.empty { display: inline-block; min-width: 60%; border-bottom: 1px dotted #aaa; }
.para { font-size: 10.5px; padding: 1px 0; }

/* Spacer after empty section so it's not collapsed */
.empty-pad { min-height: 16mm; }

/* ---- Signature page ---- */
.sig-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #000; min-height: 80mm; }
.sig-box { padding: 6px 8px; border-left: 1px solid #000; position: relative; }
.sig-box:first-child { border-left: 0; }
.sig-title { font-weight: 700; text-decoration: underline; font-size: 10.5px; }
.sig-img { max-height: 40mm; max-width: 70mm; display: block; margin: 6mm auto 0; }
.sig-script { font-family: 'Brush Script MT', 'Segoe Script', cursive; font-size: 38px; color: var(--accent, #1d3a8a); text-align: center; margin-top: 14mm; }

/* ---- Page footer ---- */
.pageno { position: absolute; left: 0; right: 0; bottom: 8mm; text-align: center; font-size: 10px; color: #111; }
.ftr { position: absolute; left: 12mm; right: 12mm; bottom: 14mm; padding-top: 4px; font-size: 8.5px; color: #888; display: flex; justify-content: space-between; }

@media print { body { background: #fff; } .a4 { margin: 0; box-shadow: none; } }
</style></head><body>${html}<script>window.onload=()=>{setTimeout(()=>{window.print();},250);};</script></body></html>`);
  w.document.close();
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DischargeReportsPage() {
  const { patients } = usePatients();
  const {
    templates, lockTemplate, duplicateTemplate, deleteTemplate, addTemplate, updateTemplate,
  } = useTemplates();

  const activePatients = useMemo(
    () => patients.filter((p) => p.status === "active" || p.status === "completed"),
    [patients],
  );

  const dischargeTemplates = useMemo(
    () => templates.filter((t) => t.category === "discharge"),
    [templates],
  );

  // Prefer the structured IR Discharge Note by default when it's present.
  const defaultTplId = useMemo(() => {
    const ir = dischargeTemplates.find((t) => t.id === "tpl-seed-discharge-ir-note");
    return ir?.id ?? dischargeTemplates[0]?.id ?? null;
  }, [dischargeTemplates]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [patientId, setPatientId]     = useState<string>("");
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [filling, setFilling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [formMode, setFormMode] = useState(true);

  const [edits, setEdits] = useState<Record<string, string>>({});
  // Pasted-demographics keyed by patientId (so switching patients keeps context).
  const [pastedByPatient, setPastedByPatient] =
    useState<Record<string, Partial<PlaceholderContext>>>({});
  const [pasteDraft, setPasteDraft] = useState("");
  const [pasteReport, setPasteReport] = useState<{
    matched: (keyof PlaceholderContext)[]; unmatched: string[];
  } | null>(null);

  // ---- Initial hydration -------------------------------------------------
  useEffect(() => { setEdits(loadJson(EDITS_KEY, {})); }, []);
  useEffect(() => { saveJson(EDITS_KEY, edits); }, [edits]);
  useEffect(() => { setPastedByPatient(loadJson(DEMO_KEY, {})); }, []);
  useEffect(() => { saveJson(DEMO_KEY, pastedByPatient); }, [pastedByPatient]);

  // Once templates load, pick defaults.
  useEffect(() => {
    if (selectedIds.length === 0 && defaultTplId) {
      setSelectedIds([defaultTplId]);
      setActivePreviewId(defaultTplId);
    }
  }, [defaultTplId, selectedIds.length]);
  useEffect(() => {
    if (!patientId && activePatients.length > 0) {
      setPatientId(activePatients[0].id);
    }
  }, [activePatients, patientId]);

  const selectedTemplates = dischargeTemplates.filter((t) => selectedIds.includes(t.id));
  const selectedPatient   = activePatients.find((p) => p.id === patientId) || activePatients[0];
  /** Stable key for pastedByPatient — falls back to a constant when no patient is loaded yet. */
  const pasteKey = selectedPatient?.id ?? "__default__";
  const currentDemographics = pastedByPatient[pasteKey] || {};
  const isProtected = !!selectedPatient?.isTemplateSource;

  const toggleSelected = (id: string) => {
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    setActivePreviewId(id);
  };

  // ---- AI auto-fill (simulated latency + placeholder substitution) --------
  const aiAutoFill = async () => {
    if (!selectedPatient || selectedTemplates.length === 0 || isProtected) return;
    setFilling(true); setProgress(0);
    const ctx = buildPlaceholderContext(selectedPatient, currentDemographics);

    const total = 12;
    for (let i = 0; i <= total; i++) {
      await new Promise((r) => setTimeout(r, 85));
      setProgress(Math.round((i / total) * 100));
    }

    const next = { ...edits };
    for (const t of selectedTemplates) {
      next[editKey(t.id, selectedPatient.id)] = applyPlaceholders(t.body, ctx);
    }
    setEdits(next);
    setFilling(false);
    if (!activePreviewId || !selectedIds.includes(activePreviewId)) {
      setActivePreviewId(selectedTemplates[0].id);
    }
  };

  // ---- Paste demographics handler ----------------------------------------
  const applyPaste = () => {
    if (!currentPreviewTpl) return;
    const { values, matched, unmatched } = parseDemographics(pasteDraft);
    const mergedDemo = { ...(pastedByPatient[pasteKey] || {}), ...values };
    setPastedByPatient((cur) => ({
      ...cur,
      [pasteKey]: mergedDemo,
    }));
    // Immediately rebuild the body so the A4 preview + raw editor stay in sync.
    const ctx = buildPlaceholderContext(selectedPatient, mergedDemo);
    const newBody = applyPlaceholders(currentPreviewTpl.body, ctx);
    updateBody(newBody);
    // Switch to form view so filled fields are visible right away.
    if (useFormEditor) setFormMode(true);
    setPasteReport({ matched, unmatched });
  };
  const clearPaste = () => {
    setPastedByPatient((cur) => {
      const next = { ...cur }; delete next[pasteKey]; return next;
    });
    setPasteDraft(""); setPasteReport(null);
  };

  // ---- Body helpers ------------------------------------------------------
  const currentPreviewTpl =
    selectedTemplates.find((t) => t.id === activePreviewId) || selectedTemplates[0];

  const bodyFor = (tplId: string) => {
    const tpl = dischargeTemplates.find((t) => t.id === tplId);
    if (!tpl) return "";
    if (!selectedPatient) return tpl.body;
    return edits[editKey(tpl.id, selectedPatient.id)] ?? tpl.body;
  };

  const currentBody = currentPreviewTpl ? bodyFor(currentPreviewTpl.id) : "";
  const currentIsEdited =
    !!currentPreviewTpl && !!selectedPatient &&
    edits[editKey(currentPreviewTpl.id, selectedPatient.id)] !== undefined;

  const updateBody = (value: string) => {
    if (!currentPreviewTpl || !selectedPatient || isProtected) return;
    setEdits((e) => ({
      ...e,
      [editKey(currentPreviewTpl.id, selectedPatient.id)]: value,
    }));
  };

  const resetToTemplate = () => {
    if (!currentPreviewTpl || !selectedPatient) return;
    setEdits((e) => {
      const n = { ...e }; delete n[editKey(currentPreviewTpl.id, selectedPatient.id)]; return n;
    });
  };

  const normalizePlaceholders = () => {
    if (!currentPreviewTpl || !selectedPatient) return;
    const ctx = buildPlaceholderContext(selectedPatient, currentDemographics);
    updateBody(applyPlaceholders(currentBody, ctx));
  };

  const unresolved = currentBody
    ? PLACEHOLDER_KEYS.filter((k) =>
        new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}|\\[\\s*${k}\\s*\\]|<\\s*${k}\\s*>|\\$${k}\\b`).test(currentBody),
      )
    : [];

  const exportPdf = () => {
    if (selectedTemplates.length === 0) return;
    const pages = selectedTemplates
      .map((t) => renderA4Html(bodyFor(t.id), t.name, resolveChrome(t.chrome)))
      .join("\n");
    openPrintWindow(pages, `Discharge Reports · ${selectedPatient?.fullName ?? ""}`);
  };

  const exportSinglePdf = () => {
    if (!currentPreviewTpl) return;
    const html = renderA4Html(currentBody, currentPreviewTpl.name, resolveChrome(currentPreviewTpl.chrome));
    openPrintWindow(html, `${currentPreviewTpl.name} · ${selectedPatient?.fullName ?? ""}`);
  };

  // ---- Form editor helpers -----------------------------------------------
  /** True when the active template uses the numbered-section form structure. */
  const useFormEditor = !!currentPreviewTpl && isFormBody(parseStructuredBody(currentPreviewTpl.body));

  /** Update a single demographics field and immediately rebuild the body. */
  const onFormFieldChange = (key: keyof PlaceholderContext, value: string) => {
    if (!currentPreviewTpl) return;
    const newDemo = { ...(pastedByPatient[pasteKey] || {}), [key]: value };
    setPastedByPatient((cur) => ({ ...cur, [pasteKey]: newDemo }));
    const ctx = buildPlaceholderContext(selectedPatient, newDemo);
    updateBody(applyPlaceholders(currentPreviewTpl.body, ctx));
  };

  /** Persist a chrome field change to the template record. */
  const onFormChromeChange = (key: ChromeKey, value: string) => {
    if (!currentPreviewTpl) return;
    const newChrome: TemplateChrome = { ...(currentPreviewTpl.chrome || {}) };
    if (value) (newChrome as Record<string, unknown>)[key] = value;
    else delete (newChrome as Record<string, unknown>)[key];
    void updateTemplate(currentPreviewTpl.id, { chrome: newChrome });
  };

  // If the structured IR Discharge Note isn't present (e.g. DB seeded before
  // this template existed), let the user insert it on demand.
  const hasIrNote = dischargeTemplates.some((t) => t.id === "tpl-seed-discharge-ir-note");
  const insertIrNote = () => {
    const tpl = addTemplate({
      id: "tpl-seed-discharge-ir-note",
      name: "IR Discharge Note (Structured)",
      category: "discharge",
      body: IR_DISCHARGE_NOTE_BODY,
      locked: true,
      source: "seed",
      originalFileName: "DischargeNote_Template.pdf",
      chrome: {
        titleOverride: "PATIENT DISCHARGE AND INFORMATION",
        practiceName: "Nicosia Polyclinic",
        practiceAddress: "ΑΧΑΙΩΝ 22",
        practicePhone: "22 780780",
        practiceEmail: "polnic@cytanet.com.cy",
        doctorName: "Agathangelou Marios",
        doctorTitles: "Consultant Doctor · Department Manager",
        doctorLicense: "A / 20 / N",
        signatureText: "M. Agathangelou",
        footerLeft: "Department of Interventional Radiology · Confidential medical record",
        footerRight: "Form Ref. 1290022-23006",
      },
    });
    setSelectedIds([tpl.id]); setActivePreviewId(tpl.id);
  };

  return (
    <PageShell
      title="Discharge Reports"
      subtitle="IR Discharge Note · Paste demographics · AI auto-fill · Placeholder normalization · A4 PDF export"
      actions={
        <>
          <Button
            variant="outline" size="sm"
            onClick={() => (window.location.href = "/files")}
          >
            <Upload className="h-4 w-4" /> Manage Templates
          </Button>
          {!hasIrNote && (
            <Button variant="outline" size="sm" onClick={insertIrNote}>
              <Plus className="h-4 w-4" /> Insert IR Discharge Note
            </Button>
          )}
          <Button
            variant="primary" size="sm"
            onClick={exportPdf}
            disabled={selectedTemplates.length === 0}
          >
            <FileDown className="h-4 w-4" />
            Export {selectedTemplates.length > 1 ? `${selectedTemplates.length} PDFs` : "PDF"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4">
        {/* -------------------- LEFT: templates + patient + paste -------- */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Templates ({dischargeTemplates.length})</span>
                <Badge variant="outline">{selectedIds.length} selected</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1.5 max-h-[420px] overflow-y-auto">
              {dischargeTemplates.length === 0 && (
                <div className="p-4 text-xs text-muted-foreground text-center">
                  No discharge templates yet. Upload a Word template in{" "}
                  <a className="underline" href="/files">File Manager</a>
                  {" "}or insert the IR Discharge Note from the top actions.
                </div>
              )}
              {dischargeTemplates.map((t) => {
                const active = selectedIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    className={cn(
                      "rounded-md border p-3 transition-colors",
                      active
                        ? "border-primary-foreground/40 bg-primary-foreground/5"
                        : "border-border hover:border-muted",
                    )}
                  >
                    <button
                      onClick={() => toggleSelected(t.id)}
                      className="w-full text-left focus-ring"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <input type="checkbox" checked={active} readOnly className="accent-primary" />
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="text-sm font-medium text-foreground truncate">{t.name}</div>
                        </div>
                        {t.locked ? (
                          <Badge variant="success" className="gap-1"><Lock className="h-2.5 w-2.5" /> Locked</Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1"><Unlock className="h-2.5 w-2.5" /> Draft</Badge>
                        )}
                      </div>
                      {t.originalFileName && (
                        <div className="mt-1 text-[10px] text-muted-foreground truncate">
                          from {t.originalFileName}
                        </div>
                      )}
                    </button>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button variant="ghost" size="sm" className="h-6 text-[10px]"
                        onClick={() => lockTemplate(t.id, !t.locked)}>
                        {t.locked ? <><Unlock className="h-3 w-3" /> Unlock</> : <><Lock className="h-3 w-3" /> Lock</>}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px]"
                        onClick={() => {
                          const dup = duplicateTemplate(t.id);
                          if (dup) toggleSelected(dup.id);
                        }}>
                        <Copy className="h-3 w-3" /> Duplicate
                      </Button>
                      {!t.locked && t.source !== "seed" && (
                        <Button variant="ghost" size="sm"
                          className="h-6 text-[10px] text-danger hover:text-danger"
                          onClick={() => {
                            deleteTemplate(t.id);
                            setSelectedIds((s) => s.filter((x) => x !== t.id));
                          }}>
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Paste demographics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardPaste className="h-4 w-4" /> Paste Demographics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-[11px] text-muted-foreground">
                Copy/paste label: value pairs (any format). Recognized labels map to template
                placeholders; unknown labels are listed for review.
              </div>
              <Textarea
                placeholder={`Patient Name: John Doe\nHIO Code: 12345\nID/Passport No: AB123456\nHospital ID: H-99\nDate of Birth: 01-02-1950\nOccupation: Retired\nGender: M\nAddress: 1 Main St\nTelephone: +357 99 000000\nAdmission Date: 15-04-2026\nDischarge Date: 17-04-2026\nReferral Doctor: Dr. Smith\nPrimary Diagnosis: ...`}
                value={pasteDraft}
                onChange={(e) => setPasteDraft(e.target.value)}
                className="min-h-[140px] font-mono text-[11px]"
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="primary" onClick={applyPaste}
                  disabled={!pasteDraft.trim()}>
                  <Sparkles className="h-4 w-4" /> AI Auto-Fill
                </Button>
                <Button size="sm" variant="outline" onClick={clearPaste}>
                  <RotateCcw className="h-4 w-4" /> Clear
                </Button>
              </div>

              {pasteReport && (
                <div className="rounded border border-border bg-card/60 p-2 space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-1 text-success">
                    <CheckCircle2 className="h-3 w-3" />
                    Mapped {pasteReport.matched.length} field{pasteReport.matched.length === 1 ? "" : "s"}
                  </div>
                  {pasteReport.matched.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {pasteReport.matched.map((k) => (
                        <span key={k} className="rounded border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[10px]">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                  {pasteReport.unmatched.length > 0 && (
                    <div>
                      <div className="text-warning">Unrecognized:</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pasteReport.unmatched.slice(0, 12).map((l, i) => (
                          <span key={i} className="rounded border border-border bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {l.length > 28 ? l.slice(0, 28) + "…" : l}
                          </span>
                        ))}
                        {pasteReport.unmatched.length > 12 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{pasteReport.unmatched.length - 12} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Placeholder Formats</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-[11px]">
              {[
                ["[Field]",      "Detected"],
                ["{{Field}}",    "Normalized"],
                ["<Field>",      "Detected"],
                ["$Variable",    "Detected"],
              ].map(([fmt, state]) => (
                <div key={fmt} className="flex items-center justify-between rounded border border-border bg-card/60 px-2 py-1">
                  <span className="font-mono text-muted-foreground">{fmt}</span>
                  <Badge variant={state === "Normalized" ? "primary" : "outline"}>{state}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* -------------------- RIGHT: preview + editor ------------------ */}
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
                        <button key={t.id}
                          onClick={() => setActivePreviewId(t.id)}
                          className={cn(
                            "px-2.5 py-1 text-[11px]",
                            activePreviewId === t.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-card",
                          )}>
                          {t.name.length > 22 ? t.name.slice(0, 22) + "…" : t.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" size="sm"
                    onClick={exportSinglePdf}
                    disabled={!currentPreviewTpl}>
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
                  <A4Preview body={currentBody}
                    templateName={currentPreviewTpl.name}
                    chrome={resolveChrome(currentPreviewTpl.chrome)} />
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
                    {unresolved.length} unresolved placeholder{unresolved.length === 1 ? "" : "s"}: {unresolved.slice(0, 6).join(", ")}
                    {unresolved.length > 6 && ` +${unresolved.length - 6}`}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {currentPreviewTpl && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {useFormEditor && formMode ? "Document Editor" : "discharge-report.md"}
                      {currentIsEdited && (
                        <Badge variant="warning" className="gap-1">
                          Edited
                        </Badge>
                      )}
                      {currentPreviewTpl.locked && (
                        <Badge variant="success" className="gap-1">
                          <Lock className="h-2.5 w-2.5" /> Locked
                        </Badge>
                      )}
                      {isProtected && (
                        <Badge variant="warning" className="gap-1">
                          <ShieldCheck className="h-2.5 w-2.5" /> Protected
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {useFormEditor && formMode
                        ? "Fill labeled fields — changes flow live into the A4 preview &amp; PDF export"
                        : "Individualized draft for this patient · edits flow into the A4 preview &amp; PDF export"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {useFormEditor && (
                      <Button
                        variant={formMode ? "primary" : "outline"}
                        size="sm"
                        onClick={() => setFormMode((m) => !m)}
                      >
                        {formMode
                          ? <><Code2 className="h-4 w-4" /> Raw</>
                          : <><LayoutList className="h-4 w-4" /> Form</>}
                      </Button>
                    )}
                    {(!useFormEditor || !formMode) && (
                      <Button variant="outline" size="sm"
                        onClick={normalizePlaceholders}
                        disabled={!selectedPatient || currentPreviewTpl.locked || isProtected}>
                        <Wand2 className="h-4 w-4" /> Normalize
                      </Button>
                    )}
                    <Button variant="outline" size="sm"
                      onClick={resetToTemplate}
                      disabled={!currentIsEdited}>
                      <RotateCcw className="h-4 w-4" /> Reset
                    </Button>
                    <Button variant="outline" size="sm"
                      onClick={() => lockTemplate(currentPreviewTpl.id, !currentPreviewTpl.locked)}>
                      {currentPreviewTpl.locked
                        ? <><Unlock className="h-4 w-4" /> Unlock</>
                        : <><Lock className="h-4 w-4" /> Lock</>}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {useFormEditor && formMode ? (
                  <div className="max-h-[680px] overflow-y-auto pr-1.5 -mr-1.5">
                    <DischargeFormEditor
                      template={currentPreviewTpl}
                      ctx={buildPlaceholderContext(selectedPatient, currentDemographics)}
                      readOnly={isProtected}
                      onFieldChange={onFormFieldChange}
                      onChromeChange={onFormChromeChange}
                    />
                  </div>
                ) : (
                  <>
                    <Textarea
                      value={currentBody}
                      readOnly={currentPreviewTpl.locked || isProtected}
                      onChange={(e) => updateBody(e.target.value)}
                      className="min-h-[420px] font-mono text-xs leading-relaxed"
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{currentBody.length} chars · {currentBody.split(/\n/).length} lines</span>
                      <span>Template: {currentPreviewTpl.name}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}

// ===========================================================================
// Structured body parser — turns the plain-text discharge body into typed
// blocks that both the on-screen A4 preview and the print HTML render as a
// form (bold numbered/lettered section headers, label: value rows, and the
// side-by-side Mode/Status row on section 6).
// ===========================================================================

interface FormSection {
  /** "Department" header row (3 cells), Episode No row, or numbered/lettered heading */
  kind: "header3" | "numbered" | "lettered" | "lone";
  /** Header text for numbered / lettered / lone sections */
  heading?: string;
  /** For "header3": the 3 column kv cells */
  headerCells?: { label: string; value: string }[];
  /** Body blocks belonging to this section (excluding the heading itself) */
  body: Block[];
}

/**
 * Splits a parsed body into:
 *   - `episodeRow`     — optional standalone "Episode No: ..." kv block
 *   - `headerRow`      — optional 3-cell tabRow containing Department / Manager / Consultant
 *   - `sections`       — array of grouped sections (each renders as a bordered cell)
 *   - `signatureLines` — trailing "Doctor's Signature" / "Patient ... Signature" lines
 */
function splitForm(blocks: Block[]) {
  let episodeRow: Block | null = null;
  let headerRow: Block | null = null;
  const sections: FormSection[] = [];
  const signatureLines: string[] = [];

  // Working list — strip leading blanks
  let i = 0;
  while (i < blocks.length && blocks[i].kind === "blank") i++;

  // Episode No (optional first kv)
  if (
    i < blocks.length &&
    blocks[i].kind === "kv" &&
    /^episode\s*no/i.test((blocks[i] as any).label)
  ) {
    episodeRow = blocks[i++];
    while (i < blocks.length && blocks[i].kind === "blank") i++;
  }

  // Department / Manager / Consultant 3-col row
  if (
    i < blocks.length &&
    blocks[i].kind === "tabRow" &&
    (blocks[i] as any).cells.length === 3 &&
    /department/i.test((blocks[i] as any).cells[0].label)
  ) {
    headerRow = blocks[i++];
    while (i < blocks.length && blocks[i].kind === "blank") i++;
  }

  let current: FormSection | null = null;
  const flush = () => { if (current) { sections.push(current); current = null; } };

  for (; i < blocks.length; i++) {
    const b = blocks[i];

    // Trailing signature lines — capture and stop adding to body sections.
    if (b.kind === "paragraph" || b.kind === "kv") {
      const text = b.kind === "paragraph"
        ? b.text
        : `${(b as any).label}: ${(b as any).value}`;
      if (/^doctor['’]s\s*signature|^patient\s*\/\s*guardian|^patient\s*\/\s*guardian\s*\/\s*intimate/i.test(text.trim())) {
        signatureLines.push(text);
        continue;
      }
    }

    if (b.kind === "numSection") {
      flush();
      current = { kind: "numbered", heading: b.text, body: [] };
      continue;
    }
    if (!current) {
      // Floating block before first numbered section — ignore blanks, keep content as a "lone" cell.
      if (b.kind === "blank") continue;
      current = { kind: "lone", body: [] };
    }
    current.body.push(b);
  }
  flush();

  // Trim trailing blanks inside each section.
  for (const s of sections) {
    while (s.body.length && s.body[s.body.length - 1].kind === "blank") s.body.pop();
  }

  return { episodeRow, headerRow, sections, signatureLines };
}

// ===========================================================================
// A4 preview component
// ===========================================================================

function A4Preview({
  body, templateName, chrome: c,
}: { body: string; templateName: string; chrome: ResolvedChrome }) {
  const title = c.titleOverride?.trim() || templateName;
  const blocks = parseStructuredBody(body);
  const useForm = isFormBody(blocks);
  const printDate = new Date().toLocaleDateString("en-GB");

  if (!useForm) {
    // Legacy free-flow layout for non-structured templates (e.g. Greek consultation).
    return (
      <div className="shadow-2xl bg-white text-[#111] relative"
        style={{
          width: "210mm", minHeight: "297mm", padding: "14mm 16mm 20mm 16mm",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}>
        <FreeFlowHeader c={c} title={title} />
        <FreeFlowBody body={body} />
        <FreeFlowFooter c={c} />
      </div>
    );
  }

  const { episodeRow, headerRow, sections, signatureLines } = splitForm(blocks);
  const docSig     = signatureLines.find((l) => /doctor/i.test(l)) ?? "Doctor's Signature/Stamp:";
  const patientSig = signatureLines.find((l) => /patient/i.test(l)) ?? "Patient / Guardian / Intimate Person Signature:";
  const docSigLabel     = docSig.replace(/:.*$/, ":");
  const patientSigLabel = patientSig.replace(/:.*$/, ":");

  return (
    <div className="space-y-4">
      {/* ---------------- Page 1 ---------------- */}
      <div className="shadow-2xl bg-white text-[#111] relative"
        style={{
          width: "210mm", minHeight: "297mm", padding: "10mm 12mm 16mm 12mm",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}>
        <FormHeader c={c} title={title} episodeRow={episodeRow} printDate={printDate} />

        <div className="border border-black mt-1">
          {/* Department / Manager / Consultant */}
          {headerRow && headerRow.kind === "tabRow" && (
            <div className="grid grid-cols-3 border-b border-black">
              {(headerRow as any).cells.map((cell: any, i: number) => (
                <div key={i} className={cn("px-2 py-1.5 text-[10.5px]", i > 0 && "border-l border-black")}>
                  <div className="font-bold underline">{cell.label}:</div>
                  <div className="font-medium">{cell.value || <>&nbsp;</>}</div>
                </div>
              ))}
            </div>
          )}

          {sections.map((s, i) => (
            <div key={i} className={cn("px-2 py-1", i > 0 && "border-t border-black")}>
              {s.heading && (
                <div className="font-bold text-[10.5px] underline mb-1">{s.heading}</div>
              )}
              <SectionBody blocks={s.body} accent={c.accentColor} />
            </div>
          ))}
        </div>

        <div className="absolute left-0 right-0 bottom-[8mm] text-center text-[10px]">1 of 2</div>
      </div>

      {/* ---------------- Page 2 — Signatures ---------------- */}
      <div className="shadow-2xl bg-white text-[#111] relative"
        style={{
          width: "210mm", minHeight: "297mm", padding: "10mm 12mm 16mm 12mm",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}>
        <FormHeader c={c} title={title} episodeRow={episodeRow} printDate={printDate} />

        <div className="grid grid-cols-2 border border-black mt-1" style={{ minHeight: "80mm" }}>
          <div className="px-2 py-1.5 relative">
            <div className="font-bold underline text-[10.5px]">{docSigLabel}</div>
            {c.signatureImageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.signatureImageDataUrl} alt="signature" className="block mx-auto mt-6" style={{ maxHeight: "40mm", maxWidth: "70mm" }} />
            ) : (
              <div className="text-center mt-12"
                style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontSize: "38px", color: c.accentColor }}>
                {c.signatureText}
              </div>
            )}
          </div>
          <div className="px-2 py-1.5 border-l border-black">
            <div className="font-bold underline text-[10.5px]">{patientSigLabel}</div>
          </div>
        </div>

        <div className="absolute left-0 right-0 bottom-[8mm] text-center text-[10px]">2 of 2</div>
      </div>
    </div>
  );
}

// ---- Form header (matches Nicosia Polyclinic discharge) -------------------

function FormHeader({
  c, title, episodeRow, printDate,
}: {
  c: ResolvedChrome; title: string;
  episodeRow: Block | null; printDate: string;
}) {
  const episodeNo = episodeRow && episodeRow.kind === "kv" ? (episodeRow as any).value : "";
  return (
    <>
      <div className="grid grid-cols-[1fr_1.4fr_1fr] items-start gap-2 pb-1">
        {/* Left: Logo + clinic name (small caps) */}
        <div className="flex items-center gap-1.5">
          {c.showLogo && (
            <div className="w-[34px] h-[34px] rounded-full text-white flex items-center justify-center font-bold text-[11px] overflow-hidden shrink-0"
              style={{ background: c.accentColor }}>
              {c.practiceLogoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.practiceLogoDataUrl} alt="logo" className="w-full h-full object-contain bg-white rounded-full" />
              ) : (
                c.practiceLogoText
              )}
            </div>
          )}
          <div className="text-[8.5px] font-bold leading-tight tracking-wider" style={{ color: c.accentColor }}>
            {c.practiceName.toUpperCase().split(" ").map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        </div>
        {/* Center: Practice name + DOC TITLE */}
        <div className="text-center">
          <div className="text-[11.5px] font-bold">{c.practiceName}</div>
          <div className="text-[11.5px] font-bold uppercase tracking-wide mt-0.5">{title}</div>
        </div>
        {/* Right: contact block */}
        <div className="text-right text-[9px] leading-snug">
          {c.practiceAddress && <div><b>Address:</b> {c.practiceAddress}</div>}
          {c.practiceEmail   && <div><b>E-mail:</b> {c.practiceEmail}</div>}
          {c.practicePhone   && <div><b>Tel:</b> {c.practicePhone}</div>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[9px] pt-1 pb-1.5">
        <div><b>License Registration Number:</b> {c.doctorLicense}</div>
        <div className="text-center"><b>Episode No:</b> {episodeNo}</div>
        <div className="text-right"><b>Print Date:</b> {printDate}</div>
      </div>
    </>
  );
}

// ---- Section body (kv / tabRow / subSection / paragraph) ------------------

function SectionBody({ blocks, accent }: { blocks: Block[]; accent: string }) {
  return (
    <div className="text-[10.5px] leading-snug">
      {blocks.map((b, i) => {
        if (b.kind === "blank") return <div key={i} style={{ height: "3px" }} />;
        if (b.kind === "subSection") {
          return <div key={i} className="font-bold mt-1">{b.text}</div>;
        }
        if (b.kind === "kv") {
          return (
            <div key={i} className="flex gap-2 py-[1px]">
              <span className="shrink-0">{b.label}:</span>
              <span className={cn("flex-1 font-medium", !b.value && "border-b border-dotted border-gray-400 min-h-[12px]")}>{b.value}</span>
            </div>
          );
        }
        if (b.kind === "tabRow") {
          const cols = b.cells.length === 3 ? "grid-cols-3" : "grid-cols-2";
          return (
            <div key={i} className={cn("grid gap-3 py-[1px]", cols)}>
              {b.cells.map((cell, ci) => (
                <div key={ci} className="flex gap-1.5">
                  <span className="shrink-0">{cell.label}:</span>
                  <span className={cn("flex-1 font-medium", !cell.value && "border-b border-dotted border-gray-400 min-h-[12px]")}>{cell.value}</span>
                </div>
              ))}
            </div>
          );
        }
        return <div key={i} className="py-[1px]">{b.text}</div>;
      })}
      {blocks.length === 0 && <div className="min-h-[10mm]" />}
    </div>
  );
}

// ---- Free-flow (legacy) layout for non-form templates ---------------------

function FreeFlowHeader({ c, title }: { c: ResolvedChrome; title: string }) {
  if (!c.showHeader) return <div className="mt-4 text-xl font-semibold">{title}</div>;
  return (
    <div className="pb-2 border-b-2" style={{ borderColor: c.accentColor }}>
      <div className="flex items-start gap-3">
        {c.showLogo && (
          <div className="w-11 h-11 rounded-lg text-white flex items-center justify-center font-bold text-base overflow-hidden shrink-0"
            style={{ background: c.accentColor }}>
            {c.practiceLogoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.practiceLogoDataUrl} alt="logo" className="w-full h-full object-contain bg-white" />
            ) : c.practiceLogoText}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold tracking-wide">{c.practiceName}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "#2a2a2a" }}>{title}</div>
        </div>
        <div className="shrink-0 text-right text-[9px]" style={{ color: "#555" }}>
          {c.practiceAddress && <div>Address: {c.practiceAddress}</div>}
          {c.practiceEmail   && <div>E-mail: {c.practiceEmail}</div>}
          {c.practicePhone   && <div>Tel: {c.practicePhone}</div>}
          {c.doctorName      && <div className="mt-1 font-semibold" style={{ color: "#222" }}>{c.doctorName}</div>}
          {c.doctorTitles    && <div>{c.doctorTitles}</div>}
        </div>
      </div>
    </div>
  );
}

function FreeFlowBody({ body }: { body: string }) {
  return (
    <div className="mt-3 text-[11px] whitespace-pre-wrap" style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.55 }}>
      {body}
    </div>
  );
}

function FreeFlowFooter({ c }: { c: ResolvedChrome }) {
  if (!c.showFooter) return null;
  return (
    <div className="absolute left-0 right-0 px-[16mm] bottom-[8mm] border-t border-gray-300 pt-1.5 flex justify-between text-[9px] text-gray-500">
      <span>{c.footerLeft || `${c.practiceName} · Confidential medical record`}</span>
      <span>{c.footerRight || `Page 1 of 1 · ${new Date().toLocaleDateString("en-GB")}`}</span>
    </div>
  );
}

// ===========================================================================
// Static HTML generator for print window
// ===========================================================================

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderSectionBodyHtml(blocks: Block[]): string {
  if (blocks.length === 0) return `<div class="empty-pad"></div>`;
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.kind === "blank") { parts.push(`<div style="height:3px;"></div>`); continue; }
    if (b.kind === "subSection") {
      parts.push(`<div class="sec-sub">${escapeHtml(b.text)}</div>`);
      continue;
    }
    if (b.kind === "kv") {
      const v = b.value
        ? `<span class="val">${escapeHtml(b.value)}</span>`
        : `<span class="val empty">&nbsp;</span>`;
      parts.push(`<div class="kv-row c1"><div class="kv-cell"><span class="lbl">${escapeHtml(b.label)}:</span> ${v}</div></div>`);
      continue;
    }
    if (b.kind === "tabRow") {
      const cls = b.cells.length === 3 ? "c3" : "c2";
      const cells = b.cells.map((cell) => {
        const v = cell.value
          ? `<span class="val">${escapeHtml(cell.value)}</span>`
          : `<span class="val empty">&nbsp;</span>`;
        return `<div class="kv-cell"><span class="lbl">${escapeHtml(cell.label)}:</span> ${v}</div>`;
      }).join("");
      parts.push(`<div class="kv-row ${cls}">${cells}</div>`);
      continue;
    }
    parts.push(`<div class="para">${escapeHtml(b.text)}</div>`);
  }
  return parts.join("");
}

function renderFormHeaderHtml(c: ResolvedChrome, title: string, episodeNo: string, printDate: string): string {
  const logoInner = c.practiceLogoDataUrl
    ? `<img src="${c.practiceLogoDataUrl}" alt="logo" />`
    : escapeHtml(c.practiceLogoText);
  const logoHtml = c.showLogo
    ? `<div class="logo">${logoInner}</div>
       <div class="logo-text">${c.practiceName.toUpperCase().split(" ").map((w) => `<div>${escapeHtml(w)}</div>`).join("")}</div>`
    : "";
  const contact = [
    c.practiceAddress ? `<div><b>Address:</b> ${escapeHtml(c.practiceAddress)}</div>` : "",
    c.practiceEmail   ? `<div><b>E-mail:</b> ${escapeHtml(c.practiceEmail)}</div>` : "",
    c.practicePhone   ? `<div><b>Tel:</b> ${escapeHtml(c.practicePhone)}</div>` : "",
  ].filter(Boolean).join("");

  return `
  <div class="hdr">
    <div class="hdr-left">${logoHtml}</div>
    <div class="hdr-center">
      <div class="prac-name">${escapeHtml(c.practiceName)}</div>
      <div class="doc-title">${escapeHtml(title)}</div>
    </div>
    <div class="hdr-right">${contact}</div>
  </div>
  <div class="sub-row">
    <div class="cell"><b>License Registration Number:</b> ${escapeHtml(c.doctorLicense)}</div>
    <div class="cell center"><b>Episode No:</b> ${escapeHtml(episodeNo)}</div>
    <div class="cell right"><b>Print Date:</b> ${escapeHtml(printDate)}</div>
  </div>`;
}

function renderA4Html(body: string, templateName: string, c: ResolvedChrome): string {
  const title = c.titleOverride?.trim() || templateName;
  const printDate = new Date().toLocaleDateString("en-GB");
  const blocks = parseStructuredBody(body);
  const useForm = isFormBody(blocks);

  if (!useForm) {
    // Legacy free-flow layout
    const headerHtml = c.showHeader
      ? `<div style="padding-bottom:8px;border-bottom:2px solid ${c.accentColor};">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            ${c.showLogo ? `<div class="logo">${escapeHtml(c.practiceLogoText)}</div>` : ""}
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:700;">${escapeHtml(c.practiceName)}</div>
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;">${escapeHtml(title)}</div>
            </div>
            <div style="text-align:right;font-size:9px;color:#555;">
              ${c.practiceAddress ? `<div>Address: ${escapeHtml(c.practiceAddress)}</div>` : ""}
              ${c.practiceEmail   ? `<div>E-mail: ${escapeHtml(c.practiceEmail)}</div>` : ""}
              ${c.practicePhone   ? `<div>Tel: ${escapeHtml(c.practicePhone)}</div>` : ""}
            </div>
          </div>
        </div>`
      : `<div style="font-size:18px;font-weight:600;">${escapeHtml(title)}</div>`;
    return `<div class="a4" style="--accent:${c.accentColor};padding:14mm 16mm 20mm 16mm;">
      ${headerHtml}
      <div style="margin-top:10px;font-size:11px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(body)}</div>
    </div>`;
  }

  const { episodeRow, headerRow, sections, signatureLines } = splitForm(blocks);
  const episodeNo = episodeRow && episodeRow.kind === "kv" ? (episodeRow as any).value : "";
  const docSig     = signatureLines.find((l) => /doctor/i.test(l)) ?? "Doctor's Signature/Stamp:";
  const patientSig = signatureLines.find((l) => /patient/i.test(l)) ?? "Patient / Guardian / Intimate Person Signature:";
  const docSigLabel     = docSig.replace(/:.*$/, ":");
  const patientSigLabel = patientSig.replace(/:.*$/, ":");

  const headerHtml = renderFormHeaderHtml(c, title, episodeNo, printDate);

  // Department row
  const deptRowHtml = headerRow && headerRow.kind === "tabRow"
    ? `<div class="form-row cols-3">${
        (headerRow as any).cells.map((cell: any) =>
          `<div class="form-cell"><div class="sec-num"><u>${escapeHtml(cell.label)}:</u></div><div style="font-weight:500;">${escapeHtml(cell.value) || "&nbsp;"}</div></div>`
        ).join("")
      }</div>`
    : "";

  const sectionsHtml = sections.map((s) =>
    `<div class="form-row">
      ${s.heading ? `<div class="sec-num"><u>${escapeHtml(s.heading)}</u></div>` : ""}
      ${renderSectionBodyHtml(s.body)}
    </div>`
  ).join("");

  const sigMark = c.signatureImageDataUrl
    ? `<img class="sig-img" src="${c.signatureImageDataUrl}" alt="signature" />`
    : `<div class="sig-script">${escapeHtml(c.signatureText)}</div>`;

  // Page 1
  const page1 = `<div class="a4" style="--accent:${c.accentColor};">
    ${headerHtml}
    <div class="form">
      ${deptRowHtml}
      ${sectionsHtml}
    </div>
    <div class="pageno">1 of 2</div>
  </div>`;

  // Page 2 — signature page
  const page2 = `<div class="a4" style="--accent:${c.accentColor};">
    ${headerHtml}
    <div class="sig-grid">
      <div class="sig-box">
        <div class="sig-title">${escapeHtml(docSigLabel)}</div>
        ${sigMark}
      </div>
      <div class="sig-box">
        <div class="sig-title">${escapeHtml(patientSigLabel)}</div>
      </div>
    </div>
    <div class="pageno">2 of 2</div>
  </div>`;

  return page1 + "\n" + page2;
}
