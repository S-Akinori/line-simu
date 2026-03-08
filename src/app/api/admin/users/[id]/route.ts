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

// DELETE /api/admin/users/[id] — deactivate account (soft delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, status } = await checkSuperAdmin();
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;
  const adminClient = createAdminClient();

  const { error: deactivateError } = await adminClient
    .from("profiles")
    .update({ is_active: false })
    .eq("id", id);

  if (deactivateError) {
    return NextResponse.json({ error: deactivateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
