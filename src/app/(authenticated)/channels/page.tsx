"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Eye, EyeOff, Copy, Trash2, Code2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const GAS_CODE = `/**
 * LINE シミュレーター - 回答データ スプレッドシート同期
 *
 * 【セットアップ手順】
 * 1. このコードを全て貼り付けて保存（Ctrl+S）
 * 2. 「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
 *    - 次のユーザーとして実行: 自分
 *    - アクセスできるユーザー: 全員
 * 3. デプロイして表示される URL を管理画面の「スプレッドシート連携URL」に貼り付ける
 */

const SHEET_NAME = "回答データ";
const FIXED_KEYS = ["answered_at", "line_user_id", "display_name"];
const FIXED_LABELS = ["回答日時", "ユーザーID", "ユーザー名"];

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    updateSpreadsheet(payload);
    return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function updateSpreadsheet(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    initializeHeaders(sheet);
  }
  if (sheet.getLastColumn() === 0 || sheet.getRange(1, 1).getValue() === "") {
    initializeHeaders(sheet);
  }
  const answers = payload.answers || {};
  for (const [key, info] of Object.entries(answers)) {
    ensureColumn(sheet, key, info.label || key);
  }
  const targetRow = findOrCreateRow(sheet, payload.line_user_id);
  const lastCol = sheet.getLastColumn();
  const headerRow2 = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  // 既存行の値を読み込む（未回答の列を空欄で上書きしないよう保持）
  let rowValues;
  if (targetRow <= sheet.getLastRow()) {
    rowValues = sheet.getRange(targetRow, 1, 1, lastCol).getValues()[0];
    while (rowValues.length < lastCol) rowValues.push("");
  } else {
    rowValues = new Array(lastCol).fill("");
  }
  setByKey(rowValues, headerRow2, "answered_at", payload.answered_at || "");
  setByKey(rowValues, headerRow2, "line_user_id", payload.line_user_id || "");
  setByKey(rowValues, headerRow2, "display_name", payload.display_name || "");
  for (const [key, info] of Object.entries(answers)) {
    setByKey(rowValues, headerRow2, key, info.value || "");
  }
  sheet.getRange(targetRow, 1, 1, lastCol).setValues([rowValues]);
}

function initializeHeaders(sheet) {
  for (let i = 0; i < FIXED_KEYS.length; i++) {
    sheet.getRange(1, i + 1).setValue(FIXED_LABELS[i]);
    sheet.getRange(2, i + 1).setValue(FIXED_KEYS[i]);
  }
  sheet.getRange(1, 1, 1, FIXED_KEYS.length).setFontWeight("bold");
  sheet.getRange(2, 1, 1, FIXED_KEYS.length).setBackground("#f0f0f0");
}

function ensureColumn(sheet, key, label) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return;
  const headerRow2 = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  if (headerRow2.indexOf(key) === -1) {
    const newCol = lastCol + 1;
    sheet.getRange(1, newCol).setValue(label).setFontWeight("bold");
    sheet.getRange(2, newCol).setValue(key).setBackground("#f0f0f0");
  }
}

function findOrCreateRow(sheet, lineUserId) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 3 || lastCol === 0) return 3;
  const headerRow2 = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  const userIdColIndex = headerRow2.indexOf("line_user_id");
  if (userIdColIndex === -1) return lastRow + 1;
  const userIdCol = userIdColIndex + 1;
  const dataRange = sheet.getRange(3, userIdCol, lastRow - 2, 1).getValues();
  for (let i = 0; i < dataRange.length; i++) {
    if (dataRange[i][0] === lineUserId) return i + 3;
  }
  return lastRow + 1;
}

function setByKey(rowValues, headerKeys, key, value) {
  const idx = headerKeys.indexOf(key);
  if (idx !== -1) rowValues[idx] = value;
}

