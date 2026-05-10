export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RegistrosPage } from "./components/registros-page";
import type { Shift, BottleRecord } from "./components/registros-page";
import type { ActiveShift } from "./actions";

export default async function RegistrosRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: shiftData }, { data: shiftsData }, { data: retornosData }, { data: cajaData }] = await Promise.all([
    supabase
      .from("turnos")
      .select("id, started_at, retiro_amount")
      .eq("employee_id", user.id)
      .is("ended_at", null)
      .maybeSingle(),
    supabase
      .from("turnos")
      .select("id, employee_id, started_at, ended_at, retiro_amount, sales_efectivo, sales_yappy, sales_transferencia, sales_tarjeta, sales_pedidos_ya, caja_balance_at_close")
      .not("ended_at", "is", null)
      .order("ended_at", { ascending: false })
      .limit(100),
    supabase
      .from("retornos")
      .select("id, registered_by, jugos, shots, registered_at")
      .order("registered_at", { ascending: false })
      .limit(200),
    supabase.from("caja").select("balance").maybeSingle(),
  ]);

  const activeShift: ActiveShift | null = shiftData
    ? { id: shiftData.id, started_at: shiftData.started_at, retiro_amount: shiftData.retiro_amount ?? 0 }
    : null;

  // Join profiles for all user IDs referenced by shifts and retornos
  const allUserIds = [
    ...new Set([
      ...(shiftsData ?? []).map((s) => s.employee_id),
      ...(retornosData ?? []).map((r) => r.registered_by),
    ]),
  ];
  const namesMap = new Map<string, string>();
  if (allUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", allUserIds);
    for (const p of profiles ?? []) namesMap.set(p.id, p.name as string);
  }

  const initialShifts: Shift[] = (shiftsData ?? []).map((row) => {
    const diffMs = new Date(row.ended_at).getTime() - new Date(row.started_at).getTime();
    const totalMin = Math.floor(diffMs / 60000);
    const ef = row.sales_efectivo ?? 0;
    const ya = row.sales_yappy ?? 0;
    const tr = row.sales_transferencia ?? 0;
    const ta = row.sales_tarjeta ?? 0;
    const py = row.sales_pedidos_ya ?? 0;
    const totalSales = ef + ya + tr + ta + py;
    const retiro = row.retiro_amount ?? 0;
    return {
      id: String(row.id),
      employee: namesMap.get(row.employee_id) ?? "—",
      date: (row.started_at as string).slice(0, 10),
      started_at: row.started_at as string,
      ended_at: row.ended_at as string,
      durationHours: Math.floor(totalMin / 60),
      durationMinutes: totalMin % 60,
      sales: { efectivo: ef, yappy: ya, transferencia: tr, tarjeta: ta, pedidos_ya: py },
      totalSales,
      retiros: retiro,
      cajaBalance: (row.caja_balance_at_close as number) ?? null,
    };
  });

  const initialRetornos: BottleRecord[] = (retornosData ?? []).map((row) => ({
    id: row.id as number,
    registered_at: row.registered_at as string,
    jugos: row.jugos as number,
    shots: row.shots as number,
    registeredBy: namesMap.get(row.registered_by) ?? "—",
  }));

  const cajaBalance = (cajaData?.balance as number) ?? 0;

  return <RegistrosPage activeShift={activeShift} initialShifts={initialShifts} initialRetornos={initialRetornos} cajaBalance={cajaBalance} />;
}
