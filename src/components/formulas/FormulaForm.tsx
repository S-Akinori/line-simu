"use client";

import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import type { Formula, GlobalConstant, Question } from "@/types/database";
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
import { Plus, Trash2 } from "lucide-react";
import { DisplayConditionEditor } from "@/components/questions/ConditionEditor";

const keyMappingRowSchema = z.object({
  lookup_key: z.string(),
  question_key: z.string(),
  transform: z.string(),
});

const conditionalConditionSchema = z.object({
  question_key: z.string(),
  operator: z.string(),
  value_type: z.enum(["literal", "answer", "global"]).default("literal"),
  value: z.string().optional(),
  value_question_key: z.string().optional(),
  value_constant_name: z.string().optional(),
});

const conditionalCaseSchema = z.object({
  conditions: z.array(conditionalConditionSchema),
  result_type: z.enum(["literal", "answer", "global"]).default("literal"),
  result: z.number().optional(),
  result_question_key: z.string().optional(),
  result_constant_name: z.string().optional(),
});

const variableSchema = z.object({
  var_name: z.string().min(1, "変数名は必須です"),
  source: z.enum(["answer", "lookup", "constant", "formula", "conditional"]),
  question_key: z.string().optional(),
  table_name: z.string().optional(),
  key_mappings_rows: z.array(keyMappingRowSchema).optional(),
  constant_value: z.number().optional(),
  formula_name: z.string().optional(),
  conditional_cases: z.array(conditionalCaseSchema).optional(),
  conditional_default: z.number().optional(),
});

const conditionRuleSchema = z.object({
  question_key: z.string(),
  operator: z.string(),
  value: z.string().optional(),
});

const displayConditionSchema = z.object({
  rules: z.array(conditionRuleSchema).min(1),
  logic: z.enum(["and", "or"]),
});

const formulaFormSchema = z.object({
  name: z
    .string()
    .min(1, "名前は必須です")
    .regex(/^[a-z][a-z0-9_]*$/, "小文字英数字とアンダースコアのみ"),
  description: z.string().optional(),
  expression: z.string().min(1, "数式は必須です"),
  result_label: z.string().optional(),
  result_format: z.string().min(1, "フォーマットは必須です"),
  value_unit: z.string(),
  value_scale: z.number().positive(),
  value_decimals: z.number().int().min(0).max(10),
  display_order: z.number().int().min(0),
  is_active: z.boolean(),
  variables: z.array(variableSchema),
  display_conditions: z.array(displayConditionSchema),
});

type FormulaFormValues = z.infer<typeof formulaFormSchema>;

type ConditionGroup = { rules: { question_key: string; operator: string; value?: string }[]; logic: "and" | "or" };

interface FormulaFormProps {
  formula?: Formula;
  allQuestions?: Question[];
  allFormulas?: Formula[];
  allLookupTables?: { table_name: string }[];
  allGlobalConstants?: Pick<GlobalConstant, "name" | "description">[];
}

function variablesToFormValues(
  variables: Record<string, Formula["variables"][string]>
): FormulaFormValues["variables"] {
  return Object.entries(variables).map(([var_name, config]) => ({
    var_name,
    source: config.source,
    question_key: config.question_key ?? "",
    table_name: config.table_name ?? "",
    key_mappings_rows: config.key_mappings
      ? Object.entries(config.key_mappings).map(([lookup_key, mapping]) => {
          if (typeof mapping === "string") {
            return { lookup_key, question_key: mapping, transform: "" };
          }
          return {
            lookup_key,
            question_key: mapping.question_key,
            transform: mapping.transform ?? "",
          };
        })
      : [],
    constant_value: config.value ?? 0,
    formula_name: config.formula_name ?? "",
    conditional_cases: (config.cases as Record<string, unknown>[] | undefined)?.map((c) => ({
      // Support both new format ({conditions:[...], result}) and legacy ({question_key, operator, value, result})
      conditions: Array.isArray(c.conditions)
        ? (c.conditions as Record<string, string>[]).map((cond) => ({
            question_key: cond.question_key ?? "",
            operator: cond.operator ?? "eq",
            value_type: (cond.value_source ?? "literal") as "literal" | "answer" | "global",
            value: cond.value_source ? "" : String(cond.value ?? ""),
            value_question_key: cond.value_question_key ?? "",
            value_constant_name: cond.value_constant_name ?? "",
          }))
        : [{ question_key: String(c.question_key ?? ""), operator: String(c.operator ?? "eq"), value_type: "literal" as const, value: String(c.value ?? ""), value_question_key: "", value_constant_name: "" }],
      result_type: (c.result_source ?? "literal") as "literal" | "answer" | "global",
      result: c.result_source ? 0 : Number(c.result ?? 0),
      result_question_key: String(c.result_question_key ?? ""),
      result_constant_name: String(c.result_constant_name ?? ""),
    })) ?? [],
    conditional_default: config.default != null ? Number(config.default) : undefined,
  }));
}

