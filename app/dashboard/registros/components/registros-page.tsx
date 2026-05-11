"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { iniciarTurno, registrarRetiro, cancelarRetiro, cerrarTurno, getShiftSales, registrarRetorno, eliminarRetorno, eliminarTurno } from "../actions";
import type { ActiveShift, ShiftSalesSummary } from "../actions";
import { Plus, X, Eye, Trash2, MoreHorizontal, Clock } from "lucide-react";
import { Stepper } from "@/components/ui/stepper";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Shift {
  id: string;
  employee: string;
  date: string;
  started_at: string;
  ended_at: string;
  durationHours: number;
  durationMinutes: number;
  sales: Record<string, number>;
  totalSales: number;
  retiros: number;
  cajaBalance: number | null;
}

export interface BottleRecord {
  id: number;
  registered_at: string;
  jugos: number;
  shots: number;
  registeredBy: string;
}

// ── Dummy data ─────────────────────────────────────────────────────────────────

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  yappy: "Yappy",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta de crédito",
  pedidos_ya: "PedidosYa",
};

const PAYMENT_METHODS = ["efectivo", "yappy", "transferencia", "tarjeta", "pedidos_ya"];


// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatCurrency(v: number) {
  return "$" + v.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_LONG  = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function formatDate(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}.`;
}

function formatDateLong(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_LONG[m - 1]} ${y}`;
}

function formatDuration(hours: number, minutes: number) {
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

function computeDuration(startedAt: string) {
  const totalMinutes = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
}: {
  active: "turnos" | "retornos";
  onChange: (t: "turnos" | "retornos") => void;
}) {
  return (
    <div className="flex gap-1 mt-5 border-b border-white/8">
      {(["turnos", "retornos"] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={[
            "px-4 py-3 md:py-2.5 text-base md:text-sm font-medium transition-colors min-h-[44px] md:min-h-0 -mb-px border-b-2",
            active === tab
              ? "text-white border-white"
              : "text-white/40 border-transparent hover:text-white/70",
          ].join(" ")}
        >
          {tab === "turnos" ? "Turnos" : "Retornos"}
        </button>
      ))}
    </div>
  );
}

// ── Shared modal shells ───────────────────────────────────────────────────────

function MobileSheet({
  title,
  subtitle,
  onClose,
  children,
  visible,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  visible: boolean;
}) {
  return (
    <div
      className={[
        "fixed top-0 left-0 right-0 bottom-0 z-50 bg-[#1a1a1a] flex flex-col",
        "transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      <div className="flex items-center justify-between pl-5 pr-4 py-4 border-b border-white/8 shrink-0">
        <div className="min-w-0">
          <p className="text-base font-medium text-white leading-tight">{title}</p>
          {subtitle && <p className="text-sm text-white/40 truncate mt-0.5">{subtitle}</p>}
        </div>
        <button
          onClick={onClose}
          className="ml-3 p-2 rounded-full flex items-center justify-center min-h-[44px] min-w-[44px] bg-white/10 text-white/70 hover:text-white hover:bg-white/16 transition-colors shrink-0"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto pl-5 pr-5 pt-5 pb-5">{children}</div>
    </div>
  );
}

function DesktopBackdrop({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pl-4 pr-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
}

function DesktopModal({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={[
        "relative w-full max-h-[80vh] flex flex-col overflow-hidden rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl",
        wide ? "max-w-lg" : "max-w-md",
      ].join(" ")}
    >
      <div className="flex items-start justify-between pl-6 pr-5 pt-5 pb-4 border-b border-white/8 shrink-0">
        <div>
          <h2 className="text-base font-medium text-white">{title}</h2>
          {subtitle && <p className="text-sm text-white/40 mt-0.5">{subtitle}</p>}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/8 transition-colors -mr-1 -mt-0.5"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto pl-6 pr-6 pt-5 pb-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full">
        {children}
      </div>
    </div>
  );
}

// ── RetiroModal ───────────────────────────────────────────────────────────────

function RetiroModal({
  isMobile,
  onClose,
  onConfirm,
}: {
  isMobile: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}) {
  const [amount, setAmount] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [isMobile]);

  const valid = !!amount && Number(amount) > 0;

  const body = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="retiro-amount">Monto</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm pointer-events-none">$</span>
          <input
            id="retiro-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full h-10 min-h-[44px] lg:min-h-0 pl-7 pr-3 rounded-lg bg-white/6 border border-white/12 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>
      </div>
      <button
        onClick={() => onConfirm(Number(amount))}
        disabled={!valid}
        className="w-full h-10 min-h-[44px] lg:min-h-0 rounded-lg bg-[#F1DAE7] text-[#101010] text-sm font-medium hover:bg-[#e8c8d8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Registrar retiro
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <MobileSheet title="Registrar retiro" onClose={onClose} visible={visible}>
        {body}
      </MobileSheet>
    );
  }

  return (
    <DesktopBackdrop onClose={onClose}>
      <DesktopModal title="Registrar retiro" onClose={onClose}>
        {body}
      </DesktopModal>
    </DesktopBackdrop>
  );
}

