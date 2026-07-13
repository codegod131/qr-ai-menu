import React from "react";

interface AddButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  label?: string;
}

export default function AddButton({
  size = "md",
  label = "Add",
  className = "",
  onClick,
  ...props
}: AddButtonProps) {
  const sizeClasses = {
    sm: "px-4 py-1 text-xs font-semibold rounded-full",
    md: "px-5 py-1.5 text-sm font-semibold rounded-full",
    lg: "px-8 py-3.5 text-base font-bold rounded-full w-full shadow-lg shadow-accent-brand/20",
  };

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Optional micro-interaction feedback
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      onClick={handleRipple}
      className={`
        bg-accent-brand text-white border-0 cursor-pointer
        hover:bg-accent-brand-hover active:scale-95 transition-all duration-200 ease-out
        hover:shadow-md hover:shadow-accent-brand/35 text-center leading-none select-none
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {label}
    </button>
  );
}
