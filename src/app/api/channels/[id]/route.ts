import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "super_admin" ? user : null;
}

// GET /api/channels/[id] — get full channel including credentials (super_admin only)
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const adminClient = createAdminClient();
  const { data: channel, error } = await adminClient
    .from("line_channels")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !channel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: keyword_routes } = await adminClient
    .from("start_keyword_routes")
    .select("keyword, route_id")
    .eq("line_channel_id", id);

  return NextResponse.json({ channel: { ...channel, keyword_routes: keyword_routes ?? [] } });
}

// PATCH /api/channels/[id] — update channel (super_admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { keyword_routes, ...updates } = body;

  const allowedFields = [
    "name",
    "channel_id",
    "channel_secret",
    "channel_access_token",
    "gas_webhook_url",
    "webhook_path",
    "start_keywords",
    "is_active",
  ];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowedFields.includes(k))
  );

  const adminClient = createAdminClient();

  if (Object.keys(filtered).length > 0) {
    const { error } = await adminClient
      .from("line_channels")
      .update({ ...filtered, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (Array.isArray(keyword_routes)) {
    await adminClient.from("start_keyword_routes").delete().eq("line_channel_id", id);
    const toInsert = keyword_routes
      .filter((r: { keyword: string }) => r.keyword.trim().length > 0)
      .map((r: { keyword: string; route_id: string | null }) => ({
        line_channel_id: id,
        keyword: r.keyword.trim(),
        route_id: r.route_id || null,
      }));
    if (toInsert.length > 0) {
      const { error } = await adminClient.from("start_keyword_routes").insert(toInsert);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/channels/[id] — permanently delete channel and all its data (super_admin only)
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("line_channels")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
