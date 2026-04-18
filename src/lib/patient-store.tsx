"use client";

import * as React from "react";
import { patients as seed, Patient, PatientStatus } from "@/lib/mock-data";

/**
 * XML-driven field template. The shape of the template is locked the first
 * time a patient is created — either from XML import or manual entry.
 */
export interface FieldTemplate {
  id: string;
  createdAt: string;
  sourcePatientId: string;
  source: "xml" | "manual";
  /** Ordered list of canonical field keys discovered in the first record. */
  fields: string[];
}

interface PatientStoreValue {
  patients: Patient[];
  template: FieldTemplate | null;
  addPatient: (p: Patient, opts?: { setAsTemplateSource?: boolean }) => void;
  updatePatient: (id: string, patch: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  setStatus: (id: string, status: PatientStatus) => void;
  importXml: (xml: string, manualPhone: string) => ImportResult;
}

export interface ImportResult {
  ok: boolean;
  patient?: Patient;
  error?: string;
  violations?: string[];
}

const PatientCtx = React.createContext<PatientStoreValue | null>(null);

// ---- XML parsing ---------------------------------------------------------

const XML_FIELD_MAP = {
  beneficiaryName:        "BeneficiaryName",
  beneficiaryLastName:    "BeneficiaryLastName",
  beneficiaryDob:         "BeneficiaryDOB",
  beneficiaryDocId:       "BeneficiaryDocId",
  referralId:             "ReferralId",
  beneficiaryGender:      "BeneficiaryGender",
  visitDateTime:          "VisitDateTime",
  referralActivityId:     "ReferralActivityId",
  referralActivityName:   "ReferralActivityName",
  referralDoctorName:     "ReferralDoctorName",
} as const;

function pick(doc: Document, tag: string): string {
  // Case-insensitive lookup — handles mixed-case XML schemas.
  const nodes = doc.getElementsByTagName("*");
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.tagName.toLowerCase() === tag.toLowerCase()) {
      return (n.textContent || "").trim();
    }
  }
  return "";
}

function normalizeDob(raw: string): string {
  if (!raw) return "";
  // Accept YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const m = raw.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // Try Date.parse
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return raw;
}

function normalizeVisit(raw: string): string {
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return raw;
}

export function parsePatientXml(xmlText: string): {
  extracted: Record<string, string>;
  violations: string[];
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const parseError = doc.getElementsByTagName("parsererror")[0];
  if (parseError) {
    return { extracted: {}, violations: ["Invalid XML · " + parseError.textContent?.slice(0, 80)] };
  }

  const extracted: Record<string, string> = {};
  const violations: string[] = [];

  for (const [key, tag] of Object.entries(XML_FIELD_MAP)) {
    const v = pick(doc, tag);
    extracted[key] = v;
    if (!v) violations.push(`Missing required field <${tag}>`);
  }

  return { extracted, violations };
}

export function buildPatientFromXml(
  extracted: Record<string, string>,
  phone: string
): Patient {
  const todayISO = new Date().toISOString();
  const today = todayISO.slice(0, 10);
  const fullName = [extracted.beneficiaryName, extracted.beneficiaryLastName]
    .filter(Boolean)
    .join(" ")
    .trim()
    .toUpperCase();
  const activity = [extracted.referralActivityId, extracted.referralActivityName]
    .filter(Boolean)
    .join(" — ")
    .trim();
  const id = "p-" + Math.random().toString(36).slice(2, 9);
  const mrn = "IR-" + today.replace(/-/g, "").slice(2) + "-" + id.slice(-4).toUpperCase();

  return {
    id,
    mrn,
    fullName: fullName || "—",
    dob: normalizeDob(extracted.beneficiaryDob),
    docId: extracted.beneficiaryDocId || "",
    referralId: extracted.referralId || "",
    phone,
    gender: extracted.beneficiaryGender || "",
    visitDate: normalizeVisit(extracted.visitDateTime),
    reportDate: today, // Ημ. Γνωμάτευσης defaults to today
    activity: activity || "—",
    referringDoctor: extracted.referralDoctorName || "",
    status: "active",
    createdAt: todayISO,
    importedAt: todayISO,
    source: "xml",
  };
}

