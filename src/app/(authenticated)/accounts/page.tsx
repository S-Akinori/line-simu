"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { LineChannel } from "@/types/database";
import { UserPlus, Pencil, PowerOff, Network, Trash2 } from "lucide-react";

type UserRole = "super_admin" | "admin" | "viewer";

interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  is_active: boolean;
  line_notify_user_id: string | null;
  created_at: string;
  channel_ids: string[];
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "スーパー管理者",
  admin: "管理者",
  viewer: "閲覧者",
};

const ROLE_VARIANTS: Record<UserRole, "default" | "secondary" | "outline"> = {
  super_admin: "default",
  admin: "secondary",
  viewer: "outline",
};

export default function AccountsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [channels, setChannels] = useState<LineChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [channelUser, setChannelUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [savingChannels, setSavingChannels] = useState(false);
  const [lineNotifyUser, setLineNotifyUser] = useState<AdminUser | null>(null);
  const [lineNotifyInput, setLineNotifyInput] = useState("");
  const [savingLineNotify, setSavingLineNotify] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("admin");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "取得に失敗しました");
    } else {
      const data = await res.json();
      setUsers(data.users);
    }
    setLoading(false);
  }

  async function fetchChannels() {
    const supabase = createClient();
    const { data } = await supabase
      .from("line_channels")
      .select("id, name, channel_id, webhook_path, is_active, created_at, updated_at, channel_secret, channel_access_token")
      .order("name", { ascending: true });
    if (data) setChannels(data as LineChannel[]);
  }

  useEffect(() => {
    fetchUsers();
    fetchChannels();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole, display_name: inviteName }),
    });
    if (res.ok) {
      setInviteOpen(false);
      setInviteEmail(""); setInviteName(""); setInviteRole("admin");
      await fetchUsers();
    } else {
      const data = await res.json();
      alert(`エラー: ${data.error}`);
    }
    setInviting(false);
  }

  async function handleRoleChange(userId: string, role: UserRole) {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setEditUser(null);
    await fetchUsers();
  }

  async function handleDeactivate(userId: string, isActive: boolean) {
    const action = isActive ? "無効化" : "有効化";
    if (!confirm(`このアカウントを${action}しますか？`)) return;
    await fetch(`/api/admin/users/${userId}`, {
      method: isActive ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: isActive ? undefined : JSON.stringify({ is_active: true }),
    });
    await fetchUsers();
  }

  async function handleDelete() {
    if (!deleteUser) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/users/${deleteUser.id}?permanent=true`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      alert(`エラー: ${data.error}`);
    } else {
      setDeleteUser(null);
      await fetchUsers();
    }
    setDeleting(false);
  }

  function openChannelDialog(user: AdminUser) {
    setChannelUser(user);
    setSelectedChannelIds([...user.channel_ids]);
  }

  async function handleSaveChannels() {
    if (!channelUser) return;
    setSavingChannels(true);
    await fetch(`/api/admin/users/${channelUser.id}/channels`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel_ids: selectedChannelIds }),
    });
    setSavingChannels(false);
    setChannelUser(null);
    await fetchUsers();
  }

  function toggleChannel(channelId: string) {
    setSelectedChannelIds((prev) =>
      prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]
    );
  }

  function openLineNotifyDialog(user: AdminUser) {
    setLineNotifyUser(user);
    setLineNotifyInput(user.line_notify_user_id ?? "");
  }

  async function handleSaveLineNotify() {
    if (!lineNotifyUser) return;
    setSavingLineNotify(true);
    await fetch(`/api/admin/users/${lineNotifyUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line_notify_user_id: lineNotifyInput }),
    });
    setSavingLineNotify(false);
    setLineNotifyUser(null);
    await fetchUsers();
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">
          アクセス権限がありません。スーパー管理者のみがアカウント管理を行えます。
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">アカウント管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理画面にアクセスできるアカウントを管理します
          </p>
        </div>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              アカウントを招待
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しいアカウントを招待</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">メールアドレス</Label>
                <Input
                  id="invite-email" type="email" required
                  value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-name">表示名（任意）</Label>
                <Input
                  id="invite-name"
                  value={inviteName} onChange={(e) => setInviteName(e.target.value)}
                  placeholder="山田 太郎"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">ロール</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                  <SelectTrigger id="invite-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">スーパー管理者</SelectItem>
                    <SelectItem value="admin">管理者</SelectItem>
                    <SelectItem value="viewer">閲覧者</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  スーパー管理者: 全チャンネル管理 ／
                  管理者: 担当チャンネルの編集 ／
                  閲覧者: 担当チャンネルの閲覧のみ
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={inviting}>
                  {inviting ? "招待中..." : "招待メールを送信"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ロールを変更</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{editUser.email}</p>
              <Select
                defaultValue={editUser.role}
                onValueChange={(v) => handleRoleChange(editUser.id, v as UserRole)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">スーパー管理者</SelectItem>
                  <SelectItem value="admin">管理者</SelectItem>
                  <SelectItem value="viewer">閲覧者</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>アカウントを完全削除</DialogTitle>
          </DialogHeader>
          {deleteUser && (
            <div className="space-y-4">
              <p className="text-sm">
                <span className="font-medium">{deleteUser.display_name ?? deleteUser.email}</span> を完全に削除します。
              </p>
              <p className="text-sm text-destructive">
                この操作は元に戻せません。ログイン情報・設定データがすべて削除されます。
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteUser(null)}>
                  キャンセル
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "削除中..." : "完全削除"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* LINE notify user ID dialog */}
      <Dialog open={!!lineNotifyUser} onOpenChange={(open) => !open && setLineNotifyUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>LINE通知設定</DialogTitle>
          </DialogHeader>
          {lineNotifyUser && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{lineNotifyUser.email}</p>
              <div className="space-y-2">
                <Label htmlFor="line-notify-id">LINE ユーザーID</Label>
                <Input
                  id="line-notify-id"
                  value={lineNotifyInput}
                  onChange={(e) => setLineNotifyInput(e.target.value)}
                  placeholder="Uxxxxxxxxxxxx"
                />
                <p className="text-xs text-muted-foreground">
                  シミュレーション完了などの通知を受け取るLINEユーザーIDを設定します。
                  該当のLINE公式アカウントを友だち追加している必要があります。
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setLineNotifyUser(null)}>
                  キャンセル
                </Button>
                <Button onClick={handleSaveLineNotify} disabled={savingLineNotify}>
                  {savingLineNotify ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Channel assignment dialog */}
      <Dialog open={!!channelUser} onOpenChange={(open) => !open && setChannelUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>担当チャンネルを設定</DialogTitle>
          </DialogHeader>
          {channelUser && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{channelUser.email}</p>
              {channelUser.role === "super_admin" ? (
                <p className="text-sm text-muted-foreground">
                  スーパー管理者はすべてのチャンネルに自動でアクセスできます。
                </p>
              ) : (
                <>
                  <div className="space-y-2 max-h-64 overflow-y-auto rounded border p-2">
                    {channels.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">チャンネルがありません</p>
                    ) : (
                      channels.map((ch) => (
                        <label
                          key={ch.id}
                          className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedChannelIds.includes(ch.id)}
                            onCheckedChange={() => toggleChannel(ch.id)}
                          />
                          <span className="text-sm">{ch.name}</span>
                          {!ch.is_active && (
                            <Badge variant="outline" className="text-xs">無効</Badge>
                          )}
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {channelUser.role === "admin"
                      ? "選択したチャンネルの編集権限が付与されます"
                      : "選択したチャンネルの閲覧権限が付与されます"}
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setChannelUser(null)}>
                      キャンセル
                    </Button>
                    <Button onClick={handleSaveChannels} disabled={savingChannels}>
                      {savingChannels ? "保存中..." : "保存"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader><CardTitle>アカウント一覧</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">読み込み中...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead>ロール</TableHead>
                  <TableHead>担当チャンネル</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className={!u.is_active ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{u.display_name ?? "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_VARIANTS[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      {u.role === "super_admin" ? (
                        <span className="text-xs text-muted-foreground">すべて</span>
                      ) : u.channel_ids.length === 0 ? (
                        <span className="text-xs text-muted-foreground">未割り当て</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.channel_ids.map((cid) => {
                            const ch = channels.find((c) => c.id === cid);
                            return ch ? (
                              <Badge key={cid} variant="outline" className="text-xs">
                                {ch.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "default" : "outline"}>
                        {u.is_active ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditUser(u)}>
                          <Pencil className="h-3 w-3 mr-1" />
                          ロール
                        </Button>
                        {u.role !== "super_admin" && (
                          <Button size="sm" variant="outline" onClick={() => openChannelDialog(u)}>
                            <Network className="h-3 w-3 mr-1" />
                            チャンネル
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={u.is_active ? "destructive" : "outline"}
                          onClick={() => handleDeactivate(u.id, u.is_active)}
                        >
                          <PowerOff className="h-3 w-3 mr-1" />
                          {u.is_active ? "無効化" : "有効化"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteUser(u)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          削除
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
