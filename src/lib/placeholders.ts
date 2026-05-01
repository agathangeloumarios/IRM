export const PLACEHOLDER_KEYS = [
  "BeneficiaryName",
  "BeneficiaryLastName",
  "BeneficiaryDOB",
  "BeneficiaryDocId",
  "ReferralId",
  "BeneficiaryGender",
  "VisitDateTime",
  "ReportDate",
  "ReferralActivityId",
  "ReferralActivityName",
  "ReferralDoctorName",
  "Department",
  "DepartmentManager",
  "ConsultantDoctor",
  "EpisodeNo",
  "PatientName",
  "HIOCode",
  "PassportNo",
  "HospitalId",
  "DateOfBirth",
  "Occupation",
  "Gender",
  "Address",
  "Telephone",
  "AdmissionWeight",
  "VentilationHours",
  "AdmissionVia",
  "AdmissionDate",
  "DischargeDate",
  "LeaveDays",
  "ReferralDoctor",
  "ClinicalNote",
  "Pacemaker",
  "Delivery",
  "PatientClinicalStatus",
  "PrimaryDiagnosis",
  "SecondaryDiagnosis",
  "Therapy",
  "SurgicalFindings",
  "LabExamGroups",
  "LabExamDetails",
  "HistopathologyExaminations",
  "Attachments",
  "Anaesthetist",
  "AnaesthesiaType",
  "DischargeMode",
  "DischargeStatus",
  "Therapeutics",
  "NextVisit",
] as const;

export type PlaceholderKey = (typeof PLACEHOLDER_KEYS)[number];
export type PlaceholderContext = Partial<Record<PlaceholderKey, string>>;

export function applyPlaceholders(body: string, ctx: PlaceholderContext): string {
  let out = body;
  for (const key of PLACEHOLDER_KEYS) {
    const value = ctx[key] ?? "";
    const patterns = [
      new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"),
      new RegExp(`\\[\\s*${key}\\s*\\]`, "g"),
      new RegExp(`<\\s*${key}\\s*>`, "g"),
      new RegExp(`\\$${key}\\b`, "g"),
    ];
    for (const pattern of patterns) {
      out = out.replace(pattern, value);
    }
  }
  return out;
}
