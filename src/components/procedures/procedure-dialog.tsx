"use client";

import * as React from "react";
import {
  CalendarClock, Copy, Save, Trash2, AlertTriangle, Activity, User2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Procedure, ProcedureStatus, PROCEDURE_ROOMS,
} from "@/lib/mock-data";
import { usePatients } from "@/lib/patient-store";
import { useProcedureTypes } from "@/lib/procedure-types-store";
import {
  useProcedures, copyProcedureToClipboard, NewProcedureInput,
} from "@/lib/procedure-store";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Existing procedure → edit mode. Undefined → create mode. */
  procedure?: Procedure | null;
  /** Create mode: optional preset patient id (e.g. from patient detail). */
  presetPatientId?: string;
  /** Create mode: optional preset status (scheduled | waiting-list). */
  presetStatus?: ProcedureStatus;
}

interface DraftState {
  patientId: string;
  type: string;
  physician: string;
  date: string;         // YYYY-MM-DD
  time: string;         // HH:mm
  durationMin: number;
  room: string;
  status: ProcedureStatus;
  notes: string;
}

const STATUS_OPTS: { value: ProcedureStatus; label: string }[] = [
  { value: "scheduled",    label: "Scheduled" },
  { value: "waiting-list", label: "Waiting List" },
  { value: "completed",    label: "Completed" },
  { value: "cancelled",    label: "Cancelled" },
];

function isoToParts(iso: string): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  try {
    const d = new Date(iso);
    return {
      date: d.toISOString().slice(0, 10),
      time: d.toISOString().slice(11, 16),
    };
  } catch {
    return { date: "", time: "" };
  }
}

function partsToIso(date: string, time: string): string {
  if (!date) return new Date().toISOString();
  const t = time || "09:00";
  return new Date(`${date}T${t}:00.000Z`).toISOString();
}

