import { NextRequest, NextResponse } from "next/server";
import { supabaseDemo } from "@/lib/supabase-demo";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  // Fetch from our Supabase Demo Client API
  const { data, error } = await supabaseDemo.from("menu_items").select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!query || !data) {
    return NextResponse.json(data || []);
  }

  const normalizedQuery = query.toLowerCase().trim();
  const filtered = data.filter(
    (item) =>
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.description.toLowerCase().includes(normalizedQuery) ||
      (item.category && item.category.toLowerCase().includes(normalizedQuery)) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes(normalizedQuery)))
  );

  return NextResponse.json(filtered);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, kcal, description, price, image, category, tags } = body;

    if (!name || !price || !description || !image) {
      return NextResponse.json(
        { error: "Missing required parameters: name, price, description, and image URL are required." },
        { status: 400 }
      );
    }

    const newItem = {
      name,
      kcal: Number(kcal) || 0,
      description,
      price: Number(price) || 0,
      image,
      category: category || "General",
      tags: Array.isArray(tags) ? tags : [],
    };

    // Insert using standard Supabase syntax
    const { data, error } = await supabaseDemo.from("menu_items").insert([newItem]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data?.[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process add item request" }, { status: 500 });
  }
}
