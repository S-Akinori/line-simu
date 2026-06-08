"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

export function Header() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-end border-b bg-background px-6">
      <div className="flex items-center gap-4">
        {email && (
          <span className="text-sm text-muted-foreground">{email}</span>
        )}
        <Link href="/profile">
          <Button variant="ghost" size="sm">
            <UserRound className="mr-2 h-4 w-4" />
            プロフィール
          </Button>
        </Link>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          ログアウト
        </Button>
      </div>
    </header>
  );
}
