import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase-config";
import AdminSidebar from "@/components/admin/admin-sidebar";
import SupabaseSetupNotice from "@/components/admin/supabase-setup-notice";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured) {
    return <SupabaseSetupNotice />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar email={user.email || ""} />
      <div className="flex-1 bg-cream-dark px-5 py-8 md:px-10">{children}</div>
    </div>
  );
}
