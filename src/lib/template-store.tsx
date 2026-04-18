"use client";

import * as React from "react";

/**
 * Template store for Consultation Reports and Discharge Reports.
 * - Two categories: "consultation" | "discharge"
 * - Lockable templates (locked cannot be edited; can be duplicated)
 * - Persisted in localStorage
 * - Export/import as JSON
 * - Can be cloned from an uploaded Word (.docx), PDF, or plain text file
 */

export type TemplateCategory = "consultation" | "discharge";

/**
 * Per-template document chrome. All fields optional — missing values fall
 * back to PRACTICE_DEFAULTS at render time. Images (logo, signature) are
 * stored as data URLs so the whole template survives an export → import.
 */
export interface TemplateChrome {
  titleOverride?: string;        // overrides template name in document title
  accentColor?: string;          // hex — used for header rule & logo background
  practiceName?: string;
  practiceAddress?: string;
  practicePhone?: string;
  practiceEmail?: string;
  practiceLogoText?: string;     // fallback letters when no image
  practiceLogoDataUrl?: string;  // optional logo image
  doctorName?: string;
  doctorTitles?: string;         // specialty / qualifications line
  doctorLicense?: string;        // license / NPI line
  signatureText?: string;        // script-style text signature
  signatureImageDataUrl?: string;// hand-scanned signature image
  footerLeft?: string;
  footerRight?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  showSignature?: boolean;
  showLogo?: boolean;
}

export const PRACTICE_DEFAULTS: Required<Omit<
  TemplateChrome,
  "practiceLogoDataUrl" | "signatureImageDataUrl" | "titleOverride"
>> = {
  accentColor: "#F96903",
  practiceName: "Solo IR · Bay Area",
  practiceAddress: "123 Bayview Blvd, Suite 400 · San Francisco, CA 94110",
  practicePhone: "+1 (415) 555-0140",
  practiceEmail: "care@solo-ir.health",
  practiceLogoText: "IR",
  doctorName: "Dr. Alejandra Reyes, MD, FSIR",
  doctorTitles: "Interventional Radiology · Vascular & Oncologic IR",
  doctorLicense: "CA License #A-00123 · NPI 1234567890",
  signatureText: "A. Reyes",
  footerLeft: "Solo IR · Bay Area · Confidential medical record",
  footerRight: "",
  showHeader: true,
  showFooter: true,
  showSignature: true,
  showLogo: true,
};

export interface ResolvedChrome {
  titleOverride?: string;
  accentColor: string;
  practiceName: string;
  practiceAddress: string;
  practicePhone: string;
  practiceEmail: string;
  practiceLogoText: string;
  practiceLogoDataUrl?: string;
  doctorName: string;
  doctorTitles: string;
  doctorLicense: string;
  signatureText: string;
  signatureImageDataUrl?: string;
  footerLeft: string;
  footerRight: string;
  showHeader: boolean;
  showFooter: boolean;
  showSignature: boolean;
  showLogo: boolean;
}

