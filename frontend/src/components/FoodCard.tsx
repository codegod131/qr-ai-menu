import Link from "next/link";
import Image from "next/image";
import { MenuItem } from "@/lib/dummy-data";
import RatingBadge from "./RatingBadge";
import AddButton from "./AddButton";
import { MouseEvent } from "react";

interface FoodCardProps {
  item: MenuItem;
  onAddClick?: (item: MenuItem) => void;
}

export default function FoodCard({ item, onAddClick }: FoodCardProps) {
  const { id, name, kcal, rating, ratingsCount, description, price, image, tags } = item;

  const handleAddClick = (e: MouseEvent<HTMLButtonElement>) => {
    // Stop click events from bubbling up and triggering the parent link navigation
    e.stopPropagation();
    e.preventDefault();
    if (onAddClick) {
      onAddClick(item);
    }
  };

  return (
    <Link href={`/item/${id}`} className="block group">
      <div className="relative flex bg-surface-card hover:bg-[#1f1f1f] border border-white/5 rounded-2xl p-4 gap-4 transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5 cursor-pointer max-w-full overflow-hidden">
        
        {/* Calories Badge - Top-Right of the Card */}
        <div className="absolute top-4 right-4 bg-info-kcal/10 border border-info-kcal/20 px-2 py-0.5 rounded-full">
          <span className="text-[10px] font-bold text-info-kcal uppercase tracking-wider">
            {kcal} Kcal
          </span>
        </div>

        {/* Left Side: General Details */}
        <div className="flex flex-col flex-1 justify-between pr-12 min-w-0">
          <div className="flex flex-col gap-1.5">
            {/* Item Name */}
            <h3 className="font-bold text-base md:text-lg text-white group-hover:text-accent-brand transition-colors line-clamp-1 pr-6">
              {name}
            </h3>

            {/* Stars & Rating Count Row */}
            <RatingBadge rating={rating} ratingsCount={ratingsCount} />

            {/* Tags Row */}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] font-semibold bg-white/5 border border-white/10 text-text-muted px-1.5 py-0.5 rounded-full lowercase"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Truncated Description */}
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              <span className="line-clamp-1 inline">
                {description.slice(0, 75)}
              </span>
              <span className="text-white font-semibold ml-1 cursor-pointer">
                ...read more
              </span>
            </p>
          </div>

          {/* Pricing Highlight Tag */}
          <div className="text-lg font-extrabold text-white mt-3">
            ${price.toFixed(2)}
          </div>
        </div>

        {/* Right Side: Image with corner Add button wrapper */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shrink-0 aspect-square">
          <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width: 640px) 112px, 128px"
            className="object-cover group-hover:scale-105 transition-transform duration-500 rounded-2xl"
            priority={false}
          />
          {/* Overlapping Add Button at bottom-right of the image */}
          <div className="absolute bottom-1 right-1 z-10">
            <AddButton
              size="sm"
              onClick={handleAddClick}
              className="shadow-md shadow-black/50"
            />
          </div>
        </div>

      </div>
    </Link>
  );
}
