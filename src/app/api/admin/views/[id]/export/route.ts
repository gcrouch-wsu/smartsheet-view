import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-api";
import { loadAdminViewPreview } from "@/lib/public-view";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApiAccess();
  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;
  const preview = await loadAdminViewPreview(id);

  if (!preview) {
    return NextResponse.json({ error: `View "${id}" was not found.` }, { status: 404 });
  }

  return new NextResponse(`${JSON.stringify(preview, null, 2)}\n`, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${id}-export.json"`,
      "Cache-Control": "no-store",
    },
  });
}
