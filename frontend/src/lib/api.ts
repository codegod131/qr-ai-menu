import { MenuItem } from "./dummy-data";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // Client-side uses relative paths
  // Server-side base URL resolution
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return `http://localhost:${process.env.PORT || 3000}`;
};

export async function getMenuItems(): Promise<MenuItem[]> {
  const res = await fetch(`${getBaseUrl()}/api/menu`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch menu items");
  }
  return res.json();
}

export async function getMenuItem(id: string): Promise<MenuItem | null> {
  const res = await fetch(`${getBaseUrl()}/api/menu/${id}`, { cache: "no-store" });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch menu item: ${id}`);
  }
  return res.json();
}

export async function searchMenu(query: string): Promise<MenuItem[]> {
  const res = await fetch(`${getBaseUrl()}/api/menu?q=${encodeURIComponent(query)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to search menu items");
  }
  return res.json();
}

export interface AISearchResponse {
  items: MenuItem[];
  interpretedQuery: string;
}

export async function aiSearchMenu(query: string): Promise<AISearchResponse> {
  const res = await fetch(`${getBaseUrl()}/api/menu/ai-search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("AI search request failed");
  }
  return res.json();
}

export function mapBackendToMenuItem(item: any): MenuItem {
  let description = item.description || "";
  let category = "General";
  let kcal = 0;

  if (description.includes(" ||| ")) {
    const parts = description.split(" ||| ");
    description = parts[0];
    try {
      const metadata = JSON.parse(parts[1]);
      category = metadata.category || "General";
      kcal = Number(metadata.kcal) || 0;
    } catch (e) {
      // Ignore parsing errors
    }
  } else {
    // Fallback parse logic
    const tags = item.tags || [];
    const categoryTag = tags.find((t: string) => t.startsWith("_cat:"));
    if (categoryTag) {
      category = categoryTag.substring(5);
    }
  }

  const tags = (item.tags || []).filter((t: string) => !t.startsWith("_cat:"));

  // Stable mock rating based on id hash
  const idStr = String(item.id);
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const rating = (4.0 + (Math.abs(hash) % 10) * 0.1).toFixed(1);
  const ratingsCount = 10 + (Math.abs(hash) % 290);

  return {
    id: item.id,
    name: item.name,
    kcal,
    rating: parseFloat(rating),
    ratingsCount,
    description,
    price: Number(item.price),
    image: item.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
    category,
    tags,
  };
}

