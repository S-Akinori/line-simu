import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/channels — list channels without credentials (admin+)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const { data: channels, error } = await adminClient
    .from("line_channels")
    .select("id, name, webhook_path, is_active, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ channels });
}

// POST /api/channels — create channel (super_admin only)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, channel_id, channel_secret, channel_access_token, admin_line_group_id, gas_webhook_url, webhook_path, start_keywords } =
    await request.json();

  if (!name || !channel_id || !channel_secret || !channel_access_token || !webhook_path) {
    return NextResponse.json(
      {
        error:
          "Required fields: name, channel_id, channel_secret, channel_access_token, webhook_path",
      },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const { data: channel, error } = await adminClient
    .from("line_channels")
    .insert({
      name,
      channel_id,
      channel_secret,
      channel_access_token,
      admin_line_group_id: admin_line_group_id ?? null,
      gas_webhook_url: gas_webhook_url ?? null,
      webhook_path,
      start_keywords: Array.isArray(start_keywords) && start_keywords.length > 0
        ? start_keywords
        : ["慰謝料計算をする"],
      is_active: true,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, id: channel.id }, { status: 201 });
}
