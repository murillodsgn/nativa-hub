"use client";

import React, { useState } from "react";

// ── Types & filter ─────────────────────────────────────────────────────────────

type FilterType = "hoy" | "semana" | "mes";

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "hoy",    label: "Hoy" },
  { value: "semana", label: "Esta semana" },
  { value: "mes",    label: "Este mes" },
];

// ── Dummy data ─────────────────────────────────────────────────────────────────

const METAS: Record<FilterType, number> = {
  hoy:    150,
  semana: 960,
  mes:    3840,
};

const VENTAS: Record<FilterType, { total: number; discounts: number; discountPct: number }> = {
  hoy:    { total: 87.50,   discounts: 5.00,   discountPct: 5.7 },
  semana: { total: 640.00,  discounts: 32.00,  discountPct: 5.0 },
  mes:    { total: 2890.00, discounts: 145.00, discountPct: 5.0 },
};

const PRODUCCION: Record<FilterType, {
  jugos: number; shots: number; bites: number;
  perdidos: { jugos: number; shots: number; bites: number };
}> = {
  hoy:    { jugos: 12,  shots: 24,  bites: 8,   perdidos: { jugos: 1,  shots: 2,  bites: 0 } },
  semana: { jugos: 68,  shots: 142, bites: 47,  perdidos: { jugos: 5,  shots: 8,  bites: 2 } },
  mes:    { jugos: 290, shots: 610, bites: 198, perdidos: { jugos: 18, shots: 31, bites: 7 } },
};

const RETORNOS: Record<FilterType, { jugos: number; shots: number }> = {
  hoy:    { jugos: 5,   shots: 3  },
  semana: { jugos: 28,  shots: 19 },
  mes:    { jugos: 112, shots: 84 },
};

const INVENTARIO_CRITICO = [
  { name: "Jugo Mango",    category: "Jugos" },
  { name: "Shot Cúrcuma",  category: "Shots" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return "$" + v.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
      {children}
    </h2>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-white/8 border border-white/10 px-2 py-0.5 text-xs text-white/70">
      {children}
    </span>
  );
}

// ── Filter bar ─────────────────────────────────────────────────────────────────

