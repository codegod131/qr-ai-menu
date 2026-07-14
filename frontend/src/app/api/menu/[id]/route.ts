import { NextRequest, NextResponse } from "next/server";
import { mapBackendToMenuItem } from "@/lib/api";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const res = await fetch(`${BACKEND_URL}/api/items/${id}`, {
      cache: "no-store"
    });
    if (res.status === 404) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch item from backend" }, { status: res.status });
    }
    const backendItem = await res.json();
    const mappedItem = mapBackendToMenuItem(backendItem);
    return NextResponse.json(mappedItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process item details request" }, { status: 500 });
  }
}
