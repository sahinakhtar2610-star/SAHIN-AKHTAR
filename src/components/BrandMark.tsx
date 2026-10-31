import React from "react";

export const LOGO_URL = "/logo.png";

interface BrandMarkProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  withGlow?: boolean;
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  size = "md",
  className = "",
  withGlow = false,
}) => {
  const sizeMap = {
    xs: "w-5 h-5 rounded-md",
    sm: "w-7 h-7 rounded-lg",
    md: "w-9 h-9 rounded-xl",
    lg: "w-12 h-12 rounded-2xl",
    xl: "w-20 h-20 rounded-3xl",
  };

  const containerClass = sizeMap[size] || sizeMap.md;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      {withGlow && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/30 via-emerald-500/30 to-blue-500/30 blur-md transform scale-125 pointer-events-none animate-pulse" />
      )}
      <div
        className={`${containerClass} relative overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center justify-center p-0.5`}
      >
        <img
          src={LOGO_URL}
          alt="SAHIN AI"
          className="w-full h-full object-contain select-none"
          draggable={false}
          loading="eager"
        />
      </div>
    </div>
  );
};

