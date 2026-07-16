import { NextRequest, NextResponse } from "next/server";
import { MenuItem } from "@/lib/dummy-data";
import { mapBackendToMenuItem } from "@/lib/api";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    const incomingFormData = await request.formData();
    const query = incomingFormData.get("query");
    const audio = incomingFormData.get("audio");
    const businessSlug = (incomingFormData.get("business_slug") as string) || "cafe-mocha";

    // Construct form data to forward to backend
    const backendFormData = new FormData();
    backendFormData.append("business_slug", businessSlug);

    if (query) {
      backendFormData.append("query", query as string);
    }
    if (audio) {
      backendFormData.append("audio", audio as Blob, "audio.webm");
    }

    const res = await fetch(`${BACKEND_URL}/api/query`, {
      method: "POST",
      body: backendFormData,
      cache: "no-store",
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: "Unknown backend error" }));
      return NextResponse.json(
        { error: errBody.detail || "Failed to fetch vector search results from backend" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const mappedItems: MenuItem[] = (data.items || []).map(mapBackendToMenuItem);

    return NextResponse.json({
      items: mappedItems,
      interpretedQuery: data.interpretedQuery,
      transcribedText: data.transcribedText,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process AI search request" }, { status: 500 });
  }
}

