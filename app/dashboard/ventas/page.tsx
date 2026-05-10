import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VentasPage } from "./components/ventas-page";
import type { Sale, Product } from "./types";

export default async function VentasRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Today's date range (UTC)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const [{ data: salesData, error: salesErr }, { data: profile }] = await Promise.all([
    supabase
      .from("sales")
      .select("id, origin, user_id, subtotal, discount, total, payment_method, reference_number, notes, receipt_number, created_at")
      .gte("created_at", todayStart)
      .lt("created_at", tomorrowStart)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);

  if (salesErr) {
    console.error("[VentasPage] sales fetch:", salesErr.message);
  }

  // Join profiles manually (same pattern as inventory)
  const userIds = [...new Set((salesData ?? []).map((s) => s.user_id))];
  const profilesMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profilesMap.set(p.id, p.name as string);
    }
  }

  const sales: Sale[] = (salesData ?? []).map((s) => ({
    ...s,
    profiles: profilesMap.has(s.user_id) ? { name: profilesMap.get(s.user_id)! } : null,
  })) as Sale[];

  const role = profile?.role?.trim() ?? "";

  return <VentasPage sales={sales} role={role} />;
}
