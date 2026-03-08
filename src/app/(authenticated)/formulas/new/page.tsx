import { createClient } from "@/lib/supabase/server";
import { FormulaForm } from "@/components/formulas/FormulaForm";
import type { Question, Formula } from "@/types/database";

export default async function NewFormulaPage() {
  const supabase = await createClient();

  const [questionsResult, formulasResult, lookupResult, constantsResult] = await Promise.all([
    supabase
      .from("questions")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("formulas")
      .select("*")
      .order("display_order", { ascending: true }),
    supabase.from("lookup_tables").select("table_name"),
    supabase.from("global_constants").select("name, description").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">新規計算式</h1>
      <FormulaForm
        allQuestions={(questionsResult.data as Question[]) ?? []}
        allFormulas={(formulasResult.data as Formula[]) ?? []}
        allLookupTables={lookupResult.data ?? []}
        allGlobalConstants={constantsResult.data ?? []}
      />
    </div>
  );
}
