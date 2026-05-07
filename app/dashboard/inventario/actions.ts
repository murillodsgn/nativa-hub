"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState, MovementWithUser } from "./types";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (!user || error) return null;
  return { supabase, user };
}

function parseQty(raw: FormDataEntryValue | null): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

// ── Registrar entrada ─────────────────────────────────────────────────────────

export async function registrarEntrada(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await getAuthUser();
  if (!auth) return { error: "No autenticado." };
  const { supabase, user } = auth;

  const productId = formData.get("product_id") as string;
  const qty = parseQty(formData.get("quantity"));
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (!productId) return { error: "Selecciona un producto." };
  if (!qty) return { error: "La cantidad debe ser un número entero positivo." };

  const [{ data: product, error: fetchErr }, { data: profile }] = await Promise.all([
    supabase.from("products").select("factory_stock, store_stock").eq("id", productId).single(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);

  if (fetchErr || !product) return { error: "Producto no encontrado." };

  const role = profile?.role?.trim() ?? "";
  const isSeller = role === "seller";

  // Admin → adds to factory_stock only.
  // Seller → adds to store_stock only (entry + auto-transfer recorded in history).
  const updateData = isSeller
    ? { store_stock: product.store_stock + qty }
    : { factory_stock: product.factory_stock + qty };

  const { error: updateErr } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", productId);

  if (updateErr) return { error: "Error al actualizar el stock." };

  const movements = isSeller
    ? [
        { product_id: productId, type: "entry",    quantity: qty, origin: null,      destination: "factory", user_id: user.id, notes },
        { product_id: productId, type: "transfer", quantity: qty, origin: "factory", destination: "store",   user_id: user.id, notes: null },
      ]
    : [
        { product_id: productId, type: "entry",    quantity: qty, origin: null,      destination: "factory", user_id: user.id, notes },
      ];

  const { error: mvErr } = await supabase.from("inventory_movements").insert(movements);

  if (mvErr) {
    console.error("[registrarEntrada] movement insert failed:", mvErr.message);
    return { error: "Stock actualizado pero no se pudo guardar el historial." };
  }

  revalidatePath("/dashboard/inventario");
  return { success: "Entrada registrada correctamente." };
}

// ── Mover a tienda ────────────────────────────────────────────────────────────

export async function moverATienda(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await getAuthUser();
  if (!auth) return { error: "No autenticado." };
  const { supabase, user } = auth;

  const productId = formData.get("product_id") as string;
  const qty = parseQty(formData.get("quantity"));
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (!productId) return { error: "Selecciona un producto." };
  if (!qty) return { error: "La cantidad debe ser un número entero positivo." };

  const { data: product, error: fetchErr } = await supabase
    .from("products")
    .select("factory_stock, store_stock")
    .eq("id", productId)
    .single();

  if (fetchErr || !product) return { error: "Producto no encontrado." };

  if (product.factory_stock < qty) {
    return {
      error: `Stock insuficiente en fábrica. Disponible: ${product.factory_stock}`,
    };
  }

  const { error: updateErr } = await supabase
    .from("products")
    .update({
      factory_stock: product.factory_stock - qty,
      store_stock: product.store_stock + qty,
    })
    .eq("id", productId);

  if (updateErr) return { error: "Error al actualizar el stock." };

  const { error: mvErr } = await supabase.from("inventory_movements").insert({
    product_id: productId,
    type: "transfer",
    quantity: qty,
    origin: "factory",
    destination: "store",
    user_id: user.id,
    notes,
  });

  if (mvErr) {
    console.error("[moverATienda] movement insert failed:", mvErr.message);
    return { error: "Stock actualizado pero no se pudo guardar el historial." };
  }

  revalidatePath("/dashboard/inventario");
  return { success: "Transferencia registrada correctamente." };
}

// ── Descontar inventario ──────────────────────────────────────────────────────

export async function descontarInventario(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await getAuthUser();
  if (!auth) return { error: "No autenticado." };
  const { supabase, user } = auth;

  const productId = formData.get("product_id") as string;
  const origin = formData.get("origin") as string;
  const type = formData.get("type") as string;
  const qty = parseQty(formData.get("quantity"));
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (!productId) return { error: "Selecciona un producto." };
  if (!["factory", "store"].includes(origin)) return { error: "Selecciona el origen." };
  if (!["damage", "expiry", "gift"].includes(type)) return { error: "Selecciona el tipo de descuento." };
  if (!qty) return { error: "La cantidad debe ser un número entero positivo." };

  const { data: product, error: fetchErr } = await supabase
    .from("products")
    .select("factory_stock, store_stock")
    .eq("id", productId)
    .single();

  if (fetchErr || !product) return { error: "Producto no encontrado." };

  const available =
    origin === "factory" ? product.factory_stock : product.store_stock;
  const originLabel = origin === "factory" ? "fábrica" : "tienda";

  if (available < qty) {
    return {
      error: `Stock insuficiente en ${originLabel}. Disponible: ${available}`,
    };
  }

  const updateData =
    origin === "factory"
      ? { factory_stock: product.factory_stock - qty }
      : { store_stock: product.store_stock - qty };

  const { error: updateErr } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", productId);

  if (updateErr) return { error: "Error al actualizar el stock." };

  const { error: mvErr } = await supabase.from("inventory_movements").insert({
    product_id: productId,
    type,
    quantity: qty,
    origin,
    destination: null,
    user_id: user.id,
    notes,
  });

  if (mvErr) {
    console.error("[descontarInventario] movement insert failed:", mvErr.message);
    return { error: "Stock actualizado pero no se pudo guardar el historial." };
  }

  revalidatePath("/dashboard/inventario");
  return { success: "Descuento registrado correctamente." };
}

// ── Obtener movimientos de un producto ────────────────────────────────────────

export async function getProductMovements(
  productId: string
): Promise<{ data: MovementWithUser[] | null; error: string | null }> {
  const auth = await getAuthUser();
  if (!auth) return { data: null, error: "No autenticado." };
  const { supabase } = auth;

  const { data: movements, error } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  console.log("[getProductMovements] raw movements:", JSON.stringify(movements?.slice(0, 2)));

  if (error || !movements) {
    return { data: null, error: error?.message ?? null };
  }

  const userIds = [...new Set(movements.map((m) => m.user_id))];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", userIds);

  console.log("[getProductMovements] profiles:", JSON.stringify(profiles), "error:", profilesError?.message);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.name as string]));

  const result: MovementWithUser[] = movements.map((m) => ({
    ...m,
    profiles: profileMap.has(m.user_id) ? { name: profileMap.get(m.user_id)! } : null,
  }));

  return { data: result, error: null };
}