export function resolveChrome(chrome?: TemplateChrome): ResolvedChrome {
  return {
    ...PRACTICE_DEFAULTS,
    ...(chrome || {}),
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  body: string;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
  source: "seed" | "custom" | "upload";
  originalFileName?: string;
  chrome?: TemplateChrome;
}

interface TemplateStoreValue {
  templates: ReportTemplate[];
  addTemplate: (t: Omit<ReportTemplate, "id" | "createdAt" | "updatedAt"> & Partial<Pick<ReportTemplate, "id">>) => ReportTemplate;
  updateTemplate: (id: string, patch: Partial<ReportTemplate>) => void;
  deleteTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => ReportTemplate | null;
  lockTemplate: (id: string, locked: boolean) => void;
  reorderTemplates: (id: string, direction: "up" | "down") => void;
  exportJson: () => string;
  importJson: (raw: string, mode?: "merge" | "replace") => { ok: boolean; count?: number; error?: string };
  uploadFileAsTemplate: (file: File, category: TemplateCategory) => Promise<ReportTemplate>;
}

const STORAGE_KEY = "irm:templates:v1";

// ---- Seed templates ------------------------------------------------------

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

const SEED_TEMPLATES: ReportTemplate[] = [
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

// ---- File extraction (docx/pdf/txt → text) -------------------------------

async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  // Plain text
  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return await file.text();
  }

  // .docx — unzip in-browser and read word/document.xml
  if (name.endsWith(".docx")) {
    try {
      const buf = await file.arrayBuffer();
      const text = await extractDocxText(buf);
      if (text.trim().length > 0) return text;
    } catch {
      /* fall through */
    }
    return `[Imported from ${file.name} — could not extract text automatically. Paste template body here.]`;
  }

  // .pdf — very lightweight heuristic extraction of literal text objects.
  // This is not a full PDF parser; user is expected to clean up the resulting skeleton.
  if (name.endsWith(".pdf")) {
    try {
      const buf = await file.arrayBuffer();
      const text = extractPdfText(buf);
      if (text.trim().length > 0) return text;
    } catch {
      /* fall through */
    }
    return `[Imported from ${file.name} — PDF text extraction incomplete. Paste template body here.]`;
  }

  // Fallback: treat as text
  try { return await file.text(); } catch { return ""; }
}

/** Minimal DOCX text extractor (no deps). DOCX is a zip containing word/document.xml. */
async function extractDocxText(buf: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buf);
  const docXml = await readZipEntry(bytes, "word/document.xml");
  if (!docXml) return "";
  // Collect <w:t> text, insert paragraph breaks on <w:p>
  const text = docXml
    .replace(/<w:p\b[^>]*>/g, "\n")
    .replace(/<w:br\/?\s*>/g, "\n")
    .replace(/<w:tab\/?\s*>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}

/**
 * Read a single entry from a ZIP archive (store or deflate).
 * Supports STORE (method 0) and DEFLATE (method 8) using DecompressionStream.
 */
async function readZipEntry(bytes: Uint8Array, entryName: string): Promise<string | null> {
  // Find End of Central Directory record by scanning from end
  const sig = (b: Uint8Array, o: number, s1: number, s2: number, s3: number, s4: number) =>
    b[o] === s1 && b[o + 1] === s2 && b[o + 2] === s3 && b[o + 3] === s4;
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (sig(bytes, i, 0x50, 0x4b, 0x05, 0x06)) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  const totalEntries = bytes[eocd + 10] | (bytes[eocd + 11] << 8);
  const cdSize = bytes[eocd + 12] | (bytes[eocd + 13] << 8) | (bytes[eocd + 14] << 16) | (bytes[eocd + 15] << 24);
  const cdOffset = bytes[eocd + 16] | (bytes[eocd + 17] << 8) | (bytes[eocd + 18] << 16) | (bytes[eocd + 19] << 24);

  const decoder = new TextDecoder();
  let p = cdOffset;
  const end = cdOffset + cdSize;
  for (let i = 0; i < totalEntries && p < end; i++) {
    if (!sig(bytes, p, 0x50, 0x4b, 0x01, 0x02)) break;
    const method = bytes[p + 10] | (bytes[p + 11] << 8);
    const compSize = bytes[p + 20] | (bytes[p + 21] << 8) | (bytes[p + 22] << 16) | (bytes[p + 23] << 24);
    const nameLen = bytes[p + 28] | (bytes[p + 29] << 8);
    const extraLen = bytes[p + 30] | (bytes[p + 31] << 8);
    const commentLen = bytes[p + 32] | (bytes[p + 33] << 8);
    const localOffset = bytes[p + 42] | (bytes[p + 43] << 8) | (bytes[p + 44] << 16) | (bytes[p + 45] << 24);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;

    if (name === entryName) {
      // Local file header
      const lh = localOffset;
      const lhNameLen = bytes[lh + 26] | (bytes[lh + 27] << 8);
      const lhExtraLen = bytes[lh + 28] | (bytes[lh + 29] << 8);
      const dataStart = lh + 30 + lhNameLen + lhExtraLen;
      const data = bytes.subarray(dataStart, dataStart + compSize);
      if (method === 0) {
        return decoder.decode(data);
      }
      if (method === 8 && typeof DecompressionStream !== "undefined") {
        const ds = new DecompressionStream("deflate-raw");
        const stream = new Blob([data]).stream().pipeThrough(ds);
        const out = new Uint8Array(await new Response(stream).arrayBuffer());
        return decoder.decode(out);
      }
      return null;
    }
  }
  return null;
}

