import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FormulaForm } from "@/components/formulas/FormulaForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Question, Formula } from "@/types/database";

export default async function EditFormulaPage({
  params,
}: {
  params: Promise<{ cid: string; fid: string }>;
}) {
  const { cid, fid } = await params;
  const supabase = await createClient();

  const [formulaResult, questionsResult, formulasResult, lookupResult, constantsResult] =
    await Promise.all([
      supabase.from("formulas").select("*").eq("id", fid).single(),
      supabase
        .from("questions")
        .select("*")
        .eq("line_channel_id", cid)
        .order("sort_order", { ascending: true }),
      supabase
        .from("formulas")
        .select("*")
        .eq("line_channel_id", cid)
        .order("display_order", { ascending: true }),
      supabase.from("lookup_tables").select("table_name, description"),
      supabase
        .from("global_constants")
        .select("name, description")
        .eq("is_active", true)
        .order("name"),
    ]);

  if (!formulaResult.data) {
    notFound();
  }

  const formula = formulaResult.data as Formula;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-4">
        <Link href={`/channels/${cid}?tab=formulas`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">計算式を編集</h1>
      </div>
      <FormulaForm
        channelId={cid}
        formula={formula}
        allQuestions={(questionsResult.data as Question[]) ?? []}
        allFormulas={(formulasResult.data as Formula[]) ?? []}
        allLookupTables={lookupResult.data ?? []}
        allGlobalConstants={constantsResult.data ?? []}
      />
    </div>
  );
}
