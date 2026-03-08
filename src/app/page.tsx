import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="flex flex-col items-center gap-8 text-center">
        {/* Logo / Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <MessageCircle className="h-8 w-8" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            賠償シミュレーター
          </h1>
          <p className="text-muted-foreground">
            LINE公式アカウント向け管理パネル
          </p>
        </div>

        {/* Buttons */}
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Link href="/login">
            <Button className="w-full" size="lg">
              ログイン
            </Button>
          </Link>
          <Link href="/register">
            <Button className="w-full" variant="outline" size="lg">
              アカウント登録
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
