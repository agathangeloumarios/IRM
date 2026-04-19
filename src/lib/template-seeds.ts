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
];
