"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, Users, CalendarClock, DollarSign, Clock, MapPin,
  ChevronRight, CheckCircle2, Circle, PlayCircle, MoreHorizontal,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/stat-card";
import { VolumeArea, RevenueBars, PixelActivity } from "@/components/charts";
import {
  monthlyVolume, appointments, procedures, patients,
} from "@/lib/mock-data";
import { formatTime } from "@/lib/utils";

const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
  waiting: { label: "Waiting", variant: "warning", icon: Circle },
  "checked-in": { label: "Checked In", variant: "primary", icon: CheckCircle2 },
  "in-room": { label: "In Room", variant: "success", icon: PlayCircle },
  completed: { label: "Completed", variant: "outline", icon: CheckCircle2 },
};

export default function DashboardPage() {
  const [range, setRange] = useState("monthly");

  return (
    <PageShell
      title="Welcome back, Dr. Reyes"
      subtitle="Here's what's happening across your practice today."
      actions={
        <>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">Export</Button>
          <Button variant="primary" size="sm">
            <Activity className="h-4 w-4" /> New Procedure
          </Button>
        </>
      }
    >
      {/* Stat row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Procedures"
          value="658"
          delta="+12.4%"
          icon={Activity}
          spark={[32, 38, 35, 42, 45, 48, 51, 55, 58, 61, 63, 58]}
          color="#F96903"
        />
        <StatCard
          label="Active Patients"
          value="1,248"
          delta="+4.7%"
          icon={Users}
          spark={[120, 128, 134, 141, 148, 152, 160, 166, 172, 180, 190, 195]}
          color="#06E575"
        />
        <StatCard
          label="Today's Appointments"
          value="8"
          delta="+2"
          icon={CalendarClock}
          spark={[5, 6, 4, 7, 8, 6, 9, 7, 8, 10, 8, 8]}
          color="#297DFF"
        />
        <StatCard
          label="Revenue (MTD)"
          value="$198.7K"
          delta="+8.1%"
          icon={DollarSign}
          spark={[140, 155, 148, 162, 175, 180, 185, 190, 192, 195, 198, 199]}
          color="#F96903"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Volume trend */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Procedure Volume</CardTitle>
              <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                658 <span className="text-xs font-normal text-muted-foreground">procedures · YTD</span>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Badge variant="primary" className="gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" /> Procedures</Badge>
              <Badge variant="success" className="gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success" /> New Patients</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <VolumeArea data={monthlyVolume} />
          </CardContent>
        </Card>

        {/* Revenue bars */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-2xl font-semibold text-foreground">$198,700</div>
              <Badge variant="success">+8.1%</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueBars data={monthlyVolume} />
          </CardContent>
        </Card>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Today's appointments */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Today's Appointments</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs">
              View all <ChevronRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {appointments.map((a, idx) => {
                const s = statusConfig[a.status];
                const S = s.icon;
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-card/50 transition-colors"
                  >
                    <div className="w-16 shrink-0 text-right">
                      <div className="text-sm font-mono font-medium text-foreground">{formatTime(a.time)}</div>
                    </div>
                    <div className="h-8 w-8 rounded-md bg-secondary border border-secondary-foreground/20 flex items-center justify-center text-xs font-semibold text-secondary-foreground">
                      {a.patientName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{a.patientName}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                        {a.procedure}
                        {a.room && (<><span>·</span><MapPin className="h-3 w-3" />{a.room}</>)}
                      </div>
                    </div>
                    <Badge variant={s.variant} className="gap-1">
                      <S className="h-3 w-3" />
                      {s.label}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Waiting list */}
        <Card>
          <CardHeader>
            <CardTitle>Waiting List</CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">3 patients · avg wait 12 min</div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {patients.slice(0, 4).map((p, index) => (
              <div key={p.id} className="flex items-center gap-3 rounded-md border border-border bg-background/40 p-2.5">
                <div className="h-7 w-7 rounded-md bg-primary-foreground/10 border border-primary-foreground/20 flex items-center justify-center text-[10px] font-semibold text-primary-foreground">
                  {p.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">{p.fullName}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{p.activity}</div>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-0.5" />
                  {index * 4 + 7}m
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Activity pixel grid */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Practice Activity · Last 52 weeks</CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">
              Each cell represents case volume on a given day.
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-0.5">
              {[0.2, 0.4, 0.6, 0.8, 1].map((o) => (
                <span key={o} className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: `rgba(249, 105, 3, ${o})` }} />
              ))}
            </div>
            <span>More</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <PixelActivity />
        </CardContent>
      </Card>

      {/* Recent procedures table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent Procedures</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs">View all <ChevronRight className="h-3 w-3" /></Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-card/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-medium px-5 py-2.5">ID</th>
                  <th className="text-left font-medium px-5 py-2.5">Patient</th>
                  <th className="text-left font-medium px-5 py-2.5">Procedure</th>
                  <th className="text-left font-medium px-5 py-2.5">Room</th>
                  <th className="text-left font-medium px-5 py-2.5">Status</th>
                  <th className="text-right font-medium px-5 py-2.5">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {procedures.slice(0, 6).map((p) => (
                  <tr key={p.id} className="hover:bg-card/40 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">#{p.id.toUpperCase()}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{p.patientName}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.type}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.room}</td>
                    <td className="px-5 py-3">
                      <Badge
                        variant={
                          p.status === "completed" ? "success" :
                          p.status === "in-progress" ? "primary" :
                          p.status === "cancelled" ? "destructive" : "warning"
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-muted-foreground">
                      {p.durationMin} min
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
