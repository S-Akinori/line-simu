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
      "回答に基づいて慰謝料・賠償金を自動算出。計算式も管理画面から編集でき、法改正や判例変更にも素早く対応できます。",
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
      "全問回答後、慰謝料・賠償金の概算をLINEメッセージで自動通知します。",
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
            <Link href="/register">
              <Button size="sm">
                無料で始める
                <ChevronRight className="ml-1 h-3 w-3" />
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
            LINE Chatbot × 慰謝料計算
          </Badge>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            LINEで簡単に
            <br />
            <span className="text-primary">交通事故慰謝料</span>を
            <br />
            シミュレーション
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            質問に答えるだけで慰謝料の概算を自動計算。複雑な計算式・条件分岐を
            ノーコードで管理できる、法律事務所・相談センター向けサービスです。
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="px-8">
                管理画面を無料登録
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="px-8">
                ログイン
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

      {/* How it works */}
      <section className="border-y bg-muted/30 py-20">
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
      <section className="py-20">
        <div className="mx-auto max-w-xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight">
            まずは管理画面を試してみる
          </h2>
          <p className="mb-8 text-muted-foreground">
            アカウント登録後すぐに質問フローや計算式の設定を始められます。
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="px-10">
                無料で始める
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="px-10">
                ログイン
              </Button>
            </Link>
          </div>
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
