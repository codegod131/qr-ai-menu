import { NextRequest, NextResponse } from "next/server";
import { MenuItem } from "@/lib/dummy-data";
import { mapBackendToMenuItem } from "@/lib/api";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const businessSlug = searchParams.get("business_slug") || "cafe-mocha";

  try {
    const res = await fetch(`${BACKEND_URL}/api/items?business_slug=${encodeURIComponent(businessSlug)}`, {
      cache: "no-store"
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch from backend" }, { status: res.status });
    }
    const backendData = await res.json();
    const mappedData = backendData.map(mapBackendToMenuItem);

    if (!query) {
      return NextResponse.json(mappedData);
    }

    const normalizedQuery = query.toLowerCase().trim();
    const filtered = mappedData.filter(
      (item: MenuItem) =>
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery) ||
        (item.category && item.category.toLowerCase().includes(normalizedQuery)) ||
        (item.tags && item.tags.some((t: string) => t.toLowerCase().includes(normalizedQuery)))
    );

    return NextResponse.json(filtered);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, kcal, description, price, image, category, tags } = body;

    if (!name || price === undefined || !description) {
      return NextResponse.json(
        { error: "Missing required parameters: name, price, and description are required." },
        { status: 400 }
      );
    }

    const metadata = {
      category: category || "General",
      kcal: Number(kcal) || 0
    };
    const serializedDesc = `${description.trim()} ||| ${JSON.stringify(metadata)}`;

    const newItemPayload = {
      name: name.trim(),
      price: Number(price) || 0,
      description: serializedDesc,
      tags: Array.isArray(tags) ? tags : [],
      image_url: (typeof image === "string" && image.trim()) ? image.trim() : null
    };

    const res = await fetch(`${BACKEND_URL}/api/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-business-slug": "cafe-mocha",
        "x-business-pin": "mocha123"
      },
      body: JSON.stringify(newItemPayload)
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: "Unknown error" }));
      return NextResponse.json({ error: errBody.detail || "Failed to create item in backend" }, { status: res.status });
    }

    const createdItem = await res.json();
    const mappedItem = mapBackendToMenuItem(createdItem);

    return NextResponse.json({ success: true, item: mappedItem }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process add item request" }, { status: 500 });
  }
}
