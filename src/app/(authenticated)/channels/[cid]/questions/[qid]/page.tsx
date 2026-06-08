import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QuestionForm } from "@/components/questions/QuestionForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Question, QuestionOption } from "@/types/database";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ cid: string; qid: string }>;
}) {
  const { cid, qid } = await params;
  const supabase = await createClient();

  const [questionResult, optionsResult, allQuestionsResult] =
    await Promise.all([
      supabase.from("questions").select("*").eq("id", qid).single(),
      supabase
        .from("question_options")
        .select("*")
        .eq("question_id", qid)
        .order("sort_order", { ascending: true }),
      supabase
        .from("questions")
        .select("*")
        .eq("line_channel_id", cid)
        .order("sort_order", { ascending: true }),
    ]);

  if (!questionResult.data) {
    notFound();
  }

  const question = {
    ...(questionResult.data as Question),
    question_options: (optionsResult.data as QuestionOption[]) ?? [],
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-4">
        <Link href={`/channels/${cid}?tab=questions`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">質問を編集</h1>
      </div>
      <QuestionForm
        channelId={cid}
        question={question}
        allQuestions={(allQuestionsResult.data as Question[]) ?? []}
      />
    </div>
  );
}
