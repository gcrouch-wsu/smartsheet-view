import { NextResponse } from "next/server";
import { getSourceConfigById } from "@/lib/config/store";
import { getSmartsheetSchema, testSourceConnection } from "@/lib/smartsheet";
import { validateSourceConfig } from "@/lib/config/validation";

async function resolveSourceInput(id: string, request?: Request) {
  const body = request ? ((await request.json().catch(() => null)) as unknown) : null;
  if (body) {
    const result = validateSourceConfig(
      typeof body === "object" && body !== null
        ? { ...(body as Record<string, unknown>), id: (body as Record<string, unknown>).id ?? (id === "preview" ? "preview" : id) }
        : body
    );
    if (!result.success || !result.data) {
      return { errors: result.errors };
    }
    return { source: result.data };
  }

  const source = await getSourceConfigById(id);
  if (!source) {
    return { error: `Source \"${id}\" was not found.` };
  }
  return { source };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resolved = await resolveSourceInput(id);
  if ("errors" in resolved) {
    return NextResponse.json({ errors: resolved.errors }, { status: 400 });
  }
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 404 });
  }

  const connection = await testSourceConnection(resolved.source);
  if (!connection.ok) {
    return NextResponse.json({ connection }, { status: 502 });
  }

  const schema = await getSmartsheetSchema(resolved.source, { fresh: true });
  return NextResponse.json({ connection, schema });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resolved = await resolveSourceInput(id, request);
  if ("errors" in resolved) {
    return NextResponse.json({ errors: resolved.errors }, { status: 400 });
  }
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 404 });
  }

  const connection = await testSourceConnection(resolved.source);
  if (!connection.ok) {
    return NextResponse.json({ connection }, { status: 502 });
  }

  const schema = await getSmartsheetSchema(resolved.source, { fresh: true });
  return NextResponse.json({ connection, schema });
}