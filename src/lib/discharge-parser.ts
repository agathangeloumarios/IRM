import type { PlaceholderContext, PlaceholderKey } from "@/lib/placeholders";

type AddressPartKey = "street" | "municipality" | "district" | "postalCode" | "country";
type DerivedFieldKey = `__address:${AddressPartKey}`;
type DemoFieldKey = PlaceholderKey | DerivedFieldKey;

type DemoFieldMapEntry = {
  key: DemoFieldKey;
  patterns: RegExp[];
};

const IGNORED_SECTION_PATTERNS = [
  /^δημογραφικά\s*στοιχεία$/i,
  /^προσωπικά\s*στοιχεία$/i,
  /^στοιχεία\s*επικοινωνίας$/i,
  /^διεύθυνση\s*οικίας$/i,
  /^οικογεν\.?\s*κατάσταση$/i,
  /^υπηκοότητα$/i,
  /^ηλ\.?\s*ταχυδρομείο$/i,
  /^όνομα\s*πλησιέστερου\s*συγγενή$/i,
  /^τηλ\.?\s*πλησιέστερου\s*συγγενή$/i,
  /^-+$/,
] as const;

const DEMO_FIELD_MAP: DemoFieldMapEntry[] = [
  { key: "EpisodeNo", patterns: [/^episode\s*(?:no|number)\.?$/i, /^episode$/i, /^αρ(?:ιθμός)?\.?\s*επεισοδίου$/i] },
  { key: "Department", patterns: [/^department$/i, /^clinic(?:al)?\s*department$/i, /^τμήμα$/i] },
  { key: "DepartmentManager", patterns: [/^department\s*manager$/i, /^manager\s*of\s*department$/i, /^διευθυντής\s*τμήματος$/i] },
  { key: "ConsultantDoctor", patterns: [/^consultant\s*doctor$/i, /^consultant$/i, /^treating\s*doctor$/i, /^ιατρός\s*σύμβουλος$/i, /^θεράπων\s*ιατρός$/i] },
  { key: "PatientName", patterns: [/^patient\s*name$/i, /^patient$/i, /^name$/i, /^full\s*name$/i, /^ονοματ\s*\/\s*νυμο(?:\s*ασθενή)?$/i, /^ονοματ(?:επ)?(?:ώ)?νυμο(?:\s*ασθενή)?$/i, /^ονοματεπώνυμο(?:\s*ασθενή)?$/i, /^όνομα(?:\s*ασθενή)?$/i] },
  { key: "HIOCode", patterns: [/^hio\s*code$/i, /^gesy\s*(?:code|no|number)?$/i, /^g(?:e)?sy\s*(?:code|no|number)?$/i, /^αριθμός\s*γεσυ(?:\s*δικαιούχου)?$/i, /^αρ\.?\s*γεσυ(?:\s*δικαιούχου)?$/i, /^γεσυ(?:\s*δικαιούχου)?$/i, /^αρ\.?\s*γεσυ$/i] },
  { key: "PassportNo", patterns: [/^id\s*[/-]\s*passport(?:\s*no\.?)?$/i, /^id\s*\/\s*passport\s*no\.?$/i, /^passport(?:\s*no\.?)?$/i, /^id\s*no\.?$/i, /^identity\s*(?:card\s*)?(?:no|number)\.?$/i, /^αρ\.?\s*(?:ταυτότητας|διαβατηρίου)$/i, /^ταυτότητα\s*\/\s*διαβατήριο$/i, /^έγγραφο\s*ταυτοποίησης$/i] },
  { key: "HospitalId", patterns: [/^hospital\s*id$/i, /^hospital\s*(?:no|number)\.?$/i, /^medical\s*record\s*(?:no|number)\.?$/i, /^mrn$/i, /^αρ\.?\s*φακέλου$/i, /^αριθμός\s*φακέλου$/i] },
  { key: "DateOfBirth", patterns: [/^date\s*of\s*birth$/i, /^dob$/i, /^birth\s*date$/i, /^ημερομηνία\s*γέννησης$/i, /^ημ\.?\s*γέννησης$/i] },
  { key: "Occupation", patterns: [/^occupation$/i, /^profession$/i, /^job$/i, /^επάγγελμα$/i] },
  { key: "Gender", patterns: [/^gender$/i, /^sex$/i, /^φύλο$/i] },
  { key: "Address", patterns: [/^address$/i, /^home\s*address$/i] },
  { key: "__address:street", patterns: [/^street\s*address$/i, /^διεύθυνση$/i] },
  { key: "__address:municipality", patterns: [/^municipality$/i, /^δήμος\s*\/\s*κοινότητα$/i] },
  { key: "__address:district", patterns: [/^district$/i, /^province$/i, /^επαρχία$/i] },
  { key: "__address:postalCode", patterns: [/^postal\s*code$/i, /^zip$/i, /^zip\s*code$/i, /^ταχ\.?\s*κώδικας$/i, /^ταχυδρομικός\s*κώδικας$/i, /^τ\.?\s*κ\.?$/i] },
  { key: "__address:country", patterns: [/^country$/i, /^χώρα$/i] },
  { key: "Telephone", patterns: [/^telephone$/i, /^phone$/i, /^tel\.?$/i, /^mobile$/i, /^mobile\s*phone$/i, /^contact\s*(?:phone|number)$/i, /^τηλέφωνο$/i, /^κινητ[οό]$/i, /^τηλ\.?$/i, /^τηλέφωνο\s*οικίας$/i, /^κινητ[οό]\s*τηλ(?:έ|ε)?\s*φωνο$/i, /^κινητ[οό]\s*τηλ\.?$/i, /^τηλέφωνο\s*εργασίας$/i] },
  { key: "AdmissionWeight", patterns: [/^admission\s*weight(?:\s*\(.*\))?$/i, /^weight\s*on\s*admission$/i, /^βάρος\s*εισαγωγής$/i] },
  { key: "VentilationHours", patterns: [/^ventilation\s*hours$/i, /^hours\s*of\s*ventilation$/i, /^ώρες\s*αερισμού$/i] },
  { key: "AdmissionVia", patterns: [/^admission\s*via$/i, /^admitted\s*via$/i, /^τρόπος\s*εισαγωγής$/i] },
  { key: "AdmissionDate", patterns: [/^admission\s*date$/i, /^date\s*of\s*admission$/i, /^ημερομηνία\s*εισαγωγής$/i, /^ημ\.?\s*εισαγωγής$/i] },
  { key: "DischargeDate", patterns: [/^discharge\s*date$/i, /^date\s*of\s*discharge$/i, /^ημερομηνία\s*εξιτηρίου$/i, /^ημ\.?\s*εξιτηρίου$/i] },
  { key: "LeaveDays", patterns: [/^leave\s*days$/i, /^days\s*of\s*leave$/i, /^ημέρες\s*άδειας$/i] },
  { key: "ReferralDoctor", patterns: [/^referral\s*doctor$/i, /^referring\s*doctor$/i, /^referrer$/i, /^παραπέμπων\s*ιατρός$/i, /^παραπέμποντας\s*ιατρός$/i] },
  { key: "ClinicalNote", patterns: [/^(?:a\.?\s*)?clinical\s*note(?:\s*\(.*\))?$/i, /^history$/i, /^clinical\s*history$/i, /^κλινικό\s*σημείωμα$/i, /^ιστορικό$/i] },
  { key: "Pacemaker", patterns: [/^pacemaker$/i] },
  { key: "Delivery", patterns: [/^delivery$/i] },
  { key: "PatientClinicalStatus", patterns: [/^patient\s*clinical\s*status(?:\s*on\s*admission)?$/i, /^clinical\s*status(?:\s*on\s*admission)?$/i, /^κλινική\s*κατάσταση(?:\s*κατά\s*την\s*εισαγωγή)?$/i] },
  { key: "PrimaryDiagnosis", patterns: [/^(?:b\.?\s*)?primary\s*diagnosis(?:\s*\(.*\))?$/i, /^final\s*diagnosis$/i, /^κύρια\s*διάγνωση$/i] },
  { key: "SecondaryDiagnosis", patterns: [/^(?:c\.?\s*)?secondary\s*diagnosis(?:\s*\(.*\))?$/i, /^δευτερεύουσα\s*διάγνωση$/i] },
  { key: "Therapy", patterns: [/^(?:d\.?\s*)?therapy(?:\s*-\s*clinical\s*procedures)?$/i, /^clinical\s*procedures$/i, /^θεραπεία$/i] },
  { key: "SurgicalFindings", patterns: [/^(?:e\.?\s*)?surgical\s*findings$/i, /^χειρουργικά\s*ευρήματα$/i] },
  { key: "LabExamGroups", patterns: [/^(?:f\.?\s*)?laboratory\s*examinations?\s*groups$/i, /^lab\s*groups$/i, /^ομάδες\s*εργαστηριακών\s*εξετάσεων$/i] },
  { key: "LabExamDetails", patterns: [/^(?:f\.?\s*)?laboratory\s*examinations?\s*details$/i, /^lab\s*details$/i, /^λεπτομέρειες\s*εργαστηριακών\s*εξετάσεων$/i] },
  { key: "HistopathologyExaminations", patterns: [/^(?:g\.?\s*)?histopathology(?:\s*examinations?)?$/i, /^ιστοπαθολογικές\s*εξετάσεις$/i] },
  { key: "Attachments", patterns: [/^(?:h\.?\s*)?attachments?$/i, /^συνημμένα$/i] },
  { key: "Anaesthetist", patterns: [/^anaesthetist$/i, /^anesthetist$/i] },
  { key: "AnaesthesiaType", patterns: [/^anaesthesia\s*type$/i, /^anesthesia\s*type$/i] },
  { key: "DischargeMode", patterns: [/^(?:a\.?\s*)?mode(?:\s*\/\s*type)?$/i, /^discharge\s*mode$/i] },
  { key: "DischargeStatus", patterns: [/^(?:b\.?\s*)?status(?:\s*\/\s*condition)?$/i, /^discharge\s*status$/i] },
  { key: "Therapeutics", patterns: [/^therapeutically(?:\s*-.*)?$/i, /^medicines?(?:\s*and\s*advices?)?$/i, /^φαρμακευτική\s*αγωγή$/i, /^οδηγίες$/i] },
  { key: "NextVisit", patterns: [/^next\s*visit$/i, /^follow\s*up$/i, /^next\s*appointment$/i, /^επόμενη\s*επίσκεψη$/i] },
];

