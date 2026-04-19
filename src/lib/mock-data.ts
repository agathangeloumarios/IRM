// Mock data store for demo purposes. Replace with HIPAA-compliant backend in production.

export type PatientStatus = "active" | "inactive" | "completed" | "archived";
export type ProcedureStatus = "scheduled" | "waiting-list" | "completed" | "cancelled";

/**
 * Enforced 11-field patient template (Greek labels).
 * `phone` is always entered manually. `reportDate` defaults to today on import.
 */
export const PATIENT_TEMPLATE_FIELDS = [
  { key: "fullName",        label: "Ονοματεπώνυμο",     xml: "BeneficiaryName + BeneficiaryLastName" },
  { key: "dob",             label: "Ημ. Γέννησης",      xml: "BeneficiaryDOB" },
  { key: "docId",           label: "ΑΔΤ",               xml: "BeneficiaryDocId" },
  { key: "referralId",      label: "Αρ. Παραπεμπτικού", xml: "ReferralId" },
  { key: "phone",           label: "Τηλέφωνο",          xml: "— manual entry —" },
  { key: "gender",          label: "Φύλο",              xml: "BeneficiaryGender" },
  { key: "visitDate",       label: "Ημ. Εξετ.",         xml: "VisitDateTime" },
  { key: "reportDate",      label: "Ημ. Γνωμάτευσης",   xml: "— defaults to today —" },
  { key: "activity",        label: "Δραστηριότητα",     xml: "ReferralActivityId + ReferralActivityName" },
  { key: "referringDoctor", label: "Παραπ. Ιατρός",     xml: "ReferralDoctorName" },
  { key: "mrn",             label: "MRN",               xml: "— system generated —" },
] as const;

export type PatientFieldKey = (typeof PATIENT_TEMPLATE_FIELDS)[number]["key"];

export interface Patient {
  id: string;
  mrn: string;
  // Greek template fields
  fullName: string;        // Ονοματεπώνυμο
  dob: string;             // Ημ. Γέννησης (YYYY-MM-DD)
  docId: string;           // ΑΔΤ
  referralId: string;      // Αρ. Παραπεμπτικού
  phone: string;           // Τηλέφωνο (manual)
  gender: string;          // Φύλο (Α / Θ / Μ / F / X)
  visitDate: string;       // Ημ. Εξετ. (YYYY-MM-DD)
  reportDate: string;      // Ημ. Γνωμάτευσης
  activity: string;        // Δραστηριότητα
  referringDoctor: string; // Παραπ. Ιατρός
  status: PatientStatus;
  createdAt: string;
  importedAt?: string;
  isTemplateSource?: boolean;
  source: "manual" | "xml";
}

// Back-compat display helpers for pages that referenced older fields.
export const patientName = (p: Patient) => p.fullName;
export const patientDiagnosis = (p: Patient) =>
  p.activity.includes(" — ") ? p.activity.split(" — ")[1] : p.activity;

export interface Procedure {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn?: string;
  patientPhone?: string;
  patientDob?: string;
  patientReferralId?: string;
  patientDocId?: string;
  type: string;
  physician: string;
  scheduledAt: string;      // ISO datetime
  durationMin: number;
  status: ProcedureStatus;
  room: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  time: string;
  procedure: string;
  status: "waiting" | "checked-in" | "in-room" | "completed";
  room?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  locked: boolean;
  placeholders: string[];
  updated: string;
  format: "docx" | "txt" | "pdf";
}

export interface FileItem {
  id: string;
  name: string;
  type: "template" | "backup" | "report" | "import";
  size: string;
  updated: string;
  ext: string;
}

export const MOCK_NOW_ISO = "2026-04-18T09:00:00.000Z";

