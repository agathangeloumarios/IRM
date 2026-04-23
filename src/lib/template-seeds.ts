/**
 * Seed templates for the IRM app. Kept in a plain (non-client) module so the
 * Prisma seed script can import it without dragging in React/JSX.
 */

import type { ReportTemplate } from "./template-types";

const CONSULTATION_BODY = `ΓΝΩΜΑΤΕΥΣΗ

Ονοματεπώνυμο: {{BeneficiaryName}} {{BeneficiaryLastName}}
Ημ. Γέννησης: {{BeneficiaryDOB}}
ΑΔΤ: {{BeneficiaryDocId}}
Αρ. Παραπεμπτικού: {{ReferralId}}
Φύλο: {{BeneficiaryGender}}
Ημ. Εξετ.: {{VisitDateTime}}
Ημ. Γνωμάτευσης: {{ReportDate}}
Δραστηριότητα: {{ReferralActivityId}} {{ReferralActivityName}}
Παραπ. Ιατρός: {{ReferralDoctorName}}

ΙΣΤΟΡΙΚΟ
Ο/Η ασθενής προσήλθε για εξέταση στο πλαίσιο παρακολούθησης της πάθησής του/της. Αναφέρεται πλήρες ιστορικό και τρέχουσα συμπτωματολογία.

ΚΛΙΝΙΚΗ ΕΞΕΤΑΣΗ
Η κλινική εικόνα είναι σταθερή. Δεν παρατηρούνται ανησυχητικά ευρήματα κατά την αντικειμενική εξέταση.

ΕΥΡΗΜΑΤΑ
Τα απεικονιστικά ευρήματα συνάδουν με την αναμενόμενη εξέλιξη. Δεν διαπιστώνονται νέες αλλοιώσεις.

ΣΥΣΤΑΣΕΙΣ
Συνιστάται επανεκτίμηση σε 3 μήνες και συνέχιση της συνταγογραφημένης αγωγής χωρίς μεταβολή.
`;

const DISCHARGE_BODY = `ΕΞΙΤΗΡΙΟ

Ονοματεπώνυμο: {{BeneficiaryName}} {{BeneficiaryLastName}}
Ημ. Γέννησης: {{BeneficiaryDOB}}
ΑΔΤ: {{BeneficiaryDocId}}
Αρ. Παραπεμπτικού: {{ReferralId}}
Φύλο: {{BeneficiaryGender}}
Ημ. Εξετ.: {{VisitDateTime}}
Ημ. Γνωμάτευσης: {{ReportDate}}
Δραστηριότητα: {{ReferralActivityId}} {{ReferralActivityName}}
Παραπ. Ιατρός: {{ReferralDoctorName}}

ΠΕΡΙΓΡΑΦΗ ΕΠΕΜΒΑΣΗΣ
Υπό άσηπτες συνθήκες και καταστολή, πραγματοποιήθηκε η προγραμματισμένη επεμβατική διαδικασία χωρίς επιπλοκές.

ΜΕΤΕΓΧΕΙΡΗΤΙΚΗ ΠΟΡΕΙΑ
Ομαλή ανάνηψη. Σταθερά ζωτικά σημεία. Καλή ανοχή της διαδικασίας.

ΦΑΡΜΑΚΕΥΤΙΚΗ ΑΓΩΓΗ
- Παρακεταμόλη 500mg PO q6h PRN
- Ιβουπροφαίνη 400mg PO q8h PRN

ΟΔΗΓΙΕΣ ΕΞΟΔΟΥ
Επανεξέταση σε 2 εβδομάδες. Άμεση επικοινωνία σε περίπτωση πυρετού, έντονου πόνου ή αιμορραγίας.
`;

/**
 * Structured "PATIENT DISCHARGE AND INFORMATION" form — cloned from
 * the Nicosia Polyclinic discharge note (DischargeNote_Template.pdf).
 *
 * Body is plain text using `Label: {{Placeholder}}` lines. Tab-separated
 * key:value rows on a single line render as multi-column rows in the form.
 * The renderer in /reports detects numbered sections (e.g. "1. ...") and
 * wraps the body in a bordered table; the signature block (last two lines)
 * is moved to its own page automatically.
 */