// ── CerrarTurnoModal ──────────────────────────────────────────────────────────

function CerrarTurnoModal({
  isMobile,
  startedAt,
  retiroAmount,
  cajaBalance,
  onClose,
  onConfirm,
}: {
  isMobile: boolean;
  startedAt: string;
  retiroAmount: number;
  cajaBalance: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [sales, setSales] = useState<ShiftSalesSummary | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [isMobile]);

  useEffect(() => {
    getShiftSales().then((result) => {
      if ("error" in result) setLoadError(true);
      else setSales(result.data);
    });
  }, []);

  const duration = computeDuration(startedAt);
  const totalSales = sales ? Object.values(sales).reduce((a, b) => a + b, 0) : 0;
  const activeMethods = sales ? PAYMENT_METHODS : [];
  const nuevoBalance = cajaBalance + (sales?.efectivo ?? 0) - retiroAmount;

  const body = (
    <div className="space-y-4">
      <div className="rounded-lg bg-white/4 border border-white/8 pl-4 pr-4 pt-3 pb-3">
        <p className="text-xs text-white/40 mb-1">Duración del turno</p>
        <p className="text-base font-medium text-white">
          {formatDuration(duration.hours, duration.minutes)}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Ventas por método</p>
        <div className="rounded-lg bg-white/4 border border-white/8 divide-y divide-white/6 overflow-hidden">
          {sales === null ? (
            <div className="pl-4 pr-4 pt-4 pb-4 text-sm text-white/40">
              {loadError ? "Error al cargar ventas." : "Cargando..."}
            </div>
          ) : (
            <>
              {activeMethods.map((method) => (
                <div key={method} className="flex justify-between pl-4 pr-4 pt-2.5 pb-2.5 text-base">
                  <span className="text-white/60">{PAYMENT_LABELS[method]}</span>
                  <span className="text-white tabular-nums">{formatCurrency(sales[method as keyof ShiftSalesSummary])}</span>
                </div>
              ))}
              <div className="flex justify-between pl-4 pr-4 pt-2.5 pb-2.5 text-base font-semibold">
                <span className="text-white/80">Total</span>
                <span className="text-white tabular-nums">{formatCurrency(totalSales)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Caja</p>
        <div className="rounded-lg bg-white/4 border border-white/8 divide-y divide-white/6 overflow-hidden">
          <div className="flex justify-between pl-4 pr-4 pt-2.5 pb-2.5 text-base">
            <span className="text-white/60">Balance actual</span>
            <span className="text-white tabular-nums">{formatCurrency(cajaBalance)}</span>
          </div>
          <div className="flex justify-between pl-4 pr-4 pt-2.5 pb-2.5 text-base">
            <span className="text-white/60">+ Efectivo del turno</span>
            <span className="text-emerald-400 tabular-nums">+{formatCurrency(sales?.efectivo ?? 0)}</span>
          </div>
          <div className="flex justify-between pl-4 pr-4 pt-2.5 pb-2.5 text-base">
            <span className="text-white/60">− Retiro</span>
            <span className="text-red-400 tabular-nums">−{formatCurrency(retiroAmount)}</span>
          </div>
          <div className="flex justify-between pl-4 pr-4 pt-3 pb-3 text-base font-semibold">
            <span className="text-white">Nuevo balance</span>
            <span className="text-white tabular-nums">{formatCurrency(nuevoBalance)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={onClose}
          className="flex-1 h-10 min-h-[44px] lg:min-h-0 rounded-lg border border-white/15 text-sm text-white/70 hover:text-white hover:border-white/25 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 h-10 min-h-[44px] lg:min-h-0 rounded-lg bg-red-900 text-sm text-white hover:bg-red-800 transition-colors"
        >
          Cerrar turno
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileSheet title="Cerrar turno" subtitle="Resumen del turno" onClose={onClose} visible={visible}>
        {body}
      </MobileSheet>
    );
  }

  return (
    <DesktopBackdrop onClose={onClose}>
      <DesktopModal title="Cerrar turno" subtitle="Resumen del turno" onClose={onClose}>
        {body}
      </DesktopModal>
    </DesktopBackdrop>
  );
}

// ── ShiftDetailModal ──────────────────────────────────────────────────────────

function ShiftDetailModal({
  shift,
  isMobile,
  onClose,
}: {
  shift: Shift;
  isMobile: boolean;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [isMobile]);

  const activeMethods = PAYMENT_METHODS;

  const body = (
    <div className="space-y-4">
      <div className="rounded-lg bg-white/4 border border-white/8 divide-y divide-white/6 overflow-hidden">
        {[
          { label: "Entrada", value: formatTime(shift.started_at) },
          { label: "Salida", value: formatTime(shift.ended_at) },
          { label: "Duración", value: formatDuration(shift.durationHours, shift.durationMinutes) },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between pl-4 pr-4 pt-2.5 pb-2.5 text-base">
            <span className="text-white/50">{label}</span>
            <span className="text-white font-medium tabular-nums">{value}</span>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Ventas</p>
        <div className="rounded-lg bg-white/4 border border-white/8 divide-y divide-white/6 overflow-hidden">
          {activeMethods.map((method) => (
            <div key={method} className="flex justify-between pl-4 pr-4 pt-2.5 pb-2.5 text-base">
              <span className="text-white/60">{PAYMENT_LABELS[method]}</span>
              <span className="text-white tabular-nums">{formatCurrency(shift.sales[method])}</span>
            </div>
          ))}
          <div className="flex justify-between pl-4 pr-4 pt-2.5 pb-2.5 text-base font-semibold">
            <span className="text-white/80">Total</span>
            <span className="text-white tabular-nums">{formatCurrency(shift.totalSales)}</span>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Retiros</p>
        <div className="rounded-lg bg-white/4 border border-white/8 divide-y divide-white/6 overflow-hidden">
          <div className="flex justify-between pl-4 pr-4 pt-2.5 pb-2.5 text-base">
            <span className="text-white/60">Retiros de efectivo</span>
            <span className="text-red-400 tabular-nums">−{formatCurrency(shift.retiros)}</span>
          </div>
          <div className="flex justify-between pl-4 pr-4 pt-3 pb-3 text-base font-semibold">
            <span className="text-white">Balance de caja</span>
            <span className="text-white tabular-nums">{shift.cajaBalance != null ? formatCurrency(shift.cajaBalance) : "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileSheet
        title={formatDateLong(shift.date)}
        subtitle={shift.employee}
        onClose={onClose}
        visible={visible}
      >
        {body}
      </MobileSheet>
    );
  }

  return (
    <DesktopBackdrop onClose={onClose}>
      <DesktopModal
        title={formatDateLong(shift.date)}
        subtitle={shift.employee}
        onClose={onClose}
      >
        {body}
      </DesktopModal>
    </DesktopBackdrop>
  );
}

// ── Shift menu — mobile full-screen ───────────────────────────────────────────

function ShiftMenuMobile({
  shift,
  onView,
  onDelete,
  onClose,
}: {
  shift: Shift;
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
      <div className="flex items-center justify-between pl-5 pr-4 pt-5 pb-4">
        <div>
          <p className="text-lg font-semibold text-white">{shift.employee}</p>
          <p className="text-sm text-white/40 mt-0.5">{formatDateLong(shift.date)}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/16 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 pl-8 pr-8">
        <button
          onClick={onView}
          className="w-full flex items-center gap-5 pl-6 pr-6 pt-5 pb-5 rounded-2xl text-lg font-medium text-white bg-white/8 hover:bg-white/12 active:bg-white/16 transition-colors"
        >
          <Eye size={24} strokeWidth={1.75} />
          Ver detalle
        </button>
        <button
          onClick={onDelete}
          className="w-full flex items-center gap-5 pl-6 pr-6 pt-5 pb-5 rounded-2xl text-lg font-medium text-red-400 bg-white/8 hover:bg-red-500/10 active:bg-red-500/15 transition-colors"
        >
          <Trash2 size={24} strokeWidth={1.75} />
          Eliminar
        </button>
      </div>
    </div>
  );
}

// ── Shift menu — tablet bottom sheet ─────────────────────────────────────────

function ShiftMenuBottomSheet({
  shift,
  onView,
  onDelete,
  onClose,
}: {
  shift: Shift;
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
        <div className="pl-5 pr-5 pt-4 pb-3">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <p className="text-sm font-medium text-white">{shift.employee}</p>
          <p className="text-xs text-white/40 mt-0.5">{formatDateLong(shift.date)}</p>
        </div>
        <div className="pl-3 pr-3 pb-10">
          <button
            onClick={onView}
            className="w-full flex items-center gap-4 pl-4 pr-4 pt-4 pb-4 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/6 transition-colors"
          >
            <div className="p-2.5 rounded-xl bg-white/8">
              <Eye size={18} strokeWidth={1.75} />
            </div>
            Ver detalle
          </button>
          <button
            onClick={onDelete}
            className="w-full flex items-center gap-4 pl-4 pr-4 pt-4 pb-4 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
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

// ── Shift menu — desktop dropdown ─────────────────────────────────────────────

function ShiftMenuDropdown({
  pos,
  onView,
  onDelete,
  onClose,
}: {
  pos: { top: number; right: number };
  onView: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div
        className="hidden lg:block fixed top-0 left-0 right-0 bottom-0 z-40"
        onClick={onClose}
      />
      <div
        className="hidden lg:block fixed z-50 w-44 py-1"
        style={{
          top: pos.top,
          right: pos.right,
          backgroundColor: "#242424",
          border: "1px solid rgba(255, 255, 255, 0.10)",
          borderRadius: "8px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.8)",
        }}
      >
        <button
          onClick={onView}
          className="w-full flex items-center gap-2.5 pl-3 pr-3 pt-2.5 pb-2.5 text-sm text-white/70 hover:text-white hover:bg-white/6 transition-colors"
        >
          <Eye size={14} strokeWidth={2} />
          Ver detalle
        </button>
        <button
          onClick={onDelete}
          className="w-full flex items-center gap-2.5 pl-3 pr-3 pt-2.5 pb-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={14} strokeWidth={2} />
          Eliminar
        </button>
      </div>
    </>
  );
}

// ── Delete shift confirmation ──────────────────────────────────────────────────

function DeleteShiftDialog({
  shift,
  onCancel,
  onConfirm,
}: {
  shift: Shift;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pl-4 pr-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-sm rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl pl-6 pr-6 pt-6 pb-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-base font-medium text-white">¿Eliminar turno?</h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/8 transition-colors -mr-1 -mt-0.5"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-white/70 font-medium mb-0.5">{shift.employee}</p>
        <p className="text-sm text-white/50 mb-6">
          {formatDateLong(shift.date)} · {formatTime(shift.started_at)}–{formatTime(shift.ended_at)}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-10 min-h-[44px] lg:min-h-0 rounded-md border border-white/15 text-sm text-white/70 hover:text-white hover:border-white/25 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-10 min-h-[44px] lg:min-h-0 rounded-md bg-red-900 text-sm text-white hover:bg-red-800 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Active shift banner ───────────────────────────────────────────────────────

function ActiveShiftBanner({
  retiros,
  startedAt,
  cajaBalance,
  onRetiro,
  onCancelRetiro,
  onCerrar,
}: {
  retiros: number;
  startedAt: string;
  cajaBalance: number;
  onRetiro: () => void;
  onCancelRetiro: () => void;
  onCerrar: () => void;
}) {
  const hasRetiro = retiros > 0;

  const retiroChip = (
    <span className="inline-flex items-center gap-1 pl-3 pr-1 rounded-lg bg-white/8 border border-white/10 text-sm text-white/80 tabular-nums whitespace-nowrap">
      {formatCurrency(retiros)}
      <button
        onClick={onCancelRetiro}
        title="Deshacer retiro"
        className="flex items-center justify-center min-h-[44px] md:min-h-0 w-7 md:w-6 text-white/30 hover:text-red-400 transition-colors rounded-r-lg"
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    </span>
  );

  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 pl-4 pr-4 pt-4 pb-4 md:pl-5 md:pr-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        {/* Info */}
        <div className="flex flex-col">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-white">Turno activo</p>
              <p className="hidden md:block text-sm text-white/40 mt-0.5">Desde las {formatTime(startedAt)}</p>
              <p className="hidden md:block text-sm text-white/40">Caja: {formatCurrency(cajaBalance)}</p>
              {hasRetiro && <div className="hidden md:block mt-2">{retiroChip}</div>}
            </div>
          </div>
          <p className="md:hidden text-sm text-white/40 mt-0.5">Desde las {formatTime(startedAt)}</p>
          <p className="md:hidden text-sm text-white/40">Caja: {formatCurrency(cajaBalance)}</p>
          {hasRetiro && <div className="md:hidden mt-2">{retiroChip}</div>}
        </div>
        {/* Buttons */}
        <div className="flex gap-2 w-full md:w-auto md:shrink-0">
          {!hasRetiro && (
            <button
              onClick={onRetiro}
              className="flex-1 md:flex-none pl-3 pr-3 h-11 md:h-9 min-h-[44px] lg:min-h-0 rounded-lg border border-white/15 text-sm text-white/70 hover:text-white hover:border-white/25 transition-colors whitespace-nowrap"
            >
              Registrar retiro
            </button>
          )}
          <button
            onClick={onCerrar}
            className="flex-1 md:flex-none pl-3 pr-3 h-11 md:h-9 min-h-[44px] lg:min-h-0 rounded-lg bg-white/8 text-sm text-white/80 hover:text-white hover:bg-white/12 transition-colors whitespace-nowrap"
          >
            Cerrar turno
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Turnos table (desktop) ────────────────────────────────────────────────────

const TURNOS_HEADERS: { label: string; right: boolean }[] = [
  { label: "Fecha",    right: false },
  { label: "Empleado", right: false },
  { label: "Entrada",  right: false },
  { label: "Salida",   right: false },
  { label: "Caja",     right: true  },
  { label: "Acciones", right: true  },
];

function TurnosTable({
  shifts,
  onView,
  onDelete,
}: {
  shifts: Shift[];
  onView: (shift: Shift) => void;
  onDelete: (shift: Shift) => void;
}) {
  if (shifts.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#1a1a1a] pl-6 pr-6 pt-12 pb-12 text-center">
        <p className="text-sm text-white/30">No hay turnos registrados.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-white/8 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/8">
            {TURNOS_HEADERS.map(({ label, right }) => (
              <th
                key={label || "_actions"}
                className={`pl-4 pr-4 pt-4 pb-4 text-xs font-medium text-white/40 uppercase tracking-wider whitespace-nowrap ${right ? "text-right" : "text-left"}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/6">
          {shifts.map((shift) => (
            <tr key={shift.id} className="hover:bg-white/3 transition-colors">
              <td className="pl-4 pr-4 pt-3.5 pb-3.5 text-white/60 whitespace-nowrap">{formatDateLong(shift.date)}</td>
              <td className="pl-4 pr-4 pt-3.5 pb-3.5 font-medium text-white whitespace-nowrap">{shift.employee}</td>
              <td className="pl-4 pr-4 pt-3.5 pb-3.5 text-white/70 tabular-nums">{formatTime(shift.started_at)}</td>
              <td className="pl-4 pr-4 pt-3.5 pb-3.5 text-white/70 tabular-nums">{formatTime(shift.ended_at)}</td>
              <td className="pl-4 pr-4 pt-3.5 pb-3.5 text-right font-medium text-white tabular-nums">{shift.cajaBalance != null ? formatCurrency(shift.cajaBalance) : "—"}</td>
              <td className="pl-4 pr-4 pt-3.5 pb-3.5 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onView(shift)}
                    className="p-1.5 rounded-md text-white/30 hover:text-white hover:bg-white/8 transition-colors"
                    title="Ver detalle"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(shift)}
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

// ── Turnos cards (mobile / tablet) ────────────────────────────────────────────

function TurnosCards({
  shifts,
  openMenuId,
  onMenuClick,
}: {
  shifts: Shift[];
  openMenuId: string | null;
  onMenuClick: (id: string) => void;
}) {
  if (shifts.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#1a1a1a] pl-6 pr-6 pt-12 pb-12 text-center">
        <p className="text-sm text-white/30">No hay turnos registrados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {shifts.map((shift) => (
        <div key={shift.id} className="rounded-xl bg-[#1a1a1a] border border-white/8 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg md:text-sm font-semibold md:font-medium text-white">
                {shift.employee}
              </p>
              <p className="text-sm text-white/40 mt-0.5">{formatDateLong(shift.date)}</p>
            </div>
            <button
              onClick={() => onMenuClick(shift.id)}
              className={[
                "p-1.5 rounded-md min-h-[44px] min-w-[44px] transition-colors shrink-0",
                openMenuId === shift.id
                  ? "text-white bg-white/10"
                  : "text-white/50 hover:text-white hover:bg-white/8",
              ].join(" ")}
            >
              <MoreHorizontal size={16} className="w-6 h-6 md:w-4 md:h-4" />
            </button>
          </div>

          <div className="flex items-end justify-between mt-2 pt-3 border-t border-white/6">
            <p className="text-sm text-white/55 tabular-nums">{formatTime(shift.started_at)} – {formatTime(shift.ended_at)}</p>
            <p className="text-[18px] font-semibold text-white tabular-nums">{shift.cajaBalance != null ? formatCurrency(shift.cajaBalance) : "—"}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Turnos tab ────────────────────────────────────────────────────────────────

function TurnosTab({
  isMobile,
  isDesktop,
  initialActiveShift,
  initialShifts,
  initialCajaBalance,
}: {
  isMobile: boolean;
  isDesktop: boolean;
  initialActiveShift: ActiveShift | null;
  initialShifts: Shift[];
  initialCajaBalance: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(initialActiveShift);
  const [retiroCash, setRetiroCash] = useState(initialActiveShift?.retiro_amount ?? 0);

  useEffect(() => {
    setActiveShift(initialActiveShift);
    setRetiroCash(initialActiveShift?.retiro_amount ?? 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialActiveShift?.id, initialActiveShift?.retiro_amount]);

  useEffect(() => {
    setShifts(initialShifts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialShifts[0]?.id]);

  const [showRetiro, setShowRetiro] = useState(false);
  const [showCerrar, setShowCerrar] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [detailShift, setDetailShift] = useState<Shift | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Shift | null>(null);

  const openShift = shifts.find((s) => s.id === openMenuId) ?? null;

  function handleMenuClickMobile(id: string) {
    setOpenMenuId((prev) => (prev === id ? null : id));
  }

  function handleView() {
    if (!openShift) return;
    setDetailShift(openShift);
    setOpenMenuId(null);
  }

  function handleDeleteIntent() {
    if (!openShift) return;
    setDeleteTarget(openShift);
    setOpenMenuId(null);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setShifts((prev) => prev.filter((s) => s.id !== target.id));
    setDeleteTarget(null);
    const result = await eliminarTurno(Number(target.id));
    if ("error" in result) {
      console.error("[eliminarTurno]", result.error);
      startTransition(() => router.refresh());
    }
  }

  async function handleRetiroConfirm(amount: number) {
    setRetiroCash(amount);
    setShowRetiro(false);
    const result = await registrarRetiro(amount);
    if ("error" in result) {
      setRetiroCash(0);
      console.error("[registrarRetiro]", result.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  async function handleCancelRetiro() {
    const prev = retiroCash;
    setRetiroCash(0);
    const result = await cancelarRetiro();
    if ("error" in result) {
      setRetiroCash(prev);
      console.error("[cancelarRetiro]", result.error);
    }
    startTransition(() => router.refresh());
  }

  async function handleCerrarTurno() {
    const result = await cerrarTurno();
    if ("error" in result) {
      console.error("[cerrarTurno]", result.error);
      return;
    }
    setActiveShift(null);
    setRetiroCash(0);
    setShowCerrar(false);
    startTransition(() => router.refresh());
  }

  async function handleIniciarTurno() {
    setActiveShift({ id: 0, started_at: new Date().toISOString(), retiro_amount: 0 });
    const result = await iniciarTurno();
    if ("error" in result) {
      setActiveShift(null);
      console.error("[iniciarTurno]", result.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div>
      {activeShift && (
        <ActiveShiftBanner
          retiros={retiroCash}
          startedAt={activeShift.started_at}
          cajaBalance={initialCajaBalance}
          onRetiro={() => setShowRetiro(true)}
          onCancelRetiro={handleCancelRetiro}
          onCerrar={() => setShowCerrar(true)}
        />
      )}

      <div className="flex items-center justify-between mt-6 mb-3">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
          Historial de turnos
        </p>
        {!activeShift && (
          <button
            onClick={handleIniciarTurno}
            className="flex items-center gap-2 h-9 min-h-[44px] lg:min-h-0 pl-4 pr-4 rounded-md bg-[#F1DAE7] text-[#101010] text-sm font-medium hover:bg-[#e8c8d8] transition-colors"
          >
            <Clock size={16} strokeWidth={2} />
            Iniciar turno
          </button>
        )}
      </div>

      {isDesktop ? (
        <TurnosTable
          shifts={shifts}
          onView={(shift) => setDetailShift(shift)}
          onDelete={(shift) => setDeleteTarget(shift)}
        />
      ) : (
        <TurnosCards
          shifts={shifts}
          openMenuId={openMenuId}
          onMenuClick={handleMenuClickMobile}
        />
      )}

      {openMenuId && openShift && (
        <>
          <ShiftMenuMobile shift={openShift} onView={handleView} onDelete={handleDeleteIntent} onClose={() => setOpenMenuId(null)} />
          <ShiftMenuBottomSheet shift={openShift} onView={handleView} onDelete={handleDeleteIntent} onClose={() => setOpenMenuId(null)} />
        </>
      )}

      {deleteTarget && (
        <DeleteShiftDialog
          shift={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {showRetiro && (
        <RetiroModal
          isMobile={isMobile}
          onClose={() => setShowRetiro(false)}
          onConfirm={handleRetiroConfirm}
        />
      )}

      {showCerrar && activeShift && (
        <CerrarTurnoModal
          isMobile={isMobile}
          startedAt={activeShift.started_at}
          retiroAmount={retiroCash}
          cajaBalance={initialCajaBalance}
          onClose={() => setShowCerrar(false)}
          onConfirm={handleCerrarTurno}
        />
      )}

      {detailShift && (
        <ShiftDetailModal shift={detailShift} isMobile={isMobile} onClose={() => setDetailShift(null)} />
      )}
    </div>
  );
}

// ── RegistrarBotellasModal ────────────────────────────────────────────────────

function RegistrarBotellasModal({
  isMobile,
  onClose,
  onConfirm,
}: {
  isMobile: boolean;
  onClose: () => void;
  onConfirm: (jugos: number, shots: number) => void;
}) {
  const [jugos, setJugos] = useState(0);
  const [shots, setShots] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [isMobile]);

  const canSubmit = jugos > 0 || shots > 0;

  const body = (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-1.5">
        <Label>Jugos</Label>
        <Stepper value={jugos} onChange={setJugos} min={0} />
      </div>
      <div className="flex flex-col items-center space-y-1.5">
        <Label>Shots</Label>
        <Stepper value={shots} onChange={setShots} min={0} />
      </div>
      <button
        onClick={() => onConfirm(jugos, shots)}
        disabled={!canSubmit}
        className="w-full h-10 min-h-[44px] lg:min-h-0 rounded-lg bg-[#F1DAE7] text-[#101010] text-sm font-medium hover:bg-[#e8c8d8] transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        Registrar
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <MobileSheet title="Registrar retorno" onClose={onClose} visible={visible}>
        {body}
      </MobileSheet>
    );
  }

  return (
    <DesktopBackdrop onClose={onClose}>
      <DesktopModal title="Registrar retorno" onClose={onClose}>
        {body}
      </DesktopModal>
    </DesktopBackdrop>
  );
}

// ── Botellas table (desktop) ──────────────────────────────────────────────────

const BOTELLAS_HEADERS: { label: string; center?: boolean; right: boolean; w?: string }[] = [
  { label: "Fecha",          right: false, w: "w-36"  },
  { label: "Hora",           right: false, w: "w-28"  },
  { label: "Jugos",          center: true, right: false, w: "w-24" },
  { label: "Shots",          center: true, right: false, w: "w-24" },
  { label: "Registrado por", right: false, w: "w-52"  },
  { label: "Acciones",       right: true,  w: "w-28"  },
];

function DeleteRetornoDialog({
  record,
  onCancel,
  onConfirm,
}: {
  record: BottleRecord;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pl-4 pr-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-sm rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl pl-6 pr-6 pt-6 pb-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-base font-medium text-white">¿Eliminar retorno?</h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/8 transition-colors -mr-1 -mt-0.5"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-white/70 font-medium mb-0.5">{record.registeredBy}</p>
        <p className="text-sm text-white/50 mb-6">
          {formatDateLong(record.registered_at.slice(0, 10))} · {formatTime(record.registered_at)}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-10 min-h-[44px] lg:min-h-0 rounded-md border border-white/15 text-sm text-white/70 hover:text-white hover:border-white/25 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-10 min-h-[44px] lg:min-h-0 rounded-md bg-red-900 text-sm text-white hover:bg-red-800 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function BotellasTable({ records, onDelete }: { records: BottleRecord[]; onDelete: (r: BottleRecord) => void }) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#1a1a1a] pl-6 pr-6 pt-12 pb-12 text-center">
        <p className="text-sm text-white/30">No hay registros.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-white/8 overflow-hidden">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          {BOTELLAS_HEADERS.map(({ label, w }) => (
            <col key={label} className={w ?? ""} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-white/8">
            {BOTELLAS_HEADERS.map(({ label, right, center }) => (
              <th
                key={label}
                className={`pl-5 pr-5 pt-4 pb-4 text-xs font-medium text-white/40 uppercase tracking-wider whitespace-nowrap ${center ? "text-center" : right ? "text-right" : "text-left"}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/6">
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-white/3 transition-colors">
              <td className="pl-5 pr-5 pt-3.5 pb-3.5 text-white/60 whitespace-nowrap">{formatDateLong(r.registered_at.slice(0, 10))}</td>
              <td className="pl-5 pr-5 pt-3.5 pb-3.5 text-white/60 tabular-nums">{formatTime(r.registered_at)}</td>
              <td className="pl-5 pr-5 pt-3.5 pb-3.5 text-center font-semibold text-white tabular-nums">{r.jugos > 0 ? r.jugos : "—"}</td>
              <td className="pl-5 pr-5 pt-3.5 pb-3.5 text-center font-semibold text-white tabular-nums">{r.shots > 0 ? r.shots : "—"}</td>
              <td className="pl-5 pr-5 pt-3.5 pb-3.5 text-white/70">{r.registeredBy}</td>
              <td className="pl-5 pr-5 pt-3.5 pb-3.5 text-right">
                <button
                  onClick={() => onDelete(r)}
                  className="p-1.5 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Botellas cards (mobile / tablet) ─────────────────────────────────────────

function BotellasCards({ records, onDelete }: { records: BottleRecord[]; onDelete: (r: BottleRecord) => void }) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#1a1a1a] pl-6 pr-6 pt-12 pb-12 text-center">
        <p className="text-sm text-white/30">No hay registros.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((r) => (
        <div key={r.id} className="rounded-xl bg-[#1a1a1a] border border-white/8 pl-4 pr-4 pt-3 pb-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 mr-4">
              <p className="text-lg md:text-sm font-semibold md:font-medium text-white">{r.registeredBy}</p>
              <p className="text-sm text-white/40 mt-0.5">{formatDateLong(r.registered_at.slice(0, 10))}</p>
              <p className="text-sm text-white/40">{formatTime(r.registered_at)}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-4">
                {r.jugos > 0 && (
                  <div className="flex flex-col items-center">
                    <p className="text-[18px] font-semibold text-white tabular-nums">{r.jugos}</p>
                    <p className="text-sm text-white/40">jugos</p>
                  </div>
                )}
                {r.shots > 0 && (
                  <div className="flex flex-col items-center">
                    <p className="text-[18px] font-semibold text-white tabular-nums">{r.shots}</p>
                    <p className="text-sm text-white/40">shots</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => onDelete(r)}
                className="p-1.5 rounded-md min-h-[44px] min-w-[44px] text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Eliminar"
              >
                <Trash2 size={16} className="w-5 h-5 md:w-4 md:h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Botellas tab ──────────────────────────────────────────────────────────────

function BotellasTab({
  isMobile,
  isDesktop,
  initialRetornos,
}: {
  isMobile: boolean;
  isDesktop: boolean;
  initialRetornos: BottleRecord[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [records, setRecords] = useState<BottleRecord[]>(initialRetornos);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BottleRecord | null>(null);

  useEffect(() => {
    setRecords(initialRetornos);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRetornos[0]?.id]);

  async function handleConfirmRetorno(jugos: number, shots: number) {
    setShowModal(false);
    const result = await registrarRetorno(jugos, shots);
    if ("error" in result) {
      console.error("[registrarRetorno]", result.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setRecords((prev) => prev.filter((r) => r.id !== target.id));
    setDeleteTarget(null);
    const result = await eliminarRetorno(target.id);
    if ("error" in result) {
      console.error("[eliminarRetorno]", result.error);
      startTransition(() => router.refresh());
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Historial</p>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 h-9 min-h-[44px] lg:min-h-0 pl-4 pr-4 rounded-md bg-[#F1DAE7] text-[#101010] text-sm font-medium hover:bg-[#e8c8d8] transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} />
          Registrar retorno
        </button>
      </div>

      {isDesktop ? (
        <BotellasTable records={records} onDelete={(r) => setDeleteTarget(r)} />
      ) : (
        <BotellasCards records={records} onDelete={(r) => setDeleteTarget(r)} />
      )}

      {showModal && (
        <RegistrarBotellasModal
          isMobile={isMobile}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirmRetorno}
        />
      )}

      {deleteTarget && (
        <DeleteRetornoDialog
          record={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function RegistrosPage({
  activeShift,
  initialShifts,
  initialRetornos,
  cajaBalance,
}: {
  activeShift: ActiveShift | null;
  initialShifts: Shift[];
  initialRetornos: BottleRecord[];
  cajaBalance: number;
}) {
  const [activeTab, setActiveTab] = useState<"turnos" | "retornos">("turnos");
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();

  return (
    <div>
      <h1 className="text-2xl md:text-xl font-semibold text-white">Registros</h1>
      <TabBar active={activeTab} onChange={setActiveTab} />
      <div className="mt-6">
        {activeTab === "turnos" && <TurnosTab isMobile={isMobile} isDesktop={isDesktop} initialActiveShift={activeShift} initialShifts={initialShifts} initialCajaBalance={cajaBalance} />}
        {activeTab === "retornos" && <BotellasTab isMobile={isMobile} isDesktop={isDesktop} initialRetornos={initialRetornos} />}
      </div>
    </div>
  );
}
