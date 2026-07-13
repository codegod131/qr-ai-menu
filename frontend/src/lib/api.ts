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