// ---- Provider ------------------------------------------------------------

const STORAGE_KEY = "irm:patients:v1";
const TEMPLATE_KEY = "irm:template:v1";

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = React.useState<Patient[]>(seed);
  const [template, setTemplate] = React.useState<FieldTemplate | null>(() => {
    // Derive initial template from seed data — Elena Marchetti is the template source.
    const src = seed.find((p) => p.isTemplateSource) || seed[0];
    if (!src) return null;
    return {
      id: "tpl-seed",
      createdAt: src.createdAt,
      sourcePatientId: src.id,
      source: src.source,
      fields: [
        "fullName", "dob", "docId", "referralId", "phone",
        "gender", "visitDate", "reportDate", "activity", "referringDoctor", "mrn",
      ],
    };
  });

  // Hydrate from localStorage (client-only)
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPatients(JSON.parse(raw));
      const tpl = localStorage.getItem(TEMPLATE_KEY);
      if (tpl) setTemplate(JSON.parse(tpl));
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(patients)); } catch {}
  }, [patients]);

  React.useEffect(() => {
    try { localStorage.setItem(TEMPLATE_KEY, JSON.stringify(template)); } catch {}
  }, [template]);

  const addPatient = React.useCallback<PatientStoreValue["addPatient"]>(
    (p, opts) => {
      setPatients((list) => {
        const next = [{ ...p, isTemplateSource: opts?.setAsTemplateSource }, ...list];
        return next;
      });
      setTemplate((tpl) => {
        if (tpl) return tpl;
        return {
          id: "tpl-" + Date.now(),
          createdAt: new Date().toISOString(),
          sourcePatientId: p.id,
          source: p.source,
          fields: [
            "fullName", "dob", "docId", "referralId", "phone",
            "gender", "visitDate", "reportDate", "activity", "referringDoctor", "mrn",
          ],
        };
      });
    },
    []
  );

  const updatePatient = React.useCallback<PatientStoreValue["updatePatient"]>((id, patch) => {
    setPatients((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const deletePatient = React.useCallback<PatientStoreValue["deletePatient"]>((id) => {
    setPatients((list) => list.filter((p) => p.id !== id));
  }, []);

  const setStatus = React.useCallback<PatientStoreValue["setStatus"]>((id, status) => {
    setPatients((list) =>
      list.map((p) =>
        p.id === id
          ? {
              ...p,
              // "Completed" → auto-archive per workflow.
              status: status === "completed" ? "archived" : status,
            }
          : p
      )
    );
  }, []);

  const importXml = React.useCallback<PatientStoreValue["importXml"]>(
    (xml, manualPhone) => {
      const { extracted, violations } = parsePatientXml(xml);
      if (violations.length > 0 && Object.values(extracted).filter(Boolean).length === 0) {
        return { ok: false, error: "Could not parse XML", violations };
      }
      const patient = buildPatientFromXml(extracted, manualPhone);
      const isFirst = !template;
      addPatient(patient, { setAsTemplateSource: isFirst });
      return { ok: true, patient, violations };
    },
    [template, addPatient]
  );

  const value: PatientStoreValue = React.useMemo(
    () => ({ patients, template, addPatient, updatePatient, deletePatient, setStatus, importXml }),
    [patients, template, addPatient, updatePatient, deletePatient, setStatus, importXml]
  );

  return <PatientCtx.Provider value={value}>{children}</PatientCtx.Provider>;
}

export function usePatients() {
  const ctx = React.useContext(PatientCtx);
  if (!ctx) throw new Error("usePatients must be used within <PatientProvider>");
  return ctx;
}