export function ProcedureDialog({
  open, onOpenChange, procedure, presetPatientId, presetStatus,
}: Props) {
  const { patients } = usePatients();
  const { activeTypes } = useProcedureTypes();
  const { addProcedure, updateProcedure, deleteProcedure } = useProcedures();

  const isEdit = !!procedure;

  const initial = React.useMemo<DraftState>(() => {
    if (procedure) {
      const { date, time } = isoToParts(procedure.scheduledAt);
      return {
        patientId: procedure.patientId,
        type: procedure.type,
        physician: procedure.physician,
        date, time,
        durationMin: procedure.durationMin,
        room: procedure.room,
        status: procedure.status,
        notes: procedure.notes || "",
      };
    }
    const today = new Date().toISOString().slice(0, 10);
    return {
      patientId: presetPatientId || "",
      type: "",
      physician: "Dr. Reyes",
      date: today,
      time: "09:00",
      durationMin: 60,
      room: "IR-Suite 1",
      status: presetStatus || "scheduled",
      notes: "",
    };
  }, [procedure, presetPatientId, presetStatus]);

  const [draft, setDraft] = React.useState<DraftState>(initial);
  const [toast, setToast] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setDraft(initial);
      setConfirmDelete(false);
      setToast(null);
    }
  }, [open, initial]);

  const set = <K extends keyof DraftState>(k: K, v: DraftState[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  // Autofill duration when type changes (only in create mode & when not already customised)
  const onTypeChange = (name: string) => {
    const t = activeTypes.find((x) => x.name === name);
    setDraft((d) => ({
      ...d,
      type: name,
      durationMin: isEdit ? d.durationMin : t?.defaultDurationMin || d.durationMin,
    }));
  };

  const selectedPatient = patients.find((p) => p.id === draft.patientId);

  const canSave =
    !!draft.patientId && !!draft.type && !!draft.date && !!draft.time;

  const buildPayload = (): NewProcedureInput | null => {
    if (!selectedPatient) return null;
    return {
      patientId: selectedPatient.id,
      patientName: selectedPatient.fullName,
      patientMrn: selectedPatient.mrn,
      patientPhone: selectedPatient.phone,
      patientDob: selectedPatient.dob,
      patientReferralId: selectedPatient.referralId,
      patientDocId: selectedPatient.docId,
      type: draft.type.trim(),
      physician: draft.physician.trim() || "Dr. Reyes",
      scheduledAt: partsToIso(draft.date, draft.time),
      durationMin: Number(draft.durationMin) || 60,
      status: draft.status,
      room: draft.room,
      notes: draft.notes.trim() || undefined,
    };
  };

  const handleSave = async (opts?: { copyAfter?: boolean }) => {
    const payload = buildPayload();
    if (!payload) return;
    let saved: Procedure | null = null;
    if (isEdit && procedure) {
      updateProcedure(procedure.id, payload);
      saved = { ...procedure, ...payload, updatedAt: new Date().toISOString() } as Procedure;
    } else {
      saved = addProcedure(payload);
    }
    if (opts?.copyAfter && saved) {
      const ok = await copyProcedureToClipboard(saved);
      setToast(ok ? "Copied to clipboard" : "Copy failed");
      setTimeout(() => setToast(null), 1800);
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!procedure) return;
    deleteProcedure(procedure.id);
    onOpenChange(false);
  };

  const handleCopyOnly = async () => {
    const payload = buildPayload();
    if (!payload) return;
    const preview: Procedure = {
      id: procedure?.id || "preview",
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusChangedAt: new Date().toISOString(),
    } as Procedure;
    const ok = await copyProcedureToClipboard(preview);
    setToast(ok ? "Copied to clipboard" : "Copy failed");
    setTimeout(() => setToast(null), 1800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary-foreground" />
            {isEdit ? "Edit Procedure" : "Schedule Procedure"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update procedure details, status, and notes."
              : "Select a patient (XML details autofill), set date/time and status."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient picker */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <User2 className="h-3.5 w-3.5" /> Patient
            </Label>
            <Select
              value={draft.patientId}
              onValueChange={(v) => set("patientId", v)}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a patient…" />
              </SelectTrigger>
              <SelectContent>
                {patients.length === 0 && (
                  <div className="px-2 py-2 text-xs text-muted-foreground">
                    No patients yet — import an XML first.
                  </div>
                )}
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-medium">{p.fullName}</span>
                    <span className="text-muted-foreground"> · {p.mrn}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedPatient && (
              <div className="rounded-md border border-border bg-card/60 p-3 text-[11px] text-muted-foreground space-y-0.5">
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  <span><span className="text-foreground font-medium">{selectedPatient.fullName}</span></span>
                  <span>MRN {selectedPatient.mrn}</span>
                  <span>DOB {selectedPatient.dob || "—"}</span>
                  <span>Phone {selectedPatient.phone || "—"}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>Referral {selectedPatient.referralId || "—"}</span>
                  <span>ΑΔΤ {selectedPatient.docId || "—"}</span>
                  <span>{selectedPatient.activity}</span>
                </div>
              </div>
            )}
          </div>

          {/* Procedure type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Procedure Type</Label>
              <Select value={draft.type} onValueChange={onTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a type…" />
                </SelectTrigger>
                <SelectContent>
                  {activeTypes.length === 0 && (
                    <div className="px-2 py-2 text-xs text-muted-foreground">
                      No procedure types — add one in Settings.
                    </div>
                  )}
                  {activeTypes.map((t) => (
                    <SelectItem key={t.id} value={t.name}>
                      {t.name}
                      <span className="text-muted-foreground"> · {t.defaultDurationMin}m</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Physician</Label>
              <Input value={draft.physician} onChange={(e) => set("physician", e.target.value)} />
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={draft.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Time</Label>
              <Input
                type="time"
                value={draft.time}
                onChange={(e) => set("time", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                min={15}
                step={15}
                value={draft.durationMin}
                onChange={(e) => set("durationMin", Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Room</Label>
              <Select value={draft.room} onValueChange={(v) => set("room", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROCEDURE_ROOMS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => set("status", v as ProcedureStatus)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Optional clinical notes, prep instructions, contrast…"
            />
          </div>

          {/* Delete section (edit only) */}
          {isEdit && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground">Delete Procedure</div>
                  <div className="text-[11px] text-muted-foreground">
                    Permanent. Removes this procedure from all dashboards and lists.
                  </div>
                  {!confirmDelete ? (
                    <Button
                      variant="destructive" size="sm" className="mt-2"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" size="sm" onClick={handleDelete}>
                        <Trash2 className="h-3.5 w-3.5" /> Confirm delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {toast && (
            <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
              {toast}
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-border gap-2">
          <div className="flex-1 flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <CalendarClock className="h-3 w-3" />
              {draft.status}
            </Badge>
          </div>
          <Button variant="outline" onClick={handleCopyOnly} disabled={!canSave}>
            <Copy className="h-4 w-4" /> Copy
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!isEdit && (
            <Button
              variant="outline"
              onClick={() => handleSave({ copyAfter: true })}
              disabled={!canSave}
            >
              <Copy className="h-4 w-4" /> Save + Copy
            </Button>
          )}
          <Button variant="primary" onClick={() => handleSave()} disabled={!canSave}>
            <Save className="h-4 w-4" /> {isEdit ? "Save Changes" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