export const IR_DISCHARGE_NOTE_BODY = `Episode No: {{EpisodeNo}}
Department: {{Department}}\tDepartment Manager: {{DepartmentManager}}\tConsultant Doctor: {{ConsultantDoctor}}

1. Patient Demographic Information:
Patient Name: {{PatientName}}\tID/ PASSPORT No: {{PassportNo}}\tHospital ID: {{HospitalId}}
HIO Code: {{HIOCode}}
Date of Birth: {{DateOfBirth}}\tOccupation: {{Occupation}}\tGender: {{Gender}}
Address: {{Address}}\tTelephone: {{Telephone}}
Admission weight(kids under 1 year old): {{AdmissionWeight}}\tVentilation hours: {{VentilationHours}}

2. Admission via: {{AdmissionVia}}

3. Hospitalization time:
Admission Date: {{AdmissionDate}}\tDischarge Date: {{DischargeDate}}\tLeave Days: {{LeaveDays}}

4. Referral Doctor: {{ReferralDoctor}}

5. Reason of Admission - Treatment:
a. Clinical note (briefly history of the patient symptoms):
{{ClinicalNote}}
Pacemaker: {{Pacemaker}}\tDelivery: {{Delivery}}
Patient Clinical Status on Admission: {{PatientClinicalStatus}}

b. Primary Diagnosis (Final diagnosis – the one that brought the patient to the hospital to be admitted, after examinations)
{{PrimaryDiagnosis}}

c. Secondary Diagnosis(Diagnosis that were along with the Primary Diagnosis or happen during patient stay)
{{SecondaryDiagnosis}}

d. Therapy – Clinical Procedures
Therapy: {{Therapy}}

e. Surgical Findings
{{SurgicalFindings}}

f. Laboratory examinations Groups
{{LabExamGroups}}

f. Laboratory examinations details
{{LabExamDetails}}

g. Histopathology Examinations
{{HistopathologyExaminations}}

h. Attachments
{{Attachments}}

i. Anaesthetist & Anaesthesia Type:
Anaesthetist: {{Anaesthetist}}\tAnaesthesia Type: {{AnaesthesiaType}}

6. Discharge (Outcome):
a. Mode/Type: {{DischargeMode}}\tb. Status/Condition: {{DischargeStatus}}

7. Therapeutically – Medicines and Advices
{{Therapeutics}}

8. Next Visit: {{NextVisit}}


Doctor's Signature/Stamp: ______________________________

Patient / Guardian / Intimate Person Signature: ______________________________
`;

export const SEED_TEMPLATES: ReportTemplate[] = [
  {
    id: "tpl-seed-consult-followup",
    name: "Γνωμάτευση Παρακολούθησης",
    category: "consultation",
    body: CONSULTATION_BODY,
    locked: true,
    createdAt: "2026-04-01T09:00:00.000Z",
    updatedAt: "2026-04-01T09:00:00.000Z",
    source: "seed",
  },
  {
    id: "tpl-seed-consult-initial",
    name: "Γνωμάτευση Αρχικής Εκτίμησης",
    category: "consultation",
    body: CONSULTATION_BODY.replace(
      "Συνιστάται επανεκτίμηση σε 3 μήνες και συνέχιση της συνταγογραφημένης αγωγής χωρίς μεταβολή.",
      "Συνιστάται επιπλέον απεικονιστικός έλεγχος και επανεξέταση σε 4 εβδομάδες."
    ),
    locked: false,
    createdAt: "2026-04-05T09:00:00.000Z",
    updatedAt: "2026-04-05T09:00:00.000Z",
    source: "seed",
  },
  {
    id: "tpl-seed-discharge-ufe",
    name: "UFE Discharge Summary",
    category: "discharge",
    body: DISCHARGE_BODY,
    locked: true,
    createdAt: "2026-04-02T09:00:00.000Z",
    updatedAt: "2026-04-02T09:00:00.000Z",
    source: "seed",
  },
  {
    id: "tpl-seed-discharge-tace",
    name: "TACE Post-Procedure",
    category: "discharge",
    body: DISCHARGE_BODY,
    locked: false,
    createdAt: "2026-04-06T09:00:00.000Z",
    updatedAt: "2026-04-06T09:00:00.000Z",
    source: "seed",
  },
  {
    id: "tpl-seed-discharge-ir-note",
    name: "IR Discharge Note (Structured)",
    category: "discharge",
    body: IR_DISCHARGE_NOTE_BODY,
    locked: true,
    createdAt: "2026-04-10T09:00:00.000Z",
    updatedAt: "2026-04-10T09:00:00.000Z",
    source: "seed",
    originalFileName: "DischargeNote_Template.pdf",
    chrome: {
      titleOverride: "PATIENT DISCHARGE AND INFORMATION",
      practiceName: "Nicosia Polyclinic",
      practiceAddress: "ΑΧΑΙΩΝ 22",
      practicePhone: "22 780780",
      practiceEmail: "polnic@cytanet.com.cy",
      practiceLogoText: "NP",
      doctorName: "Agathangelou Marios",
      doctorTitles: "Consultant Doctor · Department Manager",
      doctorLicense: "A / 20 / N",
      signatureText: "M. Agathangelou",
      footerLeft: "Department of Interventional Radiology · Confidential medical record",
      footerRight: "Form Ref. 1290022-23006",
    },
  },
];
