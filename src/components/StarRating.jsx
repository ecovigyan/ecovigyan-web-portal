"use client";

import { useState } from "react";
import { Star } from "lucide-react";

const SIZES = {
  sm: "w-3.5 h-3.5",
  md: "w-5 h-5",
  lg: "w-7 h-7",
};

/**
 * Star rating display, and optionally an input.
 *
 * Read-only by default: pass onChange to make it interactive, which switches
 * it to buttons in a radiogroup so it is reachable by keyboard.
 *
 * Fractional values render as a partial star, so an average of 4.3 looks
 * different from 4.0 rather than rounding away the difference.
 */
export default function StarRating({
  value = 0,
  onChange,
  size = "md",
  className = "",
  label,
}) {
  const [hovered, setHovered] = useState(0);
  const interactive = typeof onChange === "function";
  const sizeClass = SIZES[size] || SIZES.md;

  // While hovering an interactive widget, preview that value instead
  const shown = interactive && hovered ? hovered : value;

  if (!interactive) {
    return (
      <div
        className={`inline-flex items-center gap-0.5 ${className}`}
        role="img"
        aria-label={label || `Rated ${value} out of 5`}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          // Portion of THIS star that should be filled, 0–1
          const fill = Math.max(0, Math.min(1, shown - (star - 1)));
          return (
            <span key={star} className={`relative inline-block ${sizeClass}`}>
              <Star className={`${sizeClass} absolute inset-0 text-stone-300`} fill="currentColor" />
              {fill > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                >
                  <Star className={`${sizeClass} text-amber-400`} fill="currentColor" />
                </span>
              )}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      role="radiogroup"
      aria-label={label || "Rating"}
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          className="p-0.5 rounded transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
        >
          <Star
            className={`${sizeClass} transition-colors ${
              star <= shown ? "text-amber-400" : "text-stone-300"
            }`}
            fill="currentColor"
          />
        </button>
      ))}
    </div>
  );
}
