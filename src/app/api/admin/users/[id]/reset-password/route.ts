import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/admin/users/[id]/reset-password — send password reset email to a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const adminClient = createAdminClient();

  // Get target user's email
  const { data: targetProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("email")
    .eq("id", id)
    .single();

  if (profileError || !targetProfile?.email) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }

  const reqOrigin = new URL(request.url).origin;
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? vercelUrl ?? reqOrigin;

  // Generate recovery link — triggers password reset email via Supabase SMTP
  const { error: resetError } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email: targetProfile.email,
    options: {
      redirectTo: `${siteUrl}/auth/callback?type=recovery`,
    },
  });

  if (resetError) {
    return NextResponse.json({ error: resetError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
