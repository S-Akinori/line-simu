"use client";

import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import type { Question, QuestionOption } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { Plus, Trash2 } from "lucide-react";
import { ConditionEditor, DisplayConditionEditor } from "./ConditionEditor";

const optionSchema = z.object({
  label: z.string().min(1, "ラベルは必須です"),
  value: z.string().min(1, "値は必須です"),
  image_url: z.string().optional(),
  error_message: z.string().optional(),
});

const conditionRuleSchema = z.object({
  question_key: z.string().min(1, "質問キーは必須です"),
  operator: z.string().min(1, "演算子は必須です"),
  value: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
});

const conditionSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  rules: z.array(conditionRuleSchema).min(1),
  logic: z.enum(["and", "or"]),
  next_question_key: z.string().min(1, "遷移先キーは必須です"),
});

const displayConditionSchema = z.object({
  rules: z.array(conditionRuleSchema).min(1),
  logic: z.enum(["and", "or"]),
});

const questionFormSchema = z.object({
  line_channel_id: z.string().min(1, "チャンネルは必須です"),
  image_url: z.string().optional(),
  question_key: z
    .string()
    .min(1, "質問キーは必須です")
    .regex(/^[a-z][a-z0-9_]*$/, "小文字英数字とアンダースコアのみ"),
  question_type: z.enum(["image_carousel", "button", "free_text"]),
  content: z.string().min(1, "質問文は必須です"),
  description: z.string().optional(),
  group_name: z.string().optional(),
  is_active: z.boolean(),
  options: z.array(optionSchema),
  conditions: z.array(conditionSchema),
  display_conditions: z.array(displayConditionSchema),
  validation_type: z.enum(["none", "numeric"]).default("none"),
  validation_min: z.string().optional(),
  validation_max: z.string().optional(),
});

type QuestionFormValues = z.infer<typeof questionFormSchema>;

interface Channel {
  id: string;
  name: string;
}

interface QuestionFormProps {
  question?: Question & { question_options?: QuestionOption[] };
  allQuestions?: Question[];
  channels?: Channel[];
}