export function normalizeDemographicLabel(label: string) {
  return label.trim()
    .replace(/\u00a0/g, " ")
    .replace(/[–—−]/g, "-")
    .replace(/^\[(.*)\]$/, "$1")
    .replace(/^［(.*)］$/, "$1")
    .replace(/\s+/g, " ")
    .replace(/[\s:;.-]+$/g, "")
    .trim();
}

export function splitDemographicLine(line: string): [label: string, value: string] | null {
  const colonOrSemicolon = /^([^:;]{1,120})\s*[:;]\s*(.*)$/.exec(line);
  if (colonOrSemicolon) return [colonOrSemicolon[1].trim(), colonOrSemicolon[2].trim()];

  const spacedDash = /^(.{1,120}?)\s+[-–—−]\s+(.*)$/.exec(line);
  if (spacedDash) return [spacedDash[1].trim(), spacedDash[2].trim()];

  // Support label + value on the same line without delimiter, e.g.
  // "Κινητό Τηλέφωνο +357 96384096" or "Telephone +35796384096".
  const inlinePhone = /^(τηλέφωνο\s*οικίας|κινητ[οό]\s*τηλ(?:έ|ε)?\s*φωνο|κινητ[οό]\s*τηλ\.?|τηλέφωνο\s*εργασίας|τηλέφωνο|telephone|phone|mobile\s*phone|mobile|tel\.?)\s+(.+)$/i.exec(line.trim());
  if (inlinePhone) {
    const value = inlinePhone[2].trim();
    // Treat as inline phone only when the value looks like a phone number.
    if (/[+\d]/.test(value)) {
      return [inlinePhone[1].trim(), value];
    }
  }

  return null;
}

