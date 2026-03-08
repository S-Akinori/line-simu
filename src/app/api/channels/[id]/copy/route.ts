import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/channels/[id]/copy — Copy all data from source channel to target channel
// body: { target_channel_id: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require super_admin role
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: sourceChannelId } = await params;
  const { target_channel_id } = await request.json();
  if (!target_channel_id)
    return NextResponse.json(
      { error: "target_channel_id is required" },
      { status: 400 }
    );

  const adminClient = createAdminClient();

  try {
    // 1. Copy questions (build UUID mapping)
    const { data: questions } = await adminClient
      .from("questions")
      .select("*")
      .eq("line_channel_id", sourceChannelId);

    const questionIdMap: Record<string, string> = {};
    if (questions && questions.length > 0) {
      const newQuestions = questions.map((q) => {
        const newId = crypto.randomUUID();
        questionIdMap[q.id] = newId;
        return {
          ...q,
          id: newId,
          line_channel_id: target_channel_id,
          parent_question_id: null, // Remap later
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });
      await adminClient.from("questions").insert(newQuestions);

      // Remap parent_question_id self-references
      for (const q of questions) {
        if (q.parent_question_id && questionIdMap[q.parent_question_id]) {
          await adminClient
            .from("questions")
            .update({
              parent_question_id: questionIdMap[q.parent_question_id],
            })
            .eq("id", questionIdMap[q.id]);
        }
      }

      // 2. Copy question_options
      const { data: options } = await adminClient
        .from("question_options")
        .select("*")
        .in("question_id", Object.keys(questionIdMap));
      if (options && options.length > 0) {
        const newOptions = options.map((opt) => ({
          ...opt,
          id: crypto.randomUUID(),
          question_id: questionIdMap[opt.question_id],
          created_at: new Date().toISOString(),
        }));
        await adminClient.from("question_options").insert(newOptions);
      }
    }

    // 3. Copy routes (build UUID mapping)
    const { data: routes } = await adminClient
      .from("routes")
      .select("*")
      .eq("channel_id", sourceChannelId);

    const routeIdMap: Record<string, string> = {};
    if (routes && routes.length > 0) {
      const newRoutes = routes.map((r) => {
        const newId = crypto.randomUUID();
        routeIdMap[r.id] = newId;
        return {
          ...r,
          id: newId,
          channel_id: target_channel_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });
      await adminClient.from("routes").insert(newRoutes);

      // 4. Copy route_questions
      const { data: rqs } = await adminClient
        .from("route_questions")
        .select("*")
        .in("route_id", Object.keys(routeIdMap));
      if (rqs && rqs.length > 0) {
        const newRqs = rqs
          .filter((rq) => questionIdMap[rq.question_id])
          .map((rq) => ({
            id: crypto.randomUUID(),
            route_id: routeIdMap[rq.route_id],
            question_id: questionIdMap[rq.question_id],
            sort_order: rq.sort_order,
          }));
        if (newRqs.length > 0)
          await adminClient.from("route_questions").insert(newRqs);
      }

      // 5. Copy route_connections
      const { data: rcs } = await adminClient
        .from("route_connections")
        .select("*")
        .in("from_route_id", Object.keys(routeIdMap));
      if (rcs && rcs.length > 0) {
        const newRcs = rcs
          .filter((rc) => routeIdMap[rc.to_route_id])
          .map((rc) => ({
            id: crypto.randomUUID(),
            from_route_id: routeIdMap[rc.from_route_id],
            to_route_id: routeIdMap[rc.to_route_id],
            conditions: rc.conditions,
            sort_order: rc.sort_order,
          }));
        if (newRcs.length > 0)
          await adminClient.from("route_connections").insert(newRcs);
      }
    }

    // 6. Copy formulas
    const { data: formulas } = await adminClient
      .from("formulas")
      .select("*")
      .eq("line_channel_id", sourceChannelId);
    if (formulas && formulas.length > 0) {
      const newFormulas = formulas.map((f) => ({
        ...f,
        id: crypto.randomUUID(),
        line_channel_id: target_channel_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      await adminClient.from("formulas").insert(newFormulas);
    }

    // 7. Copy result_display_configs (remap trigger_route_id)
    const { data: configs } = await adminClient
      .from("result_display_configs")
      .select("*")
      .eq("line_channel_id", sourceChannelId);
    if (configs && configs.length > 0) {
      const newConfigs = configs.map((c) => ({
        ...c,
        id: crypto.randomUUID(),
        line_channel_id: target_channel_id,
        trigger_route_id: c.trigger_route_id
          ? (routeIdMap[c.trigger_route_id] ?? null)
          : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      await adminClient.from("result_display_configs").insert(newConfigs);
    }

    // 8. Copy step_delivery_configs
    const { data: deliveries } = await adminClient
      .from("step_delivery_configs")
      .select("*")
      .eq("line_channel_id", sourceChannelId);
    if (deliveries && deliveries.length > 0) {
      const newDeliveries = deliveries.map((d) => ({
        ...d,
        id: crypto.randomUUID(),
        line_channel_id: target_channel_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      await adminClient.from("step_delivery_configs").insert(newDeliveries);
    }

    // 9. Copy start_keyword_routes (remap route_id)
    const { data: keywordRoutes } = await adminClient
      .from("start_keyword_routes")
      .select("*")
      .eq("line_channel_id", sourceChannelId);
    if (keywordRoutes && keywordRoutes.length > 0) {
      const newKeywordRoutes = keywordRoutes.map((kr) => ({
        ...kr,
        id: crypto.randomUUID(),
        line_channel_id: target_channel_id,
        route_id: kr.route_id ? (routeIdMap[kr.route_id] ?? null) : null,
      }));
      await adminClient.from("start_keyword_routes").insert(newKeywordRoutes);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
