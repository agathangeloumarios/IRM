// Server-safe XML extraction + patient builder.
// No DOM APIs: works in Node route handlers AND in the browser.

import type { Patient } from "@/lib/mock-data";

const XML_FIELD_MAP = {
  beneficiaryName: "BeneficiaryName",
  beneficiaryLastName: "BeneficiaryLastName",
  beneficiaryDob: "BeneficiaryDOB",
  beneficiaryDocId: "BeneficiaryDocId",
  referralId: "ReferralId",
  beneficiaryGender: "BeneficiaryGender",
  visitDateTime: "VisitDateTime",
  referralActivityId: "ReferralActivityId",
  referralActivityName: "ReferralActivityName",
  referralDoctorName: "ReferralDoctorName",
} as const;

function pick(xml: string, tag: string): string {
  const re = new RegExp(
    `<\\s*${tag}\\b[^>]*>([\\s\\S]*?)<\\s*/\\s*${tag}\\s*>`,
    "i"
  );
  const m = xml.match(re);
  return m ? m[1].trim() : "";
}

function normalizeDob(raw: string): string {
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const m = raw.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
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
  const extracted: Record<string, string> = {};
  const violations: string[] = [];

  if (!xmlText || typeof xmlText !== "string" || xmlText.trim().length === 0) {
    return { extracted, violations: ["Empty XML document"] };
  }

  for (const [key, tag] of Object.entries(XML_FIELD_MAP)) {
    const v = pick(xmlText, tag);
    extracted[key] = v;
    if (!v) violations.push(`Missing required field <${tag}>`);
  }

  return { extracted, violations };
}

export function buildPatientFromXml(
  extracted: Record<string, string>,
  phone: string,
  opts?: { id?: string }
): Omit<Patient, "createdAt" | "importedAt"> & {
  createdAt: string;
  importedAt: string;
} {
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
  const id = opts?.id || "p-" + Math.random().toString(36).slice(2, 9);
  const mrn =
    "IR-" + today.replace(/-/g, "").slice(2) + "-" + id.slice(-4).toUpperCase();

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
    reportDate: today,
    activity: activity || "—",
    referringDoctor: extracted.referralDoctorName || "",
    status: "active",
    createdAt: todayISO,
    importedAt: todayISO,
    source: "xml",
  };
}

export function naturalKeyFromExtracted(
  extracted: Record<string, string>
): string {
  return [
    extracted.beneficiaryDocId || "",
    extracted.referralId || "",
    extracted.visitDateTime || "",
  ].join("|");
}
