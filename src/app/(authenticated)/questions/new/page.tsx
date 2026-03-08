import { createClient } from "@/lib/supabase/server";
import { QuestionForm } from "@/components/questions/QuestionForm";
import type { Question } from "@/types/database";

export default async function NewQuestionPage() {
  const supabase = await createClient();
  const [{ data: allQuestions }, { data: channels }] = await Promise.all([
    supabase.from("questions").select("*").order("sort_order", { ascending: true }),
    supabase.from("line_channels").select("id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">新規質問</h1>
      <QuestionForm
        allQuestions={(allQuestions as Question[]) ?? []}
        channels={channels ?? []}
      />
    </div>
  );
}
