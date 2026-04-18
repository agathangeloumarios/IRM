"use client";

import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/charts";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, delta, positive = true, icon: Icon, spark, color = "#F96903", unit,
}: {
  label: string;
  value: string | number;
  delta?: string;
  positive?: boolean;
  icon?: LucideIcon;
  spark?: number[];
  color?: string;
  unit?: string;
}) {
  const Delta = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <Card className="p-5 flex flex-col gap-4 relative overflow-hidden group hover:border-muted transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <div className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
              {value}
            </div>
            {unit && <div className="text-xs text-muted-foreground">{unit}</div>}
          </div>
        </div>
        {Icon && (
          <div className="h-8 w-8 rounded-md bg-card border border-border flex items-center justify-center">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      {spark && (
        <div className="h-10 -mx-1">
          <Sparkline data={spark} color={color} />
        </div>
      )}
      {delta && (
        <div className="flex items-center gap-1 border-t border-border pt-2.5 text-xs">
          <Delta className={cn("h-3.5 w-3.5", positive ? "text-success" : "text-destructive")} />
          <span className={cn("font-medium", positive ? "text-success" : "text-destructive")}>{delta}</span>
          <span className="text-muted-foreground">vs last period</span>
        </div>
      )}
    </Card>
  );
}
