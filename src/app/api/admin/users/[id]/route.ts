import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function checkSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401, supabase: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return { error: "Forbidden", status: 403, supabase: null };
  }

  return { error: null, status: 200, supabase };
}

// PATCH /api/admin/users/[id] — update role or display_name
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, status } = await checkSuperAdmin();
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.role !== undefined) {
    if (!["super_admin", "admin", "viewer"].includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    updates.role = body.role;
  }
  if (body.display_name !== undefined) updates.display_name = body.display_name;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.line_notify_user_id !== undefined) updates.line_notify_user_id = body.line_notify_user_id || null;

  const adminClient = createAdminClient();
  const { error: updateError } = await adminClient
    .from("profiles")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/users/[id] — deactivate (soft) or permanently delete (?permanent=true)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, status, supabase } = await checkSuperAdmin();
  if (error || !supabase) return NextResponse.json({ error }, { status });

  const { id } = await params;
  const permanent = new URL(request.url).searchParams.get("permanent") === "true";
  const adminClient = createAdminClient();

  if (!permanent) {
    // Soft delete: deactivate only
    const { error: deactivateError } = await adminClient
      .from("profiles")
      .update({ is_active: false })
      .eq("id", id);
    if (deactivateError) {
      return NextResponse.json({ error: deactivateError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // Permanent delete: guard against self-deletion
  const { data: { user: me } } = await supabase.auth.getUser();
  if (me?.id === id) {
    return NextResponse.json({ error: "自分自身は削除できません" }, { status: 400 });
  }

  // Guard: must not be the last super_admin
  const { data: superAdmins } = await adminClient
    .from("profiles")
    .select("id")
    .eq("role", "super_admin");
  const target = superAdmins?.find((u) => u.id === id);
  if (target && (superAdmins?.length ?? 0) <= 1) {
    return NextResponse.json({ error: "最後のスーパー管理者は削除できません" }, { status: 400 });
  }

  // Delete from Supabase Auth (cascades to profiles via FK)
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
