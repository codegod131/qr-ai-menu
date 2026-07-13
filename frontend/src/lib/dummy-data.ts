export interface MenuItem {
  id: string;
  name: string;
  kcal: number;
  rating: number;
  ratingsCount: number;
  description: string;      // full description
  price: number;
  image: string;            // path or remote URL
  category?: string;
  tags?: string[];          // optional item tags
}

export let menuItems: MenuItem[] = [
  {
    id: "pozole-bowl",
    name: "Pozole Bowl",
    kcal: 553,
    rating: 4.8,
    ratingsCount: 155,
    description: "A traditional pre-Hispanic Mexican soup made with hominy, tender shredded chicken, and aromatic chili broth, topped with crisp radishes, lime, and oregano.",
    price: 115,
    image: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=600&auto=format&fit=crop&q=80",
    category: "Soups",
    tags: ["spicy", "traditional", "gluten-free"]
  },
  {
    id: "vegan-salad",
    name: "Vegan Salad Bowl",
    kcal: 320,
    rating: 4.6,
    ratingsCount: 98,
    description: "A nutrient-rich power bowl packed with organic quinoa, roasted sweet potatoes, fresh avocado, spinach, cucumbers, and customized lemon-tahini dressing.",
    price: 95,
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80",
    category: "Salads",
    tags: ["vegan", "healthy", "high-fiber"]
  },
  {
    id: "cafe-mocha",
    name: "Double Café Mocha",
    kcal: 290,
    rating: 4.9,
    ratingsCount: 220,
    description: "Rich full-bodied espresso combined with bittersweet chocolate syrup and steamed milk, topped with a generous dollop of whipped cream and chocolate swirls.",
    price: 45,
    image: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=600&auto=format&fit=crop&q=80",
    category: "Drinks",
    tags: ["beverages", "sweet", "caffeine"]
  },
  {
    id: "street-tacos",
    name: "Artisan Street Tacos",
    kcal: 410,
    rating: 4.7,
    ratingsCount: 184,
    description: "Three soft corn tortillas loaded with slow-cooked shredded beef, diced white onions, fresh cilantro, spicy verde salsa, and grilled key lime wedges.",
    price: 85,
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&auto=format&fit=crop&q=80",
    category: "Mains",
    tags: ["popular", "spicy", "mexican"]
  },
  {
    id: "classic-burger",
    name: "Smoked Cheese Burger",
    kcal: 680,
    rating: 4.5,
    ratingsCount: 310,
    description: "Grilled Angus beef patty, melted smoked cheddar cheese, heirloom tomatoes, caramelized red onions, crisp iceberg lettuce, and house signature truffle sauce on a toasted brioche bun.",
    price: 130,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
    category: "Mains",
    tags: ["cheese", "filling", "burger"]
  },
  {
    id: "berry-pancakes",
    name: "Wild Berry Pancakes",
    kcal: 510,
    rating: 4.4,
    ratingsCount: 112,
    description: "A stack of fluffy buttermilk pancakes layered with fresh wild blueberries, strawberries, and local organic maple syrup, dusted with powdered sugar.",
    price: 75,
    image: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&auto=format&fit=crop&q=80",
    category: "Breakfast",
    tags: ["sweet", "breakfast", "kids-friendly"]
  },
  {
    id: "dragon-sushi",
    name: "Dragon Sushi Roll",
    kcal: 440,
    rating: 4.9,
    ratingsCount: 147,
    description: "Premium sushi roll stuffed with crispy shrimp tempura and cucumber, topped with thin slices of fresh avocado, unagi eel sauce, and spicy sriracha mayo.",
    price: 150,
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=80",
    category: "Japanese",
    tags: ["seafood", "spicy", "premium"]
  },
  {
    id: "truffle-pizza",
    name: "White Truffle Pizza",
    kcal: 750,
    rating: 4.8,
    ratingsCount: 165,
    description: "Neapolitan thin crust sourdough pizza topped with fresh mozzarella, wild forest mushrooms, drizzled white truffle oil, and wild baby arugula salad.",
    price: 140,
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
    category: "Mains",
    tags: ["vegetarian", "truffles", "italian"]
  }
];

// Helper to push items from memory submissions
export function addMenuItem(item: MenuItem) {
  menuItems.push(item);
}