function testUpdate() {
  const testPayload = {
    line_user_id: "U_test_001",
    display_name: "テストユーザー",
    answered_at: new Date().toISOString(),
    answers: {
      accident_type: { label: "事故の種類", value: "追突" },
      injury_level: { label: "怪我の程度", value: "軽傷" },
      hospital_days: { label: "通院日数", value: "30" },
    },
  };
  updateSpreadsheet(testPayload);
  Logger.log("テスト完了。スプレッドシートを確認してください。");
}`;

interface KeywordRoute {
  keyword: string;
  route_id: string | null;
}

interface RouteOption {
  id: string;
  name: string;
  description: string | null;
}

interface ChannelListItem {
  id: string;
  name: string;
  webhook_path: string;
  is_active: boolean;
  created_at: string;
}

interface ChannelFull extends ChannelListItem {
  channel_id: string;
  channel_secret: string;
  channel_access_token: string;
  gas_webhook_url: string | null;
  start_keywords: string[];
  keyword_routes: KeywordRoute[];
}

type FormState = Omit<ChannelFull, "id" | "created_at" | "start_keywords"> & {
  copy_from_channel_id?: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  channel_id: "",
  channel_secret: "",
  channel_access_token: "",
  gas_webhook_url: "",
  webhook_path: "",
  keyword_routes: [{ keyword: "慰謝料計算をする", route_id: null }],
  is_active: true,
  copy_from_channel_id: "",
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState<ChannelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [gasDialogOpen, setGasDialogOpen] = useState(false);
  const [gasCopied, setGasCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChannelListItem | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

  async function fetchChannels() {
    setLoading(true);
    const res = await fetch("/api/channels");
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "取得に失敗しました");
    } else {
      const data = await res.json();
      setChannels(data.channels);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchChannels();
  }, []);

  async function fetchRoutesForChannel(channelId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("routes")
      .select("id, name, description")
      .eq("channel_id", channelId)
      .order("sort_order", { ascending: true });
    setRoutes(data ?? []);
  }

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setRoutes([]);
    setShowSecret(false);
    setShowToken(false);
    setDialogOpen(true);
  }

  async function openEdit(channel: ChannelListItem) {
    setShowSecret(false);
    setShowToken(false);
    const res = await fetch(`/api/channels/${channel.id}`);
    if (!res.ok) {
      alert("チャンネル情報の取得に失敗しました（スーパー管理者権限が必要です）");
      return;
    }
    const data = await res.json();
    const c = data.channel as ChannelFull;

    // Build keyword_routes from start_keyword_routes
    const keywordRoutes: KeywordRoute[] = (c.keyword_routes ?? []).map(
      (r: { keyword: string; route_id: string | null }) => ({
        keyword: r.keyword,
        route_id: r.route_id ?? null,
      })
    );

    setEditId(c.id);
    setForm({
      name: c.name,
      channel_id: c.channel_id,
      channel_secret: c.channel_secret,
      channel_access_token: c.channel_access_token,
      gas_webhook_url: c.gas_webhook_url ?? "",
      webhook_path: c.webhook_path,
      keyword_routes: keywordRoutes.length > 0
        ? keywordRoutes
        : [{ keyword: "", route_id: null }],
      is_active: c.is_active,
    });

    await fetchRoutesForChannel(c.id);
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const validRoutes = form.keyword_routes.filter((r) => r.keyword.trim().length > 0);
    const start_keywords = validRoutes.map((r) => r.keyword.trim());

    const payload = {
      name: form.name,
      channel_id: form.channel_id,
      channel_secret: form.channel_secret,
      channel_access_token: form.channel_access_token,
      gas_webhook_url: form.gas_webhook_url || null,
      webhook_path: form.webhook_path,
      start_keywords,
      is_active: form.is_active,
      keyword_routes: validRoutes,
    };

    if (editId) {
      const res = await fetch(`/api/channels/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setDialogOpen(false);
        await fetchChannels();
      } else {
        const data = await res.json();
        alert(`エラー: ${data.error}`);
      }
    } else {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, keyword_routes: undefined }),
      });
      if (res.ok) {
        const created = await res.json();
        // Save keyword_routes after channel creation
        if (validRoutes.some((r) => r.route_id)) {
          await fetch(`/api/channels/${created.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keyword_routes: validRoutes }),
          });
        }
        // Copy data from source channel if specified
        if (form.copy_from_channel_id) {
          const copyRes = await fetch(
            `/api/channels/${form.copy_from_channel_id}/copy`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ target_channel_id: created.id }),
            }
          );
          if (!copyRes.ok) {
            const copyErr = await copyRes.json();
            alert(`データコピーエラー: ${copyErr.error}`);
          }
        }
        setDialogOpen(false);
        await fetchChannels();
      } else {
        const data = await res.json();
        alert(`エラー: ${data.error}`);
      }
    }
    setSaving(false);
  }

  async function handleToggleActive(channel: ChannelListItem) {
    const action = channel.is_active ? "無効化" : "有効化";
    if (!confirm(`チャンネル「${channel.name}」を${action}しますか？`)) return;

    await fetch(`/api/channels/${channel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !channel.is_active }),
    });
    await fetchChannels();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/channels/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(`削除に失敗しました: ${data.error}`);
    }
    setDeleteTarget(null);
    setDeleteConfirmName("");
    await fetchChannels();
  }

  function copyWebhookUrl(webhook_path: string) {
    const url = `${backendUrl}/webhook/${webhook_path}`;
    navigator.clipboard.writeText(url);
  }

  function copyGasCode() {
    navigator.clipboard.writeText(GAS_CODE);
    setGasCopied(true);
    setTimeout(() => setGasCopied(false), 2000);
  }

  function updateRoute(index: number, field: keyof KeywordRoute, value: string | null) {
    setForm((prev) => ({
      ...prev,
      keyword_routes: prev.keyword_routes.map((r, i) =>
        i === index ? { ...r, [field]: value } : r
      ),
    }));
  }

  function addRoute() {
    setForm((prev) => ({
      ...prev,
      keyword_routes: [...prev.keyword_routes, { keyword: "", route_id: null }],
    }));
  }

  function removeRoute(index: number) {
    setForm((prev) => ({
      ...prev,
      keyword_routes: prev.keyword_routes.filter((_, i) => i !== index),
    }));
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">
          アクセス権限がありません。管理者以上の権限が必要です。
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">LINEアカウント管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            連携するLINE公式アカウントを管理します
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setGasDialogOpen(true)}>
            <Code2 className="mr-2 h-4 w-4" />
            GASコード
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            アカウントを追加
          </Button>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? "LINEアカウントを編集" : "LINEアカウントを追加"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {!editId && (
              <div className="space-y-2">
                <Label htmlFor="ch-copy-from">コピー元アカウント（任意）</Label>
                <Select
                  value={form.copy_from_channel_id || "__none__"}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      copy_from_channel_id: v === "__none__" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger id="ch-copy-from">
                    <SelectValue placeholder="コピーしない（空で作成）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      コピーしない（空で作成）
                    </SelectItem>
                    {channels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        {ch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  選択したアカウントの質問・計算式・ルートなどをコピーします
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ch-name">アカウント名</Label>
              <Input
                id="ch-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="交通事故シミュレーター"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ch-webhook-path">Webhookパス</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  /webhook/
                </span>
                <Input
                  id="ch-webhook-path"
                  required
                  value={form.webhook_path}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      webhook_path: e.target.value.replace(/[^a-z0-9_-]/g, ""),
                    })
                  }
                  placeholder="traffic-accident"
                />
              </div>
              {backendUrl && (
                <p className="text-xs text-muted-foreground">
                  Webhook URL: {backendUrl}/webhook/{form.webhook_path || "..."}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ch-channel-id">チャンネルID</Label>
              <Input
                id="ch-channel-id"
                required
                value={form.channel_id}
                onChange={(e) => setForm({ ...form, channel_id: e.target.value })}
                placeholder="1234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ch-secret">チャンネルシークレット</Label>
              <div className="relative">
                <Input
                  id="ch-secret"
                  required
                  type={showSecret ? "text" : "password"}
                  value={form.channel_secret}
                  onChange={(e) =>
                    setForm({ ...form, channel_secret: e.target.value })
                  }
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ch-token">チャンネルアクセストークン</Label>
              <div className="relative">
                <Input
                  id="ch-token"
                  required
                  type={showToken ? "text" : "password"}
                  value={form.channel_access_token}
                  onChange={(e) =>
                    setForm({ ...form, channel_access_token: e.target.value })
                  }
                  placeholder="xxxxxxxxxxxxxxxx..."
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ch-gas-url">スプレッドシート連携URL（任意）</Label>
              <Input
                id="ch-gas-url"
                value={form.gas_webhook_url ?? ""}
                onChange={(e) =>
                  setForm({ ...form, gas_webhook_url: e.target.value })
                }
                placeholder="https://script.google.com/macros/s/..."
              />
              <p className="text-xs text-muted-foreground">
                Google Apps Script のウェブアプリURLを設定すると、回答をリアルタイムでスプレッドシートに記録します
              </p>
            </div>

            {/* Keyword routing table */}
            <div className="space-y-2">
              <Label>開始キーワード</Label>
              <p className="text-xs text-muted-foreground">
                いずれかを受信するとセッションをリセットして指定のルートから再開します。ルート未指定の場合は最初のルートから開始します。
              </p>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">キーワード</th>
                      <th className="text-left px-3 py-2 font-medium">開始ルート</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.keyword_routes.map((route, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2">
                          <Input
                            value={route.keyword}
                            onChange={(e) => updateRoute(index, "keyword", e.target.value)}
                            placeholder="慰謝料計算をする"
                            className="h-8"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={route.route_id ?? "__default__"}
                            onValueChange={(v) =>
                              updateRoute(index, "route_id", v === "__default__" ? null : v)
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="最初のルート（デフォルト）" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__default__">最初のルート（デフォルト）</SelectItem>
                              {routes.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.name}
                                  {r.description ? ` — ${r.description.slice(0, 20)}${r.description.length > 20 ? "…" : ""}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {routes.length === 0 && editId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              ルートが未作成です（ルート管理から追加できます）
                            </p>
                          )}
                          {!editId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              チャンネル作成後にルートを設定できます
                            </p>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeRoute(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addRoute}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                キーワードを追加
              </Button>
            </div>

            {editId && (
              <div className="flex items-center gap-3">
                <Switch
                  id="ch-active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label htmlFor="ch-active">有効</Label>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "保存中..." : editId ? "更新" : "追加"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirmName("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>アカウントを削除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            アカウント「<strong>{deleteTarget?.name}</strong>」とその全データ（質問・計算式・ルート・回答履歴など）を完全に削除します。この操作は取り消せません。
          </p>
          <div className="space-y-2">
            <Label>確認のためアカウント名を入力してください</Label>
            <Input
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={deleteTarget?.name}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirmName("");
              }}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmName !== deleteTarget?.name}
              onClick={handleDelete}
            >
              削除する
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* GAS Code Dialog */}
      <Dialog open={gasDialogOpen} onOpenChange={setGasDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Google Apps Script コード</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Google スプレッドシートの「拡張機能 → Apps Script」に以下のコードを貼り付けてデプロイしてください。
            デプロイ後に発行されるURLを、アカウント編集の「スプレッドシート連携URL」に設定します。
          </p>
          <div className="relative flex-1 min-h-0">
            <pre className="h-96 overflow-auto rounded-md bg-muted p-4 text-xs font-mono leading-relaxed">
              {GAS_CODE}
            </pre>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setGasDialogOpen(false)}>
              閉じる
            </Button>
            <Button onClick={copyGasCode}>
              <Copy className="h-4 w-4 mr-2" />
              {gasCopied ? "コピーしました！" : "コードをコピー"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>LINEアカウント一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">読み込み中...</p>
          ) : channels.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              LINEアカウントが登録されていません。「アカウントを追加」から登録してください。
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>アカウント名</TableHead>
                  <TableHead>Webhook URL</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((ch) => (
                  <TableRow key={ch.id} className={!ch.is_active ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{ch.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          /webhook/{ch.webhook_path}
                        </code>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => copyWebhookUrl(ch.webhook_path)}
                          title="URLをコピー"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ch.is_active ? "default" : "outline"}>
                        {ch.is_active ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ch.created_at).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(ch)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          編集
                        </Button>
                        <Button
                          size="sm"
                          variant={ch.is_active ? "destructive" : "outline"}
                          onClick={() => handleToggleActive(ch)}
                        >
                          {ch.is_active ? "無効化" : "有効化"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setDeleteTarget(ch);
                            setDeleteConfirmName("");
                          }}
                          title="アカウントを削除"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
