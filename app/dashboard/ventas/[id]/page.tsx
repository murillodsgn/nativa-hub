import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_METHOD_LABELS } from "../types";

function formatCurrency(v: number) {
  return (
    "$" +
    v.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const day = d.getDate();
  const month = MONTHS_ES[d.getMonth()];
  const year = d.getFullYear();
  const time = d.toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${day} de ${month} de ${year} · ${time}`;
}

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sale, error: saleErr } = await supabase
    .from("sales")
    .select(
      "id, receipt_number, created_at, payment_method, reference_number, subtotal, discount, total, notes, user_id"
    )
    .eq("id", id)
    .single();

  if (saleErr || !sale) notFound();

  // ── Fetch sale_items and seller profile in parallel ─────────────────────────
  const [{ data: rawItems, error: itemsErr }, { data: sellerProfile }] =
    await Promise.all([
      supabase
        .from("sale_items")
        .select("id, product_id, quantity, unit_price, discount, subtotal")
        .eq("sale_id", id)
        .order("id"),
      supabase
        .from("profiles")
        .select("name")
        .eq("id", sale.user_id)
        .maybeSingle(),
    ]);

  console.log(
    "[SaleDetail] sale_id:", id,
    "| items error:", itemsErr?.message ?? "none",
    "| items count:", rawItems?.length ?? 0,
    "| first item:", JSON.stringify(rawItems?.[0] ?? null)
  );

  const items = rawItems ?? [];

  // ── Look up product names for sale_items (no FK join — manual lookup) ───────
  const itemProductIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))];
  const { data: itemProducts } = itemProductIds.length
    ? await supabase
        .from("products")
        .select("id, name, is_plan")
        .in("id", itemProductIds)
    : { data: [] as { id: number; name: string; is_plan: boolean }[] };

  const productMap = new Map((itemProducts ?? []).map((p) => [p.id, p]));

  // ── Fetch plan sub-items ─────────────────────────────────────────────────────
  const planItemsMap = new Map<
    number,
    { product_id: number; quantity: number; name: string | null }[]
  >();

  if (items.length > 0) {
    const itemIds = items.map((i) => i.id);
    const { data: planItems } = await supabase
      .from("sale_plan_items")
      .select("sale_item_id, product_id, quantity")
      .in("sale_item_id", itemIds);

    const planProductIds = [
      ...new Set((planItems ?? []).map((pi) => pi.product_id).filter(Boolean)),
    ];
    const { data: planProducts } = planProductIds.length
      ? await supabase.from("products").select("id, name").in("id", planProductIds)
      : { data: [] as { id: number; name: string }[] };

    const planProductMap = new Map((planProducts ?? []).map((p) => [p.id, p.name]));

    for (const pi of planItems ?? []) {
      if (!planItemsMap.has(pi.sale_item_id)) planItemsMap.set(pi.sale_item_id, []);
      planItemsMap.get(pi.sale_item_id)!.push({
        product_id: pi.product_id,
        quantity: pi.quantity,
        name: planProductMap.get(pi.product_id) ?? null,
      });
    }
  }

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "0 auto",
        width: "100%",
        paddingTop: "1.5rem",
        paddingBottom: "1.5rem",
        paddingLeft: "1rem",
        paddingRight: "1rem",
      }}
    >
      <Link
        href="/dashboard/ventas"
        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Volver a ventas
      </Link>

      {/* Header */}
      <div className="rounded-xl bg-[#1a1a1a] border border-white/8 px-5 py-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xl md:text-lg font-semibold text-white">
              {sale.receipt_number ?? "--"}
            </p>
            <p className="text-base md:text-sm text-white/40 mt-0.5">
              {formatDateTime(sale.created_at)}
            </p>
            {sellerProfile?.name && (
              <p className="text-base md:text-sm text-white/40 mt-0.5">{sellerProfile.name}</p>
            )}
          </div>
          <span className="shrink-0 px-3 py-1 rounded-md bg-white/6 text-xs text-white/60 border border-white/10 whitespace-nowrap">
            {PAYMENT_METHOD_LABELS[sale.payment_method] ?? sale.payment_method}
          </span>
        </div>
        {sale.reference_number && (
          <p className="text-sm md:text-xs text-white/30 mt-2">Ref: {sale.reference_number}</p>
        )}
      </div>

      {/* Productos */}
      <div className="rounded-xl bg-[#1a1a1a] border border-white/8 overflow-hidden mb-4">
        <p className="px-5 py-3 text-sm md:text-xs font-medium text-white/40 uppercase tracking-wider border-b border-white/8">
          Productos
        </p>
        {items.length === 0 ? (
          <p className="px-5 py-4 text-sm text-white/30">No hay productos.</p>
        ) : (
          <div className="divide-y divide-white/6">
            {items.map((item) => {
              const product = productMap.get(item.product_id);
              const subItems = planItemsMap.get(item.id) ?? [];
              return (
                <div key={item.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-base md:text-sm font-medium text-white truncate">
                        {product?.name ?? `producto #${item.product_id}`}
                      </p>
                      <p className="text-sm md:text-xs text-white/40 mt-0.5">
                        {item.quantity} × {formatCurrency(item.unit_price)}
                        {item.discount ? ` · −${formatCurrency(item.discount)}` : ""}
                      </p>
                    </div>
                    <p className="text-base md:text-sm font-semibold text-white tabular-nums whitespace-nowrap">
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                  {subItems.length > 0 && (
                    <div className="mt-2 ml-3 space-y-1 border-l border-white/8 pl-3">
                      {subItems.map((pi, i) => (
                        <p key={i} className="text-xs text-white/40">
                          {pi.name ?? `#${pi.product_id}`} × {pi.quantity}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resumen */}
      <div className="rounded-xl bg-[#1a1a1a] border border-white/8 px-5 py-4 mb-4">
        <p className="text-sm md:text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
          Resumen
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-base md:text-sm">
            <span className="text-white/60">Subtotal</span>
            <span className="text-white tabular-nums">{formatCurrency(sale.subtotal)}</span>
          </div>
          {sale.discount ? (
            <div className="flex justify-between text-base md:text-sm">
              <span className="text-white/60">Descuento</span>
              <span className="text-red-400 tabular-nums">
                −{formatCurrency(sale.discount)}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between text-xl md:text-sm font-semibold border-t border-white/8 pt-2">
            <span className="text-white">Total</span>
            <span className="text-white tabular-nums">{formatCurrency(sale.total)}</span>
          </div>
        </div>
      </div>

      {/* Notas */}
      {sale.notes && (
        <div className="rounded-xl bg-[#1a1a1a] border border-white/8 px-5 py-4">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
            Notas
          </p>
          <p className="text-sm text-white/70 whitespace-pre-wrap">{sale.notes}</p>
        </div>
      )}
    </div>
  );
}
