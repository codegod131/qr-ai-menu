import { Star } from "lucide-react";

interface RatingBadgeProps {
  rating: number;
  ratingsCount: number;
  showCount?: boolean;
  className?: string;
}

export default function RatingBadge({
  rating,
  ratingsCount,
  showCount = true,
  className = "",
}: RatingBadgeProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Star
        className="w-4 h-4 text-star-gold fill-star-gold shrink-0"
        strokeWidth={2}
      />
      <span className="text-sm font-semibold text-white leading-none">
        {rating.toFixed(1)}
      </span>
      {showCount && (
        <span className="text-xs text-text-muted leading-none">
          ({ratingsCount} ratings)
        </span>
      )}
    </div>
  );
}
