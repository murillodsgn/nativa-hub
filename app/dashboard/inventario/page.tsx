import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InventarioPage } from "./components/inventory-page";
import type { Product } from "./types";

export default async function InventarioRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data, error }, { data: profile }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, unit, price, factory_stock, store_stock, active")
      .eq("is_plan", false)
      .neq("category", "Servicios")
      .order("name"),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);

  if (error) {
    console.error("[InventarioPage] products fetch:", error.message);
  }

  const products: Product[] = (data ?? []) as Product[];
  const role = profile?.role?.trim() ?? "";

  return <InventarioPage products={products} role={role} />;
}
