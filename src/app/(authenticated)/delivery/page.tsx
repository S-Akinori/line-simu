"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { StepDeliveryConfig, LineChannel } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";

const TRIGGER_LABELS: Record<string, string> = {
  inactivity: "非アクティブ",
  session_start: "セッション開始",
  specific_question: "特定質問",
  registration_delay: "登録後",
};

// delay_hours stored internally; UI shows days for registration_delay
function hoursToDisplayDays(hours: number): string {
  return String(Math.round(hours / 24));
}

function displayDaysToHours(days: string): number {
  return parseFloat(days) * 24;
}

type FormState = {
  line_channel_id: string;
  name: string;
  trigger: string;
  delay_hours: string;   // hours for non-registration; ignored for registration_delay
  delay_days: string;    // days for registration_delay
  max_sends: string;
  message_template: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  line_channel_id: "",
  name: "",
  trigger: "inactivity",
  delay_hours: "24",
  delay_days: "3",
  max_sends: "1",
  message_template: "",
  is_active: true,
};

export default function DeliveryPage() {
  const [configs, setConfigs] = useState<StepDeliveryConfig[]>([]);
  const [channels, setChannels] = useState<Pick<LineChannel, "id" | "name">[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("line_channels")
      .select("id, name")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setChannels(data as Pick<LineChannel, "id" | "name">[]);
          setSelectedChannelId(data[0].id);
        }
      });
  }, []);

  const fetchConfigs = useCallback(async () => {
    if (!selectedChannelId) {
      setConfigs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("step_delivery_configs")
      .select("*")
      .eq("line_channel_id", selectedChannelId)
      .order("created_at", { ascending: true });
    if (data) setConfigs(data as StepDeliveryConfig[]);
    setLoading(false);
  }, [selectedChannelId]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(config: StepDeliveryConfig) {
    setEditId(config.id);
    setForm({
      line_channel_id: config.line_channel_id ?? "",
      name: config.name,
      trigger: config.trigger,
      delay_hours: String(config.delay_hours),
      delay_days:
        config.trigger === "registration_delay"
          ? hoursToDisplayDays(config.delay_hours)
          : "3",
      max_sends: String(config.max_sends),
      message_template: config.message_template,
      is_active: config.is_active,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const supabase = createClient();
    const isRegistration = form.trigger === "registration_delay";
    const payload = {
      line_channel_id: form.line_channel_id || null,
      name: form.name,
      trigger: form.trigger,
      delay_hours: isRegistration
        ? displayDaysToHours(form.delay_days)
        : parseFloat(form.delay_hours),
      max_sends: parseInt(form.max_sends),
      message_template: form.message_template,
      is_active: form.is_active,
    };

    if (editId) {
      const { error } = await supabase
        .from("step_delivery_configs")
        .update(payload)
        .eq("id", editId);
      if (error) {
        alert("更新に失敗しました: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("step_delivery_configs")
        .insert(payload);
      if (error) {
        alert("作成に失敗しました: " + error.message);
        return;
      }
    }

    setDialogOpen(false);
    fetchConfigs();
  }

  async function handleDelete(id: string) {
    if (!confirm("この配信設定を削除しますか？")) return;
    setConfigs((prev) => prev.filter((c) => c.id !== id));
    const supabase = createClient();
    await supabase.from("step_delivery_configs").delete().eq("id", id);
  }

  function formatDelay(config: StepDeliveryConfig): string {
    if (config.trigger === "registration_delay") {
      const days = Math.round(config.delay_hours / 24);
      return `登録後${days}日`;
    }
    return `${config.delay_hours}時間`;
  }

  function channelName(id: string | null): string {
    if (!id) return "—";
    return channels.find((c) => c.id === id)?.name ?? "—";
  }

  const isRegistration = form.trigger === "registration_delay";
  const canSave =
    !!form.name &&
    !!form.message_template &&
    (!isRegistration || !!form.line_channel_id);

  if (loading) {
    return <p className="text-muted-foreground">読み込み中...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">ステップ配信設定</h1>
          <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="アカウントを選択" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新規設定
        </Button>
      </div>

      {configs.length === 0 ? (
        <p className="text-muted-foreground">配信設定がありません。</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>トリガー</TableHead>
              <TableHead>タイミング</TableHead>
              <TableHead>最大送信</TableHead>
              <TableHead>チャンネル</TableHead>
              <TableHead>メッセージ</TableHead>
              <TableHead>状態</TableHead>
              <TableHead className="w-24">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((config) => (
              <TableRow key={config.id}>
                <TableCell className="font-medium">{config.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {TRIGGER_LABELS[config.trigger] ?? config.trigger}
                  </Badge>
                </TableCell>
                <TableCell>{formatDelay(config)}</TableCell>
                <TableCell>{config.max_sends}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {channelName(config.line_channel_id)}
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm">
                  {config.message_template}
                </TableCell>
                <TableCell>
                  <Badge variant={config.is_active ? "default" : "secondary"}>
                    {config.is_active ? "有効" : "無効"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(config)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(config.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editId ? "配信設定を編集" : "新規配信設定"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名前</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>トリガータイプ</Label>
              <Select
                value={form.trigger}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, trigger: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inactivity">非アクティブ</SelectItem>
                  <SelectItem value="session_start">セッション開始</SelectItem>
                  <SelectItem value="specific_question">特定質問</SelectItem>
                  <SelectItem value="registration_delay">
                    登録後（日数指定）
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isRegistration ? (
              <>
                <div className="space-y-2">
                  <Label>対象チャンネル</Label>
                  <Select
                    value={form.line_channel_id}
                    onValueChange={(v) =>
                      setForm((prev) => ({ ...prev, line_channel_id: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="チャンネルを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((ch) => (
                        <SelectItem key={ch.id} value={ch.id}>
                          {ch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>登録からの日数</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      className="w-28"
                      value={form.delay_days}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          delay_days: e.target.value,
                        }))
                      }
                    />
                    <span className="text-sm text-muted-foreground">日後に送信</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    友だち追加から指定した日数が経過したユーザーに1回だけ送信します。
                  </p>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>遅延 (時間)</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={form.delay_hours}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        delay_hours: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>最大送信回数</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.max_sends}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        max_sends: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>メッセージテンプレート</Label>
              <Textarea
                placeholder={
                  isRegistration
                    ? "{{display_name}}さん、ご登録ありがとうございます！..."
                    : "{{display_name}}さん、まだ回答が完了していません..."
                }
                value={form.message_template}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    message_template: e.target.value,
                  }))
                }
              />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  使用できる変数（クリックで挿入）:
                </p>
                <div className="flex flex-wrap gap-1">
                  {[
                    { key: "display_name", label: "ユーザー名" },
                    { key: "channel_name", label: "アカウント名" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className="rounded bg-muted px-2 py-0.5 font-mono text-xs hover:bg-muted/80"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          message_template:
                            prev.message_template + `{{${key}}}`,
                        }))
                      }
                    >
                      {`{{${key}}}`}
                      <span className="ml-1 text-muted-foreground">
                        ({label})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, is_active: checked }))
                }
              />
              <Label>有効</Label>
            </div>

            <Button onClick={handleSave} disabled={!canSave}>
              {editId ? "更新" : "作成"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
