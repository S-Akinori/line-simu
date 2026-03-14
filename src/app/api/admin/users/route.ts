import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/users — list all admin accounts
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only super_admin can list all users
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, is_active, created_at, profile_channels(channel_id)")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = (profiles ?? []).map((p) => ({
    ...p,
    channel_ids: (p.profile_channels as { channel_id: string }[] | null)?.map((r) => r.channel_id) ?? [],
    profile_channels: undefined,
  }));

  return NextResponse.json({ users });
}

// POST /api/admin/users — invite a new user by email
export async function POST(request: NextRequest) {
  try {
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

    const { email, role, display_name } = await request.json();

    if (!email || !role) {
      return NextResponse.json({ error: "email and role are required" }, { status: 400 });
    }
    if (!["super_admin", "admin", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Derive site URL: env var > request origin > Vercel URL
    const reqOrigin = new URL(request.url).origin;
    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? vercelUrl ?? reqOrigin;

    console.log("[invite] config:", {
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      siteUrl,
      redirectTo: `${siteUrl}/auth/callback?type=invite`,
      email,
      role,
    });

    const adminClient = createAdminClient();

    // Invite user via Supabase Auth (sends invitation email)
    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: { role, display_name: display_name ?? "" },
        redirectTo: `${siteUrl}/auth/setup`,
      }
    );

    if (inviteError) {
      console.error("[invite] inviteUserByEmail failed:", JSON.stringify({
        name: (inviteError as any).name,
        message: inviteError.message,
        status: inviteError.status,
        cause: (inviteError as any).cause,
      }, null, 2));
      return NextResponse.json(
        { error: inviteError.message, status: inviteError.status },
        { status: 500 }
      );
    }

    console.log("[invite] success, user_id:", invited.user.id);

    // Upsert profile with role (trigger handles basic insert; ensure role is set correctly)
    const { error: upsertError } = await adminClient
      .from("profiles")
      .upsert({
        id: invited.user.id,
        email,
        display_name: display_name ?? null,
        role,
        is_active: true,
      });

    if (upsertError) {
      console.error("[invite] profiles upsert error:", JSON.stringify({
        message: upsertError.message,
        code: upsertError.code,
        details: upsertError.details,
        hint: upsertError.hint,
      }, null, 2));
    }

    return NextResponse.json({ success: true, user_id: invited.user.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[invite] unexpected error:", JSON.stringify({ message, stack }, null, 2));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
