"use client";

import React from "react";

// ── Dummy data ─────────────────────────────────────────────────────────────────

const SALES_TODAY = {
  total: 1247.5,
  count: 18,
  avg: 69.31,
  discounts: 85.0,
  discountPct: 6.8,
};

const INVENTORY_CATS = [
  { label: "Jugos", units: 47, value: 658.0 },
  { label: "Shots", units: 124, value: 744.0 },
  { label: "Bites", units: 89, value: 356.0 },
];

const OPERATIONS = {
  lostUnits: 3,
  lostPct: 0.8,
  lostDetail: "Jugos ×1 · Shots ×1 · Bites ×1",
  recoveredBottles: 12,
  estimatedLoss: 42.0,
};

const PAYMENT_METHODS = [
  { label: "Efectivo",      value: 521.0, pct: 41.8, color: "#86efac" },
  { label: "Yappy",         value: 384.5, pct: 30.8, color: "#F1DAE7" },
  { label: "Transferencia", value: 196.0, pct: 15.7, color: "#c4b5fd" },
  { label: "Tarjeta",       value: 98.0,  pct: 7.9,  color: "#fdba74" },
  { label: "PedidosYa",     value: 48.0,  pct: 3.9,  color: "#67e8f9" },
];

const TOP_PRODUCTS = [
  { name: "Jugo Verde",        units: 14, revenue: 196.0 },
  { name: "Jugo Rojo",         units: 11, revenue: 154.0 },
  { name: "Shot de Jengibre",  units: 9,  revenue: 63.0  },
  { name: "Bites de Almendra", units: 7,  revenue: 84.0  },
  { name: "Jugo Naranja",      units: 6,  revenue: 84.0  },
];

const WEEKLY = [
  { day: "Lun", total: 320  },
  { day: "Mar", total: 480  },
  { day: "Mié", total: 620  },
  { day: "Jue", total: 290  },
  { day: "Vie", total: 850  },
  { day: "Sáb", total: 1100 },
  { day: "Hoy", total: 1247 },
];

const REVENUE_SPLIT = [
  { label: "Planes",            value: 473.85, pct: 38, color: "#F1DAE7" },
  { label: "Productos sueltos", value: 773.65, pct: 62, color: "#c4b5fd" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return "$" + v.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Section title ──────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
      {children}
    </h2>
  );
}

