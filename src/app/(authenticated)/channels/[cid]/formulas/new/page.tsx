import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FormulaForm } from "@/components/formulas/FormulaForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Question, Formula } from "@/types/database";

export default async function NewFormulaPage({
  params,
}: {
  params: Promise<{ cid: string }>;
}) {
  const { cid } = await params;
  const supabase = await createClient();

  const [questionsResult, formulasResult, lookupResult, constantsResult] =
    await Promise.all([
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

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-4">
        <Link href={`/channels/${cid}?tab=formulas`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">新規計算式</h1>
      </div>
      <FormulaForm
        channelId={cid}
        allQuestions={(questionsResult.data as Question[]) ?? []}
        allFormulas={(formulasResult.data as Formula[]) ?? []}
        allLookupTables={lookupResult.data ?? []}
        allGlobalConstants={constantsResult.data ?? []}
      />
    </div>
  );
}
