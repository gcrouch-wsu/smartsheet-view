import { NextResponse } from "next/server";
import { loadAdminViewPreview } from "@/lib/public-view";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const preview = await loadAdminViewPreview(id);

  if (!preview) {
    return NextResponse.json({ error: `View \"${id}\" was not found.` }, { status: 404 });
  }

  return NextResponse.json(preview);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const preview = await loadAdminViewPreview(id);

  if (!preview) {
    return NextResponse.json({ error: `View \"${id}\" was not found.` }, { status: 404 });
  }

  return NextResponse.json(preview);
}
