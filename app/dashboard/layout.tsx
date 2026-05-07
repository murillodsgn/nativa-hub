import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarLayout } from "@/components/sidebar-layout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "[DashboardLayout] profiles query failed:",
      profileError.message,
      "| code:", profileError.code,
      "| user:", user.id
    );
  }

  const userName = profile?.name?.trim() || user.email || "Usuario";
  const role = profile?.role?.trim() ?? "";

  return (
    <SidebarLayout userName={userName} role={role}>
      {children}
    </SidebarLayout>
  );
}