/** Very light PDF text object extractor. Enough to recover a skeleton for editing. */
function extractPdfText(buf: ArrayBuffer): string {
  const raw = new TextDecoder("latin1").decode(new Uint8Array(buf));
  const matches = raw.match(/\(([^()\\]{1,200})\)\s*Tj/g) || [];
  const lines = matches
    .map((m) => m.replace(/\)\s*Tj$/, "").replace(/^\(/, ""))
    .filter((s) => s.trim().length > 0);
  return lines.join("\n");
}

// ---- Provider ------------------------------------------------------------

const TemplateCtx = React.createContext<TemplateStoreValue | null>(null);

export function TemplateProvider({ children }: { children: React.ReactNode }) {
  const [templates, setTemplates] = React.useState<ReportTemplate[]>(SEED_TEMPLATES);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: ReportTemplate[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) setTemplates(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(templates)); } catch {}
  }, [templates]);

  const addTemplate: TemplateStoreValue["addTemplate"] = React.useCallback((t) => {
    const now = new Date().toISOString();
    const tpl: ReportTemplate = {
      id: t.id || "tpl-" + Math.random().toString(36).slice(2, 10),
      name: t.name,
      category: t.category,
      body: t.body,
      locked: t.locked ?? false,
      createdAt: now,
      updatedAt: now,
      source: t.source,
      originalFileName: t.originalFileName,
      chrome: t.chrome,
    };
    setTemplates((list) => [tpl, ...list]);
    return tpl;
  }, []);

  const updateTemplate: TemplateStoreValue["updateTemplate"] = React.useCallback((id, patch) => {
    setTemplates((list) =>
      list.map((t) => {
        if (t.id !== id) return t;
        if (t.locked && !("locked" in patch)) return t; // locked templates are read-only
        return { ...t, ...patch, updatedAt: new Date().toISOString() };
      })
    );
  }, []);

  const deleteTemplate: TemplateStoreValue["deleteTemplate"] = React.useCallback((id) => {
    setTemplates((list) => list.filter((t) => t.id !== id));
  }, []);

  const duplicateTemplate: TemplateStoreValue["duplicateTemplate"] = React.useCallback((id) => {
    let dup: ReportTemplate | null = null;
    setTemplates((list) => {
      const src = list.find((t) => t.id === id);
      if (!src) return list;
      const now = new Date().toISOString();
      dup = {
        ...src,
        id: "tpl-" + Math.random().toString(36).slice(2, 10),
        name: src.name + " (Copy)",
        locked: false,
        createdAt: now,
        updatedAt: now,
        source: "custom",
      };
      const idx = list.findIndex((t) => t.id === id);
      const next = list.slice();
      next.splice(idx + 1, 0, dup);
      return next;
    });
    return dup;
  }, []);

  const lockTemplate: TemplateStoreValue["lockTemplate"] = React.useCallback((id, locked) => {
    setTemplates((list) =>
      list.map((t) => (t.id === id ? { ...t, locked, updatedAt: new Date().toISOString() } : t))
    );
  }, []);

  const reorderTemplates: TemplateStoreValue["reorderTemplates"] = React.useCallback((id, direction) => {
    setTemplates((list) => {
      const idx = list.findIndex((t) => t.id === id);
      if (idx < 0) return list;
      const swap = direction === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= list.length) return list;
      const next = list.slice();
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }, []);

  const exportJson: TemplateStoreValue["exportJson"] = React.useCallback(() => {
    return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), templates }, null, 2);
  }, [templates]);

  const importJson: TemplateStoreValue["importJson"] = React.useCallback((raw, mode = "merge") => {
    try {
      const parsed = JSON.parse(raw);
      const incoming: ReportTemplate[] = Array.isArray(parsed) ? parsed : parsed.templates;
      if (!Array.isArray(incoming)) return { ok: false, error: "Invalid JSON structure" };
      const clean = incoming.filter((t) => t && t.name && t.body && t.category);
      if (mode === "replace") {
        setTemplates(clean);
      } else {
        setTemplates((list) => {
          const existingIds = new Set(list.map((t) => t.id));
          const merged = [...list];
          for (const t of clean) {
            if (existingIds.has(t.id)) {
              merged.push({ ...t, id: "tpl-" + Math.random().toString(36).slice(2, 10) });
            } else {
              merged.push(t);
            }
          }
          return merged;
        });
      }
      return { ok: true, count: clean.length };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Parse error" };
    }
  }, []);

  const uploadFileAsTemplate: TemplateStoreValue["uploadFileAsTemplate"] = React.useCallback(
    async (file, category) => {
      const body = await extractTextFromFile(file);
      const name = file.name.replace(/\.(docx|pdf|txt|md)$/i, "");
      const now = new Date().toISOString();
      const tpl: ReportTemplate = {
        id: "tpl-" + Math.random().toString(36).slice(2, 10),
        name,
        category,
        body: body || `[Empty upload — paste template body here]`,
        locked: false,
        createdAt: now,
        updatedAt: now,
        source: "upload",
        originalFileName: file.name,
      };
      setTemplates((list) => [tpl, ...list]);
      return tpl;
    },
    []
  );

  const value = React.useMemo<TemplateStoreValue>(
    () => ({
      templates,
      addTemplate,
      updateTemplate,
      deleteTemplate,
      duplicateTemplate,
      lockTemplate,
      reorderTemplates,
      exportJson,
      importJson,
      uploadFileAsTemplate,
    }),
    [
      templates, addTemplate, updateTemplate, deleteTemplate, duplicateTemplate,
      lockTemplate, reorderTemplates, exportJson, importJson, uploadFileAsTemplate,
    ]
  );

  return <TemplateCtx.Provider value={value}>{children}</TemplateCtx.Provider>;
}

