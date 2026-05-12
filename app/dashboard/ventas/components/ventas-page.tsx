"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Eye, Trash2, X, ChevronDown, Check, MoreHorizontal } from "lucide-react";
import type { Sale } from "../types";
import { PAYMENT_METHOD_LABELS } from "../types";
import { eliminarVenta } from "../actions";

// ── Breakpoint hooks ───────────────────────────────────────────────────────────

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(v: number) {
  return (
    "$" +
    v.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Panama",
  });
}

const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function formatDate(iso: string) {
  const d = new Date(iso);
  const tz = { timeZone: "America/Panama" } as const;
  const day   = new Intl.DateTimeFormat("es-MX", { ...tz, day:   "numeric" }).format(d);
  const month = new Intl.DateTimeFormat("es-MX", { ...tz, month: "long"    }).format(d);
  const year  = new Intl.DateTimeFormat("es-MX", { ...tz, year:  "numeric" }).format(d);
  return `${day} ${month} ${year}`;
}

const TZ = "America/Panama";

// Returns the calendar date components for a moment in Panama timezone
function panamaDateParts(d: Date) {
  return {
    year:  Number(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year:  "numeric" }).format(d)),
    month: Number(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, month: "numeric" }).format(d)) - 1, // 0-based
    day:   Number(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, day:   "numeric" }).format(d)),
  };
}

// Midnight Panama time = 05:00 UTC (UTC-5, no DST)
function startOfDay(d: Date): Date {
  const { year, month, day } = panamaDateParts(d);
  return new Date(Date.UTC(year, month, day, 5, 0, 0));
}

function startOfWeek(d: Date): Date {
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayName = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d);
  const dow = DOW.indexOf(dayName); // 0=Sun … 6=Sat
  const diff = dow === 0 ? 6 : dow - 1; // days since Monday
  return new Date(startOfDay(d).getTime() - diff * 86_400_000);
}

function startOfMonth(d: Date): Date {
  const { year, month } = panamaDateParts(d);
  return new Date(Date.UTC(year, month, 1, 5, 0, 0));
}

// ── Filter constants ───────────────────────────────────────────────────────────

type DateFilterType = "hoy" | "semana" | "mes";

const DATE_OPTIONS: { value: DateFilterType; label: string }[] = [
  { value: "hoy",    label: "Hoy" },
  { value: "semana", label: "Esta semana" },
  { value: "mes",    label: "Este mes" },
];

const PAYMENT_OPTIONS = [
  { value: "efectivo",      label: "Efectivo" },
  { value: "yappy",         label: "Yappy" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta",       label: "Tarjeta de crédito" },
  { value: "pedidos_ya",    label: "PedidosYa" },
];

const ALL_METHODS = new Set(PAYMENT_OPTIONS.map((o) => o.value));

// ── Checkbox ──────────────────────────────────────────────────────────────────

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div
      className={[
        "w-5 h-5 rounded shrink-0 flex items-center justify-center border transition-colors",
        checked ? "bg-[#F1DAE7] border-[#F1DAE7]" : "border-white/25 bg-transparent",
      ].join(" ")}
    >
      {checked && <Check size={11} className="text-[#101010]" strokeWidth={3} />}
    </div>
  );
}

// ── Date filter — mobile full-screen sheet ────────────────────────────────────

