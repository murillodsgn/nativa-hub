import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NuevaVentaForm } from "./components/nueva-venta-form";
import type { FormProduct } from "./components/nueva-venta-form";

export default async function NuevaVentaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("products")
    .select("id, name, price, category, is_plan")
    .eq("active", true)
    .order("name");

  return <NuevaVentaForm products={(data ?? []) as FormProduct[]} />;
}
