"use client";

/**
 * template-parser.tsx
 *
 * Shared utilities for parsing structured discharge-note template bodies
 * and rendering the Discharge Form Editor component.
 *
 * Used by:  src/app/reports/page.tsx
 *           src/app/files/page.tsx
 */

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PlaceholderContext } from "@/lib/placeholders";
import {
  ReportTemplate,
  TemplateChrome,
  resolveChrome,
} from "@/lib/template-store";

// ===========================================================================
// Block type + structured body parser
// ===========================================================================

export type Block =
  | { kind: "numSection"; text: string }
  | { kind: "subSection"; text: string }
  | { kind: "kv"; label: string; value: string }
  | { kind: "tabRow"; cells: { label: string; value: string }[] }
  | { kind: "paragraph"; text: string }
  | { kind: "blank" };

export const NUM_SECTION_RE = /^(\d{1,2})\.\s+(.*)$/;
export const SUB_SECTION_RE = /^([a-z])\.\s+(.*)$/i;
export const KV_RE          = /^([^:]{1,120}):\s*(.*)$/;

export function parseStructuredBody(body: string): Block[] {
  const out: Block[] = [];
  const lines = body.split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) { out.push({ kind: "blank" }); continue; }

    if (line.includes("\t")) {
      const rawCells = line.split("\t");
      const cells: { label: string; value: string }[] = [];
      let allValid = true;
      for (const rawCell of rawCells) {
        const subM = /^([a-z])\.\s+/i.exec(rawCell.trim());
        const stripped = subM ? rawCell.trim().slice(subM[0].length) : rawCell.trim();
        const m = KV_RE.exec(stripped);
        if (m) {
          const prefix = subM ? `${subM[0].trim()} ` : "";
          cells.push({ label: prefix + m[1].trim(), value: m[2].trim() });
        } else {
          allValid = false;
          break;
        }
      }
      if (allValid && cells.length >= 2) {
        out.push({ kind: "tabRow", cells });
        continue;
      }
    }

    const num = NUM_SECTION_RE.exec(line);
    if (num) {
      const inner = num[2];
      const innerKv = KV_RE.exec(inner);
      if (innerKv && innerKv[2].trim().length > 0) {
        out.push({ kind: "numSection", text: `${num[1]}. ${innerKv[1].trim()}` });
        out.push({ kind: "kv", label: innerKv[1].trim(), value: innerKv[2].trim() });
      } else {
        out.push({ kind: "numSection", text: line.replace(/:\s*$/, "") });
      }
      continue;
    }

    const sub = SUB_SECTION_RE.exec(line);
    if (sub) {
      out.push({ kind: "subSection", text: line });
      continue;
    }

    const kv = KV_RE.exec(line);
    if (kv && kv[1].trim().length <= 60) {
      out.push({ kind: "kv", label: kv[1].trim(), value: kv[2].trim() });
      continue;
    }

    out.push({ kind: "paragraph", text: line });
  }

  const compact: Block[] = [];
  for (const b of out) {
    if (b.kind === "blank" && compact[compact.length - 1]?.kind === "blank") continue;
    compact.push(b);
  }
  return compact;
}

export function isFormBody(blocks: Block[]): boolean {
  return blocks.some((b) => b.kind === "numSection");
}

// ===========================================================================
// Discharge Form Editor — form field definitions + component
// ===========================================================================

/** The subset of TemplateChrome keys that are plain text (editable in the form). */
export type ChromeKey =
  | "titleOverride" | "practiceName" | "practiceAddress"
  | "practicePhone" | "practiceEmail"
  | "doctorName" | "doctorTitles" | "doctorLicense"
  | "signatureText" | "footerLeft";

export interface FormFieldDef {
  key: keyof PlaceholderContext;
  label: string;
  multiline?: boolean;
  span2?: boolean;
}
export interface FormSectionDef {
  id: string;
  title: string;
  fields: FormFieldDef[];
}
export interface ChromeFieldDef {
  key: ChromeKey;
  label: string;
  span2?: boolean;
}

