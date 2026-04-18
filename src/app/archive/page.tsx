"use client";

import { useMemo, useState } from "react";
import {
  Archive as ArchiveIcon, Search, RotateCcw, Database, ShieldCheck, Clock,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { patients } from "@/lib/mock-data";
import { formatDate, initials } from "@/lib/utils";

export default function ArchivePage() {
  const [q, setQ] = useState("");
  const archived = useMemo(
    () =>
      patients
        .concat(
          Array.from({ length: 6 }, (_, i) => ({
            ...patients[i % patients.length],
            id: `arc-${i}`,
            mrn: `IR-22${String(i).padStart(4, "0")}`,
            status: "archived" as const,
          }))
        )
        .filter((p) => p.status === "archived" || p.id.startsWith("arc-"))
        .filter((p) => !q || p.fullName.toLowerCase().includes(q.toLowerCase()) || p.mrn.includes(q)),
    [q]
  );

  return (
    <PageShell
      title="Archive"
      subtitle="Long-term patient storage · auto-archiving · full-text search · one-click restoration"
      actions={
        <>
          <Button variant="outline" size="sm"><Database className="h-4 w-4" /> Backup Archive</Button>
          <Button variant="primary" size="sm"><ArchiveIcon className="h-4 w-4" /> Archive Rules</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: "Total Archived", v: "2,847", i: ArchiveIcon },
          { l: "Auto-Archived (30d)", v: "84", i: Clock },
          { l: "Storage Used", v: "4.2 GB", i: Database },
          { l: "Encryption", v: "AES-256", i: ShieldCheck },
        ].map((s) => {
          const I = s.i;
          return (
            <Card key={s.l} className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-card border border-border flex items-center justify-center">
                  <I className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
                  <div className="text-xl font-semibold text-foreground">{s.v}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle>Archived Patients</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search archive..."
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-card/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">MRN</th>
                  <th className="px-4 py-3 text-left font-medium">Ονοματεπώνυμο</th>
                  <th className="px-4 py-3 text-left font-medium">Δραστηριότητα</th>
                  <th className="px-4 py-3 text-left font-medium">Archived</th>
                  <th className="px-4 py-3 text-left font-medium">Retention</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {archived.map((p) => (
                  <tr key={p.id} className="hover:bg-card/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.mrn}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-md bg-muted/50 border border-border flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                          {initials(p.fullName)}
                        </div>
                        <span className="text-foreground font-medium">{p.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.activity}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(p.visitDate)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">7 years remaining</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm"><RotateCcw className="h-3.5 w-3.5" /> Restore</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
