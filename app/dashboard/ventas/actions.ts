"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState, SalePayload } from "./types";

// ── Auth ───────────────────────────────────────────────────────────────────────

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (!user || error) return null;
  return { supabase, user };
}

// ── Receipt number ─────────────────────────────────────────────────────────────

async function nextReceiptNumber(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const { count } = await supabase
    .from("sales")
    .select("*", { count: "exact", head: true });
  return `NA-${String((count ?? 0) + 1).padStart(5, "0")}`;
}

// ── Stock helpers ──────────────────────────────────────────────────────────────

async function deductStock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  qty: number,
  userId: string,
  saleId: number
): Promise<string | null> {
  const { data: product, error } = await supabase
    .from("products")
    .select("store_stock, factory_stock")
    .eq("id", productId)
    .single();

  if (error || !product) return `Producto no encontrado (${productId}).`;

  const storeDeduct = Math.min(qty, product.store_stock);
  const factoryDeduct = qty - storeDeduct;

  if (factoryDeduct > product.factory_stock) {
    return "Stock insuficiente para uno de los productos.";
  }

  await supabase
    .from("products")
    .update({
      store_stock: product.store_stock - storeDeduct,
      factory_stock: product.factory_stock - factoryDeduct,
    })
    .eq("id", productId);

  const movements = [];
  if (storeDeduct > 0) {
    movements.push({
      product_id: productId,
      type: "sale",
      quantity: storeDeduct,
      origin: "store",
      destination: null,
      user_id: userId,
      notes: null,
      sale_id: saleId,
    });
  }
  if (factoryDeduct > 0) {
    movements.push({
      product_id: productId,
      type: "sale",
      quantity: factoryDeduct,
      origin: "factory",
      destination: null,
      user_id: userId,
      notes: null,
      sale_id: saleId,
    });
  }
  if (movements.length > 0) {
    await supabase.from("inventory_movements").insert(movements);
  }

  return null;
}

async function restoreStock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  qty: number
) {
  const { data: product } = await supabase
    .from("products")
    .select("store_stock")
    .eq("id", productId)
    .single();
  if (!product) return;
  await supabase
    .from("products")
    .update({ store_stock: product.store_stock + qty })
    .eq("id", productId);
}

// ── createVenta ────────────────────────────────────────────────────────────────

export async function createVenta(payload: SalePayload): Promise<ActionState> {
  const auth = await getUser();
  if (!auth) return { error: "No autenticado." };
  const { supabase, user } = auth;

  if (!payload.items.length) return { error: "Agrega al menos un producto." };
  if (!payload.payment_method) return { error: "Selecciona un método de pago." };
  if (
    ["tarjeta", "pedidos_ya"].includes(payload.payment_method) &&
    !payload.reference_number?.trim()
  ) {
    return { error: "Ingresa el número de referencia." };
  }

  const subtotal = payload.items.reduce((s, i) => s + i.subtotal, 0);
  const total = Math.max(0, subtotal - (payload.global_discount || 0));
  const receiptNumber = await nextReceiptNumber(supabase);

  const { data: sale, error: saleErr } = await supabase
    .from("sales")
    .insert({
      origin: "store",
      user_id: user.id,
      subtotal,
      discount: payload.global_discount || null,
      total,
      payment_method: payload.payment_method,
      reference_number: payload.reference_number?.trim() || null,
      notes: payload.notes?.trim() || null,
      receipt_number: receiptNumber,
    })
    .select("id")
    .single();

  if (saleErr || !sale) {
    console.error("[createVenta] sale insert error:", JSON.stringify(saleErr, null, 2));
    return { error: `Error al registrar la venta. (${saleErr?.code}: ${saleErr?.message})` };
  }

  const rows = payload.items.map((item) => ({
    sale_id: sale.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount: item.discount || null,
    subtotal: item.subtotal,
  }));

  const { data: insertedItems, error: itemsErr } = await supabase
    .from("sale_items")
    .insert(rows)
    .select("id");
  if (itemsErr || !insertedItems) {
    console.error("[createVenta] items insert:", itemsErr?.message);
    await supabase.from("sales").delete().eq("id", sale.id);
    return { error: "Error al guardar los productos de la venta." };
  }

  const planRows: { sale_item_id: number; product_id: number; quantity: number }[] = [];
  for (let i = 0; i < payload.items.length; i++) {
    const item = payload.items[i];
    if (item.is_plan && item.plan_products?.length) {
      for (const pp of item.plan_products) {
        if (pp.product_id) {
          planRows.push({
            sale_item_id: insertedItems[i].id as number,
            product_id: Number(pp.product_id),
            quantity: pp.quantity,
          });
        }
      }
    }
  }
  if (planRows.length > 0) {
    const { error: planErr } = await supabase.from("sale_plan_items").insert(planRows);
    if (planErr) {
      console.error("[createVenta] plan items insert:", planErr.message);
    }
  }

  for (const item of payload.items) {
    if (!item.is_plan && item.product_id) {
      await deductStock(supabase, item.product_id, item.quantity, user.id, sale.id);
    } else if (item.is_plan && item.plan_products?.length) {
      for (const pp of item.plan_products) {
        if (pp.product_id && pp.quantity > 0) {
          await deductStock(supabase, pp.product_id, pp.quantity, user.id, sale.id);
        }
      }
    }
  }

  revalidatePath("/dashboard/ventas");
  revalidatePath("/dashboard/inventario");
  return { success: "Venta registrada.", sale_id: sale.id };
}

// ── eliminarVenta ──────────────────────────────────────────────────────────────

export async function eliminarVenta(saleId: string): Promise<ActionState> {
  const auth = await getUser();
  if (!auth) return { error: "No autenticado." };
  const { supabase } = auth;

  const { data: saleItems } = await supabase
    .from("sale_items")
    .select("product_id, quantity")
    .eq("sale_id", saleId);

  if (saleItems?.length) {
    const productIds = saleItems
      .map((i) => i.product_id)
      .filter(Boolean) as string[];

    const { data: planProducts } = await supabase
      .from("products")
      .select("id")
      .in("id", productIds)
      .eq("is_plan", true);

    const planIds = new Set((planProducts ?? []).map((p) => p.id));

    for (const item of saleItems) {
      if (item.product_id && !planIds.has(item.product_id)) {
        await restoreStock(supabase, item.product_id, item.quantity);
      }
    }
  }

  await supabase.from("sale_items").delete().eq("sale_id", saleId);

  const { error } = await supabase.from("sales").delete().eq("id", saleId);
  if (error) return { error: "Error al eliminar la venta." };

  revalidatePath("/dashboard/ventas");
  revalidatePath("/dashboard/inventario");
  return { success: "Venta eliminada." };
}