export const DISCHARGE_SECTIONS: FormSectionDef[] = [
  {
    id: "hdrow",
    title: "Form Identification",
    fields: [
      { key: "EpisodeNo",         label: "EPISODE NO" },
      { key: "Department",        label: "DEPARTMENT" },
      { key: "DepartmentManager", label: "DEPARTMENT MANAGER" },
      { key: "ConsultantDoctor",  label: "CONSULTANT DOCTOR" },
    ],
  },
  {
    id: "s1",
    title: "1. Patient Demographic Information",
    fields: [
      { key: "PatientName",      label: "PATIENT NAME",      span2: true },
      { key: "HIOCode",          label: "HIO CODE" },
      { key: "PassportNo",       label: "ID / PASSPORT NO" },
      { key: "HospitalId",       label: "HOSPITAL ID" },
      { key: "DateOfBirth",      label: "DATE OF BIRTH" },
      { key: "Occupation",       label: "OCCUPATION" },
      { key: "Gender",           label: "GENDER" },
      { key: "Address",          label: "ADDRESS",           span2: true },
      { key: "Telephone",        label: "TELEPHONE" },
      { key: "AdmissionWeight",  label: "ADMISSION WEIGHT (KIDS UNDER 1 YEAR OLD)", span2: true },
      { key: "VentilationHours", label: "VENTILATION HOURS" },
    ],
  },
  {
    id: "s2",
    title: "2. Admission Via",
    fields: [
      { key: "AdmissionVia", label: "ADMISSION VIA", multiline: true, span2: true },
    ],
  },
  {
    id: "s3",
    title: "3. Hospitalization Time",
    fields: [
      { key: "AdmissionDate", label: "ADMISSION DATE" },
      { key: "DischargeDate", label: "DISCHARGE DATE" },
      { key: "LeaveDays",     label: "LEAVE DAYS" },
    ],
  },
  {
    id: "s4",
    title: "4. Referral Doctor",
    fields: [
      { key: "ReferralDoctor", label: "REFERRAL DOCTOR", span2: true },
    ],
  },
  {
    id: "s5",
    title: "5. Reason of Admission – Treatment",
    fields: [
      { key: "ClinicalNote",          label: "a. CLINICAL NOTE (BRIEFLY HISTORY OF PATIENT SYMPTOMS)", multiline: true, span2: true },
      { key: "Pacemaker",             label: "PACEMAKER" },
      { key: "Delivery",              label: "DELIVERY" },
      { key: "PatientClinicalStatus", label: "PATIENT CLINICAL STATUS ON ADMISSION", multiline: true, span2: true },
      { key: "PrimaryDiagnosis",      label: "b. PRIMARY DIAGNOSIS",               multiline: true, span2: true },
      { key: "SecondaryDiagnosis",    label: "c. SECONDARY DIAGNOSIS",             multiline: true, span2: true },
      { key: "Therapy",               label: "d. THERAPY – CLINICAL PROCEDURES",   multiline: true, span2: true },
      { key: "SurgicalFindings",      label: "e. SURGICAL FINDINGS",               multiline: true, span2: true },
      { key: "LabExamGroups",         label: "f. LABORATORY EXAMINATIONS GROUPS",  multiline: true, span2: true },
      { key: "LabExamDetails",        label: "f. LABORATORY EXAMINATIONS DETAILS", multiline: true, span2: true },
      { key: "HistopathologyExaminations", label: "g. HISTOPATHOLOGY EXAMINATIONS", multiline: true, span2: true },
      { key: "Attachments",           label: "h. ATTACHMENTS",                     multiline: true, span2: true },
      { key: "Anaesthetist",          label: "i. ANAESTHETIST" },
      { key: "AnaesthesiaType",       label: "i. ANAESTHESIA TYPE" },
    ],
  },
  {
    id: "s6",
    title: "6. Discharge (Outcome)",
    fields: [
      { key: "DischargeMode",   label: "a. MODE / TYPE" },
      { key: "DischargeStatus", label: "b. STATUS / CONDITION" },
    ],
  },
  {
    id: "s7",
    title: "7. Therapeutically – Medicines and Advices",
    fields: [
      { key: "Therapeutics", label: "THERAPEUTICALLY – MEDICINES AND ADVICES", multiline: true, span2: true },
    ],
  },
  {
    id: "s8",
    title: "8. Next Visit",
    fields: [
      { key: "NextVisit", label: "NEXT VISIT", span2: true },
    ],
  },
];

