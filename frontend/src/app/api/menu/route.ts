import { NextRequest, NextResponse } from "next/server";
import { MenuItem, menuItems } from "@/lib/dummy-data";
import { mapBackendToMenuItem } from "@/lib/api";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";

async function ensureBusinessExists() {
  try {
    const slug = "cafe-mocha";
    const res = await fetch(`${BACKEND_URL}/api/business/${slug}`);
    if (res.status === 404) {
      await fetch(`${BACKEND_URL}/api/business`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Café Mocha",
          slug: slug,
          pin: "mocha123"
        })
      });
    }
  } catch (err) {
    console.error("Failed to automatically register default business:", err);
  }
}

async function seedDatabaseIfEmpty() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/items?business_slug=cafe-mocha`, {
      cache: "no-store"
    });
    if (res.ok) {
      const items = await res.json();
      if (items.length === 0) {
        console.log("Seeding default items to backend database...");
        for (const dummy of menuItems) {
          const metadata = {
            category: dummy.category || "General",
            kcal: dummy.kcal || 0
          };
          const serializedDesc = `${dummy.description} ||| ${JSON.stringify(metadata)}`;
          
          await fetch(`${BACKEND_URL}/api/items`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-business-slug": "cafe-mocha",
              "x-business-pin": "mocha123"
            },
            body: JSON.stringify({
              name: dummy.name,
              price: dummy.price,
              description: serializedDesc,
              tags: dummy.tags || [],
              image_url: dummy.image
            })
          });
        }
      }
    }
  } catch (err) {
    console.error("Failed to seed default items:", err);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  await ensureBusinessExists();
  await seedDatabaseIfEmpty();

  try {
    const res = await fetch(`${BACKEND_URL}/api/items?business_slug=cafe-mocha`, {
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
  await ensureBusinessExists();

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
