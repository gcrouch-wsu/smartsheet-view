import { NextResponse } from "next/server";
import { AdminActionError, updateAdminViewPublication } from "@/lib/admin-management";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = ((await request.json().catch(() => null)) ?? {}) as { public?: boolean };

  try {
    const view = await updateAdminViewPublication(id, Boolean(body.public));
    return NextResponse.json({ view });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json(
        { error: error.message, errors: error.errors, warnings: error.warnings },
        { status: error.status }
      );
    }

    throw error;
  }
}