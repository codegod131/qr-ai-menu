import { NextRequest, NextResponse } from "next/server";
import { MenuItem } from "@/lib/dummy-data";
import { mapBackendToMenuItem } from "@/lib/api";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    // Fetch live list of items from the backend
    const res = await fetch(`${BACKEND_URL}/api/items?business_slug=cafe-mocha`, {
      cache: "no-store"
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch items for search" }, { status: res.status });
    }
    const backendData = await res.json();
    const mappedItems: MenuItem[] = backendData.map(mapBackendToMenuItem);

    // Simulate AI model processing time (800ms)
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (!query || typeof query !== "string") {
      return NextResponse.json({
        items: mappedItems,
        interpretedQuery: "AI understood: Show whole menu book.",
      });
    }

    const cleanQuery = query.toLowerCase().trim();
    let interpretedQuery = `AI understood: Show items related to "${query}"`;

    // Dynamic AI interpretation based on keywords
    if (cleanQuery.includes("spicy") || cleanQuery.includes("mexican") || cleanQuery.includes("hot") || cleanQuery.includes("pozole") || cleanQuery.includes("tacos")) {
      interpretedQuery = "AI understood: You are looking for spicy, savory pre-Hispanic or Mexican street food.";
    } else if (cleanQuery.includes("healthy") || cleanQuery.includes("vegan") || cleanQuery.includes("diet") || cleanQuery.includes("green") || cleanQuery.includes("salad")) {
      interpretedQuery = "AI understood: You prefer plant-based, gluten-free, healthy bowls with low calories.";
    } else if (cleanQuery.includes("sweet") || cleanQuery.includes("chocolate") || cleanQuery.includes("coffee") || cleanQuery.includes("caffeine") || cleanQuery.includes("mocha") || cleanQuery.includes("dessert")) {
      interpretedQuery = "AI understood: You want premium baristas and sweet coffee treats.";
    } else if (cleanQuery.includes("fish") || cleanQuery.includes("sushi") || cleanQuery.includes("japanese") || cleanQuery.includes("sea")) {
      interpretedQuery = "AI understood: You are searching for gourmet Japanese seafood rolls.";
    } else if (cleanQuery.includes("fast") || cleanQuery.includes("burger") || cleanQuery.includes("cheese") || cleanQuery.includes("pizza") || cleanQuery.includes("junk") || cleanQuery.includes("high calorie")) {
      interpretedQuery = "AI understood: You want premium, comfort food options (burgers and artisanal pizzas).";
    }

    // Keyword relevance score tracking to simulate semantic search ranking
    const keywords = cleanQuery.split(/\s+/).filter(Boolean);
    const scoredItems = mappedItems.map(item => {
      let score = 0;
      const textToSearch = `${item.name} ${item.description} ${item.category || ""}`.toLowerCase();
      
      keywords.forEach(keyword => {
        if (textToSearch.includes(keyword)) {
          score += 2; // direct match
        }
        if (item.name.toLowerCase().includes(keyword)) {
          score += 3; // name matches have higher weight
        }
      });
      return { item, score };
    });

    // Sort items by keyword hit score descending
    const filteredItems = scoredItems
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.item);

    const resultItems = filteredItems.length > 0 ? filteredItems : [];

    return NextResponse.json({
      items: resultItems,
      interpretedQuery,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process AI search Request" }, { status: 400 });
  }
}
