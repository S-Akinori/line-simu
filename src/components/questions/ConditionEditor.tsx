"use client";

import {
  type Control,
  type UseFormRegister,
  type UseFormWatch,
  type UseFormSetValue,
  useFieldArray,
} from "react-hook-form";
import type { Question } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const OPERATORS = [
  { value: "eq", label: "等しい (=)" },
  { value: "neq", label: "等しくない (!=)" },
  { value: "in", label: "含まれる (in)" },
  { value: "not_in", label: "含まれない (not in)" },
  { value: "gt", label: "より大きい (>)" },
  { value: "gte", label: "以上 (>=)" },
  { value: "lt", label: "より小さい (<)" },
  { value: "lte", label: "以下 (<=)" },
  { value: "exists", label: "回答あり" },
  { value: "not_exists", label: "回答なし" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ConditionEditorProps {
  control: Control<any>;
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  allQuestions: Question[];
}

export function ConditionEditor({
  control,
  register,
  watch,
  setValue,
  allQuestions,
}: ConditionEditorProps) {
  const {
    fields: conditionFields,
    append: appendCondition,
    remove: removeCondition,
  } = useFieldArray({ control, name: "conditions" });

  function addCondition() {
    appendCondition({
      id: `cond_${Date.now()}`,
      description: "",
      rules: [{ question_key: "", operator: "eq", value: "" }],
      logic: "and" as const,
      next_question_key: "",
    });
  }

  return (
    <div className="space-y-4">
      {conditionFields.map((field, condIndex) => (
        <Card key={field.id} className="border-dashed">
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                条件 {condIndex + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeCondition(condIndex)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">説明</Label>
              <Input
                placeholder="条件の説明..."
                {...register(`conditions.${condIndex}.description`)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs">ロジック:</Label>
              <Select
                value={watch(`conditions.${condIndex}.logic`)}
                onValueChange={(v) =>
                  setValue(`conditions.${condIndex}.logic`, v)
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="and">AND</SelectItem>
                  <SelectItem value="or">OR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ConditionRules
              condIndex={condIndex}
              control={control}
              register={register}
              watch={watch}
              setValue={setValue}
              allQuestions={allQuestions}
            />

            <div className="space-y-2">
              <Label className="text-xs">遷移先の質問キー</Label>
              <Select
                value={watch(`conditions.${condIndex}.next_question_key`)}
                onValueChange={(v) =>
                  setValue(`conditions.${condIndex}.next_question_key`, v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="質問を選択..." />
                </SelectTrigger>
                <SelectContent>
                  {allQuestions.map((q) => (
                    <SelectItem key={q.id} value={q.question_key}>
                      <span className="font-mono">{q.question_key}</span>
                      <span className="ml-2 text-muted-foreground">{q.content.substring(0, 24)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addCondition}>
        <Plus className="mr-2 h-4 w-4" />
        条件を追加
      </Button>
    </div>
  );
}

export function DisplayConditionEditor({
  control,
  register,
  watch,
  setValue,
  allQuestions,
}: ConditionEditorProps) {
  const {
    fields,
    append,
    remove,
  } = useFieldArray({ control, name: "display_conditions" });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        設定すると、条件を満たす場合のみこの質問が表示されます。未設定 = 常に表示。
        複数設定した場合はいずれか一つを満たせば表示されます（OR）。
      </p>
      {fields.map((field, idx) => (
        <Card key={field.id} className="border-dashed">
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">表示条件 {idx + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(idx)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">ルール間ロジック:</span>
              <Select
                value={watch(`display_conditions.${idx}.logic`)}
                onValueChange={(v) => setValue(`display_conditions.${idx}.logic`, v)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="and">AND</SelectItem>
                  <SelectItem value="or">OR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DisplayConditionRules
              groupIndex={idx}
              control={control}
              register={register}
              watch={watch}
              setValue={setValue}
              allQuestions={allQuestions}
            />
          </CardContent>
        </Card>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ rules: [{ question_key: "", operator: "eq", value: "" }], logic: "and" })}
      >
        <Plus className="mr-2 h-4 w-4" />
        表示条件を追加
      </Button>
    </div>
  );
}

function DisplayConditionRules({
  groupIndex,
  control,
  register,
  watch,
  setValue,
  allQuestions,
}: {
  groupIndex: number;
  control: Control<any>;
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  allQuestions: Question[];
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `display_conditions.${groupIndex}.rules`,
  });

  return (
    <div className="space-y-2">
      <span className="text-xs text-muted-foreground">ルール</span>
      {fields.map((f, ruleIdx) => (
        <div key={f.id} className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">質問キー</Label>
            <Select
              value={watch(`display_conditions.${groupIndex}.rules.${ruleIdx}.question_key`)}
              onValueChange={(v) =>
                setValue(`display_conditions.${groupIndex}.rules.${ruleIdx}.question_key`, v)
              }
            >
              <SelectTrigger><SelectValue placeholder="質問を選択..." /></SelectTrigger>
              <SelectContent>
                {allQuestions.map((q) => (
                  <SelectItem key={q.id} value={q.question_key}>
                    <span className="font-mono">{q.question_key}</span>
                    <span className="ml-2 text-muted-foreground">{q.content.substring(0, 24)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40 space-y-1">
            <Label className="text-xs">演算子</Label>
            <Select
              value={watch(`display_conditions.${groupIndex}.rules.${ruleIdx}.operator`)}
              onValueChange={(v) =>
                setValue(`display_conditions.${groupIndex}.rules.${ruleIdx}.operator`, v)
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OPERATORS.map((op) => (
                  <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">値</Label>
            <Input
              placeholder="比較値"
              {...register(`display_conditions.${groupIndex}.rules.${ruleIdx}.value`)}
            />
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(ruleIdx)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ question_key: "", operator: "eq", value: "" })}
      >
        <Plus className="mr-2 h-4 w-4" />
        ルールを追加
      </Button>
    </div>
  );
}

function ConditionRules({
  condIndex,
  control,
  register,
  watch,
  setValue,
  allQuestions,
}: {
  condIndex: number;
  control: Control<any>;
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  allQuestions: Question[];
}) {
  const {
    fields: ruleFields,
    append: appendRule,
    remove: removeRule,
  } = useFieldArray({
    control,
    name: `conditions.${condIndex}.rules`,
  });

  return (
    <div className="space-y-2">
      <Label className="text-xs">ルール</Label>
      {ruleFields.map((ruleField, ruleIndex) => (
        <div key={ruleField.id} className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">質問キー</Label>
            <Select
              value={watch(
                `conditions.${condIndex}.rules.${ruleIndex}.question_key`
              )}
              onValueChange={(v) =>
                setValue(
                  `conditions.${condIndex}.rules.${ruleIndex}.question_key`,
                  v
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="質問を選択..." />
              </SelectTrigger>
              <SelectContent>
                {allQuestions.map((q) => (
                  <SelectItem key={q.id} value={q.question_key}>
                    <span className="font-mono">{q.question_key}</span>
                    <span className="ml-2 text-muted-foreground">{q.content.substring(0, 24)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40 space-y-1">
            <Label className="text-xs">演算子</Label>
            <Select
              value={watch(
                `conditions.${condIndex}.rules.${ruleIndex}.operator`
              )}
              onValueChange={(v) =>
                setValue(
                  `conditions.${condIndex}.rules.${ruleIndex}.operator`,
                  v
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">値</Label>
            <Input
              placeholder="比較値"
              {...register(
                `conditions.${condIndex}.rules.${ruleIndex}.value`
              )}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeRule(ruleIndex)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          appendRule({ question_key: "", operator: "eq", value: "" })
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        ルールを追加
      </Button>
    </div>
  );
}
