import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-api";
import { listSourceConfigs } from "@/lib/config/store";
import { validateViewConfig } from "@/lib/config/validation";
import { resolvePreviewFromConfig } from "@/lib/public-view";

export async function POST(request: Request) {
  const auth = await requireAdminApiAccess();
  if (auth.response) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const sources = await listSourceConfigs();
  const result = validateViewConfig(body, { knownSourceIds: sources.map((s) => s.id), sources });

  if (!result.success || !result.data) {
    return NextResponse.json(
      { errors: result.errors, rows: [], fields: [], warnings: [], rowCount: 0 },
      { status: 400 }
    );
  }

  try {
    const preview = await resolvePreviewFromConfig(result.data);
    return NextResponse.json({
      rows: preview.rows,
      fields: preview.fields,
      warnings: preview.warnings,
      rowCount: preview.rowCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview failed.";
    return NextResponse.json(
      { error: message, rows: [], fields: [], warnings: [], rowCount: 0 },
      { status: 502 }
    );
  }
}
