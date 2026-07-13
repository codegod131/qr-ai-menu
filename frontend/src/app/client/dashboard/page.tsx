"use client";

import React, { useEffect, useState } from "react";
import imageCompression from "browser-image-compression";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlusCircle, LogOut, Sparkles, Utensils, Check, HelpCircle, ArrowLeft, RefreshCw, Trash } from "lucide-react";
import { getMenuItems } from "@/lib/api";
import { MenuItem } from "@/lib/dummy-data";

// Researched classic food items templates to let restaurant client pre-fill instantly
interface FoodTemplate {
  name: string;
  price: number;
  kcal: number;
  category: string;
  description: string;
  image: string;
  tags: string[];
}

const PRESET_TEMPLATES: FoodTemplate[] = [
  {
    name: "Classic Sourdough Margherita",
    price: 14.50,
    kcal: 720,
    category: "Mains",
    description: "Authentic wood-fired sourdough pizza crust topped with rich San Marzano tomato pulp, fresh buffalo mozzarella, aromatic sweet basil leaves, and cold-pressed extra virgin olive oil.",
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&auto=format&fit=crop&q=80",
    tags: ["vegetarian", "classic", "oven-baked", "italian"]
  },
  {
    name: "Grilled Chicken Caesar Salad",
    price: 12.00,
    kcal: 440,
    category: "Salads",
    description: "Tender flame-grilled rosemary chicken breast served over a bed of crisp Romaine lettuce, roasted garlic croutons, aged parmesan shavings, and house caesar cream.",
    image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&auto=format&fit=crop&q=80",
    tags: ["healthy", "creamy", "poultry", "low-carb"]
  },
  {
    name: "Ceremonial Iced Matcha Latte",
    price: 6.50,
    kcal: 140,
    category: "Drinks",
    description: "Premium Japanese stone-ground Uji matcha whisked with water and poured over cold organic oat milk, lightly sweetened with pure organic agave nectar.",
    image: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80",
    tags: ["organic", "caffeine", "japanese", "cold"]
  },
  {
    name: "Warm Molten Lava Cake",
    price: 8.50,
    kcal: 590,
    category: "Desserts",
    description: "Decadent dark chocolate soufflé cake baked with a rich liquid fudge center, served dusted with powdered confectioner sugar and fresh raspberries.",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80",
    tags: ["sweet", "chocolate", "hot-dessert", "indulgent"]
  },
  {
    name: "Rich Chashu Pork Ramen",
    price: 16.00,
    kcal: 920,
    category: "Japanese",
    description: "Slow-simmered rich tonkotsu pork broth, thin springy wheat noodles, melt-in-your-mouth braised pork belly slices, marinated soft-boiled egg, scallions, bamboo shoots, and roasted seaweed.",
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80",
    tags: ["soup", "hearty", "japanese", "savory"]
  }
];

