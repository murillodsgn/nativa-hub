import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardPage } from "./components/dashboard-page";

export default async function DashboardRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role?.trim() ?? "";
  if (role === "seller") redirect("/dashboard/registros");

  return <DashboardPage />;
}