function formValuesToVariables(
  variables: FormulaFormValues["variables"]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const v of variables) {
    const entry: Record<string, unknown> = { source: v.source };
    switch (v.source) {
      case "answer":
        entry.question_key = v.question_key;
        break;
      case "lookup": {
        entry.table_name = v.table_name;
        const key_mappings: Record<string, unknown> = {};
        for (const row of v.key_mappings_rows ?? []) {
          if (row.transform) {
            key_mappings[row.lookup_key] = { question_key: row.question_key, transform: row.transform };
          } else {
            key_mappings[row.lookup_key] = row.question_key;
          }
        }
        entry.key_mappings = key_mappings;
        break;
      }
      case "constant":
        entry.value = v.constant_value;
        break;
      case "formula":
        entry.formula_name = v.formula_name;
        break;
      case "conditional":
        entry.cases = (v.conditional_cases ?? []).map((c) => {
          const conditions = c.conditions.map((cond) => {
            const base: Record<string, string> = { question_key: cond.question_key, operator: cond.operator };
            if (cond.value_type === "answer") {
              return { ...base, value_source: "answer", value_question_key: cond.value_question_key ?? "" };
            }
            if (cond.value_type === "global") {
              return { ...base, value_source: "global", value_constant_name: cond.value_constant_name ?? "" };
            }
            return { ...base, value: cond.value ?? "" };
          });
          const caseEntry: Record<string, unknown> = { conditions };
          if (c.result_type === "answer") {
            caseEntry.result_source = "answer";
            caseEntry.result_question_key = c.result_question_key ?? "";
          } else if (c.result_type === "global") {
            caseEntry.result_source = "global";
            caseEntry.result_constant_name = c.result_constant_name ?? "";
          } else {
            caseEntry.result = c.result ?? 0;
          }
          return caseEntry;
        });
        if (v.conditional_default != null) {
          entry.default = v.conditional_default;
        }
        break;
    }
    result[v.var_name] = entry;
  }
  return result;
}

