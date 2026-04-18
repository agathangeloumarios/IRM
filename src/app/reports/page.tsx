"use client";

import { useMemo, useState } from "react";
import {
  FileText, Upload, Plus, Sparkles, Download, Lock, Unlock,
  CheckCircle2, Wand2, FileDown, Loader2,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { templates, patients } from "@/lib/mock-data";
import { formatDate, cn } from "@/lib/utils";

export default function ReportsPage() {
  const [tpl, setTpl] = useState(templates[0].id);
  const [patientId, setPatientId] = useState(patients[0].id);
  const [filling, setFilling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generated, setGenerated] = useState("");

  const selectedTpl = templates.find((t) => t.id === tpl)!;
  const selectedPatient = patients.find((p) => p.id === patientId)!;

  const previewText = useMemo(() => {
    const header =
`DISCHARGE SUMMARY — ${selectedTpl.name}
────────────────────────────────────────────────────
Patient: {{PatientName}}
MRN: {{MRN}}
Date of Procedure: {{ProcedureDate}}
Physician: Dr. A. Reyes, MD
────────────────────────────────────────────────────

INDICATION
The patient presented with {{Diagnosis}}. Referred by {{ReferringPhysician}}.

PROCEDURE
{{ProcedureDescription}}

FINDINGS
{{Findings}}

MEDICATIONS ON DISCHARGE
{{Medications}}

FOLLOW-UP
{{FollowUp}}

SIGNED,
Dr. A. Reyes, MD — Interventional Radiology`;
    return header;
  }, [selectedTpl]);

  const autofill = async () => {
    setFilling(true);
    setProgress(0);
    setGenerated("");
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, 120));
      setProgress(Math.round((i / steps) * 100));
    }
    const out = previewText
      .replaceAll("{{PatientName}}", selectedPatient.fullName)
      .replaceAll("{{MRN}}", selectedPatient.mrn)
      .replaceAll("{{ProcedureDate}}", formatDate(new Date()))
      .replaceAll("{{Diagnosis}}", selectedPatient.activity)
      .replaceAll("{{ReferringPhysician}}", selectedPatient.referringDoctor)
      .replaceAll(
        "{{ProcedureDescription}}",
        "Under sterile conditions and moderate sedation, right common femoral artery access was obtained. Selective catheterization was performed and embolization completed without complication."
      )
      .replaceAll(
        "{{Findings}}",
        "Successful embolization with stasis achieved. No immediate post-procedural complications. Patient tolerated the procedure well."
      )
      .replaceAll(
        "{{Medications}}",
        "- Acetaminophen 500mg PO q6h PRN\n- Ibuprofen 400mg PO q6h PRN\n- Ondansetron 4mg PO q8h PRN nausea"
      )
      .replaceAll(
        "{{FollowUp}}",
        "Clinic follow-up in 2 weeks. Return to ED for fever >101°F, severe pain unrelieved by medication, or active bleeding."
      );
    setGenerated(out);
    setFilling(false);
  };

  return (
    <PageShell
      title="Discharge Reports"
      subtitle="Template-based reports · Word import · AI completion · Placeholder normalization · PDF export"
      actions={
        <>
          <Button variant="outline" size="sm"><Upload className="h-4 w-4" /> Import Word</Button>
          <Button variant="primary" size="sm"><Plus className="h-4 w-4" /> New Template</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4">
        {/* Templates list */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Templates ({templates.length})</CardTitle></CardHeader>
            <CardContent className="p-2 space-y-1.5">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTpl(t.id)}
                  className={cn(
                    "w-full text-left rounded-md border p-3 transition-colors focus-ring",
                    tpl === t.id
                      ? "border-primary-foreground/40 bg-primary-foreground/5"
                      : "border-border hover:border-muted"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="text-sm font-medium text-foreground truncate">{t.name}</div>
                    </div>
                    {t.locked ? (
                      <Badge variant="success" className="gap-1"><Lock className="h-2.5 w-2.5" /> Locked</Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1"><Unlock className="h-2.5 w-2.5" /> Draft</Badge>
                    )}
                  </div>
                  <div className="mt-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
                    {t.placeholders.length} placeholders · .{t.format}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.placeholders.slice(0, 4).map((p) => (
                      <span key={p} className="rounded border border-border bg-card/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                        {"{{"}{p}{"}}"}
                      </span>
                    ))}
                    {t.placeholders.length > 4 && (
                      <span className="text-[10px] text-muted-foreground">+{t.placeholders.length - 4}</span>
                    )}
                  </div>
                  <div className="mt-2 text-[10px] text-muted-foreground">Updated {formatDate(t.updated)}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Placeholder Formats</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded border border-border bg-card/60 px-2.5 py-1.5">
                <span className="font-mono text-muted-foreground">[Field]</span>
                <Badge variant="outline">Detected</Badge>
              </div>
              <div className="flex items-center justify-between rounded border border-border bg-card/60 px-2.5 py-1.5">
                <span className="font-mono text-muted-foreground">{"{{Field}}"}</span>
                <Badge variant="primary">Normalized</Badge>
              </div>
              <div className="flex items-center justify-between rounded border border-border bg-card/60 px-2.5 py-1.5">
                <span className="font-mono text-muted-foreground">&lt;Field&gt;</span>
                <Badge variant="outline">Detected</Badge>
              </div>
              <div className="flex items-center justify-between rounded border border-border bg-card/60 px-2.5 py-1.5">
                <span className="font-mono text-muted-foreground">$Variable</span>
                <Badge variant="outline">Detected</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Editor */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
                <div>
                  <CardTitle>Report Generation</CardTitle>
                  <div className="mt-1 text-sm text-foreground font-medium">{selectedTpl.name}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div>
                    <Label className="mb-1 block">Patient</Label>
                    <Select value={patientId} onValueChange={setPatientId}>
                      <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {patients.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.fullName} — {p.mrn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="primary" size="sm" onClick={autofill} disabled={filling}>
                    {filling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {filling ? "AI is filling..." : "AI Auto-Fill"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filling && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>Extracting patient data · procedure context · template fields</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <div className="rounded-md border border-border bg-background/50 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <FileText className="h-3 w-3" /> report-preview.md
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]"><Wand2 className="h-3 w-3" /> Lint</Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]"><Lock className="h-3 w-3" /> Lock</Button>
                  </div>
                </div>
                <Textarea
                  value={generated || previewText}
                  onChange={(e) => setGenerated(e.target.value)}
                  className="min-h-[460px] border-0 bg-transparent font-mono text-xs leading-relaxed focus-visible:ring-0 resize-none"
                  spellCheck={false}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  All placeholders resolved · template integrity verified
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><Download className="h-4 w-4" /> .TXT</Button>
                  <Button variant="primary" size="sm"><FileDown className="h-4 w-4" /> Export PDF</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
