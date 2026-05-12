"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  ChevronLeft,
  Banknote,
  Smartphone,
  ArrowLeftRight,
  CreditCard,
  Bike,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { createVenta } from "../../actions";
import styles from "./nueva-venta-form.module.css";

const CATEGORIES = ["Jugos", "Shots", "Bites", "Planes", "Servicios"];
const NEEDS_REFERENCE = new Set(["tarjeta", "pedidos_ya"]);

const PAYMENT_OPTIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "efectivo", label: "Efectivo", icon: Banknote },
  { value: "yappy", label: "Yappy", icon: Smartphone },
  { value: "transferencia", label: "Transferencia", icon: ArrowLeftRight },
  { value: "tarjeta", label: "Tarjeta de crédito", icon: CreditCard },
  { value: "pedidos_ya", label: "PedidosYa", icon: Bike },
];

// ── Types ──────────────────────────────────────────────────────────────────────

export type FormProduct = {
  id: string | number;
  name: string;
  price: number | string | null;
  category: string;
  is_plan: boolean;
};

type PlanItem = { id: string; product_id: string; quantity: number };

type FormItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  discount: string;
  plan_products: PlanItem[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeItem(): FormItem {
  return {
    id: crypto.randomUUID(),
    product_id: "",
    quantity: 1,
    unit_price: "",
    discount: "",
    plan_products: [],
  };
}

function makePlanItem(): PlanItem {
  return { id: crypto.randomUUID(), product_id: "", quantity: 1 };
}

function rowSubtotal(item: FormItem): number {
  const price = parseFloat(item.unit_price) || 0;
  const disc = parseFloat(item.discount) || 0;
  return Math.max(0, price * item.quantity - disc);
}

function fmt(v: number) {
  return (
    "$" +
    v.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function NuevaVentaForm({ products }: { products: FormProduct[] }) {
  const router = useRouter();
  const regularProducts = products.filter((p) => !p.is_plan);

  const [items, setItems] = useState<FormItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [globalDiscount, setGlobalDiscount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Item helpers ─────────────────────────────────────────────────────────────

  function updateItem(id: string, patch: Partial<FormItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function handleProductChange(itemId: string, productId: string) {
    const product = products.find((p) => String(p.id) === productId);
    const price = product?.price != null ? Number(product.price) : null;
    updateItem(itemId, {
      product_id: productId,
      unit_price: price != null && !isNaN(price) ? String(price) : "",
      plan_products: [],
    });
  }

  function updatePlanItem(
    itemId: string,
    planId: string,
    patch: Partial<PlanItem>
  ) {
    setItems((prev) =>
      prev.map((i) =>
        i.id !== itemId
          ? i
          : {
              ...i,
              plan_products: i.plan_products.map((pp) =>
                pp.id === planId ? { ...pp, ...patch } : pp
              ),
            }
      )
    );
  }

  function removePlanItem(itemId: string, planId: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.id !== itemId
          ? i
          : { ...i, plan_products: i.plan_products.filter((pp) => pp.id !== planId) }
      )
    );
  }

  function addPlanItem(itemId: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.id !== itemId
          ? i
          : { ...i, plan_products: [...i.plan_products, makePlanItem()] }
      )
    );
  }

  // ── Totals ───────────────────────────────────────────────────────────────────

  const subtotal = items.reduce((s, i) => s + rowSubtotal(i), 0);
  const globalDiscNum = parseFloat(globalDiscount) || 0;
  const total = Math.max(0, subtotal - globalDiscNum);

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setFormError(null);
    setIsSubmitting(true);
    try {
      const result = await createVenta({
        items: items.map((i) => {
          const product = products.find((p) => String(p.id) === i.product_id);
          return {
            product_id: i.product_id || null,
            quantity: i.quantity,
            unit_price: parseFloat(i.unit_price) || 0,
            discount: parseFloat(i.discount) || 0,
            subtotal: rowSubtotal(i),
            is_plan: product?.is_plan ?? false,
            plan_products: i.plan_products.map((pp) => ({
              product_id: pp.product_id,
              quantity: pp.quantity,
            })),
          };
        }),
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || null,
        notes: notes.trim() || null,
        global_discount: globalDiscNum,
      });
      if (result?.error) {
        setFormError(result.error);
      } else {
        router.push("/dashboard/ventas");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[100] bg-[#101010] overflow-y-auto">
      <div className={styles.inner}>
        {/* Header */}
        <div className={cn("flex items-center gap-2", styles.header)}>
          <button
            type="button"
            onClick={() => router.push("/dashboard/ventas")}
            className="flex items-center gap-1.5 min-h-[44px] lg:min-h-0 text-sm text-white/50 hover:text-white transition-colors"
          >
            <ChevronLeft size={16} />
            Regresar
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {/* ── PRODUCTOS ────────────────────────────────────────────────────── */}
          <section>
            <p
              className={cn(
                "text-xs font-medium text-white/40 uppercase tracking-wider",
                styles.sectionLabel
              )}
            >
              Productos
            </p>

            <div className="flex flex-col gap-2">
              {items.map((item) => {
                const selectedProduct = products.find(
                  (p) => String(p.id) === item.product_id
                );
                const isPlan = selectedProduct?.is_plan ?? false;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-xl bg-[#1a1a1a] border border-white/8",
                      styles.itemCard
                    )}
                  >
                    {/* Product select row */}
                    <div className="flex gap-2">
                      <Select
                        className="flex-1"
                        value={item.product_id}
                        onChange={(e) =>
                          handleProductChange(item.id, e.target.value)
                        }
                      >
                        <option value="">Seleccionar producto…</option>
                        {CATEGORIES.map((cat) => {
                          const prods = products.filter(
                            (p) => p.category === cat
                          );
                          if (!prods.length) return null;
                          return (
                            <optgroup key={cat} label={cat}>
                              {prods.map((p) => (
                                <option key={String(p.id)} value={String(p.id)}>
                                  {p.name}
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </Select>
                      <button
                        type="button"
                        onClick={() =>
                          setItems((prev) =>
                            prev.filter((i) => i.id !== item.id)
                          )
                        }
                        className={cn(
                          "rounded-md min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0",
                          styles.deleteBtn
                        )}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Qty / price / discount / subtotal */}
                    <div
                      className={cn(
                        "flex flex-wrap gap-x-4 gap-y-2 items-center",
                        styles.itemControls
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40">Cant.</span>
                        <Stepper
                          value={item.quantity}
                          onChange={(v) => updateItem(item.id, { quantity: v })}
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-white/40">$</span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="0.00"
                          className="w-20 h-8 text-sm"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateItem(item.id, { unit_price: e.target.value })
                          }
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-white/40">-$</span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="0.00"
                          className="w-20 h-8 text-sm"
                          value={item.discount}
                          onChange={(e) =>
                            updateItem(item.id, { discount: e.target.value })
                          }
                        />
                      </div>

                      <div className={styles.subtotalPush}>
                        <span className="text-sm font-semibold text-white tabular-nums">
                          {fmt(rowSubtotal(item))}
                        </span>
                      </div>
                    </div>

                    {/* Plan sub-products */}
                    {isPlan && (
                      <div
                        className={cn(
                          "border-t border-white/8",
                          styles.planSection
                        )}
                      >
                        <p
                          className={cn(
                            "text-xs text-white/40",
                            styles.planLabel
                          )}
                        >
                          Productos del plan
                        </p>
                        <div className="flex flex-col gap-2">
                          {item.plan_products.map((pp) => (
                            <div
                              key={pp.id}
                              className="flex items-center gap-2"
                            >
                              <Select
                                className="flex-1"
                                value={pp.product_id}
                                onChange={(e) =>
                                  updatePlanItem(item.id, pp.id, {
                                    product_id: e.target.value,
                                  })
                                }
                              >
                                <option value="">Seleccionar…</option>
                                {CATEGORIES.filter((c) => c !== "Planes").map(
                                  (cat) => {
                                    const prods = regularProducts.filter(
                                      (p) => p.category === cat
                                    );
                                    if (!prods.length) return null;
                                    return (
                                      <optgroup key={cat} label={cat}>
                                        {prods.map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.name}
                                          </option>
                                        ))}
                                      </optgroup>
                                    );
                                  }
                                )}
                              </Select>
                              <Stepper
                                value={pp.quantity}
                                onChange={(v) =>
                                  updatePlanItem(item.id, pp.id, { quantity: v })
                                }
                              />
                              <button
                                type="button"
                                onClick={() => removePlanItem(item.id, pp.id)}
                                className={cn(
                                  "rounded-md min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors",
                                  styles.planDeleteBtn
                                )}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => addPlanItem(item.id)}
                          className={cn(
                            "flex items-center gap-1.5 min-h-[44px] lg:min-h-0 text-xs text-white/40 hover:text-white/70 transition-colors",
                            styles.planAddBtn
                          )}
                        >
                          <Plus size={11} />
                          Agregar producto al plan
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, makeItem()])}
              className={cn(
                "flex items-center gap-2 h-9 min-h-[44px] lg:min-h-0 rounded-md border border-white/15 text-sm text-white/60 hover:text-white hover:border-white/25 transition-colors w-full justify-center",
                styles.addProductBtn
              )}
            >
              <Plus size={14} />
              Agregar producto
            </button>
          </section>

          {/* ── MÉTODO DE PAGO ───────────────────────────────────────────────── */}
          <section>
            <p
              className={cn(
                "text-xs font-medium text-white/40 uppercase tracking-wider",
                styles.sectionLabel
              )}
            >
              Método de pago
            </p>
            <div className="flex gap-2">
              {PAYMENT_OPTIONS.map((pm) => {
                const selected = paymentMethod === pm.value;
                return (
                  <button
                    key={pm.value}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(pm.value);
                      if (!NEEDS_REFERENCE.has(pm.value)) setReferenceNumber("");
                    }}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-2 rounded-xl border transition-colors",
                      selected
                        ? "bg-[#F1DAE7]/10 border-[#F1DAE7]/40 text-[#F1DAE7]"
                        : "border-white/10 text-white/40 hover:text-white/70 hover:border-white/20",
                      styles.paymentCard
                    )}
                  >
                    <pm.icon size={20} strokeWidth={1.75} />
                    <span className="text-[10px] font-medium leading-tight text-center">
                      {pm.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {NEEDS_REFERENCE.has(paymentMethod) && (
              <div className={styles.referenceInput}>
                <Input
                  placeholder="Número de referencia"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </div>
            )}
          </section>

          {/* ── NOTAS ────────────────────────────────────────────────────────── */}
          <section>
            <p
              className={cn(
                "text-xs font-medium text-white/40 uppercase tracking-wider",
                styles.sectionLabel
              )}
            >
              Notas
            </p>
            <Textarea
              placeholder="Notas adicionales (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </section>

          {/* ── RESUMEN ──────────────────────────────────────────────────────── */}
          <section
            className={cn(
              "rounded-xl bg-[#1a1a1a] border border-white/8",
              styles.summaryCard
            )}
          >
            <p
              className={cn(
                "text-xs font-medium text-white/40 uppercase tracking-wider",
                styles.summaryLabel
              )}
            >
              Resumen
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/60">Subtotal</span>
                <span className="text-sm text-white tabular-nums">
                  {fmt(subtotal)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/60">Descuento</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-white/40">-$</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-24 h-8 text-sm text-right"
                    value={globalDiscount}
                    onChange={(e) => setGlobalDiscount(e.target.value)}
                  />
                </div>
              </div>
              <div
                className={cn(
                  "flex justify-between items-center border-t border-white/8",
                  styles.totalRow
                )}
              >
                <span className="text-base font-semibold text-white">Total</span>
                <span className="text-base font-semibold text-white tabular-nums">
                  {fmt(total)}
                </span>
              </div>
            </div>
          </section>

          {/* ── SUBMIT ───────────────────────────────────────────────────────── */}
          {formError && (
            <p className="text-sm text-red-400">{formError}</p>
          )}
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Registrando…" : "Registrar venta"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/dashboard/ventas")}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
