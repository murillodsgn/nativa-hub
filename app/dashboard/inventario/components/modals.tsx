"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { registrarEntrada, moverATienda, descontarInventario, getProductMovements } from "../actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X, Warehouse, Store, AlertTriangle, Clock, Gift } from "lucide-react";
import { Stepper } from "@/components/ui/stepper";
import { ORIGIN_LABELS } from "../types";
import type { Product, ActionState, MovementWithUser } from "../types";

// ── Shared ────────────────────────────────────────────────────────────────────

function Backdrop({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full max-w-md rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl">
      <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/8">
        <div>
          <h2 className="text-base font-medium text-white">{title}</h2>
          {subtitle && (
            <p className="text-sm text-white/40 mt-0.5">{subtitle}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/8 transition-colors -mr-1 -mt-0.5"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function FormStatus({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.success)
    return (
      <div className="mb-4 px-4 py-3 rounded-lg bg-green-950/40 border border-green-900/40 text-sm text-green-400">
        {state.success}
      </div>
    );
  if (state.error)
    return (
      <div className="mb-4 px-4 py-3 rounded-lg bg-red-950/40 border border-red-900/40 text-sm text-red-400">
        {state.error}
      </div>
    );
  return null;
}

// ── AddStockModal ─────────────────────────────────────────────────────────────

export function AddStockModal({
  product,
  role,
  isMobile,
  onClose,
}: {
  product: Product;
  role: string;
  isMobile: boolean;
  onClose: () => void;
}) {
  const [state, action, isPending] = useActionState<ActionState, FormData>(
    registrarEntrada,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [qty, setQty] = useState(1);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setQty(1);
      setTimeout(onClose, 800);
    }
  }, [state, onClose]);

  useEffect(() => {
    if (!isMobile) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [isMobile]);

  const isSeller = role === "seller";
  const stock = isSeller ? product.store_stock : product.factory_stock;
  const stockLabel = isSeller ? "Stock actual en tienda" : "Stock actual en fábrica";

  const formContent = (
    <>
      <FormStatus state={state} />
      <form ref={formRef} action={action} className="space-y-4">
        <input type="hidden" name="product_id" value={product.id} />
        <input type="hidden" name="quantity" value={qty} />

        <div className="flex items-center justify-between text-sm">
          <span className="text-white/40">{stockLabel}</span>
          <span className={stock > 0 && stock < 10 ? "text-yellow-400 font-medium" : "text-white/70"}>
            {stock} {product.unit}
          </span>
        </div>

        <div className="space-y-1.5">
          <Label>Cantidad a agregar</Label>
          <Stepper value={qty} onChange={setQty} disabled={isPending} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="add-notes">
            Notas{" "}
            <span className="text-white/25 font-normal">(opcional)</span>
          </Label>
          <Textarea
            id="add-notes"
            name="notes"
            placeholder="Proveedor, lote, observaciones..."
            disabled={isPending}
          />
        </div>

        <Button type="submit" size="lg" className="w-full mt-1" disabled={isPending}>
          {isPending ? "Agregando..." : "Agregar"}
        </Button>
      </form>
    </>
  );

  if (isMobile) {
    return (
      <div className={["fixed top-0 left-0 right-0 bottom-0 z-50 bg-[#1a1a1a] flex flex-col", "transition-opacity duration-200", visible ? "opacity-100" : "opacity-0"].join(" ")}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div className="min-w-0">
            <p className="text-base font-medium text-white leading-tight">Agregar</p>
            <p className="text-sm text-white/40 truncate mt-0.5">{product.name}</p>
          </div>
          <button onClick={onClose} className="ml-3 p-2 rounded-full flex items-center justify-center min-h-[44px] min-w-[44px] bg-white/10 text-white/70 hover:text-white hover:bg-white/16 transition-colors shrink-0" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{formContent}</div>
      </div>
    );
  }

  return (
    <Backdrop onClose={onClose}>
      <ModalShell title="Agregar" subtitle={product.name} onClose={onClose}>
        {formContent}
      </ModalShell>
    </Backdrop>
  );
}

// ── DeductStockModal ──────────────────────────────────────────────────────────

const DEDUCT_TYPES = [
  { value: "damage", label: "Dañado" },
  { value: "expiry", label: "Vencido" },
  { value: "gift", label: "Regalía" },
];

export function DeductStockModal({
  product,
  role,
  isMobile,
  onClose,
}: {
  product: Product;
  role: string;
  isMobile: boolean;
  onClose: () => void;
}) {
  const isSeller = role === "seller";
  const [state, action, isPending] = useActionState<ActionState, FormData>(
    descontarInventario,
    null
  );
  const [origin, setOrigin] = useState<"factory" | "store" | "">(
    isSeller ? "store" : ""
  );
  const [deductType, setDeductType] = useState<string>("");
  const [qty, setQty] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setOrigin(isSeller ? "store" : "");
      setDeductType("");
      setQty(1);
      setTimeout(onClose, 800);
    }
  }, [state, onClose, isSeller]);

  useEffect(() => {
    if (!isMobile) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [isMobile]);

  const formContent = (
    <>
      <FormStatus state={state} />
        <form ref={formRef} action={action} className="space-y-4">
          <input type="hidden" name="product_id" value={product.id} />
          <input type="hidden" name="quantity" value={qty} />
          <input type="hidden" name="origin" value={origin} />
          <input type="hidden" name="type" value={deductType} />

          {/* Origen — admin only, radio cards */}
          {!isSeller && (
            <div className="space-y-1.5">
              <Label>Origen</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "factory", label: "Fábrica", icon: Warehouse, stock: product.factory_stock },
                  { value: "store",   label: "Tienda",  icon: Store,     stock: product.store_stock  },
                ] as const).map(({ value, label, icon: Icon, stock }) => {
                  const selected = origin === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={isPending}
                      onClick={() => setOrigin(value)}
                      className={[
                        "flex flex-col items-center gap-1 px-3 py-3 rounded-lg border transition-colors text-left w-full",
                        selected
                          ? "border-[#F1DAE7]/40 bg-[#F1DAE7]/6 text-white"
                          : "border-white/10 bg-white/4 text-white/50 hover:border-white/20 hover:text-white/70",
                      ].join(" ")}
                    >
                      <Icon size={16} strokeWidth={1.75} className={selected ? "text-[#F1DAE7]/80" : "text-white/30"} />
                      <span className="text-xs font-medium leading-none">{label}</span>
                      <span className={`text-[11px] leading-none tabular-nums ${selected ? "text-white/50" : "text-white/25"}`}>
                        {stock} {product.unit}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock info row — seller only (admin gets stock from cards above) */}
          {isSeller && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/40">Stock actual en tienda</span>
              <span className={product.store_stock > 0 && product.store_stock < 10 ? "text-yellow-400 font-medium" : "text-white/70"}>
                {product.store_stock} {product.unit}
              </span>
            </div>
          )}

          {/* Cantidad stepper */}
          <div className="space-y-1.5">
            <Label>Cantidad</Label>
            <Stepper value={qty} onChange={setQty} disabled={isPending} />
          </div>

          {/* Razón — radio cards */}
          <div className="space-y-1.5">
            <Label>Razón</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "damage", label: "Dañado",  icon: AlertTriangle },
                { value: "expiry", label: "Vencido", icon: Clock         },
                { value: "gift",   label: "Regalía", icon: Gift          },
              ] as const).map(({ value, label, icon: Icon }) => {
                const selected = deductType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={isPending}
                    onClick={() => setDeductType(value)}
                    className={[
                      "flex flex-col items-center gap-1 px-2 py-3 rounded-lg border transition-colors w-full",
                      selected
                        ? "border-[#F1DAE7]/40 bg-[#F1DAE7]/6 text-white"
                        : "border-white/10 bg-white/4 text-white/50 hover:border-white/20 hover:text-white/70",
                    ].join(" ")}
                  >
                    <Icon size={15} strokeWidth={1.75} className={selected ? "text-[#F1DAE7]/80" : "text-white/30"} />
                    <span className="text-xs font-medium leading-none">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="dc-notes">
              Notas{" "}
              <span className="text-white/25 font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="dc-notes"
              name="notes"
              placeholder="Describe la razón del descuento..."
              disabled={isPending}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full mt-1"
            disabled={isPending}
          >
            {isPending ? "Descontando..." : "Descontar"}
          </Button>
        </form>
    </>
  );

  if (isMobile) {
    return (
      <div className={["fixed top-0 left-0 right-0 bottom-0 z-50 bg-[#1a1a1a] flex flex-col", "transition-opacity duration-200", visible ? "opacity-100" : "opacity-0"].join(" ")}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div className="min-w-0">
            <p className="text-base font-medium text-white leading-tight">Descontar</p>
            <p className="text-sm text-white/40 truncate mt-0.5">{product.name}</p>
          </div>
          <button onClick={onClose} className="ml-3 p-2 rounded-full flex items-center justify-center min-h-[44px] min-w-[44px] bg-white/10 text-white/70 hover:text-white hover:bg-white/16 transition-colors shrink-0" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{formContent}</div>
      </div>
    );
  }

  return (
    <Backdrop onClose={onClose}>
      <ModalShell title="Descontar" subtitle={product.name} onClose={onClose}>
        {formContent}
      </ModalShell>
    </Backdrop>
  );
}