export function FormulaForm({
  formula,
  allQuestions = [],
  allFormulas = [],
  allLookupTables = [],
  allGlobalConstants = [],
}: FormulaFormProps) {
  const router = useRouter();
  const isEdit = !!formula;

  const form = useForm<FormulaFormValues>({
    resolver: zodResolver(formulaFormSchema),
    defaultValues: {
      name: formula?.name ?? "",
      description: formula?.description ?? "",
      expression: formula?.expression ?? "",
      result_label: formula?.result_label ?? "",
      result_format: formula?.result_format ?? "{label}: {value}",
      value_unit: formula?.value_unit ?? "円",
      value_scale: formula?.value_scale ?? 1,
      value_decimals: formula?.value_decimals ?? 0,
      display_order: formula?.display_order ?? 0,
      is_active: formula?.is_active ?? true,
      variables: formula ? variablesToFormValues(formula.variables) : [],
      display_conditions: (formula?.condition as ConditionGroup[] | null)?.map((g) => ({
        rules: g.rules,
        logic: g.logic,
      })) ?? [],
    },
  });

  const {
    fields: varFields,
    append: appendVar,
    remove: removeVar,
  } = useFieldArray({ control: form.control, name: "variables" });

  async function onSubmit(values: FormulaFormValues) {
    const supabase = createClient();

    const formulaData = {
      name: values.name,
      description: values.description || null,
      expression: values.expression,
      result_label: values.result_label || null,
      result_format: values.result_format,
      value_unit: values.value_unit,
      value_scale: values.value_scale,
      value_decimals: values.value_decimals,
      display_order: values.display_order,
      is_active: values.is_active,
      variables: formValuesToVariables(values.variables),
      condition: values.display_conditions.length > 0 ? values.display_conditions : null,
    };

    if (isEdit && formula) {
      const { error } = await supabase
        .from("formulas")
        .update(formulaData)
        .eq("id", formula.id);
      if (error) {
        alert("更新に失敗しました: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("formulas").insert(formulaData);
      if (error) {
        alert("作成に失敗しました: " + error.message);
        return;
      }
    }

    router.push("/formulas");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>名前</Label>
              <Input
                placeholder="total_compensation"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>結果ラベル</Label>
              <Input
                placeholder="合計賠償額"
                {...form.register("result_label")}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>結果フォーマット</Label>
              <Input
                placeholder="{label}: {value}"
                {...form.register("result_format")}
              />
              {form.formState.errors.result_format && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.result_format.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {"{label}"}（ラベル）と {"{value}"}（計算結果）が使えます
              </p>
            </div>
            <div className="space-y-2">
              <Label>単位（サフィックス）</Label>
              <Input
                placeholder="円、点、kg、% ..."
                {...form.register("value_unit")}
              />
              <p className="text-xs text-muted-foreground">
                計算値の後ろに付加されます（例: 円 → 500,000円）
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>スケール（除数）</Label>
              <Input
                type="number"
                step="any"
                min={0.000001}
                placeholder="1"
                {...form.register("value_scale", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                表示前に除算。例: 10000 → 500,000÷10000=50万円
              </p>
            </div>
            <div className="space-y-2">
              <Label>小数点以下桁数</Label>
              <Input
                type="number"
                min={0}
                max={10}
                placeholder="0"
                {...form.register("value_decimals", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                0=整数表示、1=小数1桁（末尾ゼロは自動省略）
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>説明</Label>
            <Input placeholder="計算式の説明..." {...form.register("description")} />
          </div>
          <div className="space-y-2">
            <Label>数式</Label>
            <Textarea
              className="font-mono"
              placeholder="daily_rate * hospitalization_days + consolation"
              {...form.register("expression")}
            />
            {form.formState.errors.expression && (
              <p className="text-sm text-destructive">
                {form.formState.errors.expression.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>表示順序</Label>
              <Input
                type="number"
                min={0}
                {...form.register("display_order", { valueAsNumber: true })}
              />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Switch
                checked={form.watch("is_active")}
                onCheckedChange={(checked) =>
                  form.setValue("is_active", checked)
                }
              />
              <Label>有効</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>変数マッピング</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {varFields.map((field, index) => (
            <div
              key={field.id}
              className="space-y-3 rounded-md border border-dashed p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  変数 {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVar(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">変数名</Label>
                  <Input
                    className="font-mono"
                    placeholder="daily_rate"
                    {...form.register(`variables.${index}.var_name`)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ソース</Label>
                  <Select
                    value={form.watch(`variables.${index}.source`)}
                    onValueChange={(v) =>
                      form.setValue(
                        `variables.${index}.source`,
                        v as "answer" | "lookup" | "constant" | "formula" | "conditional"
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="answer">回答</SelectItem>
                      <SelectItem value="lookup">ルックアップ</SelectItem>
                      <SelectItem value="constant">定数</SelectItem>
                      <SelectItem value="formula">計算式</SelectItem>
                      <SelectItem value="conditional">条件分岐</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.watch(`variables.${index}.source`) === "answer" && (
                <div className="space-y-1">
                  <Label className="text-xs">質問キー</Label>
                  <Select
                    value={form.watch(`variables.${index}.question_key`) ?? ""}
                    onValueChange={(v) =>
                      form.setValue(`variables.${index}.question_key`, v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="質問を選択..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allQuestions.map((q) => (
                        <SelectItem key={q.id} value={q.question_key}>
                          {q.question_key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.watch(`variables.${index}.source`) === "lookup" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">テーブル名</Label>
                    <Select
                      value={form.watch(`variables.${index}.table_name`) ?? ""}
                      onValueChange={(v) =>
                        form.setValue(`variables.${index}.table_name`, v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="テーブルを選択..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allLookupTables.map((t) => (
                          <SelectItem key={t.table_name} value={t.table_name}>
                            {t.table_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">キーマッピング</Label>
                    <div className="space-y-2">
                      {(form.watch(`variables.${index}.key_mappings_rows`) ?? []).map(
                        (row, rowIdx) => (
                          <div key={rowIdx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                            <Input
                              className="font-mono text-xs"
                              placeholder="テーブルキー列"
                              value={row.lookup_key}
                              onChange={(e) => {
                                const rows = [...(form.getValues(`variables.${index}.key_mappings_rows`) ?? [])];
                                rows[rowIdx] = { ...rows[rowIdx], lookup_key: e.target.value };
                                form.setValue(`variables.${index}.key_mappings_rows`, rows);
                              }}
                            />
                            <Select
                              value={row.question_key}
                              onValueChange={(v) => {
                                const rows = [...(form.getValues(`variables.${index}.key_mappings_rows`) ?? [])];
                                rows[rowIdx] = { ...rows[rowIdx], question_key: v };
                                form.setValue(`variables.${index}.key_mappings_rows`, rows);
                              }}
                            >
                              <SelectTrigger className="text-xs">
                                <SelectValue placeholder="質問キー" />
                              </SelectTrigger>
                              <SelectContent>
                                {allQuestions.map((q) => (
                                  <SelectItem key={q.id} value={q.question_key}>
                                    {q.question_key}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              className="font-mono text-xs"
                              placeholder="変換式 例: floor(x / 30)"
                              value={row.transform}
                              onChange={(e) => {
                                const rows = [...(form.getValues(`variables.${index}.key_mappings_rows`) ?? [])];
                                rows[rowIdx] = { ...rows[rowIdx], transform: e.target.value };
                                form.setValue(`variables.${index}.key_mappings_rows`, rows);
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const rows = (form.getValues(`variables.${index}.key_mappings_rows`) ?? []).filter((_, i) => i !== rowIdx);
                                form.setValue(`variables.${index}.key_mappings_rows`, rows);
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        )
                      )}
                      <p className="text-xs text-muted-foreground">
                        テーブルキー列 / 質問キー / 変換式（任意、<code className="bg-muted px-1 rounded">x</code> が回答値）
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const rows = form.getValues(`variables.${index}.key_mappings_rows`) ?? [];
                          form.setValue(`variables.${index}.key_mappings_rows`, [
                            ...rows,
                            { lookup_key: "", question_key: "", transform: "" },
                          ]);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        キー追加
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {form.watch(`variables.${index}.source`) === "constant" && (
                <div className="space-y-1">
                  <Label className="text-xs">定数値</Label>
                  <Input
                    type="number"
                    step="any"
                    {...form.register(`variables.${index}.constant_value`, { valueAsNumber: true })}
                  />
                </div>
              )}

              {form.watch(`variables.${index}.source`) === "formula" && (
                <div className="space-y-1">
                  <Label className="text-xs">計算式名</Label>
                  <Select
                    value={form.watch(`variables.${index}.formula_name`) ?? ""}
                    onValueChange={(v) =>
                      form.setValue(`variables.${index}.formula_name`, v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="計算式を選択..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allFormulas
                        .filter((f) => f.name !== formula?.name)
                        .map((f) => (
                          <SelectItem key={f.id} value={f.name}>
                            {f.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.watch(`variables.${index}.source`) === "conditional" && (
                <div className="space-y-3">
                  <Label className="text-xs">
                    条件ケース（上から順に評価し、最初にすべての条件が一致したケースの値を使用）
                  </Label>
                  {(form.watch(`variables.${index}.conditional_cases`) ?? []).map(
                    (caseItem, caseIdx) => (
                      <div key={caseIdx} className="rounded border p-2 space-y-2 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">ケース {caseIdx + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              const cases = (
                                form.getValues(`variables.${index}.conditional_cases`) ?? []
                              ).filter((_, i) => i !== caseIdx);
                              form.setValue(`variables.${index}.conditional_cases`, cases);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            条件（すべて一致で採用）
                          </Label>
                          {(caseItem.conditions ?? []).map((cond, condIdx) => {
                            const updateCond = (patch: Record<string, string>) => {
                              const cases = [...(form.getValues(`variables.${index}.conditional_cases`) ?? [])];
                              const conds = [...(cases[caseIdx]?.conditions ?? [])];
                              conds[condIdx] = { ...conds[condIdx], ...patch };
                              cases[caseIdx] = { ...cases[caseIdx], conditions: conds };
                              form.setValue(`variables.${index}.conditional_cases`, cases);
                            };
                            return (
                              <div key={condIdx} className="space-y-1">
                                <div className="grid grid-cols-[1fr_5rem_2rem] gap-1 items-center">
                                  <Select value={cond.question_key} onValueChange={(v) => updateCond({ question_key: v })}>
                                    <SelectTrigger className="text-xs h-8"><SelectValue placeholder="質問キー" /></SelectTrigger>
                                    <SelectContent>
                                      {allQuestions.map((q) => (
                                        <SelectItem key={q.id} value={q.question_key}>{q.question_key}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select value={cond.operator} onValueChange={(v) => updateCond({ operator: v })}>
                                    <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="eq">＝</SelectItem>
                                      <SelectItem value="ne">≠</SelectItem>
                                      <SelectItem value="gt">＞</SelectItem>
                                      <SelectItem value="gte">≧</SelectItem>
                                      <SelectItem value="lt">＜</SelectItem>
                                      <SelectItem value="lte">≦</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
                                    onClick={() => {
                                      const cases = [...(form.getValues(`variables.${index}.conditional_cases`) ?? [])];
                                      const conds = (cases[caseIdx]?.conditions ?? []).filter((_, i) => i !== condIdx);
                                      cases[caseIdx] = { ...cases[caseIdx], conditions: conds };
                                      form.setValue(`variables.${index}.conditional_cases`, cases);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                                <div className="flex gap-1 pl-1">
                                  <Select value={cond.value_type ?? "literal"} onValueChange={(v) => updateCond({ value_type: v })}>
                                    <SelectTrigger className="text-xs h-7 w-28 shrink-0"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="literal">固定値</SelectItem>
                                      <SelectItem value="answer">回答値</SelectItem>
                                      <SelectItem value="global">グローバル定数</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {(cond.value_type ?? "literal") === "literal" && (
                                    <Input className="text-xs h-7 flex-1" placeholder="値" value={cond.value ?? ""}
                                      onChange={(e) => updateCond({ value: e.target.value })} />
                                  )}
                                  {cond.value_type === "answer" && (
                                    <Select value={cond.value_question_key ?? ""} onValueChange={(v) => updateCond({ value_question_key: v })}>
                                      <SelectTrigger className="text-xs h-7 flex-1"><SelectValue placeholder="質問キー" /></SelectTrigger>
                                      <SelectContent>
                                        {allQuestions.map((q) => (
                                          <SelectItem key={q.id} value={q.question_key}>{q.question_key}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                  {cond.value_type === "global" && (
                                    <Select value={cond.value_constant_name ?? ""} onValueChange={(v) => updateCond({ value_constant_name: v })}>
                                      <SelectTrigger className="text-xs h-7 flex-1"><SelectValue placeholder="定数名" /></SelectTrigger>
                                      <SelectContent>
                                        {allGlobalConstants.map((gc) => (
                                          <SelectItem key={gc.name} value={gc.name}>{gc.name}{gc.description ? ` (${gc.description})` : ""}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              const cases = [
                                ...(form.getValues(`variables.${index}.conditional_cases`) ?? []),
                              ];
                              const conds = [
                                ...(cases[caseIdx]?.conditions ?? []),
                                { question_key: "", operator: "eq", value_type: "literal" as const, value: "", value_question_key: "", value_constant_name: "" },
                              ];
                              cases[caseIdx] = { ...cases[caseIdx], conditions: conds };
                              form.setValue(`variables.${index}.conditional_cases`, cases);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            条件を追加
                          </Button>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">この場合の値</Label>
                          <div className="flex gap-1">
                            <Select
                              value={caseItem.result_type ?? "literal"}
                              onValueChange={(v) => {
                                const cases = [...(form.getValues(`variables.${index}.conditional_cases`) ?? [])];
                                cases[caseIdx] = { ...cases[caseIdx], result_type: v as "literal" | "answer" | "global" };
                                form.setValue(`variables.${index}.conditional_cases`, cases);
                              }}
                            >
                              <SelectTrigger className="text-xs h-8 w-32 shrink-0"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="literal">固定値</SelectItem>
                                <SelectItem value="answer">回答値</SelectItem>
                                <SelectItem value="global">グローバル定数</SelectItem>
                              </SelectContent>
                            </Select>
                            {(caseItem.result_type ?? "literal") === "literal" && (
                              <Input type="number" step="any" className="h-8 text-xs flex-1"
                                value={caseItem.result ?? 0}
                                onChange={(e) => {
                                  const cases = [...(form.getValues(`variables.${index}.conditional_cases`) ?? [])];
                                  cases[caseIdx] = { ...cases[caseIdx], result: Number(e.target.value) };
                                  form.setValue(`variables.${index}.conditional_cases`, cases);
                                }}
                              />
                            )}
                            {caseItem.result_type === "answer" && (
                              <Select
                                value={caseItem.result_question_key ?? ""}
                                onValueChange={(v) => {
                                  const cases = [...(form.getValues(`variables.${index}.conditional_cases`) ?? [])];
                                  cases[caseIdx] = { ...cases[caseIdx], result_question_key: v };
                                  form.setValue(`variables.${index}.conditional_cases`, cases);
                                }}
                              >
                                <SelectTrigger className="text-xs h-8 flex-1"><SelectValue placeholder="質問キー" /></SelectTrigger>
                                <SelectContent>
                                  {allQuestions.map((q) => (
                                    <SelectItem key={q.id} value={q.question_key}>{q.question_key}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {caseItem.result_type === "global" && (
                              <Select
                                value={caseItem.result_constant_name ?? ""}
                                onValueChange={(v) => {
                                  const cases = [...(form.getValues(`variables.${index}.conditional_cases`) ?? [])];
                                  cases[caseIdx] = { ...cases[caseIdx], result_constant_name: v };
                                  form.setValue(`variables.${index}.conditional_cases`, cases);
                                }}
                              >
                                <SelectTrigger className="text-xs h-8 flex-1"><SelectValue placeholder="定数名" /></SelectTrigger>
                                <SelectContent>
                                  {allGlobalConstants.map((gc) => (
                                    <SelectItem key={gc.name} value={gc.name}>{gc.name}{gc.description ? ` (${gc.description})` : ""}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const cases =
                        form.getValues(`variables.${index}.conditional_cases`) ?? [];
                      form.setValue(`variables.${index}.conditional_cases`, [
                        ...cases,
                        {
                          conditions: [{ question_key: "", operator: "eq", value_type: "literal" as const, value: "", value_question_key: "", value_constant_name: "" }],
                          result_type: "literal" as const,
                          result: 0,
                          result_question_key: "",
                          result_constant_name: "",
                        },
                      ]);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    ケースを追加
                  </Button>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      デフォルト値（どのケースにも一致しない場合）
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      className="h-8 text-xs"
                      placeholder="未設定 = 計算エラー"
                      {...form.register(`variables.${index}.conditional_default`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              appendVar({
                var_name: "",
                source: "answer",
                question_key: "",
                table_name: "",
                key_mappings_rows: [],
                constant_value: 0,
                formula_name: "",
                conditional_cases: [] as z.infer<typeof conditionalCaseSchema>[],
                conditional_default: undefined,
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            変数を追加
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>適用条件</CardTitle>
        </CardHeader>
        <CardContent>
          <DisplayConditionEditor
            control={form.control}
            register={form.register}
            watch={form.watch}
            setValue={form.setValue}
            allQuestions={allQuestions}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            設定すると、条件を満たす場合のみこの計算式が実行されます。未設定 = 常に実行。
          </p>
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
          onClick={() => router.push("/formulas")}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