export function useTemplates() {
  const ctx = React.useContext(TemplateCtx);
  if (!ctx) throw new Error("useTemplates must be used within <TemplateProvider>");
  return ctx;
}

// ---- Shared placeholder resolution --------------------------------------

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
] as const;

export type PlaceholderKey = (typeof PLACEHOLDER_KEYS)[number];

export interface PlaceholderContext {
  BeneficiaryName: string;
  BeneficiaryLastName: string;
  BeneficiaryDOB: string;
  BeneficiaryDocId: string;
  ReferralId: string;
  BeneficiaryGender: string;
  VisitDateTime: string;
  ReportDate: string;
  ReferralActivityId: string;
  ReferralActivityName: string;
  ReferralDoctorName: string;
}

/** Replace {{Key}}, [Key], <Key>, $Key occurrences with values from ctx. */
export function applyPlaceholders(body: string, ctx: PlaceholderContext): string {
  let out = body;
  for (const key of PLACEHOLDER_KEYS) {
    const v = ctx[key] ?? "";
    const patterns = [
      new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"),
      new RegExp(`\\[\\s*${key}\\s*\\]`, "g"),
      new RegExp(`<\\s*${key}\\s*>`, "g"),
      new RegExp(`\\$${key}\\b`, "g"),
    ];
    for (const p of patterns) out = out.replace(p, v);
  }
  return out;
}
