import test from "node:test";
import assert from "node:assert/strict";

import { parseDemographics } from "../src/lib/discharge-parser";
import {
  formFieldsToPlaceholderContext,
  mapParsedDemographicsToFormFields,
} from "../src/lib/discharge-demographics";
import { applyPlaceholders } from "../src/lib/placeholders";
import { IR_DISCHARGE_NOTE_BODY } from "../src/lib/template-seeds";

const greekExample = `Δημογραφικά Στοιχεία
Προσωπικά Στοιχεία
Ονοματ/νυμο
ΕΛΕΥΘΕΡΙΟΣ ΕΛΕΥΘΕΡΙΟΥ
Έγγραφο Ταυτοποίησης
ΑΔΤ0000524671
Υπηκοότητα
ΚΥΠΡΙΑΚΗ
Φύλο
Άρρεν
Ημερομηνία Γέννησης
26 Απρ 1956
Οικογεν. Κατάσταση
Παντρεμένος/η
Αριθμός ΓεΣΥ Δικαιούχου
106246
Στοιχεία Επικοινωνίας
Ηλ. Ταχυδρομείο

Τηλέφωνο Οικίας

Κινητό Τηλέφωνο

Τηλέφωνο Εργασίας
---

Όνομα Πλησιέστερου Συγγενή

Τηλ. Πλησιέστερου Συγγενή

Διεύθυνση Οικίας
Χώρα
ΚΥΠΡΟΣ
Ταχ. Κώδικας
4640
 
Διεύθυνση
Αγίας Κυριακής 17
Δήμος / Κοινότητα
Ακρωτήρι
Επαρχία
ΛΕΜΕΣΟΣ`;

test("parseDemographics recognizes the provided Greek sample", () => {
  const result = parseDemographics(greekExample);

  assert.equal(result.values.PatientName, "ΕΛΕΥΘΕΡΙΟΣ ΕΛΕΥΘΕΡΙΟΥ");
  assert.equal(result.values.PassportNo, "ΑΔΤ0000524671");
  assert.equal(result.values.HIOCode, "106246");
  assert.equal(result.values.Gender, "Άρρεν");
  assert.equal(result.values.DateOfBirth, "26 Απρ 1956");
  assert.equal(
    result.values.Address,
    "Αγίας Κυριακής 17, Ακρωτήρι, ΛΕΜΕΣΟΣ, 4640, ΚΥΠΡΟΣ",
  );

  assert.ok(result.matched.includes("PatientName"));
  assert.ok(result.matched.includes("PassportNo"));
  assert.ok(result.matched.includes("Address"));
});

test("mapping converts parsed demographics into discharge form fields", () => {
  const parsed = parseDemographics(greekExample);
  const fields = mapParsedDemographicsToFormFields(parsed.values);

  assert.deepEqual(fields, {
    patientName: "ΕΛΕΥΘΕΡΙΟΣ ΕΛΕΥΘΕΡΙΟΥ",
    hioCode: "106246",
    idPassportNo: "ΑΔΤ0000524671",
    hospitalId: "",
    dateOfBirth: "1956-04-26",
    occupation: "",
    gender: "Άρρεν",
    address: "Αγίας Κυριακής 17, Ακρωτήρι, ΛΕΜΕΣΟΣ, 4640, ΚΥΠΡΟΣ",
    telephone: "",
    referralDoctor: "",
  });
});

test("full discharge flow renders the structured report with demographics in the correct fields", () => {
  const parsed = parseDemographics(greekExample);
  const fields = mapParsedDemographicsToFormFields(parsed.values);

  const rendered = applyPlaceholders(
    IR_DISCHARGE_NOTE_BODY,
    formFieldsToPlaceholderContext({
      ...fields,
      hospitalId: "HOSP-12345",
    }),
  );

  assert.match(rendered, /Patient Name:\s+ΕΛΕΥΘΕΡΙΟΣ ΕΛΕΥΘΕΡΙΟΥ/);
  assert.match(rendered, /ID\/ PASSPORT No:\s+ΑΔΤ0000524671/);
  assert.match(rendered, /Hospital ID:\s+HOSP-12345/);
  assert.match(rendered, /HIO Code:\s+106246/);
  assert.match(rendered, /Date of Birth:\s+1956-04-26/);
  assert.match(rendered, /Gender:\s+Άρρεν/);
  assert.match(rendered, /Address:\s+Αγίας Κυριακής 17, Ακρωτήρι, ΛΕΜΕΣΟΣ, 4640, ΚΥΠΡΟΣ/);
  assert.match(rendered, /Telephone:\s*$/m);
  assert.match(rendered, /4\. Referral Doctor:\s*$/m);
  assert.doesNotMatch(rendered, /\{\{\s*(PatientName|PassportNo|HospitalId|HIOCode|DateOfBirth|Gender|Address|Telephone|ReferralDoctor)\s*\}\}/);
});

test("parser handles Ονοματ/νυμο and Κινητό Τηλέφωνο variants", () => {
  const raw = `Ονοματ/νυμο
ΕΛΕΥΘΕΡΙΟΣ ΕΛΕΥΘΕΡΙΟΥ
Κινητό Τηλέφωνο
+35799123456`;

  const parsed = parseDemographics(raw);
  assert.equal(parsed.values.PatientName, "ΕΛΕΥΘΕΡΙΟΣ ΕΛΕΥΘΕΡΙΟΥ");
  assert.equal(parsed.values.Telephone, "+35799123456");

  const fields = mapParsedDemographicsToFormFields(parsed.values);
  assert.equal(fields.patientName, "ΕΛΕΥΘΕΡΙΟΣ ΕΛΕΥΘΕΡΙΟΥ");
  assert.equal(fields.telephone, "+35799123456");
});

test("telephone parser supports spacing and line-based labels", () => {
  const raw = `Telephone:
    +357 99 123 456
Κινητό   Τηλέφωνο
  +357 97 000 111`;

  const parsed = parseDemographics(raw);
  // Latest non-empty phone label wins and value is space-normalized.
  assert.equal(parsed.values.Telephone, "+357 97 000 111");

  const fields = mapParsedDemographicsToFormFields(parsed.values);
  assert.equal(fields.telephone, "+357 97 000 111");
});

test("telephone parser supports single-line label and value", () => {
  const raw = `Κινητό Τηλέφωνο +357 96384096`;

  const parsed = parseDemographics(raw);
  assert.equal(parsed.values.Telephone, "+357 96384096");

  const fields = mapParsedDemographicsToFormFields(parsed.values);
  assert.equal(fields.telephone, "+357 96384096");
});

test("telephone insertion works when value is after a blank spacer line", () => {
  const raw = `Κινητό Τηλέφωνο

+357 99260978`;

  const parsed = parseDemographics(raw);
  assert.equal(parsed.values.Telephone, "+357 99260978");

  const fields = mapParsedDemographicsToFormFields(parsed.values);
  assert.equal(fields.telephone, "+357 99260978");
});

test("telephone separator placeholders are ignored", () => {
  const raw = `Τηλέφωνο Εργασίας ---`;

  const parsed = parseDemographics(raw);
  assert.equal(parsed.values.Telephone, undefined);

  const fields = mapParsedDemographicsToFormFields(parsed.values);
  assert.equal(fields.telephone, "");
});