export default function ClientDashboardPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeItems, setActiveItems] = useState<MenuItem[]>([]);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form Fields State
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [kcal, setKcal] = useState("");
  const [category, setCategory] = useState("Mains");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const options = {
        maxSizeMB: 0.15, // Reduce size to ~150KB
        maxWidthOrHeight: 800, // Downscale dimensions
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        setImage(base64Data);
        setIsCompressing(false);
      };
    } catch (err) {
      console.error("Image compression error:", err);
      setIsCompressing(false);
      alert("Failed to optimize image. Reading original file stream...");
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
    }
  };

  // Validate authentication session on load
  useEffect(() => {
    const loggedIn = localStorage.getItem("client_logged_in");
    if (loggedIn !== "true") {
      router.push("/client/login");
    } else {
      setIsAdmin(true);
      fetchCurrentDishes();
    }
  }, [router]);

  // Fetch items from our API
  async function fetchCurrentDishes() {
    try {
      const data = await getMenuItems();
      setActiveItems(data);
    } catch (err) {
      console.error("Failed to load dashboard dish items", err);
    }
  }

  // Pre-fill fields with selected researched template options
  const handlePreFill = (tpl: FoodTemplate) => {
    setName(tpl.name);
    setPrice(tpl.price.toString());
    setKcal(tpl.kcal.toString());
    setCategory(tpl.category);
    setDescription(tpl.description);
    setImage(tpl.image);
    setTagsStr(tpl.tags.join(", "));
  };

  const handleLogout = () => {
    localStorage.removeItem("client_logged_in");
    localStorage.removeItem("client_email");
    router.push("/client/login");
  };

  // Submit new menu items
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormSubmitting) return;

    setIsFormSubmitting(true);
    setIsSuccess(false);

    // Convert tag strings into structured lists
    const tags = tagsStr
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const payload = {
      name,
      price: parseFloat(price) || 0,
      kcal: parseInt(kcal) || 0,
      category,
      description,
      image: (typeof image === "string" && image.trim()) 
        ? image.trim() 
        : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
      tags,
    };

    try {
      const response = await fetch("/api/menu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsSuccess(true);
        // Refresh local listings display
        await fetchCurrentDishes();

        // Clear fields
        setName("");
        setPrice("");
        setKcal("");
        setDescription("");
        setImage("");
        setTagsStr("");

        // Clear success check bubble after 3 seconds
        setTimeout(() => setIsSuccess(false), 3000);
      } else {
        const errData = await response.json();
        alert(`Error adding dish: ${errData.error || "Failed registration"}`);
      }
    } catch (err) {
      alert("Network compilation error occurred.");
    } finally {
      setIsFormSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen text-white flex flex-col items-center justify-center bg-radial-to-b from-brand-from to-brand-to">
        <RefreshCw className="w-10 h-10 animate-spin text-accent-brand" />
        <p className="text-sm mt-3 tracking-wider italic text-text-muted">Directing control keys...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white flex flex-col items-center">
      
      {/* Outer Dashboard panel */}
      <div className="w-full max-w-6xl min-h-screen bg-black/60 shadow-2xl flex flex-col border-x border-white/5 pb-24">
        
        {/* Navigation Header */}
        <header className="border-b border-white/10 glass-panel py-4 px-6 md:px-8 mt-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-white px-3 py-1.5 rounded-full border border-white/10 bg-white/5 transition-all text-center cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Menu</span>
            </Link>
            <h1 className="font-extrabold text-base md:text-xl tracking-tight leading-none">
              Merchant Panel <span className="text-accent-brand">Desk</span>
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs py-1.5 px-4 rounded-full border border-accent-brand/40 bg-accent-brand/5 hover:bg-accent-brand/20 text-accent-brand font-bold cursor-pointer transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </header>

        {/* Dashboard contents grids */}
        <main className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form submissions (6 cols) */}
          <section className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Quick pre-select preset templates */}
            <div className="glass-panel border border-white/5 rounded-3xl p-5 shadow-lg">
              <span className="flex items-center gap-1.5 text-xs font-bold text-accent-brand uppercase tracking-wider mb-3">
                <Sparkles className="w-4 h-4 fill-accent-brand/10" />
                Researched Popular Dish Presets
              </span>
              <p className="text-[11px] text-text-muted mb-4">
                Click any pre-researched item template below to instantly pre-fill metadata fields.
              </p>
              
              <div className="flex flex-wrap gap-2">
                {PRESET_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => handlePreFill(tpl)}
                    className="text-xs bg-white/5 border border-white/10 hover:border-accent-brand/40 hover:bg-accent-brand/5 text-white/90 hover:text-white px-3 py-2 rounded-xl transition-all cursor-pointer text-left font-semibold flex items-center gap-1"
                  >
                    <Utensils className="w-3.5 h-3.5 text-text-muted" />
                    <span>{tpl.name.split(" ").slice(0, 3).join(" ")}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* General dynamic edit form */}
            <div className="glass-panel border border-white/10 rounded-3xl p-6 shadow-xl">
              <h3 className="text-base font-extrabold mb-4 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-accent-brand" />
                <span>Add Custom Food Item</span>
              </h3>

              {isSuccess && (
                <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs p-3.5 rounded-xl mb-4 animate-scale-up">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Item successfully added to database via Supabase client!</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                
                {/* Row 1: Dish name */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-text-muted font-semibold uppercase tracking-wider pl-1">
                    Dish/Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Traditional Spicy Taco Special"
                    className="w-full bg-[#121212] text-white text-sm px-4 py-3 rounded-xl border border-white/10 outline-none focus:border-accent-brand transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Price field */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-text-muted font-semibold uppercase tracking-wider pl-1">
                      Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 14.99"
                      className="w-full bg-[#121212] text-white text-sm px-4 py-3 rounded-xl border border-white/10 outline-none focus:border-accent-brand transition-colors"
                    />
                  </div>

                  {/* Category select fields */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-text-muted font-semibold uppercase tracking-wider pl-1">
                      Menu Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#121212] text-white text-sm px-4 py-3 rounded-xl border border-white/10 outline-none focus:border-accent-brand transition-colors appearance-none cursor-pointer"
                    >
                      <option value="Mains">Mains (Fast food etc)</option>
                      <option value="Soups">Soups & Broths</option>
                      <option value="Salads">Salads & Bowls</option>
                      <option value="Breakfast">Breakfast & Waffles</option>
                      <option value="Japanese">Japanese Rolls</option>
                      <option value="Drinks">Beverages & Coffee</option>
                      <option value="Desserts">Sweet Treats</option>
                    </select>
                  </div>
                </div>

                  {/* Optional Image Upload or URL */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-text-muted font-semibold uppercase tracking-wider pl-1">
                      Dish Image (Optional file or URL)
                    </label>
                    <div className="flex flex-col gap-2">
                      {/* Local File Selector with compress indicator */}
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="w-full text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-accent-brand/10 file:text-accent-brand hover:file:bg-accent-brand/20 cursor-pointer bg-[#121212] p-2 rounded-xl border border-white/10"
                        />
                        {isCompressing && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-info-kcal animate-ping" />
                            <span className="text-[10px] text-info-kcal font-bold uppercase tracking-wider">
                              Reducing Size...
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Display image preview if exists */}
                      {image && (
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-lg text-xs">
                          {image.startsWith("data:") ? (
                            <img
                              src={image}
                              alt="Compressed preview"
                              className="w-8 h-8 object-cover rounded-lg border border-white/10 shrink-0"
                            />
                          ) : (
                            <span className="text-[9px] truncate max-w-[150px] text-text-muted">{image}</span>
                          )}
                          <span className="text-[10px] text-emerald-400 font-bold shrink-0">image attached!</span>
                          <button
                            type="button"
                            onClick={() => setImage("")}
                            className="ml-auto text-accent-brand text-[10px] hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      {/* Fallback url input */}
                      <input
                        type="url"
                        value={image.startsWith("data:") ? "" : image}
                        onChange={(e) => setImage(e.target.value)}
                        disabled={image.startsWith("data:")}
                        placeholder={
                          image.startsWith("data:")
                            ? "Local image selected above"
                            : "Or paste image web URL directly"
                        }
                        className="w-full bg-[#121212] text-xs px-4 py-2.5 rounded-xl border border-white/10 outline-none focus:border-accent-brand transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                {/* Comma tags strings */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-xs text-text-muted font-semibold uppercase tracking-wider">
                      Dishes Tags
                    </label>
                    <span className="text-[10px] text-text-muted/75">
                      Comma separated (e.g. spicy, vegan, cheesy)
                    </span>
                  </div>
                  <input
                    type="text"
                    value={tagsStr}
                    onChange={(e) => setTagsStr(e.target.value)}
                    placeholder="gluten-free, popular, organic"
                    className="w-full bg-[#121212] text-white text-sm px-4 py-3 rounded-xl border border-white/10 outline-none focus:border-accent-brand transition-colors"
                  />
                </div>

                {/* Full descriptives */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-text-muted font-semibold uppercase tracking-wider pl-1">
                    Full Description *
                  </label>
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Add detailing, recipe features, toppings, and dietary details..."
                    className="w-full bg-[#121212] text-white text-sm px-4 py-3 rounded-xl border border-white/10 outline-none focus:border-accent-brand transition-colors resize-none font-sans"
                  />
                </div>

                {/* Submit button bar */}
                <button
                  type="submit"
                  disabled={isFormSubmitting}
                  className={`
                    w-full py-3.5 mt-2 rounded-full font-bold text-sm tracking-wide text-white border-0 flex items-center justify-center gap-2 cursor-pointer transition-all duration-300
                    ${
                      isFormSubmitting
                        ? "bg-accent-brand/50 cursor-wait"
                        : "bg-accent-brand hover:bg-accent-brand-hover active:scale-95 shadow-lg shadow-accent-brand/20 hover:shadow-accent-brand/35"
                    }
                  `}
                >
                  {isFormSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Register Dish Item</span>
                    </>
                  )}
                </button>

              </form>
            </div>

          </section>

          {/* Right Column: Database state check list (5 cols) */}
          <section className="lg:col-span-5 flex flex-col gap-6">
            
            <div className="glass-panel border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col flex-1 max-h-[680px] overflow-hidden">
              <div className="flex justify-between items-center mb-4 shrink-0">
                <span className="text-sm font-bold uppercase tracking-wider text-text-muted">
                  Active Database ({activeItems.length})
                </span>
                <span className="text-[10px] text-info-kcal font-bold uppercase py-0.5 px-2 bg-info-kcal/10 border border-info-kcal/25 rounded-full">
                  Supabase Live Feed
                </span>
              </div>

              {/* Items list viewport */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 no-scrollbar">
                {activeItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 bg-[#111111]/80 hover:bg-[#1a1a1a] p-3 rounded-2xl border border-white/5 transition-all text-xs"
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 aspect-square">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    
                    <div className="flex flex-col justify-between flex-1 min-w-0">
                      <div>
                        <span className="block font-bold text-white truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-accent-brand font-medium">
                          {item.category || "General"}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2.5">
                        <span className="font-extrabold text-white">
                          ${item.price.toFixed(2)}
                        </span>
                        
                        {item.tags && item.tags.length > 0 && (
                          <span className="text-[8px] bg-white/5 px-2 py-0.5 rounded text-text-muted truncate max-w-[120px]">
                            #{item.tags[0]} {item.tags.length > 1 && `+${item.tags.length - 1}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </section>

        </main>
      </div>

    </div>
  );
}
