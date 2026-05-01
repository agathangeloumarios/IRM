/**
 * discharge-demographics.ts
 * 
 * Mapping layer: ParsedDemographics → DischargeFormFields
 * 
 * This module handles the conversion from the generic PlaceholderContext
 * (output of parseDemographics()) to the specific form fields used in
 * Discharge Reports.
 * 
 * 10 core fields:
 *   1. patientName
 *   2. hioCode
 *   3. idPassportNo
 *   4. hospitalId (manual entry)
 *   5. dateOfBirth
 *   6. occupation (optional)
 *   7. gender
 *   8. address (merged components)
 *   9. telephone
 *   10. referralDoctor (optional, typically left empty)
 */

import type { PlaceholderContext } from "@/lib/placeholders";

/**
 * Discharge Report form field values.
 * Maps the 10 core demographics fields that users paste/fill.
 */
export interface DischargeFormFields {
  // ---- Core Patient Demographics ----
  patientName: string;              // from PatientName
  hioCode: string;                  // from HIOCode
  idPassportNo: string;             // from PassportNo
  hospitalId: string;               // manual entry (not parsed)
  dateOfBirth: string;              // from DateOfBirth (normalized)
  occupation: string;               // from Occupation (optional)
  gender: string;                   // from Gender
  address: string;                  // from Address + Δήμος + Επαρχία + ΤΚ + Χώρα
  telephone: string;                // from Telephone
  referralDoctor: string;            // optional, typically empty
}

/**
 * Normalize a date from various formats to YYYY-MM-DD.
 * 
 * Supports:
 *  - DD Mmm YYYY (26 Απρ 1956, 26 Apr 1956)
 *  - DD/MM/YYYY
 *  - DD-MM-YYYY
 *  - YYYY-MM-DD (already normalized)
 */
export function normalizeDateFormat(dateStr: string): string {
  if (!dateStr) return "";
  
  const trimmed = dateStr.trim();
  
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  
  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  
  // DD Mmm YYYY (Greek or English month names)
  const monthMap: Record<string, string> = {
    // English
    "january": "01", "february": "02", "march": "03", "april": "04",
    "may": "05", "june": "06", "july": "07", "august": "08",
    "september": "09", "october": "10", "november": "11", "december": "12",
    "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
    "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12",
    // Greek
    "ιανουαρίου": "01", "φεβρουαρίου": "02", "μαρτίου": "03", "απριλίου": "04",
    "μαΐου": "05", "ιουνίου": "06", "ιουλίου": "07", "αυγούστου": "08",
    "σεπτεμβρίου": "09", "οκτωβρίου": "10", "νοεμβρίου": "11", "δεκεμβρίου": "12",
    "απρ": "04", "ιαν": "01", "φεβ": "02", "μαρ": "03", "μαϊ": "05", "ιουν": "06",
    "ιουλ": "07", "αυγ": "08", "σεπ": "09", "οκτ": "10", "νοε": "11", "δεκ": "12",
  };
  
  const wordMatch = /^(\d{1,2})\s+(\S+)\s+(\d{4})$/.exec(trimmed);
  if (wordMatch) {
    const [, day, monthWord, year] = wordMatch;
    const monthNum = monthMap[monthWord.toLowerCase()];
    if (monthNum) {
      return `${year}-${monthNum}-${String(day).padStart(2, "0")}`;
    }
  }
  
  // Return unchanged if no pattern matched
  return trimmed;
}

/**
 * Merge address components from parsed demographics.
 * 
 * Greek address typically has:
 *  1. Διεύθυνση (Street address)
 *  2. Δήμος / Κοινότητα (Municipality)
 *  3. Επαρχία (District)
 *  4. Ταχ. Κώδικας (Postal code)
 *  5. Χώρα (Country)
 * 
 * This function combines them in order with appropriate separators.
 */
export function mergeAddressComponents(parsed: PlaceholderContext): string {
  const parts: string[] = [];
  
  if (parsed.Address && parsed.Address.trim()) {
    parts.push(parsed.Address.trim());
  }
  
  // Note: The parser may not separate these components individually yet.
  // For now, we just use the Address field as-is.
  // TODO: Enhance parser to recognize address sub-components separately:
  //   - Δήμος / Κοινότητα
  //   - Επαρχία
  //   - Ταχ. Κώδικας
  //   - Χώρα
  // Until then, users can paste the full address as one multi-line value.
  
  return parts.join(" ");
}

/**
 * Convert parsed PlaceholderContext (from parseDemographics) to DischargeFormFields.
 * 
 * This is the core mapping function used when:
 * 1. User pastes demographics → parser outputs PlaceholderContext
 * 2. We map it to DischargeFormFields
 * 3. Form populates with these values
 * 4. User can edit individual fields
 * 5. Submit form → generate report with filled demographics
 */
export function mapParsedDemographicsToFormFields(
  parsed: PlaceholderContext,
): DischargeFormFields {
  return {
    patientName: parsed.PatientName?.trim() || "",
    hioCode: parsed.HIOCode?.trim() || "",
    idPassportNo: parsed.PassportNo?.trim() || "",
    hospitalId: "", // Always manual entry
    dateOfBirth: normalizeDateFormat(parsed.DateOfBirth || ""),
    occupation: parsed.Occupation?.trim() || "",
    gender: parsed.Gender?.trim() || "",
    address: mergeAddressComponents(parsed),
    telephone: parsed.Telephone?.trim() || "",
    referralDoctor: "", // Always optional, left empty
  };
}

/**
 * Convert DischargeFormFields back to PlaceholderContext for template substitution.
 * 
 * Used when rendering the template with filled form values.
 */
export function formFieldsToPlaceholderContext(
  fields: DischargeFormFields,
): Partial<PlaceholderContext> {
  return {
    PatientName: fields.patientName,
    HIOCode: fields.hioCode,
    PassportNo: fields.idPassportNo,
    HospitalId: fields.hospitalId,
    DateOfBirth: fields.dateOfBirth,
    Occupation: fields.occupation,
    Gender: fields.gender,
    Address: fields.address,
    Telephone: fields.telephone,
    ReferralDoctor: fields.referralDoctor,
  };
}