const now = new Date(MOCK_NOW_ISO);
const iso = (offsetDays: number, hour = 9, minute = 0) => {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
};
const ymd = (offsetDays: number) => {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export const MOCK_TODAY = ymd(0);

function seededUnit(index: number) {
  const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export const patients: Patient[] = [
  {
    id: "p-001", mrn: "IR-240118",
    fullName: "ΕΛΕΝΗ ΜΑΡΚΕΤΗ", dob: "1962-03-14", docId: "ΑΙ123456",
    referralId: "REF-2026-00112", phone: "+30 210 555 0198", gender: "Θ",
    visitDate: ymd(-4), reportDate: ymd(-4),
    activity: "4312 — Εμβολισμός Μήτρας",
    referringDoctor: "Dr. Παπαδόπουλος",
    status: "active", createdAt: iso(-4, 11), source: "xml",
    importedAt: iso(-4, 11), isTemplateSource: true,
  },
  {
    id: "p-002", mrn: "IR-240204",
    fullName: "ΜΑΡΚΟΣ ΧΟΛΑΝΤΕΡ", dob: "1955-08-22", docId: "ΑΒ789012",
    referralId: "REF-2026-00143", phone: "+30 210 555 0123", gender: "Α",
    visitDate: ymd(-1), reportDate: ymd(-1),
    activity: "4208 — TACE Ήπατος",
    referringDoctor: "Dr. Τσέν",
    status: "active", createdAt: iso(-1, 14), source: "xml", importedAt: iso(-1, 14),
  },
  {
    id: "p-003", mrn: "IR-240301",
    fullName: "ΑΝΙΚΑ ΡΑΧΜΑΝ", dob: "1978-11-03", docId: "ΑΖ334567",
    referralId: "REF-2026-00189", phone: "+30 210 555 0144", gender: "Θ",
    visitDate: ymd(-10), reportDate: ymd(-10),
    activity: "4115 — Αγγειοπλαστική",
    referringDoctor: "Dr. Οκαφόρ",
    status: "inactive", createdAt: iso(-10, 9), source: "xml", importedAt: iso(-10, 9),
  },
  {
    id: "p-004", mrn: "IR-240318",
    fullName: "ΘΕΟΔΩΡΟΣ ΚΙΜ", dob: "1948-02-17", docId: "ΑΓ987654",
    referralId: "REF-2026-00201", phone: "+30 210 555 0177", gender: "Α",
    visitDate: ymd(0), reportDate: ymd(0),
    activity: "4309 — Εμβολισμός Προστάτη",
    referringDoctor: "Dr. Γουόκερ",
    status: "active", createdAt: iso(0, 10), source: "manual",
  },
  {
    id: "p-005", mrn: "IR-231112",
    fullName: "ΠΡΙΓΙΑ ΒΕΝΚΑΤΕΣ", dob: "1969-06-29", docId: "ΑΕ445566",
    referralId: "REF-2025-09887", phone: "+30 210 555 0112", gender: "Θ",
    visitDate: ymd(-90), reportDate: ymd(-90),
    activity: "4411 — IVC Filter",
    referringDoctor: "Dr. Παπαδόπουλος",
    status: "archived", createdAt: iso(-90, 13), source: "xml", importedAt: iso(-90, 13),
  },
  {
    id: "p-006", mrn: "IR-240402",
    fullName: "ΙΟΡΔΑΝΗΣ ΑΛΒΑΡΕΖ", dob: "1983-12-08", docId: "ΑΔ112233",
    referralId: "REF-2026-00233", phone: "+30 210 555 0166", gender: "Α",
    visitDate: ymd(-2), reportDate: ymd(-2),
    activity: "4507 — Κιρσοκήλη",
    referringDoctor: "Dr. Τσέν",
    status: "active", createdAt: iso(-2, 16), source: "xml", importedAt: iso(-2, 16),
  },
];

export const procedures: Procedure[] = [
  { id: "pr-001", patientId: "p-001", patientName: "ΕΛΕΝΗ ΜΑΡΚΕΤΗ", type: "Uterine Fibroid Embolization", physician: "Dr. Reyes", scheduledAt: iso(0, 9), durationMin: 90, status: "scheduled", room: "IR-Suite 1", createdAt: iso(-2, 11), updatedAt: iso(-2, 11), statusChangedAt: iso(-2, 11) },
  { id: "pr-002", patientId: "p-002", patientName: "ΜΑΡΚΟΣ ΧΟΛΑΝΤΕΡ", type: "TACE - Liver", physician: "Dr. Reyes", scheduledAt: iso(0, 11), durationMin: 120, status: "scheduled", room: "IR-Suite 2", createdAt: iso(-1, 14), updatedAt: iso(-1, 14), statusChangedAt: iso(-1, 14) },
  { id: "pr-003", patientId: "p-003", patientName: "ΑΝΙΚΑ ΡΑΧΜΑΝ", type: "Peripheral Angioplasty", physician: "Dr. Reyes", scheduledAt: iso(0, 14), durationMin: 75, status: "waiting-list", room: "IR-Suite 1", createdAt: iso(-3, 9), updatedAt: iso(-3, 9), statusChangedAt: iso(-3, 9) },
  { id: "pr-004", patientId: "p-006", patientName: "ΙΟΡΔΑΝΗΣ ΑΛΒΑΡΕΖ", type: "Varicocele Embolization", physician: "Dr. Reyes", scheduledAt: iso(1, 9, 30), durationMin: 60, status: "scheduled", room: "IR-Suite 1", createdAt: iso(-1, 16), updatedAt: iso(-1, 16), statusChangedAt: iso(-1, 16) },
  { id: "pr-005", patientId: "p-004", patientName: "ΘΕΟΔΩΡΟΣ ΚΙΜ", type: "Prostate Artery Embolization", physician: "Dr. Reyes", scheduledAt: iso(2, 10), durationMin: 120, status: "waiting-list", room: "IR-Suite 2", createdAt: iso(0, 10), updatedAt: iso(0, 10), statusChangedAt: iso(0, 10) },
  { id: "pr-006", patientId: "p-002", patientName: "ΜΑΡΚΟΣ ΧΟΛΑΝΤΕΡ", type: "Biliary Drainage", physician: "Dr. Reyes", scheduledAt: iso(-3, 13), durationMin: 60, status: "completed", room: "IR-Suite 1", createdAt: iso(-5, 13), updatedAt: iso(-3, 14), statusChangedAt: iso(-3, 14) },
  { id: "pr-007", patientId: "p-003", patientName: "ΑΝΙΚΑ ΡΑΧΜΑΝ", type: "Angiogram", physician: "Dr. Reyes", scheduledAt: iso(-7, 9), durationMin: 45, status: "completed", room: "IR-Suite 1", createdAt: iso(-9, 9), updatedAt: iso(-7, 10), statusChangedAt: iso(-7, 10) },
];

export const appointments: Appointment[] = [
  { id: "a-001", patientId: "p-001", patientName: "ΕΛΕΝΗ ΜΑΡΚΕΤΗ", time: iso(0, 9), procedure: "UFE", status: "checked-in", room: "IR-Suite 1" },
  { id: "a-002", patientId: "p-002", patientName: "ΜΑΡΚΟΣ ΧΟΛΑΝΤΕΡ", time: iso(0, 11), procedure: "TACE", status: "in-room", room: "IR-Suite 2" },
  { id: "a-003", patientId: "p-003", patientName: "ΑΝΙΚΑ ΡΑΧΜΑΝ", time: iso(0, 14), procedure: "Angioplasty", status: "waiting" },
  { id: "a-004", patientId: "p-004", patientName: "ΘΕΟΔΩΡΟΣ ΚΙΜ", time: iso(0, 15, 30), procedure: "Consultation", status: "waiting" },
];

export const templates: ReportTemplate[] = [
  { id: "t-001", name: "UFE Discharge Summary", locked: true, placeholders: ["PatientName", "MRN", "ProcedureDate", "Findings", "Medications"], updated: iso(-6), format: "docx" },
  { id: "t-002", name: "TACE Post-Procedure", locked: true, placeholders: ["PatientName", "MRN", "ProcedureDate", "ContrastUsed", "Complications", "FollowUp"], updated: iso(-12), format: "docx" },
  { id: "t-003", name: "Angioplasty Discharge", locked: false, placeholders: ["PatientName", "MRN", "Vessel", "Device", "Findings"], updated: iso(-2), format: "docx" },
  { id: "t-004", name: "Generic Operative Note", locked: false, placeholders: ["PatientName", "MRN", "Date", "Procedure", "Physician"], updated: iso(-30), format: "txt" },
];

export const files: FileItem[] = [
  { id: "f-001", name: "patients_backup_2026-04-15.json", type: "backup", size: "2.4 MB", updated: iso(-3), ext: "json" },
  { id: "f-002", name: "UFE_template_v3.docx", type: "template", size: "184 KB", updated: iso(-6), ext: "docx" },
  { id: "f-003", name: "marchetti_operative_report.pdf", type: "report", size: "612 KB", updated: iso(-4), ext: "pdf" },
  { id: "f-004", name: "hollander_lab_import.xml", type: "import", size: "48 KB", updated: iso(-1), ext: "xml" },
  { id: "f-005", name: "TACE_template_v2.docx", type: "template", size: "204 KB", updated: iso(-12), ext: "docx" },
  { id: "f-006", name: "full_practice_export_q1.xlsx", type: "backup", size: "8.1 MB", updated: iso(-20), ext: "xlsx" },
];

// Analytics mock series
export const monthlyVolume = [
  { month: "Jan", procedures: 42, revenue: 128400, newPatients: 14 },
  { month: "Feb", procedures: 38, revenue: 114200, newPatients: 11 },
  { month: "Mar", procedures: 51, revenue: 162100, newPatients: 18 },
  { month: "Apr", procedures: 47, revenue: 149800, newPatients: 16 },
  { month: "May", procedures: 55, revenue: 178300, newPatients: 21 },
  { month: "Jun", procedures: 61, revenue: 198700, newPatients: 19 },
  { month: "Jul", procedures: 58, revenue: 185900, newPatients: 17 },
  { month: "Aug", procedures: 53, revenue: 171200, newPatients: 15 },
  { month: "Sep", procedures: 60, revenue: 194500, newPatients: 22 },
  { month: "Oct", procedures: 66, revenue: 219800, newPatients: 24 },
  { month: "Nov", procedures: 63, revenue: 208400, newPatients: 20 },
  { month: "Dec", procedures: 58, revenue: 189600, newPatients: 18 },
];

export const procedureMix = [
  { name: "Embolization", value: 38, color: "#F96903" },
  { name: "Angioplasty", value: 24, color: "#06E575" },
  { name: "Biopsy", value: 16, color: "#297DFF" },
  { name: "Drainage", value: 12, color: "#AC47FC" },
  { name: "Other", value: 10, color: "#7B7876" },
];

export const dailyActivity = Array.from({ length: 28 }, (_, i) => {
  const intensity = seededUnit(i + 1);
  return {
    day: i + 1,
    cases: Math.floor(intensity * 6) + 1,
    intensity,
  };
});

// Back-compat: earlier UI referenced this constant. Now derived from the template.
export const PATIENT_FIELD_TEMPLATE = PATIENT_TEMPLATE_FIELDS.map((f) => f.label);

export interface ProcedureType {
  id: string;
  name: string;
  defaultDurationMin: number;
  cpt?: string;
  active: boolean;
}

export const PROCEDURE_TYPE_SEEDS: ProcedureType[] = [
  { id: "pt-001", name: "Uterine Fibroid Embolization", defaultDurationMin: 90,  cpt: "37243", active: true },
  { id: "pt-002", name: "TACE - Liver",                 defaultDurationMin: 120, cpt: "37244", active: true },
  { id: "pt-003", name: "Peripheral Angioplasty",       defaultDurationMin: 75,  cpt: "37224", active: true },
  { id: "pt-004", name: "Prostate Artery Embolization", defaultDurationMin: 120, cpt: "37243", active: true },
  { id: "pt-005", name: "Varicocele Embolization",      defaultDurationMin: 60,  cpt: "37241", active: true },
  { id: "pt-006", name: "Biliary Drainage",             defaultDurationMin: 60,  cpt: "47533", active: true },
  { id: "pt-007", name: "Angiogram",                    defaultDurationMin: 45,  cpt: "36200", active: true },
  { id: "pt-008", name: "Biopsy - Core Needle",         defaultDurationMin: 45,  cpt: "10005", active: true },
];

export const PROCEDURE_ROOMS = ["IR-Suite 1", "IR-Suite 2"] as const;