function FilterBar({ value, onChange }: { value: FilterType; onChange: (v: FilterType) => void }) {
  return (
    <div className="flex gap-2">
      {FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={[
            "flex items-center min-h-[44px] md:min-h-0 pt-2.5 pb-2.5 pl-3 pr-3 rounded-lg text-sm border transition-colors whitespace-nowrap",
            value === opt.value
              ? "bg-white/8 border-white/20 text-white"
              : "bg-transparent border-white/12 text-white/50 hover:text-white hover:border-white/20",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Section 1: Ventas ──────────────────────────────────────────────────────────

const META_LABELS: Record<FilterType, string> = {
  hoy:    "Meta del día",
  semana: "Meta de la semana",
  mes:    "Meta del mes",
};

function ArcProgress({ pct, reached }: { pct: number; reached: boolean }) {
  const r = 11;
  const circ = 2 * Math.PI * r;
  const arc = (pct / 100) * circ;
  return (
    <svg width={28} height={28} viewBox="0 0 28 28" className="shrink-0">
      <circle cx="14" cy="14" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
      <circle
        cx="14" cy="14" r={r}
        fill="none"
        stroke={reached ? "#86efac" : "#F1DAE7"}
        strokeWidth="2.5"
        strokeDasharray={`${arc} ${circ}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
      />
    </svg>
  );
}

function VentasSection({ filter }: { filter: FilterType }) {
  const v = VENTAS[filter];
  const meta = METAS[filter];
  const pct = Math.min((v.total / meta) * 100, 100);
  const reached = pct >= 100;

  return (
    <section>
      <SectionTitle>Ventas</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 lg:gap-3">
        {/* Card 1 — Total vendido (prominent) */}
        <div className="rounded-xl bg-[#1e1e1e] border border-[#F1DAE7]/15 px-4 py-3">
          <p className="text-xs text-[#F1DAE7]/50 mb-1.5 leading-tight">Total vendido</p>
          <p className="text-2xl font-semibold text-white tabular-nums">{fmt(v.total)}</p>
        </div>

        {/* Card 2 — Meta with arc indicator */}
        <div className="rounded-xl bg-[#1a1a1a] border border-white/8 px-4 py-3">
          <div className="flex items-start justify-between mb-1.5">
            <p className="text-xs text-white/40 leading-tight">{META_LABELS[filter]}</p>
            <ArcProgress pct={pct} reached={reached} />
          </div>
          <p className="text-2xl font-semibold tabular-nums">
            <span className="text-white">{fmt(v.total)}</span>
            <span className="text-base font-normal text-white/30"> / {fmt(meta)}</span>
          </p>
        </div>

        {/* Card 3 — Descuentos */}
        <div className="rounded-xl bg-[#1a1a1a] border border-white/8 px-4 py-3">
          <p className="text-xs text-white/40 mb-1.5 leading-tight">Descuentos</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-semibold text-white tabular-nums">{fmt(v.discounts)}</p>
            <Tag>{v.discountPct}%</Tag>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section 2: Producción ──────────────────────────────────────────────────────

function ProduccionSection({ filter }: { filter: FilterType }) {
  const p = PRODUCCION[filter];
  const cats = [
    { label: "Jugos", produced: p.jugos, perdidos: p.perdidos.jugos },
    { label: "Shots", produced: p.shots, perdidos: p.perdidos.shots },
    { label: "Bites", produced: p.bites, perdidos: p.perdidos.bites },
  ];

  return (
    <section>
      <SectionTitle>Producción</SectionTitle>
      <div className="grid grid-cols-3 gap-2 lg:gap-3">
        {cats.map((cat) => (
          <div key={cat.label} className="rounded-xl bg-[#1a1a1a] border border-white/8 px-4 py-3">
            <p className="text-xs text-white/40 mb-1.5 leading-tight">{cat.label}</p>
            <p className="text-xl font-semibold text-white tabular-nums">{cat.produced}</p>
            {cat.perdidos > 0 ? (
              <p className="text-xs text-red-400/70 mt-1">{cat.perdidos} perdidos</p>
            ) : (
              <p className="text-xs text-white/20 mt-1">Sin pérdidas</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Section 3: Retornos ────────────────────────────────────────────────────────

function RetornosSection({ filter }: { filter: FilterType }) {
  const r = RETORNOS[filter];
  const total = r.jugos + r.shots;

  return (
    <section>
      <SectionTitle>Retornos</SectionTitle>
      <div className="rounded-xl bg-[#1a1a1a] border border-white/8 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/40 mb-1.5 leading-tight">Total retornado</p>
            <p className="text-xl font-semibold text-white tabular-nums">
              {total}{" "}
              <span className="text-base font-normal text-white/40">botellas</span>
            </p>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-xs text-white/40 mb-1">Jugos</p>
              <p className="text-lg font-semibold text-white tabular-nums">{r.jugos}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40 mb-1">Shots</p>
              <p className="text-lg font-semibold text-white tabular-nums">{r.shots}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section 4: Inventario crítico ──────────────────────────────────────────────

function InventarioCriticoSection() {
  return (
    <section>
      <SectionTitle>Inventario crítico</SectionTitle>
      {INVENTARIO_CRITICO.length === 0 ? (
        <div className="rounded-xl bg-[#1a1a1a] border border-white/8 px-4 py-4 text-center">
          <p className="text-sm text-white/40">Todo en stock ✓</p>
        </div>
      ) : (
        <div className="rounded-xl bg-[#1a1a1a] border border-white/8 overflow-hidden divide-y divide-white/6">
          {INVENTARIO_CRITICO.map((item) => (
            <div key={item.name} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-white">{item.name}</span>
              <Tag>{item.category}</Tag>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [filter, setFilter] = useState<FilterType>("hoy");

  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-white/30 mt-0.5 capitalize">{today}</p>
      </div>

      {/* Filter bar */}
      <FilterBar value={filter} onChange={setFilter} />

      <VentasSection filter={filter} />
      <ProduccionSection filter={filter} />
      <RetornosSection filter={filter} />
      <InventarioCriticoSection />
    </div>
  );
}
