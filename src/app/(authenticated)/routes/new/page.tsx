import { createClient } from "@/lib/supabase/server";
import { RouteForm } from "@/components/routes/RouteForm";

export default async function NewRoutePage() {
  const supabase = await createClient();
  const [{ data: questions }, { data: routes }, { data: channels }] = await Promise.all([
    supabase.from("questions").select("*").order("sort_order", { ascending: true }),
    supabase.from("routes").select("*").order("sort_order", { ascending: true }),
    supabase.from("line_channels").select("id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">新規ルート</h1>
      <RouteForm
        allQuestions={questions ?? []}
        allRoutes={routes ?? []}
        allChannels={channels ?? []}
      />
    </div>
  );
}
