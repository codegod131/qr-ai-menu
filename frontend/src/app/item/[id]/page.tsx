"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getMenuItem } from "@/lib/api";
import { MenuItem } from "@/lib/dummy-data";
import RatingBadge from "@/components/RatingBadge";
import QuantitySelector from "@/components/QuantitySelector";
import AddButton from "@/components/AddButton";
import { ArrowLeft, Flame, Check } from "lucide-react";

interface ItemPageProps {
  params: Promise<{ id: string }>;
}

export default function ItemDetailPage({ params }: ItemPageProps) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [item, setItem] = useState<MenuItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    async function loadItem() {
      try {
        setIsLoading(true);
        const data = await getMenuItem(id);
        setItem(data);
      } catch (err) {
        console.error("Failed to load menu item details", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadItem();
  }, [id]);

  const handleAddToCart = () => {
    if (!item) return;
    setIsAdded(true);
    // Visual timer success reset
    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen text-white flex flex-col items-center justify-center bg-radial-to-b from-brand-from to-brand-to">
        <div className="w-10 h-10 border-4 border-accent-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-text-muted text-sm italic">Loading chef's recipe...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen text-white flex flex-col items-center justify-center px-6 bg-radial-to-b from-brand-from to-brand-to text-center">
        <div className="bg-surface-card p-8 rounded-3xl border border-white/5 max-w-sm w-full">
          <h2 className="text-xl font-bold mb-2">Item Not Found</h2>
          <p className="text-text-muted text-sm mb-6">
            We couldn't find the dish you were looking for. It might have been updated or removed.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-accent-brand hover:bg-accent-brand-hover text-white text-sm font-semibold rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Menu Book</span>
          </Link>
        </div>
      </div>
    );
  }

  const totalPrice = item.price * quantity;

  return (
    <div className="min-h-screen text-white flex flex-col items-center">
      {/* Container wrapper mimicking interactive phone or layout grid */}
      <div className="w-full max-w-2xl min-h-screen bg-black/60 shadow-2xl flex flex-col border-x border-white/5 pb-32 relative">
        
        {/* Floating circular Back Action arrow button */}
        <div className="absolute top-4 left-4 z-30">
          <Link
            href="/"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 border border-white/10 transition-colors text-white"
            aria-label="Back to main menu listing"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>

        {/* Hero Product Image */}
        <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] overflow-hidden rounded-b-[2.5rem]">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 z-10" />
          <Image
            src={item.image}
            alt={item.name}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 640px"
            className="object-cover"
          />
        </div>

        {/* Title Details Section */}
        <div className="px-6 py-6 flex flex-col gap-4">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {item.name}
              </h1>
              {item.category && (
                <span className="text-xs font-bold text-accent-brand uppercase tracking-wider mt-1 block">
                  {item.category}
                </span>
              )}
            </div>
            {/* Calories badge */}
            <div className="bg-info-kcal/10 border border-info-kcal/20 px-3 py-1 rounded-full shrink-0 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-info-kcal fill-info-kcal/15" />
              <span className="text-xs font-bold text-info-kcal tracking-wide">
                {item.kcal} Kcal
              </span>
            </div>
          </div>

          {/* Social Stars & Count metadata */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <RatingBadge rating={item.rating} ratingsCount={item.ratingsCount} />
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-bold bg-white/5 border border-white/10 text-accent-brand px-2.5 py-0.5 rounded-full lowercase"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Recipe descriptions */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted">
              About this dish
            </h3>
            <p className="text-sm text-text-muted leading-relaxed font-sans">
              {item.description}
            </p>
          </div>

          {/* Controls: Quantity selectors */}
          <div className="flex items-center justify-between border-t border-white/5 pt-6 mt-2">
            <span className="text-sm font-bold text-white uppercase tracking-wider">
              Quantity / Portions
            </span>
            <QuantitySelector quantity={quantity} onChange={setQuantity} />
          </div>
        </div>

        {/* App-pinned action bar button details */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#0f0a0b]/95 border-t border-white/10 backdrop-blur-md z-40 py-4 px-6 flex justify-between items-center gap-4 max-w-2xl mx-auto shadow-[0_-8px_30px_rgb(0,0,0,0.5)]">
          <div className="flex flex-col">
            <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">
              Total Order Price
            </span>
            <span className="text-white text-xl font-extrabold">
              ${totalPrice.toFixed(2)}
            </span>
          </div>

          <div className="w-48 sm:w-60">
            <AddButton
              size="lg"
              onClick={handleAddToCart}
              label={isAdded ? "Added!" : `Add to Cart`}
              className={`w-full flex items-center justify-center gap-2 h-12 ${
                isAdded ? "bg-emerald-600 hover:bg-emerald-700" : ""
              }`}
              disabled={isAdded}
            >
              {isAdded && <Check className="w-4 h-4 animate-scale-up" />}
            </AddButton>
          </div>
        </div>

      </div>
    </div>
  );
}
