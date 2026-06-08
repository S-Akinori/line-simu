"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "スーパー管理者",
  admin: "管理者",
  viewer: "閲覧者",
};

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  super_admin: "default",
  admin: "secondary",
  viewer: "outline",
};

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [lineNotifyId, setLineNotifyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email ?? "");

      const { data } = await supabase
        .from("profiles")
        .select("display_name, role, line_notify_user_id")
        .eq("id", user.id)
        .single();

      if (data) {
        setDisplayName(data.display_name ?? "");
        setRole(data.role ?? "");
        setLineNotifyId(data.line_notify_user_id ?? "");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: displayName,
        line_notify_user_id: lineNotifyId,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "保存に失敗しました");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground p-6">読み込み中...</p>;
  }

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">プロフィール設定</h1>
        <p className="text-sm text-muted-foreground mt-1">
          表示名とLINE通知設定を変更できます
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>アカウント情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">メールアドレス</span>
            <span>{email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">ロール</span>
            <Badge variant={ROLE_VARIANTS[role] ?? "outline"}>
              {ROLE_LABELS[role] ?? role}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>設定を編集</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">表示名</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="山田 太郎"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="line-id">LINE ユーザーID</Label>
              <Input
                id="line-id"
                value={lineNotifyId}
                onChange={(e) => setLineNotifyId(e.target.value)}
                placeholder="Uxxxxxxxxxxxx"
              />
              <p className="text-xs text-muted-foreground">
                シミュレーション完了などの通知を受け取る LINE ユーザーIDです。
                該当の LINE 公式アカウントを友だち追加している必要があります。
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {saved && <p className="text-sm text-green-600">保存しました</p>}

            <Button type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
