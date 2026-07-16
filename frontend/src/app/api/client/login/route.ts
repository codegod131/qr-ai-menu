import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();
    if (!pin) {
      return NextResponse.json({ error: "PIN is required" }, { status: 400 });
    }

    // Fetch the business details from backend (since for MVP, the business is cafe-mocha)
    const res = await fetch(`${BACKEND_URL}/api/business/cafe-mocha`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch business details" }, { status: res.status });
    }

    const business = await res.json();
    if (business.pin === pin.trim()) {
      return NextResponse.json({ success: true, businessName: business.name });
    } else {
      return NextResponse.json({ error: "Invalid business PIN" }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process login request" }, { status: 500 });
  }
}