function isIgnoredSection(label: string) {
  return IGNORED_SECTION_PATTERNS.some((pattern) => pattern.test(label));
}

function findEntry(label: string) {
  return DEMO_FIELD_MAP.find((field) => field.patterns.some((pattern) => pattern.test(label)));
}

function composeAddress(parts: Partial<Record<AddressPartKey, string>>, fallback = "") {
  const ordered = [parts.street, parts.municipality, parts.district, parts.postalCode, parts.country]
    .map((value) => value?.trim())
    .filter(Boolean) as string[];

  if (!parts.street && fallback.trim()) {
    ordered.unshift(fallback.trim());
  }

  if (ordered.length === 0) return fallback.trim();
  return ordered.join(", ");
}

function assignValue(
  key: DemoFieldKey,
  rawValue: string,
  values: Partial<PlaceholderContext>,
  addressParts: Partial<Record<AddressPartKey, string>>,
  matched: Set<keyof PlaceholderContext>,
) {
  const value = rawValue.trim();

  if (key.startsWith("__address:")) {
    const part = key.slice("__address:".length) as AddressPartKey;
    addressParts[part] = value;
    values.Address = composeAddress(addressParts, values.Address ?? "");
    matched.add("Address");
    return;
  }

  // Phone labels can appear multiple times (home/mobile/work). Keep the latest
  // non-empty number and normalize spacing so line-based paste works reliably.
  if (key === "Telephone") {
    if (value) {
      if (/^[-–—\s]+$/.test(value)) {
        return;
      }
      const normalizedPhone = value.replace(/\s+/g, " ").trim();
      values.Telephone = normalizedPhone;
      matched.add("Telephone");
    } else if (!values.Telephone) {
      values.Telephone = "";
    }
    return;
  }

  const existing = values[key];
  if (value) {
    values[key] = existing ? `${existing}\n${value}` : value;
    matched.add(key);
  } else if (!existing) {
    values[key] = "";
  }
}

