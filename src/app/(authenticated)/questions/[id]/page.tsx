import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuestionForm } from "@/components/questions/QuestionForm";
import type { Question, QuestionOption } from "@/types/database";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [questionResult, optionsResult, allQuestionsResult, channelsResult] =
    await Promise.all([
      supabase.from("questions").select("*").eq("id", id).single(),
      supabase
        .from("question_options")
        .select("*")
        .eq("question_id", id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("questions")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("line_channels")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
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
      <h1 className="text-2xl font-bold">質問を編集</h1>
      <QuestionForm
        question={question}
        allQuestions={(allQuestionsResult.data as Question[]) ?? []}
        channels={channelsResult.data ?? []}
      />
    </div>
  );
}
