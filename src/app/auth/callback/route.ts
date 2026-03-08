import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles Supabase auth redirects:
//   - Invite links  → /auth/setup
//   - Password reset links → /auth/update-password
//   - OAuth / magic link → /dashboard (or ?next=...)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "";
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth_error`);
    }
  } else if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "invite" | "recovery" | "email" | "signup" | "magiclink",
    });
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth_error`);
    }
  }

  if (type === "invite") {
    return NextResponse.redirect(`${origin}/auth/setup`);
  }
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/auth/update-password`);
  }
  // signup / email confirmation → go to dashboard
  if (type === "signup" || type === "email") {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
