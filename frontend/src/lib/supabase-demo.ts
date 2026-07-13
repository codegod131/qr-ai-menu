import { MenuItem, menuItems, addMenuItem } from "./dummy-data";

/**
 * Superclass representing the Supabase client wrapper.
 * Mimics select/insert queries for the 'menu_items' table.
 */
class SupabaseDemoClient {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(url: string, key: string) {
    this.supabaseUrl = url;
    this.supabaseKey = key;
  }

  from(tableName: string) {
    if (tableName !== "menu_items") {
      return {
        select: async () => ({ data: null, error: { message: `Table '${tableName}' not found in Supabase Demo schema` } }),
        insert: async () => ({ data: null, error: { message: `Table '${tableName}' not found in Supabase Demo schema` } }),
      };
    }

    return {
      select: async () => {
        // Simulate network roundtrip latency (600ms)
        await new Promise((resolve) => setTimeout(resolve, 600));
        return {
          data: [...menuItems],
          error: null,
        };
      },
      insert: async (rows: any[]) => {
        // Simulate network roundtrip latency (800ms)
        await new Promise((resolve) => setTimeout(resolve, 800));

        const createdItems: MenuItem[] = [];

        for (const row of rows) {
          const item: MenuItem = {
            id: row.id || row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `item-${Date.now()}`,
            name: row.name,
            kcal: Number(row.kcal) || 0,
            rating: row.rating || 5.0,
            ratingsCount: row.ratingsCount || 1,
            description: row.description,
            price: Number(row.price) || 0,
            image: row.image,
            category: row.category || "General",
            tags: Array.isArray(row.tags) ? row.tags : [],
          };

          addMenuItem(item);
          createdItems.push(item);
        }

        return {
          data: createdItems,
          error: null,
        };
      },
    };
  }
}

// Instantiate and export the demo API connection block
export const supabaseDemo = new SupabaseDemoClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://demo.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy"
);
