"use client";

import {
  Activity, DollarSign, Clock, TrendingUp, Stethoscope, Target,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/stat-card";
import { VolumeArea, RevenueBars, ProcedureMixPie } from "@/components/charts";
import { monthlyVolume, procedureMix } from "@/lib/mock-data";

export default function AnalyticsPage() {
  return (
    <PageShell
      title="Analytics"
      subtitle="Real-time practice intelligence · revenue, outcomes, utilization"
      actions={
        <>
          <Select defaultValue="ytd">
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">Export XLSX</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value="$2.10M" delta="+14.2%" icon={DollarSign}
          spark={[150, 158, 162, 170, 178, 182, 190, 195, 198, 205, 208, 210]} color="#F96903" />
        <StatCard label="Cases Performed" value="658" delta="+9.3%" icon={Activity}
          spark={[42, 38, 51, 47, 55, 61, 58, 53, 60, 66, 63, 58]} color="#06E575" />
        <StatCard label="Avg. Case Time" value="78" unit="min" delta="-4.1%" positive={false} icon={Clock}
          spark={[88, 86, 84, 82, 81, 80, 79, 78, 78, 77, 78, 78]} color="#297DFF" />
        <StatCard label="Complication Rate" value="0.8" unit="%" delta="-0.2%" positive={false} icon={Target}
          spark={[1.4, 1.3, 1.2, 1.1, 1.0, 1.0, 0.9, 0.9, 0.8, 0.8, 0.8, 0.8]} color="#AC47FC" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Procedure Volume vs New Patients</CardTitle>
              <div className="mt-1 text-2xl font-semibold text-foreground">658 / 215</div>
            </div>
            <Badge variant="primary">Monthly</Badge>
          </CardHeader>
          <CardContent><VolumeArea data={monthlyVolume} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Procedure Mix</CardTitle></CardHeader>
          <CardContent><ProcedureMixPie data={procedureMix} /></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Monthly Revenue</CardTitle>
            <div className="text-xs text-muted-foreground">USD · gross</div>
          </CardHeader>
          <CardContent><RevenueBars data={monthlyVolume} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top Referring Physicians</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Dr. Patel", count: 142, pct: 92 },
              { name: "Dr. Chen", count: 118, pct: 76 },
              { name: "Dr. Okafor", count: 89, pct: 57 },
              { name: "Dr. Walker", count: 64, pct: 41 },
              { name: "Dr. Martinez", count: 38, pct: 24 },
            ].map((r) => (
              <div key={r.name}>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-foreground font-medium">{r.name}</span>
                  </div>
                  <span className="font-mono text-muted-foreground">{r.count}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary-foreground"
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Outcome Quality Metrics</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { l: "Technical Success", v: "98.4%", t: "success" },
              { l: "Clinical Success", v: "94.7%", t: "success" },
              { l: "30-Day Readmission", v: "2.1%", t: "warning" },
              { l: "Patient Satisfaction", v: "4.8/5", t: "primary" },
            ].map((m) => (
              <div key={m.l} className="rounded-md border border-border bg-card/40 p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.l}</div>
                <div className="mt-2 flex items-end gap-2">
                  <div className="text-2xl font-semibold text-foreground">{m.v}</div>
                  <TrendingUp className="h-4 w-4 text-success mb-1" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
