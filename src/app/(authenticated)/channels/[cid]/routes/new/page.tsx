import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RouteForm } from "@/components/routes/RouteForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewRoutePage({
  params,
}: {
  params: Promise<{ cid: string }>;
}) {
  const { cid } = await params;
  const supabase = await createClient();
  const [{ data: questions }, { data: routes }] = await Promise.all([
    supabase
      .from("questions")
      .select("*")
      .eq("line_channel_id", cid)
      .order("sort_order", { ascending: true }),
    supabase
      .from("routes")
      .select("*")
      .eq("channel_id", cid)
      .order("sort_order", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/channels/${cid}?tab=routes`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">新規ルート</h1>
      </div>
      <RouteForm
        channelId={cid}
        allQuestions={questions ?? []}
        allRoutes={routes ?? []}
      />
    </div>
  );
}