// ── Metric card ────────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl px-4 py-3",
        accent
          ? "bg-[#1a1a1a] border border-[#F1DAE7]/15"
          : "bg-[#1a1a1a] border border-white/8",
      ].join(" ")}
    >
      <p className="text-xs text-white/40 mb-1.5 leading-tight">{label}</p>
      <p className="text-xl font-semibold text-white tabular-nums">{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

// ── Weekly bar chart (CSS) ─────────────────────────────────────────────────────

function WeeklyBarChart({ data }: { data: typeof WEEKLY }) {
  const max = Math.max(...data.map((d) => d.total));
  const weekTotal = data.reduce((s, d) => s + d.total, 0);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-xs text-white/40">Últimos 7 días</p>
        <p className="text-sm font-semibold text-white tabular-nums">{fmt(weekTotal)}</p>
      </div>
      <div className="flex items-end gap-1.5" style={{ height: 80 }}>
        {data.map((d, i) => {
          const isToday = i === data.length - 1;
          return (
            <div
              key={d.day}
              title={fmt(d.total)}
              className="flex-1 rounded-t"
              style={{
                height: `${Math.max((d.total / max) * 80, 3)}px`,
                background: isToday ? "#F1DAE7" : "rgba(241,218,231,0.2)",
              }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        {data.map((d, i) => {
          const isToday = i === data.length - 1;
          return (
            <div key={d.day} className="flex-1 text-center">
              <span
                className="text-[10px]"
                style={{ color: isToday ? "rgba(241,218,231,0.7)" : "rgba(255,255,255,0.3)" }}
              >
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Donut chart (SVG) ──────────────────────────────────────────────────────────

function DonutChart({ segments }: { segments: typeof REVENUE_SPLIT }) {
  const r = 38;
  const cx = 60;
  const cy = 60;
  const sw = 13;
  const circumference = 2 * Math.PI * r;

  // cumOffset starts at circumference/4 so the first segment begins at 12 o'clock.
  // Each segment subtracts its own arc length to position the next one.
  let cumOffset = circumference / 4;

  return (
    <svg viewBox="0 0 120 120" width={112} height={112} className="shrink-0">
      {/* Track */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={sw}
      />
      {segments.map((seg) => {
        const arc = (seg.pct / 100) * circumference;
        const dashOffset = cumOffset;
        cumOffset -= arc;
        return (
          <circle
            key={seg.label}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={sw}
            strokeDasharray={`${arc} ${circumference - arc}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="butt"
          />
        );
      })}
      {/* Center label */}
      <text
        x={cx} y={cy - 4}
        textAnchor="middle"
        fill="white"
        fontSize={14}
        fontWeight={600}
        fontFamily="inherit"
      >
        {segments[0].pct}%
      </text>
      <text
        x={cx} y={cy + 12}
        textAnchor="middle"
        fill="rgba(255,255,255,0.35)"
        fontSize={9}
        fontFamily="inherit"
      >
        planes
      </text>
    </svg>
  );
}

// ── Payment method bars ────────────────────────────────────────────────────────

function PaymentBars({ methods }: { methods: typeof PAYMENT_METHODS }) {
  return (
    <div className="space-y-3.5">
      {methods.map((m) => (
        <div key={m.label}>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/60">{m.label}</span>
            <div className="flex gap-2 text-white/40 tabular-nums">
              <span>{fmt(m.value)}</span>
              <span className="w-9 text-right">{m.pct}%</span>
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/6 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${m.pct}%`, background: m.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const inventoryTotal = INVENTORY_CATS.reduce((s, c) => s + c.value, 0);
  const inventoryUnits = INVENTORY_CATS.reduce((s, c) => s + c.units, 0);

  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl md:text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-white/30 mt-0.5 capitalize">{today}</p>
      </div>

      {/* 1. Ventas del día */}
      <section>
        <SectionTitle>Ventas del día</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
          <MetricCard label="Total en dinero" value={fmt(SALES_TODAY.total)} />
          <MetricCard label="Cantidad de ventas" value={String(SALES_TODAY.count)} />
          <MetricCard label="Ticket promedio" value={fmt(SALES_TODAY.avg)} />
          <MetricCard
            label="Descuentos del día"
            value={fmt(SALES_TODAY.discounts)}
            sub={`${SALES_TODAY.discountPct}% del total`}
          />
        </div>
      </section>

      {/* 2. Inventario actual */}
      <section>
        <SectionTitle>Inventario actual</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
          {INVENTORY_CATS.map((cat) => (
            <MetricCard
              key={cat.label}
              label={cat.label}
              value={`${cat.units} unidades`}
              sub={fmt(cat.value)}
            />
          ))}
          <MetricCard
            label="Total en stock"
            value={fmt(inventoryTotal)}
            sub={`${inventoryUnits} unidades`}
            accent
          />
        </div>
      </section>

      {/* 3. Operaciones */}
      <section>
        <SectionTitle>Operaciones</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 lg:gap-3">
          {/* Productos perdidos — slightly richer card */}
          <div className="rounded-xl bg-[#1a1a1a] border border-white/8 px-4 py-3">
            <p className="text-xs text-white/40 mb-1.5 leading-tight">Productos perdidos</p>
            <p className="text-xl font-semibold text-white tabular-nums">
              {OPERATIONS.lostUnits}{" "}
              <span className="text-base font-normal text-white/40">unidades</span>
            </p>
            <p className="text-xs text-white/30 mt-1">
              {OPERATIONS.lostPct}% del total
            </p>
            <p className="text-xs text-white/20 mt-0.5">{OPERATIONS.lostDetail}</p>
          </div>
          <MetricCard
            label="Botellas recuperadas"
            value={`${OPERATIONS.recoveredBottles} unidades`}
          />
          <MetricCard
            label="Merma estimada"
            value={fmt(OPERATIONS.estimatedLoss)}
            sub="en productos perdidos"
          />
        </div>
      </section>

      {/* 4 + 7. Métodos de pago — Planes vs sueltos */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-3 lg:gap-4">
        <section>
          <SectionTitle>Métodos de pago</SectionTitle>
          <div className="rounded-xl bg-[#1a1a1a] border border-white/8 px-5 py-4">
            <PaymentBars methods={PAYMENT_METHODS} />
          </div>
        </section>

        <section>
          <SectionTitle>Planes vs productos sueltos</SectionTitle>
          <div className="rounded-xl bg-[#1a1a1a] border border-white/8 px-5 py-4">
            <div className="flex items-center gap-5">
              <DonutChart segments={REVENUE_SPLIT} />
              <div className="space-y-4 flex-1 min-w-0">
                {REVENUE_SPLIT.map((seg) => (
                  <div key={seg.label}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: seg.color }}
                      />
                      <span className="text-xs text-white/50 truncate">{seg.label}</span>
                    </div>
                    <p className="text-base font-semibold text-white tabular-nums pl-4">
                      {fmt(seg.value)}
                    </p>
                    <p className="text-xs text-white/30 pl-4">{seg.pct}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 5 + 6. Top 5 productos — Tendencia semanal */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-3 lg:gap-4">
        <section>
          <SectionTitle>Top 5 productos</SectionTitle>
          <div className="rounded-xl bg-[#1a1a1a] border border-white/8 overflow-hidden">
            <div className="divide-y divide-white/6">
              {TOP_PRODUCTS.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs text-white/20 tabular-nums w-4 shrink-0 text-right">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-white/80 truncate min-w-0">{p.name}</span>
                  <span className="text-xs text-white/40 tabular-nums shrink-0">{p.units} uds</span>
                  <span className="text-sm font-medium text-white tabular-nums shrink-0">
                    {fmt(p.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <SectionTitle>Tendencia semanal</SectionTitle>
          <div className="rounded-xl bg-[#1a1a1a] border border-white/8 px-5 py-4">
            <WeeklyBarChart data={WEEKLY} />
          </div>
        </section>
      </div>
    </div>
  );
}