export function parseDemographics(raw: string): {
  values: Partial<PlaceholderContext>;
  matched: (keyof PlaceholderContext)[];
  unmatched: string[];
} {
  const values: Partial<PlaceholderContext> = {};
  const matched = new Set<keyof PlaceholderContext>();
  const unmatched: string[] = [];
  const addressParts: Partial<Record<AddressPartKey, string>> = {};

  if (!raw) return { values, matched: [], unmatched };

  const lines = raw.split(/\r?\n/);
  let pendingEntry: DemoFieldMapEntry | null = null;
  let pendingBlankLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      // Some demographic exports place the value one line below a blank spacer.
      // Keep a pending label alive for one blank line to capture that value.
      if (pendingEntry) {
        pendingBlankLines += 1;
        if (pendingBlankLines <= 1) continue;
      }
      pendingEntry = null;
      pendingBlankLines = 0;
      continue;
    }

    const normalizedLine = normalizeDemographicLabel(trimmed);
    if (isIgnoredSection(normalizedLine)) {
      pendingEntry = null;
      continue;
    }

    const pair = splitDemographicLine(trimmed);
    if (pair) {
      const [label, value] = pair;
      const normalizedLabel = normalizeDemographicLabel(label);
      if (isIgnoredSection(normalizedLabel)) {
        pendingEntry = null;
        continue;
      }
      const entry = findEntry(normalizedLabel);
      if (entry) {
        assignValue(entry.key, value, values, addressParts, matched);
        pendingEntry = value === "" ? entry : null;
        pendingBlankLines = 0;
      } else {
        unmatched.push(label);
        pendingEntry = null;
        pendingBlankLines = 0;
      }
      continue;
    }

    const labelEntry = findEntry(normalizedLine);
    if (labelEntry) {
      pendingEntry = labelEntry;
      pendingBlankLines = 0;
      continue;
    }

    if (pendingEntry) {
      assignValue(pendingEntry.key, trimmed, values, addressParts, matched);
      pendingEntry = null;
      pendingBlankLines = 0;
      continue;
    }

    unmatched.push(trimmed);
  }

  return {
    values,
    matched: Array.from(matched),
    unmatched,
  };
}
