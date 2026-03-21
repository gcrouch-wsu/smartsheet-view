import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-api";
import { createContributorResetToken, listContributorUsers } from "@/lib/contributor-auth";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiAccess();
  if (auth.response) return auth.response;
  const { id } = await params;
  const users = await listContributorUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return NextResponse.json({ message: "Contributor not found" }, { status: 404 });
  const token = await createContributorResetToken(user.email);
  return NextResponse.json({ token });
}
