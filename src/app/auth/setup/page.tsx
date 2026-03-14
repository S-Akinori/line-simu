"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    }>
      <SetupForm />
    </Suspense>
  );
}

function SetupForm() {
  const searchParams = useSearchParams();
  const [sessionReady, setSessionReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Initialize session from invite link tokens
  useEffect(() => {
    const supabase = createClient();
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    async function initSession() {
      // Pattern A (new Supabase OTP): token_hash in URL query params
      if (tokenHash && type === "invite") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "invite",
        });
        if (error) {
          setInitError(error.message);
        } else {
          setSessionReady(true);
        }
        return;
      }

      // Pattern B (implicit flow): access_token in URL hash — Supabase client
      // picks it up automatically. Check immediately then wait for auth change.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
        return;
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
        if (session) {
          setSessionReady(true);
          subscription.unsubscribe();
        }
      });

      // Timeout after 8 seconds
      const timer = setTimeout(() => {
        subscription.unsubscribe();
        setInitError("招待リンクが無効か期限切れです。管理者に再送を依頼してください。");
      }, 8000);

      return () => {
        clearTimeout(timer);
        subscription.unsubscribe();
      };
    }

    initSession();
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("パスワードが一致しません。");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上にしてください。");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Set password for the invited account
    const { error: pwError } = await supabase.auth.updateUser({ password });
    if (pwError) {
      setError(pwError.message);
      setLoading(false);
      return;
    }

    // Save display name to profile
    if (displayName.trim()) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ display_name: displayName.trim() })
          .eq("id", user.id);
      }
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">アカウント設定</CardTitle>
          <CardDescription>
            パスワードを設定してアカウントを有効化してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          {initError ? (
            <p className="text-sm text-destructive">{initError}</p>
          ) : !sessionReady ? (
            <p className="text-sm text-muted-foreground">認証情報を確認しています...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display-name">表示名（任意）</Label>
                <Input
                  id="display-name"
                  type="text"
                  placeholder="山田 太郎"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="8文字以上"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">パスワード（確認）</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="もう一度入力してください"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "設定中..." : "アカウントを有効化"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
