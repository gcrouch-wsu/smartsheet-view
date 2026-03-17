import { NextResponse } from "next/server";
import { loadPublicPage } from "@/lib/public-view";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const page = await loadPublicPage(slug);

  if (!page) {
    return NextResponse.json({ error: `View slug \"${slug}\" was not found.` }, { status: 404 });
  }

  return NextResponse.json(page);
}
