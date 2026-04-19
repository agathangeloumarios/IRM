"use client";

import * as React from "react";
import { ProcedureType, PROCEDURE_TYPE_SEEDS } from "@/lib/mock-data";

const STORAGE_KEY = "irm:procedure-types:v1";

interface Value {
  types: ProcedureType[];
  activeTypes: ProcedureType[];
  addType: (input: Omit<ProcedureType, "id"> & { id?: string }) => ProcedureType;
  updateType: (id: string, patch: Partial<ProcedureType>) => void;
  deleteType: (id: string) => void;
  toggleActive: (id: string, active: boolean) => void;
}

const Ctx = React.createContext<Value | null>(null);

function load(): ProcedureType[] {
  if (typeof window === "undefined") return PROCEDURE_TYPE_SEEDS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return PROCEDURE_TYPE_SEEDS;
    const parsed = JSON.parse(raw) as ProcedureType[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : PROCEDURE_TYPE_SEEDS;
  } catch {
    return PROCEDURE_TYPE_SEEDS;
  }
}

function save(list: ProcedureType[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function makeId() {
  return `pt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

export function ProcedureTypesProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = React.useState<ProcedureType[]>(PROCEDURE_TYPE_SEEDS);

  React.useEffect(() => {
    setList(load());
  }, []);

  React.useEffect(() => {
    save(list);
  }, [list]);

  const addType = React.useCallback<Value["addType"]>((input) => {
    const t: ProcedureType = {
      id: input.id || makeId(),
      name: input.name.trim(),
      defaultDurationMin: input.defaultDurationMin || 60,
      cpt: input.cpt?.trim() || undefined,
      active: input.active ?? true,
    };
    setList((xs) => [...xs, t]);
    return t;
  }, []);

  const updateType = React.useCallback<Value["updateType"]>((id, patch) => {
    setList((xs) => xs.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const deleteType = React.useCallback<Value["deleteType"]>((id) => {
    setList((xs) => xs.filter((t) => t.id !== id));
  }, []);

  const toggleActive = React.useCallback<Value["toggleActive"]>((id, active) => {
    setList((xs) => xs.map((t) => (t.id === id ? { ...t, active } : t)));
  }, []);

  const value = React.useMemo<Value>(
    () => ({
      types: list,
      activeTypes: list.filter((t) => t.active),
      addType,
      updateType,
      deleteType,
      toggleActive,
    }),
    [list, addType, updateType, deleteType, toggleActive]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProcedureTypes() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useProcedureTypes must be used within <ProcedureTypesProvider>");
  return ctx;
}
