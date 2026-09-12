import React from "react";

interface FastPOSLogoProps {
  size?: number;
  className?: string;
  variant?: "badge" | "mark" | "full";
  showText?: boolean;
  subtitle?: string;
}

export function FastPOSLogo({
  size = 40,
  className = "",
  variant = "badge",
  showText = false,
  subtitle = "Point of Sale",
}: FastPOSLogoProps) {
  const isBadge = variant === "badge" || variant === "full";

  const markSvg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="FastPOS Logo"
    >
      <defs>
        {/* Flame & Lightning Gradients */}
        <linearGradient id="fpFlameGrad" x1="50" y1="8" x2="50" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF176" />
          <stop offset="35%" stopColor="#FFA726" />
          <stop offset="100%" stopColor="#F4511E" />
        </linearGradient>

        <linearGradient id="fpFGrad" x1="28" y1="28" x2="74" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFA726" />
          <stop offset="50%" stopColor="#FF7043" />
          <stop offset="100%" stopColor="#D84315" />
        </linearGradient>

        <linearGradient id="fpBoltGrad" x1="40" y1="36" x2="68" y2="76" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF9C4" />
          <stop offset="40%" stopColor="#FFD54F" />
          <stop offset="100%" stopColor="#FF9800" />
        </linearGradient>

        <linearGradient id="fpBadgeBg" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#25201C" />
          <stop offset="60%" stopColor="#181412" />
          <stop offset="100%" stopColor="#0E0C0B" />
        </linearGradient>

        <linearGradient id="fpBadgeBorder" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF8A65" stopOpacity="0.55" />
          <stop offset="50%" stopColor="#FFB74D" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FF7043" stopOpacity="0.1" />
        </linearGradient>

        {/* Glow Filter */}
        <filter id="fpGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {isBadge && (
        <>
          {/* Badge Background */}
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="24"
            fill="url(#fpBadgeBg)"
            stroke="url(#fpBadgeBorder)"
            strokeWidth="2"
          />

          {/* Inner ambient rim */}
          <rect
            x="7"
            y="7"
            width="86"
            height="86"
            rx="21"
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="1"
          />
        </>
      )}

      {/* Flame Motif (Top Crown) */}
      <g filter="url(#fpGlow)">
        <path
          d="M50 11C49.2 16.5 45.5 19.5 44 23.5C42.2 28.5 44.5 32 47.5 33.5C47.8 28.8 52 24.5 53.5 21C55.5 24 57.8 28.5 56.5 32.5C59 29.5 59.5 24.5 58 20.5C57 18 55 14 50 11Z"
          fill="url(#fpFlameGrad)"
        />
        <path
          d="M49 21C47.5 24 47.8 27.5 49.5 29.5C50 26.5 52.5 24.5 53 22C51 22 49.5 21.5 49 21Z"
          fill="#FFF9C4"
          opacity="0.85"
        />
      </g>

      {/* Geometric 'F' Monogram */}
      <path
        d="M29 34.5C29 33.1 30.1 32 31.5 32H70C71.7 32 72.5 34.1 71.3 35.3L64.8 41.8C64.3 42.3 63.6 42.5 63 42.5H41V49.5H62.5C64.2 49.5 65 51.5 63.8 52.7L59.3 57.2C58.8 57.7 58.1 58 57.5 58H41V81C41 82.7 38.9 83.5 37.7 82.3L29.7 74.3C29.2 73.8 29 73.1 29 72.5V34.5Z"
        fill="url(#fpFGrad)"
      />

      {/* Lightning Speed Bolt (Fast Motif) */}
      <path
        d="M55 35L38 56H48.5L42 78L63 50H51.5L55 35Z"
        fill="url(#fpBoltGrad)"
        stroke="#1E1916"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />

      {/* High-speed highlight accent */}
      <path
        d="M45.5 53.5L54.5 38.5L52.5 48.5H60L45.5 70L48 53.5H45.5Z"
        fill="white"
        opacity="0.3"
      />
    </svg>
  );

  if (!showText && variant !== "full") {
    return markSvg;
  }

  return (
    <div className="flex items-center gap-3">
      {markSvg}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-[16px] font-bold tracking-tight text-white">
            Fast<span style={{ color: "var(--accent, #f97316)" }}>POS</span>
          </span>
          <span className="rounded bg-white/10 px-1 py-0.2 text-[9px] font-semibold uppercase tracking-wider text-cream/60">
            PRO
          </span>
        </div>
        {subtitle && (
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-cream/40">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
