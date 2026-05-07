import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
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

  return (
    <div>
      <h1 className="text-2xl md:text-xl font-semibold text-white">Dashboard</h1>
      <div className="mt-6 rounded-xl border border-white/8 bg-[#1a1a1a] px-6 py-12 text-center">
        <p className="text-sm text-white/30">Módulo en desarrollo.</p>
      </div>
    </div>
  );
}
