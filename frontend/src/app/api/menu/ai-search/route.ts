import { NextRequest, NextResponse } from "next/server";
import { menuItems, MenuItem } from "@/lib/dummy-data";

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    // Simulate AI model processing time (800ms)
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (!query || typeof query !== "string") {
      return NextResponse.json({
        items: menuItems,
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
    const scoredItems = menuItems.map(item => {
      let score = 0;
      const textToSearch = `${item.name} ${item.description} ${item.category || ""}`.toLowerCase();
      
      keywords.forEach(keyword => {
        if (textToSearch.includes(keyword)) {
          score += 2; // direct match
        }
        // Substring details weight
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

    // If no keyword match found, fall back to basic text index filter or returning empty state
    const resultItems = filteredItems.length > 0 ? filteredItems : [];

    return NextResponse.json({
      items: resultItems,
      interpretedQuery,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process AI search Request" }, { status: 400 });
  }
}
