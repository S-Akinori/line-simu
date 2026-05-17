import { createClient } from "@/lib/supabase/server";
import { QuestionForm } from "@/components/questions/QuestionForm";
import type { Question } from "@/types/database";

export default async function NewQuestionPage() {
  const supabase = await createClient();
  const { data: allQuestions } = await supabase
    .from("questions")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">新規質問</h1>
      <QuestionForm
        allQuestions={(allQuestions as Question[]) ?? []}
      />
    </div>
  );
}
