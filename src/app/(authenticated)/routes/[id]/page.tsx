import { createClient } from "@/lib/supabase/server";
import { RouteForm } from "@/components/routes/RouteForm";
import { notFound } from "next/navigation";

export default async function EditRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [
    { data: routeBase },
    { data: routeQuestions },
    { data: routeConnections },
    { data: questions },
    { data: routes },
  ] = await Promise.all([
    supabase.from("routes").select("*").eq("id", id).single(),
    supabase.from("route_questions").select("*").eq("route_id", id).order("sort_order", { ascending: true }),
    supabase.from("route_connections").select("*").eq("from_route_id", id).order("sort_order", { ascending: true }),
    supabase.from("questions").select("*").order("sort_order", { ascending: true }),
    supabase.from("routes").select("*").order("sort_order", { ascending: true }),
  ]);

  if (!routeBase) notFound();

  const route = {
    ...routeBase,
    route_questions: routeQuestions ?? [],
    route_connections: routeConnections ?? [],
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ルート編集: {route.name}</h1>
      <RouteForm
        route={route}
        allQuestions={questions ?? []}
        allRoutes={routes ?? []}
      />
    </div>
  );
}
