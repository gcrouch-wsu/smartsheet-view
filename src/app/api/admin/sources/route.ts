import { NextResponse } from "next/server";
import { saveSourceConfig } from "@/lib/config/admin-store";
import { listSourceConfigs } from "@/lib/config/store";
import { validateSourceConfig } from "@/lib/config/validation";

export async function GET() {
  return NextResponse.json({ sources: await listSourceConfigs() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown;
  const result = validateSourceConfig(body);

  if (!result.success || !result.data) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  await saveSourceConfig(result.data);
  return NextResponse.json({ source: result.data }, { status: 201 });
}