"use client";

import { useEffect, useState, startTransition } from "react";
import Image from "next/image";
import SearchBar from "@/components/SearchBar";
import FoodCard from "@/components/FoodCard";
import { MenuItem } from "@/lib/dummy-data";
import { getMenuItems, searchMenu, aiSearchMenu } from "@/lib/api";
import { ShoppingBag, Star, MapPin, Clock } from "lucide-react";

export default function Home() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiInterpretation, setAiInterpretation] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [addedItemName, setAddedItemName] = useState<string | null>(null);
  const [toastTimeout, setToastTimeout] = useState<NodeJS.Timeout | null>(null);

  // Fetch initial menu
  useEffect(() => {
    async function loadInitial() {
      try {
        setIsLoading(true);
        const data = await getMenuItems();
        setItems(data);
      } catch (err) {
        console.error("Failed to load initial menu items", err);
        setErrorCode("Error loading dishes. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    }
    loadInitial();
  }, []);

  const handleSearch = async (query: string, isAi: boolean) => {
    setSearchQuery(query);
    setIsLoading(true);
    setErrorCode(null);

    // If query is empty, reset back to full menu
    if (!query.trim()) {
      try {
        const data = await getMenuItems();
        setItems(data);
        setAiInterpretation("");
      } catch (err) {
        setErrorCode("Failed to reset menu.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      if (isAi) {
        const response = await aiSearchMenu(query);
        setItems(response.items);
        setAiInterpretation(response.interpretedQuery);
      } else {
        const data = await searchMenu(query);
        setItems(data);
        setAiInterpretation("");
      }
    } catch (err) {
      console.error("Search error occurred", err);
      setErrorCode("Could not search menu. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    setAiInterpretation("");
    handleSearch("", false);
  };

  const handleAddItem = (item: MenuItem) => {
    setCartCount((prev) => prev + 1);
    setAddedItemName(item.name);

    if (toastTimeout) clearTimeout(toastTimeout);

    const timeout = setTimeout(() => {
      setAddedItemName(null);
    }, 2500);
    setToastTimeout(timeout);
  };

  return (
    <div className="relative min-h-screen text-white flex flex-col items-center">
      {/* Centered App Container wrapper */}
      <div className="w-full max-w-4xl min-h-screen bg-black/60 shadow-2xl flex flex-col border-x border-white/5 pb-20">
        
        {/* Sticky Search bar at top */}
        <SearchBar
          onSearch={handleSearch}
          isLoading={isLoading}
          activeQuery={searchQuery}
          interpretedQuery={aiInterpretation}
          onClear={handleClear}
        />

        {/* Hero Branding Card Section */}
        <div className="px-4 pt-6 pb-2">
          <div className="relative overflow-hidden w-full rounded-3xl bg-gradient-to-r from-brand-from to-[#4a1215]/80 p-5 border border-white/10 shadow-lg">
            <div className="absolute right-4 bottom-0 opacity-10 pointer-events-none">
              <ShoppingBag className="w-32 h-32 text-white" />
            </div>
            
            <div className="flex flex-col gap-2 relative z-10">
              <span className="bg-accent-brand text-xs font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full w-fit">
                Open Now
              </span>
              <h1 className="text-xl md:text-3xl font-extrabold tracking-tight">
                Café Mocha Menu
              </h1>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1 text-xs text-text-muted">
                <span className="flex items-center gap-1 font-semibold text-white">
                  <Star className="w-3.5 h-3.5 fill-star-gold text-star-gold" />
                  4.8 (1.2k+ reviews)
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Downtown 5th Ave
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  15 - 25 min delivery
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Header Label */}
        <div className="px-4 pt-6 pb-3">
          <h2 className="text-lg font-bold tracking-tight text-white/95 uppercase border-l-4 border-accent-brand pl-3">
            {searchQuery ? `Search Results for "${searchQuery}"` : "More Dishes by Café Mocha"}
          </h2>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 px-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-accent-brand border-t-transparent rounded-full animate-spin" />
              <p className="text-text-muted text-sm italic">Browsing coffee kitchens...</p>
            </div>
          ) : errorCode ? (
            <div className="text-center py-20 px-4 bg-surface-card rounded-2xl border border-white/5 my-4">
              <p className="text-accent-brand font-medium mb-2">{errorCode}</p>
              <button
                onClick={() => handleSearch(searchQuery, false)}
                className="text-xs underline hover:text-white transition-colors"
              >
                Retry Request
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 px-6 bg-surface-card/60 rounded-3xl border border-white/5 my-4">
              <p className="text-text-muted text-base font-medium mb-1">No dishes match your search</p>
              <p className="text-text-muted text-xs">Try looking for "Tacos", "Salad", "Spicy" or select another query.</p>
              <button
                onClick={handleClear}
                className="mt-4 px-5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-full transition-colors cursor-pointer"
              >
                Reset Menu Book
              </button>
            </div>
          ) : (
            /* Responsive Grid system: single column on mobiles, 2 columns on wide screens */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item) => (
                <FoodCard
                  key={item.id}
                  item={item}
                  onAddClick={handleAddItem}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Floating Add to Cart feedback animation overlay */}
      {addedItemName && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-white text-black font-semibold text-xs py-2 px-4 rounded-full shadow-2xl flex items-center gap-2 animate-bounce border border-black/5">
          <ShoppingBag className="w-3.5 h-3.5 text-accent-brand" />
          <span>Added {addedItemName}!</span>
        </div>
      )}

      {/* Bottom Sticky Status Action bar (for mobile app experience) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4">
        <div className="bg-[#121212]/95 border border-white/10 rounded-full py-3 px-6 shadow-2xl flex items-center justify-between backdrop-blur-md">
          <div className="flex flex-col">
            <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">
              Menu Book
            </span>
            <span className="text-white text-xs font-bold">
              {cartCount === 0 ? "Empty Cart" : `${cartCount} items selected`}
            </span>
          </div>
          <button
            onClick={() => cartCount > 0 && alert("Checkout details: dummy interface.")}
            disabled={cartCount === 0}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all
              ${
                cartCount > 0
                  ? "bg-accent-brand text-white hover:bg-accent-brand-hover cursor-pointer"
                  : "bg-white/10 text-white/40 cursor-not-allowed"
              }
            `}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Order Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