export const CHROME_FORM_FIELDS: ChromeFieldDef[] = [
  { key: "titleOverride",   label: "DOCUMENT TITLE (OPTIONAL OVERRIDE)", span2: true },
  { key: "practiceName",    label: "PRACTICE NAME",                      span2: true },
  { key: "practiceAddress", label: "ADDRESS",                            span2: true },
  { key: "practicePhone",   label: "TEL" },
  { key: "practiceEmail",   label: "E-MAIL" },
  { key: "doctorName",      label: "DOCTOR NAME",                        span2: true },
  { key: "doctorTitles",    label: "DOCTOR TITLES / SPECIALTY",          span2: true },
  { key: "doctorLicense",   label: "LICENSE / REGISTRATION NO" },
  { key: "signatureText",   label: "SIGNATURE TEXT" },
  { key: "footerLeft",      label: "FOOTER LEFT",                        span2: true },
];

// ===========================================================================
// DischargeFormEditor component
// ===========================================================================

interface DischargeFormEditorProps {
  template: ReportTemplate;
  ctx: PlaceholderContext;
  /** Hide the "Document Settings" (chrome) section — use when chrome fields are shown elsewhere */
  hideChrome?: boolean;
  readOnly: boolean;
  onFieldChange: (key: keyof PlaceholderContext, value: string) => void;
  onChromeChange: (key: ChromeKey, value: string) => void;
}

export function DischargeFormEditor({
  template, ctx, hideChrome = false, readOnly, onFieldChange, onChromeChange,
}: DischargeFormEditorProps) {
  const rc = resolveChrome(template.chrome);
  const chromeLocked = template.locked;

  const inputCls = "h-7 text-xs bg-background/60";
  const textCls  = "text-xs bg-background/60 min-h-[68px] resize-y";
  const lblCls   = "block text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5";
  const secCls   = "text-[9.5px] uppercase tracking-widest font-bold pb-1 mb-2.5 border-b border-primary-foreground/20 text-primary-foreground/80";

  return (
    <div className="space-y-5 py-1">
      {/* ---- Document Settings (chrome) ---- */}
      {!hideChrome && (
        <div>
          <div className={secCls}>Document Settings</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            {CHROME_FORM_FIELDS.map((f) => {
              const stored = (template.chrome as Record<string, unknown> | undefined)?.[f.key] as string | undefined;
              const fallback = (rc as unknown as Record<string, string>)[f.key] ?? "";
              return (
                <div key={f.key} className={cn("", f.span2 && "col-span-2")}>
                  <label className={lblCls}>{f.label}</label>
                  <Input
                    value={stored ?? ""}
                    placeholder={fallback}
                    readOnly={readOnly || chromeLocked}
                    className={inputCls}
                    onChange={(e) => !readOnly && !chromeLocked && onChromeChange(f.key, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Content sections ---- */}
      {DISCHARGE_SECTIONS.map((section) => (
        <div key={section.id}>
          <div className={secCls}>{section.title}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            {section.fields.map((f) => {
              const val = (ctx as Record<string, unknown>)[f.key as string] as string | undefined ?? "";
              return (
                <div key={String(f.key)} className={cn("", f.span2 && "col-span-2")}>
                  <label className={lblCls}>{f.label}</label>
                  {f.multiline ? (
                    <Textarea
                      value={val}
                      readOnly={readOnly}
                      className={textCls}
                      onChange={(e) => !readOnly && onFieldChange(f.key, e.target.value)}
                    />
                  ) : (
                    <Input
                      value={val}
                      readOnly={readOnly}
                      className={inputCls}
                      onChange={(e) => !readOnly && onFieldChange(f.key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
