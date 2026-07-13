import { Minus, Plus } from "lucide-react";

interface QuantitySelectorProps {
  quantity: number;
  onChange: (qty: number) => void;
  min?: number;
  max?: number;
}

export default function QuantitySelector({
  quantity,
  onChange,
  min = 1,
  max = 99,
}: QuantitySelectorProps) {
  const handleDecrement = () => {
    if (quantity > min) {
      onChange(quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < max) {
      onChange(quantity + 1);
    }
  };

  return (
    <div className="flex items-center bg-surface-card border border-white/10 rounded-full p-1 select-none w-fit">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={quantity <= min}
        className={`
          w-8 h-8 rounded-full flex items-center justify-center text-white
          active:scale-95 transition-all
          ${
            quantity <= min
              ? "opacity-40 cursor-not-allowed"
              : "hover:bg-white/10 cursor-pointer"
          }
        `}
        aria-label="Decrease quantity"
      >
        <Minus className="w-4 h-4" />
      </button>

      <span className="w-10 text-center font-bold text-base text-white">
        {quantity}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={quantity >= max}
        className={`
          w-8 h-8 rounded-full flex items-center justify-center text-white
          active:scale-95 transition-all
          ${
            quantity >= max
              ? "opacity-40 cursor-not-allowed"
              : "hover:bg-white/10 cursor-pointer"
          }
        `}
        aria-label="Increase quantity"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
