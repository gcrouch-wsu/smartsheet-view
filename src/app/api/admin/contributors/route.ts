import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-api";
import { deleteContributorUser, listContributorUsers } from "@/lib/contributor-auth";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminApiAccess();
  if (auth.response) return auth.response;
  const users = await listContributorUsers();
  return NextResponse.json({ users });
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApiAccess();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null) as { id?: string } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ message: "id is required" }, { status: 400 });
  await deleteContributorUser(id);
  return NextResponse.json({ ok: true });
}