export function QuestionForm({ question, allQuestions = [], channels = [] }: QuestionFormProps) {
  const router = useRouter();
  const isEdit = !!question;

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      line_channel_id: question?.line_channel_id ?? "",
      image_url: question?.image_url ?? "",
      question_key: question?.question_key ?? "",
      question_type: question?.question_type ?? "button",
      content: question?.content ?? "",
      description: question?.description ?? "",
      group_name: question?.group_name ?? "",
      is_active: question?.is_active ?? true,
      options:
        question?.question_options?.map((o) => ({
          label: o.label,
          value: o.value,
          image_url: o.image_url ?? "",
          error_message: o.error_message ?? "",
        })) ?? [],
      conditions:
        question?.conditions?.map((c) => ({
          id: c.id,
          description: c.description ?? "",
          rules: c.rules,
          logic: c.logic,
          next_question_key: c.next_question_key,
        })) ?? [],
      display_conditions:
        question?.display_conditions?.map((g) => ({
          rules: g.rules,
          logic: g.logic,
        })) ?? [],
      validation_type:
        (question?.validation?.type as "numeric" | undefined) === "numeric"
          ? "numeric"
          : "none",
      validation_min:
        question?.validation?.min != null
          ? String(question.validation.min)
          : "",
      validation_max:
        question?.validation?.max != null
          ? String(question.validation.max)
          : "",
    },
  });

  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({ control: form.control, name: "options" });

  const watchType = form.watch("question_type");
  const showOptions = watchType === "image_carousel" || watchType === "button";
  const maxOptions = watchType === "button" ? 4 : 10;

  async function onSubmit(values: QuestionFormValues) {
    const supabase = createClient();

    const validation: Record<string, unknown> = {};
    if (values.validation_type === "numeric") {
      validation.type = "numeric";
      if (values.validation_min !== "") validation.min = Number(values.validation_min);
      if (values.validation_max !== "") validation.max = Number(values.validation_max);
    }

    const questionData = {
      line_channel_id: values.line_channel_id,
      image_url: values.image_url || null,
      question_key: values.question_key,
      question_type: values.question_type,
      content: values.content,
      description: values.description || null,
      group_name: values.group_name || null,
      is_active: values.is_active,
      conditions: values.conditions,
      display_conditions: values.display_conditions,
      validation,
    };

    if (isEdit && question) {
      const { error } = await supabase
        .from("questions")
        .update(questionData)
        .eq("id", question.id);

      if (error) {
        alert("更新に失敗しました: " + error.message);
        return;
      }

      // Update options: delete all then re-insert
      await supabase
        .from("question_options")
        .delete()
        .eq("question_id", question.id);

      if (showOptions && values.options.length > 0) {
        await supabase.from("question_options").insert(
          values.options.map((opt, i) => ({
            question_id: question.id,
            label: opt.label,
            value: opt.value,
            image_url: opt.image_url || null,
            error_message: opt.error_message || null,
            sort_order: i,
          }))
        );
      }
    } else {
      // Get next sort_order
      const { data: lastQ } = await supabase
        .from("questions")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      const nextOrder = (lastQ?.sort_order ?? -1) + 1;

      const { data: newQuestion, error } = await supabase
        .from("questions")
        .insert({ ...questionData, sort_order: nextOrder })
        .select()
        .single();

      if (error || !newQuestion) {
        alert("作成に失敗しました: " + (error?.message ?? "不明なエラー"));
        return;
      }

      if (showOptions && values.options.length > 0) {
        await supabase.from("question_options").insert(
          values.options.map((opt, i) => ({
            question_id: newQuestion.id,
            label: opt.label,
            value: opt.value,
            image_url: opt.image_url || null,
            error_message: opt.error_message || null,
            sort_order: i,
          }))
        );
      }
    }

    router.push("/questions");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="line_channel_id">LINEチャンネル</Label>
            <Select
              value={form.watch("line_channel_id")}
              onValueChange={(v) => form.setValue("line_channel_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="チャンネルを選択..." />
              </SelectTrigger>
              <SelectContent>
                {channels.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.line_channel_id && (
              <p className="text-sm text-destructive">
                {form.formState.errors.line_channel_id.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="question_key">質問キー</Label>
              <Input
                id="question_key"
                placeholder="hospitalization_days"
                {...form.register("question_key")}
              />
              {form.formState.errors.question_key && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.question_key.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="question_type">質問タイプ</Label>
              <Select
                value={form.watch("question_type")}
                onValueChange={(v) =>
                  form.setValue(
                    "question_type",
                    v as "image_carousel" | "button" | "free_text"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="button">ボタン (最大4)</SelectItem>
                  <SelectItem value="image_carousel">
                    カルーセル (最大10)
                  </SelectItem>
                  <SelectItem value="free_text">自由入力</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">質問文</Label>
            <Textarea
              id="content"
              placeholder="ユーザーに表示する質問文..."
              {...form.register("content")}
            />
            {form.formState.errors.content && (
              <p className="text-sm text-destructive">
                {form.formState.errors.content.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>質問画像（任意）</Label>
            <p className="text-xs text-muted-foreground">
              ボタンテンプレートのサムネイルとして表示されます
            </p>
            <ImageUpload
              value={form.watch("image_url") ?? ""}
              onChange={(url) => form.setValue("image_url", url)}
              folder="questions"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">説明 (管理用)</Label>
              <Input
                id="description"
                placeholder="管理者向けの説明..."
                {...form.register("description")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group_name">グループ名</Label>
              <Input
                id="group_name"
                placeholder="injury_info"
                {...form.register("group_name")}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.watch("is_active")}
              onCheckedChange={(checked) =>
                form.setValue("is_active", checked)
              }
            />
            <Label>有効</Label>
          </div>
        </CardContent>
      </Card>

      {showOptions && (
        <Card>
          <CardHeader>
            <CardTitle>選択肢</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {optionFields.map((field, index) => (
              <div key={field.id} className="space-y-2 border rounded p-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">ラベル</Label>
                    <Input
                      placeholder="表示テキスト"
                      {...form.register(`options.${index}.label`)}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">値</Label>
                    <Input
                      placeholder="保存される値"
                      {...form.register(`options.${index}.value`)}
                    />
                  </div>
                  {watchType === "image_carousel" && (
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">画像</Label>
                      <ImageUpload
                        value={form.watch(`options.${index}.image_url`) ?? ""}
                        onChange={(url) =>
                          form.setValue(`options.${index}.image_url`, url)
                        }
                        folder="options"
                      />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    エラーメッセージ（任意）
                  </Label>
                  <Textarea
                    placeholder="タップ時にエラーとして返すメッセージ（設定すると回答は保存されません）"
                    rows={2}
                    {...form.register(`options.${index}.error_message`)}
                  />
                </div>
              </div>
            ))}
            {optionFields.length < maxOptions && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendOption({ label: "", value: "", image_url: "" })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                選択肢を追加
              </Button>
            )}
            {form.formState.errors.options && (
              <p className="text-sm text-destructive">
                選択肢の入力に問題があります。
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {watchType === "free_text" && (
        <Card>
          <CardHeader>
            <CardTitle>バリデーション</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>入力タイプ</Label>
              <Select
                value={form.watch("validation_type")}
                onValueChange={(v) =>
                  form.setValue("validation_type", v as "none" | "numeric")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">制限なし</SelectItem>
                  <SelectItem value="numeric">数字のみ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.watch("validation_type") === "numeric" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validation_min">最小値（任意）</Label>
                  <Input
                    id="validation_min"
                    type="number"
                    placeholder="例: 0"
                    {...form.register("validation_min")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validation_max">最大値（任意）</Label>
                  <Input
                    id="validation_max"
                    type="number"
                    placeholder="例: 365"
                    {...form.register("validation_max")}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>表示条件</CardTitle>
        </CardHeader>
        <CardContent>
          <DisplayConditionEditor
            control={form.control}
            register={form.register}
            watch={form.watch}
            setValue={form.setValue}
            allQuestions={allQuestions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>条件分岐</CardTitle>
        </CardHeader>
        <CardContent>
          <ConditionEditor
            control={form.control}
            register={form.register}
            watch={form.watch}
            setValue={form.setValue}
            allQuestions={allQuestions}
          />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting
            ? "保存中..."
            : isEdit
              ? "更新"
              : "作成"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/questions")}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
