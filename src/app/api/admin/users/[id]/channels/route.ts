import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function checkSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") return { error: "Forbidden", status: 403 };
  return { error: null, status: 200 };
}

// GET /api/admin/users/[id]/channels — list assigned channel IDs
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, status } = await checkSuperAdmin();
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;
  const adminClient = createAdminClient();

  const { data, error: fetchError } = await adminClient
    .from("profile_channels")
    .select("channel_id")
    .eq("profile_id", id);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  return NextResponse.json({ channel_ids: (data ?? []).map((r) => r.channel_id) });
}

// PUT /api/admin/users/[id]/channels — replace channel assignments
// Body: { channel_ids: string[] }
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, status } = await checkSuperAdmin();
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;
  const { channel_ids } = await req.json() as { channel_ids: string[] };

  if (!Array.isArray(channel_ids)) {
    return NextResponse.json({ error: "channel_ids must be an array" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Replace: delete all existing, then insert new ones
  const { error: deleteError } = await adminClient
    .from("profile_channels")
    .delete()
    .eq("profile_id", id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  if (channel_ids.length > 0) {
    const rows = channel_ids.map((channel_id) => ({ profile_id: id, channel_id }));
    const { error: insertError } = await adminClient.from("profile_channels").insert(rows);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
