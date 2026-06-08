import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QuestionForm } from "@/components/questions/QuestionForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Question } from "@/types/database";

export default async function NewQuestionPage({
  params,
}: {
  params: Promise<{ cid: string }>;
}) {
  const { cid } = await params;
  const supabase = await createClient();
  const { data: allQuestions } = await supabase
    .from("questions")
    .select("*")
    .eq("line_channel_id", cid)
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-4">
        <Link href={`/channels/${cid}?tab=questions`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">新規質問</h1>
      </div>
      <QuestionForm
        channelId={cid}
        allQuestions={(allQuestions as Question[]) ?? []}
      />
    </div>
  );
}
