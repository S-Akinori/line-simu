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

  const adminClient = createAdminClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(".supabase.co", ".vercel.app");

  // Invite user via Supabase Auth (sends invitation email)
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: { role, display_name: display_name ?? "" },
      redirectTo: siteUrl ? `${siteUrl}/auth/callback?type=invite` : undefined,
    }
  );

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  // Upsert profile with role (trigger handles basic insert; ensure role is set correctly)
  await adminClient
    .from("profiles")
    .upsert({
      id: invited.user.id,
      email,
      display_name: display_name ?? null,
      role,
      is_active: true,
    });

  return NextResponse.json({ success: true, user_id: invited.user.id });
}
