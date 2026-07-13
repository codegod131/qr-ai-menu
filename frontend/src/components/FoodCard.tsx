import Link from "next/link";
import Image from "next/image";
import { MenuItem } from "@/lib/dummy-data";
import RatingBadge from "./RatingBadge";

interface FoodCardProps {
  item: MenuItem;
}

export default function FoodCard({ item }: FoodCardProps) {
  const { id, name, rating, ratingsCount, description, price, image, tags } = item;

  return (
    <Link href={`/item/${id}`} className="block group">
      <div className="relative flex bg-surface-card hover:bg-[#1f1f1f] border border-white/5 rounded-2xl p-4 gap-4 transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5 cursor-pointer max-w-full overflow-hidden">

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

        {/* Right Side: Image with corner wrapper */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shrink-0 aspect-square">
          <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width: 640px) 112px, 128px"
            className="object-cover group-hover:scale-105 transition-transform duration-500 rounded-2xl"
            priority={false}
          />
        </div>

      </div>
    </Link>
  );
}