// ── TransferModal ─────────────────────────────────────────────────────────────

export function TransferModal({
  product,
  isMobile,
  onClose,
}: {
  product: Product;
  isMobile: boolean;
  onClose: () => void;
}) {
  const [state, action, isPending] = useActionState<ActionState, FormData>(
    moverATienda,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [qty, setQty] = useState(1);
  const [visible, setVisible] = useState(false);
  const noStock = product.factory_stock === 0;

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setQty(1);
      setTimeout(onClose, 800);
    }
  }, [state, onClose]);

  useEffect(() => {
    if (!isMobile) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [isMobile]);

  const formContent = (
    <>
      <FormStatus state={state} />
      <form ref={formRef} action={action} className="space-y-4">
        <input type="hidden" name="product_id" value={product.id} />
        <input type="hidden" name="quantity" value={qty} />

        {/* Visual transfer indicator */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-lg border border-white/10 bg-white/4">
            <Warehouse size={16} strokeWidth={1.75} className="text-white/30" />
            <span className="text-xs font-medium text-white/50 leading-none">Fábrica</span>
            <span className={`text-[11px] leading-none tabular-nums ${product.factory_stock > 0 && product.factory_stock < 10 ? "text-yellow-400" : "text-white/25"}`}>
              {product.factory_stock} {product.unit}
            </span>
          </div>
          <span className="text-white/25 text-sm shrink-0">→</span>
          <div className="flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-lg border border-white/10 bg-white/4">
            <Store size={16} strokeWidth={1.75} className="text-white/30" />
            <span className="text-xs font-medium text-white/50 leading-none">Tienda</span>
            <span className="text-[11px] leading-none tabular-nums text-white/25">
              {product.store_stock} {product.unit}
            </span>
          </div>
        </div>

        {/* Cantidad stepper */}
        <div className="space-y-1.5">
          <Label>Cantidad</Label>
          <Stepper
            value={qty}
            onChange={setQty}
            disabled={isPending || noStock}
            max={product.factory_stock}
          />
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <Label htmlFor="tr-notes">
            Notas{" "}
            <span className="text-white/25 font-normal">(opcional)</span>
          </Label>
          <Textarea
            id="tr-notes"
            name="notes"
            placeholder="Contexto del movimiento..."
            disabled={isPending || noStock}
          />
        </div>

        {noStock && (
          <p className="text-xs text-red-400">
            No hay stock disponible en fábrica para transferir.
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full mt-1"
          disabled={isPending || noStock}
        >
          {isPending ? "Transfiriendo..." : "Transferir"}
        </Button>
      </form>
    </>
  );

  if (isMobile) {
    return (
      <div className={["fixed top-0 left-0 right-0 bottom-0 z-50 bg-[#1a1a1a] flex flex-col", "transition-opacity duration-200", visible ? "opacity-100" : "opacity-0"].join(" ")}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div className="min-w-0">
            <p className="text-base font-medium text-white leading-tight">Transferir a tienda</p>
            <p className="text-sm text-white/40 truncate mt-0.5">{product.name}</p>
          </div>
          <button onClick={onClose} className="ml-3 p-2 rounded-full flex items-center justify-center min-h-[44px] min-w-[44px] bg-white/10 text-white/70 hover:text-white hover:bg-white/16 transition-colors shrink-0" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{formContent}</div>
      </div>
    );
  }

  return (
    <Backdrop onClose={onClose}>
      <ModalShell title="Transferir a tienda" subtitle={product.name} onClose={onClose}>
        {formContent}
      </ModalShell>
    </Backdrop>
  );
}

// ── MovementsModal ────────────────────────────────────────────────────────────

// Primary display label — damage/expiry/gift all surface as "Descuento"
function mvLabel(type: string): string {
  if (type === "damage" || type === "expiry" || type === "gift") return "Descuento";
  if (type === "entry") return "Entrada";
  if (type === "transfer") return "Traslado";
  if (type === "sale") return "Venta";
  return type;
}

// Secondary reason pill — only for Descuento sub-types
function mvTag(type: string): string | null {
  if (type === "damage") return "Dañado";
  if (type === "expiry") return "Vencido";
  if (type === "gift") return "Regalía";
  return null;
}

function mvPrefix(type: string): string {
  if (type === "entry") return "+";
  if (type === "transfer") return "→";
  return "−";
}

function mvQtyStyle(type: string): string {
  if (type === "entry") return "bg-emerald-500/10 text-emerald-400/90";
  if (type === "transfer") return "bg-blue-500/10 text-blue-400/90";
  return "bg-red-500/10 text-red-400/90";
}

function groupByDay(
  movements: MovementWithUser[]
): { dayKey: string; dayLabel: string; items: MovementWithUser[] }[] {
  const groups: { dayKey: string; dayLabel: string; items: MovementWithUser[] }[] = [];
  for (const m of movements) {
    const d = new Date(m.created_at);
    const tz = { timeZone: "America/Panama" } as const;
    const dayKey = d.toLocaleDateString("en-CA", tz);
    const existing = groups.find((g) => g.dayKey === dayKey);
    if (existing) {
      existing.items.push(m);
    } else {
      const [y,, dy] = dayKey.split("-").map(Number);
      const month = new Intl.DateTimeFormat("es-MX", { ...tz, month: "long" }).format(d).toUpperCase();
      const dayLabel = `${dy} ${month} ${y}`;
      groups.push({ dayKey, dayLabel, items: [m] });
    }
  }
  return groups;
}

function MovementRow({
  movement,
  isLast,
  isMobile,
}: {
  movement: MovementWithUser;
  isLast: boolean;
  isMobile?: boolean;
}) {
  const timeStr = new Date(movement.created_at).toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Panama",
  });
  const label = mvLabel(movement.type);
  const tag = mvTag(movement.type);
  const prefix = mvPrefix(movement.type);
  const qtyStyle = mvQtyStyle(movement.type);

  const originLabel = movement.origin
    ? (ORIGIN_LABELS[movement.origin] ?? movement.origin)
    : null;
  const destLabel = movement.destination
    ? (ORIGIN_LABELS[movement.destination] ?? movement.destination)
    : null;
  const location =
    originLabel && destLabel
      ? `${originLabel} → ${destLabel}`
      : destLabel ?? originLabel ?? null;

  // All three columns share a center line at y=10px from row top:
  // time:  mt-[5px] + leading-none 10px  → center at 10px
  // dot:   top-[7px] + h-1.5 6px         → center at 10px
  // label: mt-[3px] + leading-none 14px  → center at 10px
  return (
    <div className={`flex gap-2 ${isLast ? "" : "pb-5"}`}>
      {/* Time — right-aligned, center at y=10 */}
      <div className="w-11 shrink-0 text-right">
        <span className={`block leading-none text-white/30 tabular-nums mt-[5px] ${isMobile ? "text-sm" : "text-[10px]"}`}>
          {timeStr}
        </span>
      </div>

      {/* Spine — dot + line via absolute positioning (reliable across scroll containers) */}
      <div className="relative shrink-0 self-stretch" style={{ width: "6px" }}>
        {/* Dot at y=7px so center is at y=10px */}
        <div
          className="absolute w-1.5 h-1.5 rounded-full bg-white/20"
          style={{ top: "7px", left: "50%", transform: "translateX(-50%)" }}
        />
        {/* Line from below dot to bottom of this entry's space */}
        {!isLast && (
          <div
            className="absolute w-px bg-white/10"
            style={{ top: "16px", bottom: "0", left: "50%", transform: "translateX(-50%)" }}
          />
        )}
      </div>

      {/* Content — first line at mt-[3px] so label center is at y=10px */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mt-[3px]">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className={`font-semibold leading-none text-white ${isMobile ? "text-[18px]" : "text-sm"}`}>{label}</span>
            {tag && (
              <span className={`font-medium px-2.5 py-0.5 rounded bg-white/8 text-white/45 leading-none ${isMobile ? "text-sm" : "text-[10px]"}`}>
                {tag}
              </span>
            )}
          </div>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold tabular-nums shrink-0 text-[15px]"
            style={
              movement.type === "entry"
                ? { backgroundColor: "rgba(16,185,129,0.1)", color: "rgba(52,211,153,0.9)" }
                : movement.type === "transfer"
                  ? { backgroundColor: "rgba(59,130,246,0.1)", color: "rgba(96,165,250,0.9)" }
                  : { backgroundColor: "rgba(239,68,68,0.1)", color: "rgba(248,113,113,0.9)" }
            }
          >
            {prefix}{movement.quantity}
          </span>
        </div>
        {location && (
          <p className={`text-white/40 mt-1 ${isMobile ? "text-[15px]" : "text-xs"}`}>{location}</p>
        )}
        {movement.notes && (
          <p className={`text-white/30 mt-0.5 italic ${isMobile ? "text-[15px]" : "text-xs"}`}>{movement.notes}</p>
        )}
        <p className={`text-white/25 mt-1 ${isMobile ? "text-[15px]" : "text-xs"}`}>{movement.profiles?.name ?? "Usuario"}</p>
      </div>
    </div>
  );
}

function DayGroup({
  dayLabel,
  items,
  isMobile,
}: {
  dayLabel: string;
  items: MovementWithUser[];
  isMobile?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-4">
        {dayLabel}
      </p>
      {items.map((m, i) => (
        <MovementRow key={m.id} movement={m} isLast={i === items.length - 1} isMobile={isMobile} />
      ))}
    </div>
  );
}

function MovementsTimeline({ movements, isMobile }: { movements: MovementWithUser[]; isMobile?: boolean }) {
  const groups = groupByDay(movements);
  return (
    <div>
      {groups.map((g, i) => (
        <div key={g.dayKey} className={i > 0 ? "mt-5" : ""}>
          <DayGroup dayLabel={g.dayLabel} items={g.items} isMobile={isMobile} />
        </div>
      ))}
    </div>
  );
}

export function MovementsModal({
  product,
  isMobile,
  onClose,
}: {
  product: Product;
  isMobile: boolean;
  onClose: () => void;
}) {
  const [movements, setMovements] = useState<MovementWithUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    getProductMovements(product.id).then(({ data, error }) => {
      setMovements(data ?? []);
      if (error) setFetchError(error);
      setLoading(false);
    });
  }, [product.id]);

  useEffect(() => {
    if (!isMobile) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [isMobile]);

  const body = (
    <>
      {loading && (
        <p className="text-sm text-white/40 py-8 text-center">Cargando...</p>
      )}
      {fetchError && (
        <p className="text-sm text-red-400 py-8 text-center">{fetchError}</p>
      )}
      {!loading && !fetchError && (!movements || movements.length === 0) && (
        <p className="text-sm text-white/30 py-8 text-center">
          Sin movimientos registrados.
        </p>
      )}
      {!loading && !fetchError && movements && movements.length > 0 && (
        <MovementsTimeline movements={movements} isMobile={isMobile} />
      )}
    </>
  );

  if (isMobile) {
    return (
      <div
        className={[
          "fixed top-0 left-0 right-0 bottom-0 z-50 bg-[#1a1a1a] flex flex-col",
          "transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div className="min-w-0">
            <p className="text-base font-medium text-white leading-tight">Movimientos</p>
            <p className="text-sm text-white/40 truncate mt-0.5">{product.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 ml-3 rounded-full bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{body}</div>
      </div>
    );
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      {/*
        h-[85vh] gives the modal a definite height so flex-1 + min-h-0
        on the body resolves correctly in both Chrome and Safari.
        max-height alone is not a definite size for flex children.
      */}
      <div
        className="relative w-full max-w-lg h-[85vh] flex flex-col overflow-hidden rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/8 shrink-0">
          <div>
            <h2 className="text-base font-medium text-white">Movimientos</h2>
            <p className="text-sm text-white/40 mt-0.5">{product.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/8 transition-colors -mr-1 -mt-0.5"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full">
          {body}
        </div>
      </div>
    </div>
  );
}
