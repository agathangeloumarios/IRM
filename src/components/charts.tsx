"use client";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, CartesianGrid, Cell, PieChart, Pie, LineChart, Line, Legend,
} from "recharts";

const axisStyle = { fontSize: 10, fill: "hsl(var(--muted-foreground))" };

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover/95 backdrop-blur-sm px-3 py-2 shadow-xl">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="mt-1 flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-mono font-medium text-foreground">
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function VolumeArea({ data }: { data: { month: string; procedures: number; newPatients: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="procGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F96903" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#F96903" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="patGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06E575" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#06E575" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} style={axisStyle} />
        <YAxis tickLine={false} axisLine={false} style={axisStyle} width={36} />
        <Tooltip content={<TooltipBox />} cursor={{ stroke: "hsl(var(--muted))", strokeDasharray: "3 3" }} />
        <Area type="monotone" dataKey="procedures" name="Procedures" stroke="#F96903" strokeWidth={2} fill="url(#procGrad)" />
        <Area type="monotone" dataKey="newPatients" name="New Patients" stroke="#06E575" strokeWidth={2} fill="url(#patGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RevenueBars({ data }: { data: { month: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} style={axisStyle} />
        <YAxis tickLine={false} axisLine={false} style={axisStyle} width={46}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
        <Bar dataKey="revenue" name="Revenue" radius={[3, 3, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === data.length - 1 ? "#F96903" : "hsl(var(--muted))"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProcedureMixPie({ data }: { data: { name: string; value: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          stroke="hsl(var(--background))"
          strokeWidth={2}
        >
          {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
        </Pie>
        <Tooltip content={<TooltipBox />} />
        <Legend
          verticalAlign="bottom"
          height={30}
          iconType="square"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data, color = "#F96903" }: { data: number[]; color?: string }) {
  const d = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={d} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Pixel-grid activity chart — inspired by the reference image */
export function PixelActivity() {
  const cols = 52;
  const rows = 7;
  const cells = Array.from({ length: cols * rows }, (_, index) => {
    const value = Math.sin((index + 1) * 12.9898) * 43758.5453;
    const normalized = value - Math.floor(value);
    return normalized > 0.55 ? normalized : 0;
  });
  return (
    <div
      className="grid gap-[3px] p-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {cells.map((v, i) => (
        <div
          key={i}
          className="aspect-square rounded-[2px]"
          style={{
            background: v === 0 ? "hsl(var(--muted) / 0.25)" : `rgba(249, 105, 3, ${0.25 + v * 0.75})`,
          }}
        />
      ))}
    </div>
  );
}
