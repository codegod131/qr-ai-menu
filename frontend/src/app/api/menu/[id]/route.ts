import { NextRequest, NextResponse } from "next/server";
import { menuItems } from "@/lib/dummy-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = menuItems.find((m) => m.id === id);

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}
