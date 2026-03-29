import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormulaForm } from "@/components/formulas/FormulaForm";
import type { Question, Formula } from "@/types/database";

export default async function EditFormulaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [formulaResult, questionsResult, formulasResult, lookupResult, constantsResult, channelsResult] =
    await Promise.all([
      supabase.from("formulas").select("*").eq("id", id).single(),
      supabase.from("questions").select("*").order("sort_order", { ascending: true }),
      supabase.from("formulas").select("*").order("display_order", { ascending: true }),
      supabase.from("lookup_tables").select("table_name, description"),
      supabase.from("global_constants").select("name, description").eq("is_active", true).order("name"),
      supabase.from("line_channels").select("id, name").eq("is_active", true).order("name"),
    ]);

  if (!formulaResult.data) {
    notFound();
  }

  const formula = formulaResult.data as Formula;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">計算式を編集</h1>
      <FormulaForm
        formula={formula}
        allQuestions={(questionsResult.data as Question[]) ?? []}
        allFormulas={(formulasResult.data as Formula[]) ?? []}
        allLookupTables={lookupResult.data ?? []}
        allGlobalConstants={constantsResult.data ?? []}
        channels={channelsResult.data ?? []}
        initialChannelId={formula.line_channel_id ?? ""}
      />
    </div>
  );
}
