"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Trash2, Save, ShieldCheck, AlertTriangle, Archive, FileCode2, CalendarPlus, ListChecks,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { usePatients } from "@/lib/patient-store";
import { Patient, PatientStatus, PATIENT_TEMPLATE_FIELDS } from "@/lib/mock-data";
import { initials, formatDate } from "@/lib/utils";

interface Props {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const statusOptions: { value: PatientStatus; label: string; hint?: string }[] = [
  { value: "active",    label: "Active" },
  { value: "inactive",  label: "Inactive" },
  { value: "completed", label: "Completed", hint: "Auto-archives to Archive module" },
  { value: "archived",  label: "Archived" },
];

const statusVariant: Record<PatientStatus, "success" | "warning" | "outline" | "primary"> = {
  active: "success",
  inactive: "warning",
  completed: "primary",
  archived: "outline",
};

export function PatientDetailDialog({ patient, open, onOpenChange }: Props) {
  const router = useRouter();
  const { updatePatient, deletePatient, setStatus } = usePatients();
  const [draft, setDraft] = React.useState<Patient | null>(patient);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    setDraft(patient);
    setConfirmDelete(false);
    setDirty(false);
  }, [patient, open]);

  if (!draft) return null;

  const patch = (k: keyof Patient, v: string) => {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
    setDirty(true);
  };

  const handleStatus = (s: PatientStatus) => {
    if (!draft) return;
    setStatus(draft.id, s);
    setDraft({ ...draft, status: s === "completed" ? "archived" : s });
  };

  const handleSave = () => {
    if (!draft) return;
    const { id, ...patchable } = draft;
    updatePatient(id, patchable);
    setDirty(false);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!draft) return;
    deletePatient(draft.id);
    setConfirmDelete(false);
    onOpenChange(false);
  };

  const goSchedule = (status: "scheduled" | "waiting-list") => {
    if (!draft) return;
    onOpenChange(false);
    router.push(`/procedures?patient=${encodeURIComponent(draft.id)}&status=${status}`);
  };

  const fieldMap: Record<string, keyof Patient | "mrn"> = {
    fullName: "fullName",
    dob: "dob",
    docId: "docId",
    referralId: "referralId",
    phone: "phone",
    gender: "gender",
    visitDate: "visitDate",
    reportDate: "reportDate",
    activity: "activity",
    referringDoctor: "referringDoctor",
    mrn: "mrn",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-md bg-secondary border border-secondary-foreground/20 flex items-center justify-center text-xs font-semibold text-secondary-foreground shrink-0">
              {initials(draft.fullName)}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                {draft.fullName}
                {draft.isTemplateSource && (
                  <Badge variant="primary" className="gap-1"><ShieldCheck className="h-3 w-3" /> Template Source</Badge>
                )}
                <Badge variant={statusVariant[draft.status]} className="capitalize">{draft.status}</Badge>
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap mt-0.5">
                <span className="font-mono text-xs">{draft.mrn}</span>
                <span className="text-border">·</span>
                <span className="text-xs capitalize">{draft.source === "xml" ? "imported from XML" : "manual entry"}</span>
                {draft.importedAt && (
                  <>
                    <span className="text-border">·</span>
                    <span className="text-xs">imported {formatDate(draft.importedAt)}</span>
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-5">
          {/* Status selector */}
          <div className="rounded-md border border-border bg-card/40 p-4 space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Κατάσταση Ασθενούς · Status
            </Label>
            <div className="flex items-center gap-3">
              <Select value={draft.status} onValueChange={(v) => handleStatus(v as PatientStatus)}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                        {opt.hint && (
                          <span className="text-[10px] text-muted-foreground">{opt.hint}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Archive className="h-3.5 w-3.5" />
                Setting <span className="text-foreground font-medium">Completed</span> auto-moves patient to Archive.
              </div>
            </div>
          </div>

          {/* 11-field template */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileCode2 className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Πεδία Παραπεμπτικού · 11-Field Template
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PATIENT_TEMPLATE_FIELDS.map((f) => {
                const fieldKey = fieldMap[f.key] as keyof Patient;
                const value = (draft[fieldKey] as string) || "";
                const isMrn = f.key === "mrn";
                return (
                  <div key={f.key} className="space-y-1">
                    <Label htmlFor={`f-${f.key}`} className="flex items-center gap-1.5">
                      <span>{f.label}</span>
                      {f.key === "phone" && (
                        <Badge variant="warning" className="py-0 text-[9px]">manual</Badge>
                      )}
                      {isMrn && (
                        <Badge variant="outline" className="py-0 text-[9px]">read-only</Badge>
                      )}
                    </Label>
                    <Input
                      id={`f-${f.key}`}
                      value={value}
                      disabled={isMrn}
                      onChange={(e) => patch(fieldKey, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delete section */}
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">Danger Zone</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Permanently delete this patient and all associated records. This action cannot be undone.
                </div>
                {!confirmDelete ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-3"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Patient
                  </Button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-center gap-2 flex-wrap"
                  >
                    <span className="text-xs font-medium text-destructive">
                      Confirm permanent deletion of {draft.fullName}?
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" size="sm" onClick={handleDelete}>
                        <Trash2 className="h-3.5 w-3.5" /> Yes, delete permanently
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border gap-2 flex-wrap">
          <div className="flex items-center gap-2 mr-auto">
            <Button variant="outline" size="sm" onClick={() => goSchedule("scheduled")}>
              <CalendarPlus className="h-4 w-4" /> Schedule Procedure
            </Button>
            <Button variant="outline" size="sm" onClick={() => goSchedule("waiting-list")}>
              <ListChecks className="h-4 w-4" /> Add to Waiting List
            </Button>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="primary" onClick={handleSave} disabled={!dirty}>
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
