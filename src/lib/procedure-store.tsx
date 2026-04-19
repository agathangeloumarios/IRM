"use client";

import * as React from "react";
import {
  Procedure,
  ProcedureStatus,
  procedures as SEED_PROCEDURES,
} from "@/lib/mock-data";

const STORAGE_KEY = "irm:procedures:v2";

/**
 * Build a clipboard payload matching the exact requested layout:
 *
 * IR Procedure — <type>
 * Patient: <name>
 * DOB: <dob>                    ΑΔΤ: <docId>
 * Phone: <phone>
 * When: <date · time (dur)>     NOTES: <notes>
 * Status: <status>
 */
export function formatProcedureForClipboard(p: Procedure): string {
  const dt = new Date(p.scheduledAt);
  const date = dt.toLocaleDateString("el-GR", {
    weekday: "short", year: "numeric", month: "short", day: "2-digit",
    timeZone: "UTC",
  });
  const time = dt.toLocaleTimeString("el-GR", {
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  });

  const when = `When: ${date} · ${time} (${p.durationMin} min)`;
  const notes = p.notes ? `NOTES: ${p.notes}` : "NOTES:";
  const dob = `DOB: ${p.patientDob || "—"}`;
  const adt = `ΑΔΤ: ${p.patientDocId || "—"}`;

  // Pad first column to align the right-side field (tab-separated for paste)
  const PAD = "\t\t";
  return [
    `IR Procedure — ${p.type}`,
    `Patient: ${p.patientName}${p.patientMrn ? ` (${p.patientMrn})` : ""}`,
    `${dob}${PAD}${adt}`,
    `Phone: ${p.patientPhone || "—"}`,
    `${when}${PAD}${notes}`,
    `Status: ${p.status}`,
  ].join("\n");
}

export async function copyProcedureToClipboard(p: Procedure): Promise<boolean> {
  const text = formatProcedureForClipboard(p);
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export type NewProcedureInput = Omit<
  Procedure,
  "id" | "createdAt" | "updatedAt" | "statusChangedAt"
> & { id?: string };

interface ProcedureStoreValue {
  procedures: Procedure[];
  addProcedure: (p: NewProcedureInput) => Procedure;
  updateProcedure: (id: string, patch: Partial<Procedure>) => void;
  deleteProcedure: (id: string) => void;
  setStatus: (id: string, status: ProcedureStatus) => void;
  /** Convenience selectors — computed in memo. */
  byStatus: (s: ProcedureStatus) => Procedure[];
  todayScheduled: () => Procedure[];
  waitingList: () => Procedure[];
  resetToSeed: () => void;
}

const Ctx = React.createContext<ProcedureStoreValue | null>(null);

function load(): Procedure[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Procedure[];
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function save(list: Procedure[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore quota / privacy errors — state still lives in memory
  }
}

function makeId(): string {
  return `pr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ProcedureProvider({ children }: { children: React.ReactNode }) {
  // Keep SSR and first client render identical. Local data is adopted on mount.
  const [list, setList] = React.useState<Procedure[]>(() => SEED_PROCEDURES.slice());
  const [hydrated, setHydrated] = React.useState(false);

  // Mark hydrated on mount. If SSR rendered with SEED and localStorage has
  // data, adopt it here as a safety net.
  React.useEffect(() => {
    // One-time cleanup: remove the legacy v1 key that could contain data
    // corrupted by the pre-fix race between hydrate and persist effects.
    try { window.localStorage.removeItem("irm:procedures:v1"); } catch { /* ignore */ }
    const fromStore = load();
    if (fromStore) setList(fromStore);
    setHydrated(true);
  }, []);

  // Persist ONLY after hydration, so we never write SEED over real data.
  React.useEffect(() => {
    if (!hydrated) return;
    save(list);
  }, [list, hydrated]);

  // Cross-tab sync: reflect changes saved by other tabs.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || e.newValue == null) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) setList(parsed as Procedure[]);
      } catch {
        /* ignore */
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addProcedure = React.useCallback<ProcedureStoreValue["addProcedure"]>(
    (input) => {
      const now = new Date().toISOString();
      const proc: Procedure = {
        id: input.id || makeId(),
        patientId: input.patientId,
        patientName: input.patientName,
        patientMrn: input.patientMrn,
        patientPhone: input.patientPhone,
        patientDob: input.patientDob,
        patientReferralId: input.patientReferralId,
        patientDocId: input.patientDocId,
        type: input.type,
        physician: input.physician || "Dr. Reyes",
        scheduledAt: input.scheduledAt,
        durationMin: input.durationMin || 60,
        status: input.status || "scheduled",
        room: input.room || "IR-Suite 1",
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
        statusChangedAt: now,
      };
      setList((xs) => [proc, ...xs]);
      return proc;
    },
    []
  );

  const updateProcedure = React.useCallback<ProcedureStoreValue["updateProcedure"]>(
    (id, patch) => {
      const now = new Date().toISOString();
      setList((xs) =>
        xs.map((p) =>
          p.id === id
            ? {
                ...p,
                ...patch,
                updatedAt: now,
                statusChangedAt:
                  patch.status && patch.status !== p.status ? now : p.statusChangedAt,
              }
            : p
        )
      );
    },
    []
  );

  const deleteProcedure = React.useCallback<ProcedureStoreValue["deleteProcedure"]>(
    (id) => {
      setList((xs) => xs.filter((p) => p.id !== id));
    },
    []
  );

  const setStatus = React.useCallback<ProcedureStoreValue["setStatus"]>(
    (id, status) => updateProcedure(id, { status }),
    [updateProcedure]
  );

  const byStatus = React.useCallback(
    (s: ProcedureStatus) => list.filter((p) => p.status === s),
    [list]
  );

  const todayScheduled = React.useCallback(() => {
    const today = todayUtc();
    return list
      .filter((p) => p.status === "scheduled" && p.scheduledAt.slice(0, 10) === today)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }, [list]);

  const waitingList = React.useCallback(
    () =>
      list
        .filter((p) => p.status === "waiting-list")
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [list]
  );

  const resetToSeed = React.useCallback(() => setList(SEED_PROCEDURES.slice()), []);

  const value = React.useMemo<ProcedureStoreValue>(
    () => ({
      procedures: list,
      addProcedure,
      updateProcedure,
      deleteProcedure,
      setStatus,
      byStatus,
      todayScheduled,
      waitingList,
      resetToSeed,
    }),
    [list, addProcedure, updateProcedure, deleteProcedure, setStatus, byStatus, todayScheduled, waitingList, resetToSeed]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProcedures() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useProcedures must be used within <ProcedureProvider>");
  return ctx;
}
