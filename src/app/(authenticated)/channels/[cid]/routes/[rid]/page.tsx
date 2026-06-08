import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RouteForm } from "@/components/routes/RouteForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function EditRoutePage({
  params,
}: {
  params: Promise<{ cid: string; rid: string }>;
}) {
  const { cid, rid } = await params;
  const supabase = await createClient();
  const [
    { data: routeBase },
    { data: routeQuestions },
    { data: routeConnections },
    { data: questions },
    { data: routes },
  ] = await Promise.all([
    supabase.from("routes").select("*").eq("id", rid).single(),
    supabase
      .from("route_questions")
      .select("*")
      .eq("route_id", rid)
      .order("sort_order", { ascending: true }),
    supabase
      .from("route_connections")
      .select("*")
      .eq("from_route_id", rid)
      .order("sort_order", { ascending: true }),
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

  if (!routeBase) notFound();

  const route = {
    ...routeBase,
    route_questions: routeQuestions ?? [],
    route_connections: routeConnections ?? [],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/channels/${cid}?tab=routes`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">ルート編集: {route.name}</h1>
      </div>
      <RouteForm
        channelId={cid}
        route={route}
        allQuestions={questions ?? []}
        allRoutes={routes ?? []}
      />
    </div>
  );
}
