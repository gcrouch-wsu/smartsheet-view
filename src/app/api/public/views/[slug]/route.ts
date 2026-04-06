import { NextResponse } from "next/server";
import { loadPublicPage } from "@/lib/public-view";
import { omitRecordSuppressedRowsFromResolvedView } from "@/lib/record-suppression";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  // Public JSON must match the HTML page: only published (`public: true`) views and their data.
  const page = await loadPublicPage(slug, { datasetOptions: { fresh: true } });

  if (!page) {
    return NextResponse.json({ error: `View slug \"${slug}\" was not found.` }, { status: 404 });
  }

  return NextResponse.json({
    ...page,
    views: page.views.map(omitRecordSuppressedRowsFromResolvedView),
  });
}
