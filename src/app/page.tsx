import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Settings2,
  Calculator,
  GitBranch,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Scale,
  Building2,
  HeartPulse,
} from "lucide-react";

const FEATURES = [
  {
    icon: MessageCircle,
    title: "LINEで完結",
    description:
      "ユーザーはLINEを開くだけ。アプリのインストール不要で、友だち追加後すぐにシミュレーションを開始できます。",
  },
  {
    icon: Settings2,
    title: "柔軟な質問フロー",
    description:
      "管理画面から質問・選択肢・条件分岐を自由に設定。ドラッグ&ドロップで並び替え、変更もリアルタイムに反映されます。",
  },
  {
    icon: Calculator,
    title: "自動計算・結果表示",
    description:
      "回答に基づいて金額・スコア・診断結果を自動算出。計算式も管理画面から編集でき、変更にも素早く対応できます。",
  },
  {
    icon: GitBranch,
    title: "条件分岐・スキップ",
    description:
      "回答内容に応じて次の質問を動的に切り替え。不要な質問をスキップし、ユーザーに最適な流れを提供します。",
  },
  {
    icon: BarChart3,
    title: "セッション管理",
    description:
      "管理画面でセッション・回答履歴・通知ログを一覧表示。ユーザーの進捗をリアルタイムに把握できます。",
  },
  {
    icon: CheckCircle2,
    title: "マルチアカウント対応",
    description:
      "複数のLINE公式アカウントを一つの管理画面で運用。チャンネルごとに担当者を分けたRBAC権限管理にも対応しています。",
  },
];

const STEPS = [
  {
    step: "01",
    title: "管理者が設定",
    description: "管理画面から質問フロー・選択肢・計算式を登録します。",
  },
  {
    step: "02",
    title: "LINEで受け付け",
    description:
      "ユーザーがLINE公式アカウントを友だち追加し、チャットで質問に回答します。",
  },
  {
    step: "03",
    title: "結果を自動送信",
    description:
      "全問回答後、シミュレーション結果をLINEメッセージで自動通知します。",
  },
];

const USE_CASES = [
  {
    icon: Scale,
    industry: "法律・法務",
    title: "交通事故慰謝料シミュレーター",
    description:
      "事故状況・怪我の程度・入通院日数などを質問し、慰謝料・賠償金の概算を自動算出。初回相談前の情報収集を自動化できます。",
  },
  {
    icon: Building2,
    industry: "不動産・住宅",
    title: "住宅ローン借入可能額診断",
    description:
      "年収・勤続年数・希望返済期間を入力するだけで借入可能額の目安を提示。資料請求や来店予約への誘導にも活用できます。",
  },
  {
    icon: HeartPulse,
    industry: "医療・健康",
    title: "症状チェック・受診案内",
    description:
      "症状や体の状態を質問し、受診すべき診療科や緊急度をガイド。患者の不安を和らげ、適切な受診行動を促します。",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MessageCircle className="h-4 w-4" />
            </div>
            <span className="font-bold tracking-tight">L-Simu</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                ログイン
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-muted/60 to-background py-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <MessageCircle className="h-3 w-3" />
            LINE チャットボット × 自動計算
          </Badge>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            LINEで動く
            <br />
            <span className="text-primary">対話型シミュレーター</span>を
            <br />
            ノーコードで構築
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            質問フロー・条件分岐・計算式を管理画面から設定するだけ。
            業種を問わず、あらゆる診断・見積もり・試算をLINE上で自動化できます。
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/login">
              <Button size="lg" className="px-8">
                管理画面へログイン
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">主な機能</h2>
            <p className="mt-3 text-muted-foreground">
              シミュレーター運用に必要な機能をすべて搭載
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="border-border/60">
                  <CardContent className="flex flex-col gap-3 p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {f.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="border-y bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">利用例</h2>
            <p className="mt-3 text-muted-foreground">
              さまざまな業種・用途で活用できます
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {USE_CASES.map((u) => {
              const Icon = u.icon;
              return (
                <Card key={u.title} className="border-border/60">
                  <CardContent className="flex flex-col gap-3 p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {u.industry}
                      </Badge>
                    </div>
                    <h3 className="font-semibold">{u.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {u.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">使い方</h2>
            <p className="mt-3 text-muted-foreground">
              3ステップでシミュレーターを運用開始
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative flex flex-col items-center text-center">
                {i < STEPS.length - 1 && (
                  <div className="absolute left-[calc(50%+2.5rem)] top-6 hidden h-px w-[calc(100%-5rem)] bg-border md:block" />
                )}
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-background text-sm font-bold text-primary">
                  {s.step}
                </div>
                <h3 className="mb-2 font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight">
            まずは管理画面を試してみる
          </h2>
          <p className="mb-8 text-muted-foreground">
            ログイン後すぐに質問フローや計算式の設定を始められます。
          </p>
          <Link href="/login">
            <Button size="lg" className="px-10">
              ログイン
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
              <MessageCircle className="h-3 w-3" />
            </div>
            <span className="font-medium text-foreground">
              L-Simu ラインシミュレーター
            </span>
          </div>
          <span>© {new Date().getFullYear()} L-Simu. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
