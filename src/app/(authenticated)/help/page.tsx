"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  MessageSquare,
  GitBranch,
  Workflow,
  Calculator,
  Hash,
  TableProperties,
  BarChart2,
  Clock,
  Users,
  Bell,
  UserCog,
  Printer,
  ChevronRight,
} from "lucide-react";

function SectionHeader({
  icon: Icon,
  title,
  href,
}: {
  icon: React.ElementType;
  title: string;
  href: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="text-xl font-bold">{title}</h2>
      <a
        href={href}
        className="ml-auto text-xs text-muted-foreground flex items-center gap-1 hover:text-primary print:hidden"
      >
        開く <ChevronRight className="h-3 w-3" />
      </a>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
        {n}
      </span>
      <p className="text-sm leading-6">{children}</p>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function FieldTable({
  rows,
}: {
  rows: { field: string; desc: string; required?: boolean }[];
}) {
  return (
    <table className="w-full text-sm mt-3 border-collapse">
      <thead>
        <tr className="border-b">
          <th className="text-left py-1 pr-4 font-medium w-48">項目</th>
          <th className="text-left py-1 font-medium">説明</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.field} className="border-b last:border-0">
            <td className="py-1.5 pr-4 align-top">
              <span className="font-mono text-xs">{r.field}</span>
              {r.required && (
                <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">
                  必須
                </Badge>
              )}
            </td>
            <td className="py-1.5 text-muted-foreground align-top">{r.desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function HelpPage() {
  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body { font-size: 11pt; }
          .print\\:hidden { display: none !important; }
          .card { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="space-y-6 max-w-4xl">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">使い方ガイド</h1>
            <p className="text-sm text-muted-foreground mt-1">
              賠償シミュレーター 管理画面の操作マニュアル
            </p>
          </div>
          <Button
            variant="outline"
            className="print:hidden"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4 mr-2" />
            PDF 印刷
          </Button>
        </div>

        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle>システム概要</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7">
            <p>
              本システムは、LINE チャットボットを通じて交通事故の慰謝料・賠償額をシミュレーションする仕組みを提供します。
              管理画面では、以下の要素を設定することでシミュレーションの内容を自由にカスタマイズできます。
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "LINEアカウント", desc: "チャンネル設定・Webhook" },
                { label: "質問管理", desc: "ユーザーへの質問と選択肢" },
                { label: "ルート管理", desc: "質問の順序と条件分岐" },
                { label: "計算式", desc: "数値計算ロジック" },
                { label: "ルックアップ", desc: "表引きテーブル" },
                { label: "結果表示設定", desc: "結果メッセージのフォーマット" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border p-3">
                  <div className="font-medium text-xs">{item.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-md border-l-4 border-primary pl-4 py-2 bg-muted/50">
              <p className="font-medium">推奨セットアップ順序</p>
              <p className="text-muted-foreground text-xs mt-1">
                LINEアカウント → 質問作成 → ルート設定 → 計算式 → 結果表示設定 → Webhook 接続確認
              </p>
            </div>
          </CardContent>
        </Card>

        {/* LINE Account */}
        <Card>
          <CardHeader>
            <SectionHeader icon={Smartphone} title="LINEアカウント" href="/channels" />
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              LINE Messaging API のチャンネルを登録します。複数のチャンネルを登録し、それぞれ独立した質問フローと計算式を設定できます。
            </p>
            <div className="space-y-2">
              <Step n={1}>
                <a
                  href="https://developers.line.biz/"
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  LINE Developers Console
                </a>{" "}
                でプロバイダー・チャンネルを作成し、「Messaging API」タブで
                <strong> チャンネル ID / チャンネルシークレット / チャンネルアクセストークン</strong>
                を取得します。
              </Step>
              <Step n={2}>
                管理画面の「LINEアカウント」→「新規追加」でチャンネル情報を入力し保存します。
              </Step>
              <Step n={3}>
                保存後に表示される <strong>Webhook パス</strong> をコピーし、LINE Developers Console の
                「Webhook URL」に{" "}
                <code className="bg-muted px-1 rounded text-xs">
                  https://api.example.com/webhook/&#123;パス&#125;
                </code>{" "}
                の形式で入力して「接続確認」をクリックします。
              </Step>
            </div>
            <FieldTable
              rows={[
                { field: "チャンネル名", desc: "管理画面上の識別名（任意）", required: true },
                { field: "チャンネルID", desc: "LINE Developers Console の Basic settings にある数字 ID", required: true },
                { field: "チャンネルシークレット", desc: "Webhook 署名検証に使用するシークレットキー", required: true },
                { field: "アクセストークン", desc: "メッセージ送信に使用するトークン（長期トークン推奨）", required: true },
                { field: "管理グループID", desc: "通知を送る LINE グループの ID（任意）" },
              ]}
            />
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardHeader>
            <SectionHeader icon={MessageSquare} title="質問管理" href="/questions" />
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              ユーザーに送信する質問を作成・管理します。質問には「質問キー」を設定し、計算式やルート条件から参照します。
            </p>
            <FieldTable
              rows={[
                { field: "質問キー", desc: "計算式・条件から参照するユニーク識別子（英数字・アンダースコア）", required: true },
                { field: "質問文", desc: "ユーザーに送信するメッセージ本文", required: true },
                { field: "質問タイプ", desc: "text（自由入力）/ button（ボタン選択）/ image_carousel（画像付き選択）", required: true },
                { field: "チャンネル", desc: "この質問が属するチャンネル", required: true },
                { field: "数値入力", desc: "ON にするとユーザーの入力を数値として保存（計算に使用する場合は ON）" },
                { field: "選択肢", desc: "button / image_carousel タイプの場合に設定（ラベル・値・画像URL）" },
                { field: "表示条件", desc: "特定の回答があった場合のみこの質問を送信する条件（任意）" },
                { field: "エラーメッセージ", desc: "選択肢ごとに設定可。設定すると回答を保存せず同じ質問を再送信する" },
              ]}
            />
            <Note>
              <strong>質問タイプの使い分け</strong>：自由入力（年齢・日数など）は <code>text</code>、
              選択肢が 4 件以内なら <code>button</code>、5 件以上または画像付きなら{" "}
              <code>image_carousel</code>（最大 10 件）を使用してください。
            </Note>
          </CardContent>
        </Card>

        {/* Routes */}
        <Card>
          <CardHeader>
            <SectionHeader icon={GitBranch} title="ルート管理" href="/routes" />
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              質問を送る順序（フロー）を定義します。各ルートはチャンネルに紐づき、質問のリストと条件分岐を設定します。
            </p>
            <FieldTable
              rows={[
                { field: "ルート名", desc: "管理画面上の識別名", required: true },
                { field: "チャンネル", desc: "このルートが属するチャンネル", required: true },
                { field: "質問リスト", desc: "送信する質問を順番に並べたリスト（ドラッグで並べ替え可）", required: true },
                { field: "表示条件", desc: "質問ごとに「この質問を表示する条件」を設定可能。条件を満たさない質問はスキップされる" },
                { field: "次ルートへの条件", desc: "特定の回答があった場合に別ルートへ分岐する設定（任意）" },
              ]}
            />
            <div className="space-y-2">
              <p className="font-medium">条件設定の書き方</p>
              <div className="rounded-md bg-muted p-3 font-mono text-xs space-y-1">
                <p>{"{ \"question_key\": \"injury_type\", \"operator\": \"eq\", \"value\": \"death\" }"}</p>
                <p className="text-muted-foreground">// injury_type の回答が「death」と等しい場合</p>
              </div>
              <p className="text-muted-foreground">
                演算子: <code>eq</code>（等しい）/ <code>neq</code>（等しくない）/ <code>gt</code>（より大きい）/{" "}
                <code>gte</code>（以上）/ <code>lt</code>（未満）/ <code>lte</code>（以下）
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Flow View */}
        <Card>
          <CardHeader>
            <SectionHeader icon={Workflow} title="フロービュー" href="/flow" />
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              登録されたルートと質問の関係をグラフで可視化します。条件分岐の全体像を一画面で確認できます。
            </p>
            <Note>
              フロービューは参照専用です。編集はルート管理・質問管理から行ってください。
            </Note>
          </CardContent>
        </Card>

        {/* Formulas */}
        <Card>
          <CardHeader>
            <SectionHeader icon={Calculator} title="計算式" href="/formulas" />
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              ユーザーの回答をもとに数値を計算するロジックを定義します。計算結果は結果表示設定で整形してユーザーに送信されます。
            </p>
            <FieldTable
              rows={[
                { field: "計算式名", desc: "一意の識別名（他の計算式から参照可）", required: true },
                { field: "チャンネル", desc: "この計算式が属するチャンネル", required: true },
                { field: "式（expression）", desc: "Python の数式。変数名は「変数」セクションで定義したキーを使用", required: true },
                { field: "変数", desc: "式で使う変数の定義。回答・別計算式・定数・ルックアップ・条件分岐の各ソースが選択可" },
                { field: "表示単位", desc: "結果に付与する単位（例: 円、万円、点）" },
                { field: "スケール", desc: "表示時の除数（例: 10000 にすると「万円」表示）" },
                { field: "小数点桁数", desc: "表示する小数点以下の桁数" },
                { field: "結果ラベル", desc: "結果表示時のラベル文字列" },
                { field: "表示条件", desc: "条件を満たさない場合はこの計算式をスキップ" },
                { field: "表示順", desc: "結果メッセージ内での表示順序" },
              ]}
            />
            <div className="space-y-2">
              <p className="font-medium">変数ソースの種類</p>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {[
                    ["answer", "ユーザーの回答値（question_key を指定）"],
                    ["constant", "固定数値"],
                    ["formula", "他の計算式の結果"],
                    ["lookup", "ルックアップテーブルの検索結果"],
                    ["conditional", "条件に応じて異なる値を返す"],
                  ].map(([src, desc]) => (
                    <tr key={src} className="border-b last:border-0">
                      <td className="py-1 pr-3 font-mono">{src}</td>
                      <td className="py-1 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-muted-foreground">
                使用可能な関数: <code>min</code> / <code>max</code> / <code>round</code> / <code>abs</code> /{" "}
                <code>int</code> / <code>float</code> / <code>floor</code> / <code>ceil</code>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Global Constants */}
        <Card>
          <CardHeader>
            <SectionHeader icon={Hash} title="グローバル定数" href="/global-constants" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              全チャンネル共通で参照できる定数を管理します。法律改正などで変わる基準値（日額・係数など）を一か所で管理し、
              複数の計算式で共有できます。
            </p>
            <FieldTable
              rows={[
                { field: "定数名", desc: "計算式内で変数名として参照するキー（英数字・アンダースコア）", required: true },
                { field: "値", desc: "数値（整数・小数）", required: true },
                { field: "有効", desc: "OFF にすると計算式から参照されなくなる" },
              ]}
            />
            <Note>
              計算式の変数に同名の定義がある場合、計算式側の変数が優先されます（グローバル定数は上書き可）。
            </Note>
          </CardContent>
        </Card>

        {/* Lookup */}
        <Card>
          <CardHeader>
            <SectionHeader icon={TableProperties} title="ルックアップ" href="/lookups" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              複数のキーから数値を検索するテーブルを定義します。後遺障害等級・労働能力喪失率・慰謝料基準額など、
              条件の組み合わせで値が変わる場合に使用します。
            </p>
            <div className="space-y-2">
              <Step n={1}>「ルックアップ」→「新規作成」でテーブル名を入力します。</Step>
              <Step n={2}>
                キー列の定義を追加します（例: <code>grade</code>・<code>age</code>）。
              </Step>
              <Step n={3}>
                データ行を追加します。各行にキーの値の組み合わせと結果値を入力します。
              </Step>
            </div>
            <Note>
              計算式の変数ソース「lookup」で <code>table_name</code> と <code>key_mappings</code> を指定することで参照できます。
              キーの値は文字列として完全一致で検索されます。
            </Note>
          </CardContent>
        </Card>

        {/* Result Configs */}
        <Card>
          <CardHeader>
            <SectionHeader icon={BarChart2} title="結果表示設定" href="/result-configs" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              シミュレーション完了時にユーザーへ送信する結果メッセージの構成を定義します。
              計算式の結果をテキストやカルーセルで表示できます。
            </p>
            <FieldTable
              rows={[
                { field: "チャンネル", desc: "この設定が属するチャンネル", required: true },
                { field: "ヘッダーメッセージ", desc: "結果表示前に送信するメッセージ（任意）" },
                { field: "フッターメッセージ", desc: "結果表示後に送信するメッセージ（任意）" },
                { field: "結果フォーマット", desc: "text（テキスト）/ carousel（カルーセル）で各計算式の結果を表示" },
              ]}
            />
          </CardContent>
        </Card>

        {/* Delivery */}
        <Card>
          <CardHeader>
            <SectionHeader icon={Clock} title="ステップ配信" href="/delivery" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              シミュレーション完了後、一定期間が経過したユーザーに自動でメッセージを送信する機能です。
              フォローアップや案内を定期的に送ることができます。
            </p>
            <FieldTable
              rows={[
                { field: "チャンネル", desc: "配信対象のチャンネル", required: true },
                { field: "配信名", desc: "管理用の識別名", required: true },
                { field: "送信タイミング", desc: "完了からの経過日数（例: 3 = 完了 3 日後）", required: true },
                { field: "メッセージ", desc: "送信するメッセージ本文", required: true },
                { field: "有効", desc: "OFF にすると配信がスキップされる" },
              ]}
            />
            <Note>
              配信は毎日午前 9 時（JST）に実行されます。対象はシミュレーション完了済みのユーザーです。
            </Note>
          </CardContent>
        </Card>

        {/* Sessions */}
        <Card>
          <CardHeader>
            <SectionHeader icon={Users} title="セッション" href="/sessions" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              ユーザーごとのシミュレーション履歴を確認できます。回答内容・計算結果・ステータスを参照可能です。
            </p>
            <table className="w-full text-xs border-collapse mt-2">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 pr-4 font-medium">ステータス</th>
                  <th className="text-left py-1 font-medium">意味</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["進行中", "質問途中のセッション"],
                  ["完了", "最後まで回答しシミュレーション結果が送信された"],
                  ["離脱", "途中でブロック・一定期間無回答などで終了"],
                ].map(([s, d]) => (
                  <tr key={s} className="border-b last:border-0">
                    <td className="py-1 pr-4">{s}</td>
                    <td className="py-1 text-muted-foreground">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <SectionHeader icon={Bell} title="通知ログ" href="/notifications" />
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              管理者グループへ送信された通知メッセージの履歴を表示します。
              エラー発生時や重要イベント（ユーザーの友だち追加など）の通知が記録されます。
            </p>
          </CardContent>
        </Card>

        {/* Accounts */}
        <Card>
          <CardHeader>
            <SectionHeader icon={UserCog} title="アカウント管理" href="/accounts" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              管理画面にログインできるアカウントを管理します。権限レベルに応じて操作できる範囲が異なります。
            </p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 pr-4 font-medium">ロール</th>
                  <th className="text-left py-1 font-medium">権限</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["super_admin", "全チャンネルへのフルアクセス・アカウント管理"],
                  ["admin", "担当チャンネルの編集・設定変更"],
                  ["viewer", "担当チャンネルの参照のみ（変更不可）"],
                ].map(([role, perm]) => (
                  <tr key={role} className="border-b last:border-0">
                    <td className="py-1 pr-4 font-mono">{role}</td>
                    <td className="py-1 text-muted-foreground">{perm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Note>
              アカウントの招待は Supabase ダッシュボード（Authentication → Users → Invite）から行います。
              招待後、管理画面のアカウント管理でロールとチャンネルを割り当ててください。
            </Note>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          賠償シミュレーター 管理マニュアル — {new Date().getFullYear()}
        </p>
      </div>
    </>
  );
}