function DateFilterSheet({
  value,
  onChange,
  onClose,
}: {
  value: DateFilterType;
  onChange: (v: DateFilterType) => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={[
        "fixed top-0 left-0 right-0 bottom-0 z-50 flex flex-col transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <p className="text-lg font-semibold text-white">Período</p>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/16 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
        {DATE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { onChange(opt.value); onClose(); }}
            className={[
              "w-full flex items-center gap-5 px-6 py-5 rounded-2xl text-lg font-medium transition-colors",
              value === opt.value
                ? "text-white bg-white/12"
                : "text-white bg-white/8 hover:bg-white/10 active:bg-white/14",
            ].join(" ")}
          >
            {opt.label}
            {value === opt.value && <Check size={18} className="ml-auto" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Payment filter — mobile full-screen sheet ─────────────────────────────────

function PaymentFilterSheet({
  selected,
  onChange,
  onClose,
}: {
  selected: Set<string>;
  onChange: (v: Set<string>) => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const allSelected = selected.size === PAYMENT_OPTIONS.length;

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  }

  function toggleAll() {
    onChange(allSelected ? new Set() : new Set(ALL_METHODS));
  }

  return (
    <div
      className={[
        "fixed top-0 left-0 right-0 bottom-0 z-50 flex flex-col transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <p className="text-lg font-semibold text-white">Método de pago</p>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/16 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-3 px-8">
        <button
          onClick={toggleAll}
          className="w-full flex items-center gap-5 px-6 py-5 rounded-2xl text-lg font-medium text-white bg-white/8 hover:bg-white/10 active:bg-white/14 transition-colors"
        >
          <Checkbox checked={allSelected} />
          Todos
        </button>
        {PAYMENT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className="w-full flex items-center gap-5 px-6 py-5 rounded-2xl text-lg font-medium text-white bg-white/8 hover:bg-white/10 active:bg-white/14 transition-colors"
          >
            <Checkbox checked={selected.has(opt.value)} />
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Date filter trigger + dropdown ────────────────────────────────────────────

function DateFilter({
  value,
  onChange,
}: {
  value: DateFilterType;
  onChange: (v: DateFilterType) => void;
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMobile) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isMobile]);

  const label = DATE_OPTIONS.find((o) => o.value === value)?.label ?? "Hoy";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-2 min-h-[44px] px-3 rounded-lg text-sm border transition-colors whitespace-nowrap",
          open
            ? "bg-white/8 border-white/20 text-white"
            : "bg-transparent border-white/12 text-white/50 hover:text-white hover:border-white/20",
        ].join(" ")}
      >
        <span>{label}</span>
        <ChevronDown
          size={13}
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && isMobile && (
        <DateFilterSheet value={value} onChange={onChange} onClose={() => setOpen(false)} />
      )}

      {open && !isMobile && (
        <div
          className="absolute top-full left-0 mt-1.5 w-52 z-30 overflow-hidden"
          style={{
            backgroundColor: "#1e1e1e",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "12px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.8)",
          }}
        >
          {DATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={[
                "w-full text-left px-4 py-2.5 text-sm transition-colors",
                value === opt.value
                  ? "text-white bg-white/6"
                  : "text-white/55 hover:text-white hover:bg-white/4",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Payment filter trigger + dropdown ─────────────────────────────────────────

function PaymentFilter({
  selected,
  onChange,
}: {
  selected: Set<string>;
  onChange: (v: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMobile) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isMobile]);

  const allSelected = selected.size === PAYMENT_OPTIONS.length;
  const label = allSelected
    ? "Método de pago"
    : selected.size === 0
    ? "Ninguno"
    : selected.size === 1
    ? (PAYMENT_OPTIONS.find((o) => selected.has(o.value))?.label ?? "")
    : `${selected.size} métodos`;

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  }

  function toggleAll() {
    onChange(allSelected ? new Set() : new Set(ALL_METHODS));
  }

  const isActive = open || !allSelected;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-2 min-h-[44px] px-3 rounded-lg text-sm border transition-colors whitespace-nowrap",
          isActive
            ? "bg-white/8 border-white/20 text-white"
            : "bg-transparent border-white/12 text-white/50 hover:text-white hover:border-white/20",
        ].join(" ")}
      >
        <span>{label}</span>
        <ChevronDown
          size={13}
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && isMobile && (
        <PaymentFilterSheet selected={selected} onChange={onChange} onClose={() => setOpen(false)} />
      )}

      {open && !isMobile && (
        <div
          className="absolute top-full left-0 mt-1.5 w-52 z-30 overflow-hidden"
          style={{
            backgroundColor: "#1e1e1e",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "12px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.8)",
          }}
        >
          <button
            onClick={toggleAll}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/55 hover:text-white hover:bg-white/4 transition-colors border-b border-white/8"
          >
            <Checkbox checked={allSelected} />
            Todos
          </button>
          {PAYMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/55 hover:text-white hover:bg-white/4 transition-colors"
            >
              <Checkbox checked={selected.has(opt.value)} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sale action menu — mobile full-screen ─────────────────────────────────────

function SaleFullScreenMenu({
  sale,
  idx,
  onView,
  onDelete,
  onClose,
}: {
  sale: Sale;
  idx: number;
  onView: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={[
        "fixed top-0 left-0 right-0 bottom-0 z-50 flex flex-col md:hidden transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <p className="text-lg font-semibold text-white">
          {sale.receipt_number ?? `#${String(idx + 1).padStart(4, "0")}`}
        </p>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/16 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
        <button
          onClick={onView}
          className="w-full flex items-center gap-5 px-6 py-5 rounded-2xl text-lg font-medium text-white bg-white/8 hover:bg-white/12 active:bg-white/16 transition-colors"
        >
          <Eye size={24} strokeWidth={1.75} />
          Ver detalle
        </button>
        <button
          onClick={onDelete}
          className="w-full flex items-center gap-5 px-6 py-5 rounded-2xl text-lg font-medium text-red-400 bg-white/8 hover:bg-red-500/10 active:bg-red-500/15 transition-colors"
        >
          <Trash2 size={24} strokeWidth={1.75} />
          Eliminar
        </button>
      </div>
    </div>
  );
}

// ── Sale action menu — tablet bottom sheet ────────────────────────────────────

function SaleBottomSheet({
  sale,
  idx,
  onView,
  onDelete,
  onClose,
}: {
  sale: Sale;
  idx: number;
  onView: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <div
        className="hidden md:block lg:hidden fixed top-0 left-0 right-0 bottom-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={[
          "hidden md:flex lg:hidden fixed left-0 right-0 bottom-0 z-50 flex-col border-t border-white/10 rounded-t-2xl",
          "transition-transform duration-300 ease-out",
          visible ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
        style={{ backgroundColor: "#1a1a1a" }}
      >
        <div className="px-5 pt-4 pb-3">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <p className="text-sm font-medium text-white">
            {sale.receipt_number ?? `#${String(idx + 1).padStart(4, "0")}`}
          </p>
          <p className="text-xs text-white/40 mt-0.5">Selecciona una acción</p>
        </div>
        <div className="px-3 pb-10">
          <button
            onClick={onView}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/6 transition-colors"
          >
            <div className="p-2.5 rounded-xl bg-white/8">
              <Eye size={18} strokeWidth={1.75} />
            </div>
            Ver detalle
          </button>
          <button
            onClick={onDelete}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <div className="p-2.5 rounded-xl bg-white/8">
              <Trash2 size={18} strokeWidth={1.75} />
            </div>
            Eliminar
          </button>
        </div>
      </div>
    </>
  );
}

// ── Summary cards ──────────────────────────────────────────────────────────────

const TOTAL_METAS: Record<DateFilterType, number> = {
  hoy:    150,
  semana: 960,
  mes:    3840,
};

function SummaryCards({ sales, dateFilter }: { sales: Sale[]; dateFilter: DateFilterType }) {
  const isMobile = useIsMobile();
  const count = sales.length;
  const total = sales.reduce((s, v) => s + v.total, 0);
  const avg = count > 0 ? total / count : 0;
  const meta = TOTAL_METAS[dateFilter];
  const pct = Math.min((total / meta) * 100, 100);

  const totalCard = (compact?: boolean) => (
    <div className={compact ? "rounded-xl bg-[#1a1a1a] border border-white/8 px-3 py-2.5" : "rounded-xl bg-[#1a1a1a] border border-white/8 px-3 py-2.5 lg:px-4 lg:py-3"}>
      <p className={compact ? "text-sm text-white/40 mb-1 leading-tight" : "text-[10px] lg:text-xs text-white/40 mb-1 leading-tight"}>Total en dinero</p>
      <p className={compact ? "text-xl font-semibold tabular-nums" : "text-base lg:text-xl font-semibold tabular-nums"}>
        <span className="text-white">{formatCurrency(total)}</span>
        <span className="font-normal text-white/30 text-sm lg:text-base"> / {formatCurrency(meta)}</span>
      </p>
      <div className="h-1 w-full rounded-full bg-white/6 overflow-hidden mt-1.5">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? "#86efac" : "#F1DAE7" }} />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ width: "calc(50% - 4px)" }} className="rounded-xl bg-[#1a1a1a] border border-white/8 px-3 py-2.5">
            <p className="text-sm text-white/40 mb-1 leading-tight">Ventas</p>
            <p className="text-base font-medium text-white tabular-nums">{String(count)}</p>
          </div>
          <div style={{ width: "calc(50% - 4px)" }} className="rounded-xl bg-[#1a1a1a] border border-white/8 px-3 py-2.5">
            <p className="text-sm text-white/40 mb-1 leading-tight">Promedio</p>
            <p className="text-base font-medium text-white tabular-nums">{formatCurrency(avg)}</p>
          </div>
        </div>
        {totalCard(true)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 lg:gap-3">
      <div className="rounded-xl bg-[#1a1a1a] border border-white/8 px-3 py-2.5 lg:px-4 lg:py-3">
        <p className="text-[10px] lg:text-xs text-white/40 mb-1 leading-tight">Ventas</p>
        <p className="text-base lg:text-xl font-semibold text-white tabular-nums">{String(count)}</p>
      </div>
      <div className="rounded-xl bg-[#1a1a1a] border border-white/8 px-3 py-2.5 lg:px-4 lg:py-3">
        <p className="text-[10px] lg:text-xs text-white/40 mb-1 leading-tight">Promedio por venta</p>
        <p className="text-base lg:text-xl font-semibold text-white tabular-nums">{formatCurrency(avg)}</p>
      </div>
      {totalCard()}
    </div>
  );
}

// ── Delete confirmation dialog ─────────────────────────────────────────────────

function DeleteDialog({
  sale,
  onCancel,
  onConfirm,
  isDeleting,
}: {
  sale: Sale;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  const receipt = sale.receipt_number ?? "--";
  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-sm rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-base font-medium text-white">¿Eliminar venta?</h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/8 transition-colors -mr-1 -mt-0.5"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-white/50 mb-1">
          Recibo <span className="text-white/70 font-medium">{receipt}</span>
        </p>
        <p className="text-sm text-white/50 mb-6">
          El stock de los productos será restaurado. Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 h-10 min-h-[44px] lg:min-h-0 rounded-md border border-white/15 text-sm text-white/70 hover:text-white hover:border-white/25 transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 h-10 min-h-[44px] lg:min-h-0 rounded-md bg-red-900 text-sm text-white hover:bg-red-800 transition-colors disabled:opacity-40"
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Desktop table ──────────────────────────────────────────────────────────────

const TABLE_HEADERS = [
  { label: "Fecha",          right: false },
  { label: "# Recibo",       right: false },
  { label: "Método de pago", right: false },
  { label: "Monto",          right: true  },
  { label: "Acciones",       right: true  },
];

function SalesTable({
  sales,
  onDelete,
}: {
  sales: Sale[];
  onDelete: (sale: Sale) => void;
}) {
  if (sales.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#1a1a1a] px-6 py-12 text-center">
        <p className="text-sm text-white/30">No hay ventas para mostrar.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-white/8 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#1a1a1a] border-b border-white/8">
            {TABLE_HEADERS.map(({ label, right }) => (
              <th
                key={label}
                className={`px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider whitespace-nowrap ${
                  right ? "text-right" : "text-left"
                }`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/6">
          {sales.map((sale) => (
            <tr key={sale.id} className="hover:bg-white/3 transition-colors">
              <td className="px-5 py-4 text-white/60 whitespace-nowrap">
                {formatDate(sale.created_at)}
              </td>
              <td className="px-5 py-4 font-medium text-white whitespace-nowrap">
                {sale.receipt_number ?? "--"}
              </td>
              <td className="px-5 py-4 whitespace-nowrap">
                <span className="inline-flex items-center rounded-md bg-white/8 border border-white/10 px-2 py-0.5 text-xs text-white/70">
                  {PAYMENT_METHOD_LABELS[sale.payment_method] ?? sale.payment_method}
                </span>
              </td>
              <td className="px-5 py-4 text-right font-semibold text-white tabular-nums">
                {formatCurrency(sale.total)}
              </td>
              <td className="px-5 py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/dashboard/ventas/${sale.id}`}
                    className="p-1.5 rounded-md text-white/30 hover:text-white hover:bg-white/8 transition-colors"
                    title="Ver detalle"
                  >
                    <Eye size={14} />
                  </Link>
                  <button
                    onClick={() => onDelete(sale)}
                    className="p-1.5 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Mobile/tablet cards ────────────────────────────────────────────────────────

function SaleCards({
  sales,
  openMenuId,
  onMenuClick,
}: {
  sales: Sale[];
  openMenuId: string | null;
  onMenuClick: (id: string) => void;
}) {
  if (sales.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#1a1a1a] px-6 py-12 text-center">
        <p className="text-sm text-white/30">No hay ventas para mostrar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sales.map((sale, idx) => (
        <div
          key={sale.id}
          className="rounded-xl bg-[#1a1a1a] border border-white/8 px-4 py-3"
        >
          {/* Top row: receipt number + payment badge + 3-dot menu */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg md:text-sm font-semibold md:font-medium text-white">
                  {sale.receipt_number ?? `#${String(idx + 1).padStart(4, "0")}`}
                </p>
                <span className="inline-flex items-center rounded-md bg-white/8 border border-white/10 px-2 py-0.5 text-xs text-white/70">
                  {PAYMENT_METHOD_LABELS[sale.payment_method] ?? sale.payment_method}
                </span>
              </div>
              <p className="text-sm text-white/40 mt-0.5">{formatDate(sale.created_at)}</p>
            </div>
            <button
              onClick={() => onMenuClick(sale.id)}
              className={[
                "p-1.5 rounded-md min-h-[44px] min-w-[44px] transition-colors shrink-0",
                openMenuId === sale.id
                  ? "text-white bg-white/10"
                  : "text-white/50 hover:text-white hover:bg-white/8",
              ].join(" ")}
            >
              <MoreHorizontal size={16} className="w-6 h-6 md:w-4 md:h-4" />
            </button>
          </div>

          {/* Bottom section */}
          <div className="flex items-end justify-between mt-2 pt-3 border-t border-white/6">
            <p className="text-sm text-white/55">
              {formatTime(sale.created_at)}
            </p>
            <p className="text-[18px] font-semibold text-white tabular-nums">
              {formatCurrency(sale.total)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function VentasPage({ sales, role }: { sales: Sale[]; role: string }) {
  const router = useRouter();
  const isDesktop = useIsDesktop();

  const [dateFilter, setDateFilter] = useState<DateFilterType>("hoy");
  const [selectedMethods, setSelectedMethods] = useState<Set<string>>(new Set(ALL_METHODS));

  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [openMenuSaleId, setOpenMenuSaleId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const now = new Date();
    const rangeStart =
      dateFilter === "hoy"    ? startOfDay(now) :
      dateFilter === "semana" ? startOfWeek(now) :
                                startOfMonth(now);
    const rangeEnd = dateFilter === "hoy"
      ? new Date(startOfDay(now).getTime() + 86_400_000)
      : null;

    console.log(
      `[ventas filter] mode=${dateFilter} | pool=${sales.length} sales`,
      `| start=${rangeStart.toISOString()}`,
      rangeEnd ? `| end=${rangeEnd.toISOString()}` : "| end=now"
    );

    return sales.filter((sale) => {
      const saleDate = new Date(sale.created_at);
      if (saleDate < rangeStart) return false;
      if (rangeEnd && saleDate >= rangeEnd) return false;
      if (!selectedMethods.has(sale.payment_method)) return false;
      return true;
    });
  }, [sales, dateFilter, selectedMethods]);

  const openSale = filtered.find((s) => s.id === openMenuSaleId) ?? null;
  const openSaleIdx = filtered.findIndex((s) => s.id === openMenuSaleId);

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await eliminarVenta(deleteTarget.id);
    setIsDeleting(false);
    if (result?.error) {
      setDeleteError(result.error);
    } else {
      setDeleteTarget(null);
      router.refresh();
    }
  }

  function handleMenuClick(id: string) {
    setOpenMenuSaleId((prev) => (prev === id ? null : id));
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-xl font-semibold text-white">Ventas</h1>
        <button
          onClick={() => router.push("/dashboard/ventas/nueva")}
          className="flex items-center gap-2 h-9 min-h-[44px] lg:min-h-0 px-4 rounded-md bg-[#F1DAE7] text-[#101010] text-sm font-medium hover:bg-[#e8c8d8] transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} />
          Nueva venta
        </button>
      </div>

      {/* Filters bar */}
      <div className="mt-5 flex gap-2">
        <DateFilter value={dateFilter} onChange={setDateFilter} />
        <PaymentFilter selected={selectedMethods} onChange={setSelectedMethods} />
      </div>

      {/* Summary cards */}
      <div className="mt-4">
        <SummaryCards sales={filtered} dateFilter={dateFilter} />
      </div>

      {/* Table / cards */}
      <div className="mt-4">
        {deleteError && (
          <div className="mb-3 px-4 py-3 rounded-lg bg-red-950/40 border border-red-900/40 text-sm text-red-400">
            {deleteError}
          </div>
        )}
        {isDesktop ? (
          <SalesTable sales={filtered} onDelete={setDeleteTarget} />
        ) : (
          <SaleCards
            sales={filtered}
            openMenuId={openMenuSaleId}
            onMenuClick={handleMenuClick}
          />
        )}
      </div>

      {/* Sale action menus */}
      {openMenuSaleId && openSale && (
        <>
          <SaleFullScreenMenu
            sale={openSale}
            idx={openSaleIdx}
            onView={() => {
              setOpenMenuSaleId(null);
              router.push(`/dashboard/ventas/${openSale.id}`);
            }}
            onDelete={() => {
              setDeleteTarget(openSale);
              setOpenMenuSaleId(null);
            }}
            onClose={() => setOpenMenuSaleId(null)}
          />
          <SaleBottomSheet
            sale={openSale}
            idx={openSaleIdx}
            onView={() => {
              setOpenMenuSaleId(null);
              router.push(`/dashboard/ventas/${openSale.id}`);
            }}
            onDelete={() => {
              setDeleteTarget(openSale);
              setOpenMenuSaleId(null);
            }}
            onClose={() => setOpenMenuSaleId(null)}
          />
        </>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteDialog
          sale={deleteTarget}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
