import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-api";
import { buildSlimViewExportPayload } from "@/lib/export-slim";
import { loadAdminViewPreview } from "@/lib/public-view";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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

  const url = new URL(request.url);
  const slim = url.searchParams.get("format") === "slim";
  const body = slim ? buildSlimViewExportPayload(preview) : preview;
  const filename = slim ? `${id}-export-slim.json` : `${id}-export.json`;

  return new NextResponse(`${JSON.stringify(body, null, 2)}\n`, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
