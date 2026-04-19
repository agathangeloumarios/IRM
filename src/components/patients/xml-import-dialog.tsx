"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileCode2, Upload, CheckCircle2, AlertTriangle, ShieldCheck, X,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { usePatients, parsePatientXml } from "@/lib/patient-store";
import { PATIENT_TEMPLATE_FIELDS } from "@/lib/mock-data";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Stage = "pick" | "preview" | "done";

export function XmlImportDialog({ open, onOpenChange }: Props) {
  const { importXml, template } = usePatients();
  const [stage, setStage] = React.useState<Stage>("pick");
  const [fileName, setFileName] = React.useState("");
  const [xmlText, setXmlText] = React.useState("");
  const [extracted, setExtracted] = React.useState<Record<string, string>>({});
  const [violations, setViolations] = React.useState<string[]>([]);
  const [phone, setPhone] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [imported, setImported] = React.useState<string>("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage("pick");
    setFileName("");
    setXmlText("");
    setExtracted({});
    setViolations([]);
    setPhone("");
    setError(null);
    setImported("");
  };

  React.useEffect(() => {
    if (!open) setTimeout(reset, 200);
  }, [open]);

  const handleFile = async (file: File) => {
    setError(null);
    setFileName(file.name);
    const text = await file.text();
    setXmlText(text);
    const { extracted, violations } = parsePatientXml(text);
    if (violations.length > 0 && Object.values(extracted).filter(Boolean).length === 0) {
      setError("Could not parse file · not a valid XML document");
      return;
    }
    setExtracted(extracted);
    setViolations(violations);
    setStage("preview");
  };

  const handleSubmit = async () => {
    if (!phone.trim()) {
      setError("Τηλέφωνο is required (manual entry)");
      return;
    }
    setError(null);
    try {
      const res = await importXml(xmlText, phone.trim(), fileName || undefined);
      if (!res.ok || !res.patient) {
        setError(res.error || "Import failed");
        return;
      }
      setImported(res.patient.fullName);
      setStage("done");
    } catch {
      setError("Import failed");
    }
  };

  // Map the extracted XML record to the 11 displayable template fields.
  const previewRows = React.useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const fullName = [extracted.beneficiaryName, extracted.beneficiaryLastName]
      .filter(Boolean).join(" ").toUpperCase();
    const activity = [extracted.referralActivityId, extracted.referralActivityName]
      .filter(Boolean).join(" — ");
    const values: Record<string, string> = {
      fullName,
      dob: extracted.beneficiaryDob || "",
      docId: extracted.beneficiaryDocId || "",
      referralId: extracted.referralId || "",
      phone: phone || "—",
      gender: extracted.beneficiaryGender || "",
      visitDate: extracted.visitDateTime || "",
      reportDate: today,
      activity,
      referringDoctor: extracted.referralDoctorName || "",
      mrn: "— generated on save —",
    };
    return PATIENT_TEMPLATE_FIELDS.map((f) => ({
      key: f.key,
      label: f.label,
      xml: f.xml,
      value: values[f.key] || "",
      manual: f.key === "phone",
      auto: f.key === "reportDate" || f.key === "mrn",
    }));
  }, [extracted, phone]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
              <FileCode2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle>Import Patient from XML</DialogTitle>
              <DialogDescription>
                Εισαγωγή παραπεμπτικού · 10 fields auto-extract · Τηλέφωνο entered manually
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          <AnimatePresence mode="wait">
            {stage === "pick" && (
              <motion.div
                key="pick"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div
                  className="rounded-md border border-dashed border-border bg-card/40 p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) handleFile(f);
                  }}
                >
                  <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <div className="text-sm font-medium text-foreground">Drop XML file here or click to browse</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Accepts EDAPY / EOPYY referral XML · max 5 MB
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xml,text/xml,application/xml"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </div>

                {template && (
                  <div className="rounded-md border border-border bg-card/40 px-3 py-2 flex items-center gap-2 text-xs">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary-foreground" />
                    <span className="text-muted-foreground">
                      Template is <span className="text-foreground font-medium">locked</span> ·
                      validating against {template.fields.length}-field structure from source patient.
                    </span>
                  </div>
                )}

                {error && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 flex items-center gap-2 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {error}
                  </div>
                )}
              </motion.div>
            )}

            {stage === "preview" && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <FileCode2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono text-muted-foreground">{fileName}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={reset}>
                    <X className="h-3.5 w-3.5" /> Change file
                  </Button>
                </div>

                {violations.length > 0 && (
                  <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 font-medium text-warning">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {violations.length} field{violations.length === 1 ? "" : "s"} missing · will be left blank
                    </div>
                    <ul className="mt-1 pl-5 list-disc text-muted-foreground space-y-0.5">
                      {violations.slice(0, 4).map((v) => (<li key={v}>{v}</li>))}
                      {violations.length > 4 && <li>…and {violations.length - 4} more</li>}
                    </ul>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="xml-phone">
                    Τηλέφωνο <span className="text-destructive">*</span>
                    <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                      (manual entry — not present in XML)
                    </span>
                  </Label>
                  <Input
                    id="xml-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+30 210 555 0000"
                    autoFocus
                  />
                </div>

                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-card/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2 text-left font-medium">Πεδίο</th>
                        <th className="px-3 py-2 text-left font-medium">Τιμή</th>
                        <th className="px-3 py-2 text-left font-medium">XML Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewRows.map((row) => (
                        <tr key={row.key}>
                          <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">
                            {row.label}
                          </td>
                          <td className="px-3 py-2 text-foreground">
                            {row.value ? (
                              <span className={row.auto ? "text-primary-foreground" : ""}>{row.value}</span>
                            ) : (
                              <span className="text-muted-foreground italic">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                            {row.manual ? (
                              <Badge variant="warning" className="py-0">manual</Badge>
                            ) : row.auto ? (
                              <Badge variant="primary" className="py-0">auto</Badge>
                            ) : (
                              row.xml
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {error && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 flex items-center gap-2 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {error}
                  </div>
                )}
              </motion.div>
            )}

            {stage === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center space-y-3"
              >
                <div className="h-14 w-14 rounded-full bg-success/15 border border-success/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-7 w-7 text-success" />
                </div>
                <div>
                  <div className="text-base font-semibold text-foreground">Patient Imported</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium text-foreground">{imported}</span> added to active roster.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="pt-4 border-t border-border">
          {stage === "pick" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          )}
          {stage === "preview" && (
            <>
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button variant="primary" onClick={handleSubmit}>
                <CheckCircle2 className="h-4 w-4" /> Import Patient
              </Button>
            </>
          )}
          {stage === "done" && (
            <Button variant="primary" onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
