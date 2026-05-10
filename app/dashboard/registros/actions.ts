"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActiveShift = {
  id: number;
  started_at: string;
  retiro_amount: number;
};

export type ActionResult = { error: string } | { success: true };

export type ShiftSalesSummary = {
  efectivo: number;
  yappy: number;
  transferencia: number;
  tarjeta: number;
  pedidos_ya: number;
};

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (!user || error) return null;
  return { supabase, user };
}

export async function iniciarTurno(): Promise<ActionResult> {
  const auth = await getUser();
  if (!auth) return { error: "No autenticado." };
  const { supabase, user } = auth;

  const { data: existing } = await supabase
    .from("turnos")
    .select("id")
    .eq("employee_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  if (existing) return { error: "Ya tienes un turno activo." };

  const { error } = await supabase
    .from("turnos")
    .insert({ employee_id: user.id, started_at: new Date().toISOString() });

  if (error) {
    console.error("[iniciarTurno]", error.message);
    return { error: "Error al iniciar el turno." };
  }

  revalidatePath("/dashboard/registros");
  return { success: true };
}

export async function registrarRetiro(amount: number): Promise<ActionResult> {
  const auth = await getUser();
  if (!auth) return { error: "No autenticado." };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("turnos")
    .update({ retiro_amount: amount })
    .eq("employee_id", user.id)
    .is("ended_at", null);

  if (error) {
    console.error("[registrarRetiro]", error.message);
    return { error: "Error al registrar el retiro." };
  }

  revalidatePath("/dashboard/registros");
  return { success: true };
}

export async function getShiftSales(): Promise<{ data: ShiftSalesSummary } | { error: string }> {
  const auth = await getUser();
  if (!auth) return { error: "No autenticado." };
  const { supabase, user } = auth;

  const { data: shift } = await supabase
    .from("turnos")
    .select("started_at")
    .eq("employee_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  if (!shift) return { error: "No hay turno activo." };

  const bufferStart = new Date(new Date(shift.started_at).getTime() - 1 * 60 * 1000).toISOString();

  const { data: salesData, error } = await supabase
    .from("sales")
    .select("payment_method, total")
    .gte("created_at", bufferStart);

  if (error) {
    console.error("[getShiftSales]", error.message);
    return { error: "Error al cargar ventas." };
  }

  const sums: ShiftSalesSummary = { efectivo: 0, yappy: 0, transferencia: 0, tarjeta: 0, pedidos_ya: 0 };
  for (const sale of salesData ?? []) {
    const m = sale.payment_method as keyof ShiftSalesSummary;
    if (m in sums) sums[m] += (sale.total as number) ?? 0;
  }

  return { data: sums };
}

export async function cerrarTurno(): Promise<ActionResult> {
  const auth = await getUser();
  if (!auth) return { error: "No autenticado." };
  const { supabase, user } = auth;

  const { data: shift } = await supabase
    .from("turnos")
    .select("id, started_at, retiro_amount")
    .eq("employee_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  if (!shift) return { error: "No hay turno activo." };

  const bufferStart = new Date(new Date(shift.started_at).getTime() - 1 * 60 * 1000).toISOString();

  const { data: salesData, error: salesError } = await supabase
    .from("sales")
    .select("payment_method, total")
    .gte("created_at", bufferStart);

  if (salesError) {
    console.error("[cerrarTurno] sales:", salesError.message);
    return { error: "Error al calcular las ventas." };
  }

  const sums: ShiftSalesSummary = { efectivo: 0, yappy: 0, transferencia: 0, tarjeta: 0, pedidos_ya: 0 };
  for (const sale of salesData ?? []) {
    const m = sale.payment_method as keyof ShiftSalesSummary;
    if (m in sums) sums[m] += (sale.total as number) ?? 0;
  }

  const retiro = (shift.retiro_amount as number) ?? 0;

  const { error: turnoError } = await supabase
    .from("turnos")
    .update({
      ended_at: new Date().toISOString(),
      sales_efectivo: sums.efectivo,
      sales_yappy: sums.yappy,
      sales_transferencia: sums.transferencia,
      sales_tarjeta: sums.tarjeta,
      sales_pedidos_ya: sums.pedidos_ya,
    })
    .eq("id", shift.id);

  if (turnoError) {
    console.error("[cerrarTurno]", turnoError.message);
    return { error: "Error al cerrar el turno." };
  }

  const { data: caja } = await supabase
    .from("caja")
    .select("id, balance")
    .maybeSingle();

  if (caja) {
    const newBalance = (caja.balance as number) + sums.efectivo - retiro;
    const { error: cajaError } = await supabase
      .from("caja")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", caja.id);
    if (cajaError) {
      console.error("[cerrarTurno] caja:", cajaError.message);
      return { error: "Error al actualizar la caja." };
    }
    await supabase
      .from("turnos")
      .update({ caja_balance_at_close: newBalance })
      .eq("id", shift.id);
  }

  revalidatePath("/dashboard/registros");
  return { success: true };
}

export async function registrarRetorno(jugos: number, shots: number): Promise<ActionResult> {
  const auth = await getUser();
  if (!auth) return { error: "No autenticado." };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("retornos")
    .insert({ registered_by: user.id, jugos, shots, registered_at: new Date().toISOString() });

  if (error) {
    console.error("[registrarRetorno]", error.message);
    return { error: "Error al registrar el retorno." };
  }

  revalidatePath("/dashboard/registros");
  return { success: true };
}

export async function eliminarRetorno(id: number): Promise<ActionResult> {
  const auth = await getUser();
  if (!auth) return { error: "No autenticado." };
  const { supabase } = auth;

  const { error } = await supabase.from("retornos").delete().eq("id", id);

  if (error) {
    console.error("[eliminarRetorno]", error.message);
    return { error: "Error al eliminar el retorno." };
  }

  revalidatePath("/dashboard/registros");
  return { success: true };
}

export async function eliminarTurno(id: number): Promise<ActionResult> {
  const auth = await getUser();
  if (!auth) return { error: "No autenticado." };
  const { supabase } = auth;

  const { data: turno, error: turnoFetchError } = await supabase
    .from("turnos")
    .select("sales_efectivo, retiro_amount")
    .eq("id", id)
    .single();

  if (turnoFetchError || !turno) {
    console.error("[eliminarTurno] fetch:", turnoFetchError?.message);
    return { error: "No se encontró el turno." };
  }

  const efectivo = (turno.sales_efectivo as number) ?? 0;
  const retiro = (turno.retiro_amount as number) ?? 0;

  const { data: caja, error: cajaFetchError } = await supabase
    .from("caja")
    .select("id, balance")
    .maybeSingle();

  if (cajaFetchError) {
    console.error("[eliminarTurno] caja fetch:", cajaFetchError.message);
    return { error: "Error al leer la caja." };
  }

  const { error: deleteError } = await supabase.from("turnos").delete().eq("id", id);

  if (deleteError) {
    console.error("[eliminarTurno]", deleteError.code, deleteError.message, deleteError.details);
    return { error: `Error al eliminar el turno. (${deleteError.code}: ${deleteError.message})` };
  }

  if (caja) {
    const newBalance = (caja.balance as number) - efectivo + retiro;
    const { error: cajaUpdateError } = await supabase
      .from("caja")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", caja.id);
    if (cajaUpdateError) {
      console.error("[eliminarTurno] caja update:", cajaUpdateError.message);
      return { error: "Turno eliminado pero error al revertir la caja." };
    }
  }

  revalidatePath("/dashboard/registros");
  return { success: true };
}

export async function cancelarRetiro(): Promise<ActionResult> {
  const auth = await getUser();
  if (!auth) return { error: "No autenticado." };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("turnos")
    .update({ retiro_amount: 0 })
    .eq("employee_id", user.id)
    .is("ended_at", null);

  if (error) {
    console.error("[cancelarRetiro]", error.message);
    return { error: "Error al cancelar el retiro." };
  }

  revalidatePath("/dashboard/registros");
  return { success: true };
}
