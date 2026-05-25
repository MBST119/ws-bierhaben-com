'use client';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  // Dimension definitions based on size
  const dimensions = {
    sm: {
      svgWidth: 32,
      svgHeight: 32,
      textSize: 'text-lg',
      bubblePadding: 'px-2 py-0.5',
      bubbleRoundness: 'rounded-lg',
      gap: 'gap-1',
    },
    md: {
      svgWidth: 44,
      svgHeight: 44,
      textSize: 'text-2xl',
      bubblePadding: 'px-3 py-1',
      bubbleRoundness: 'rounded-xl',
      gap: 'gap-2',
    },
    lg: {
      svgWidth: 100,
      svgHeight: 100,
      textSize: 'text-5xl md:text-6xl',
      bubblePadding: 'px-6 py-3',
      bubbleRoundness: 'rounded-3xl border-[6px] md:border-[8px]',
      gap: 'gap-4',
    },
  };

  const { svgWidth, svgHeight, textSize, bubblePadding, bubbleRoundness, gap } = dimensions[size];

  return (
    <div className={`flex items-center ${gap} ${className} select-none`}>
      {/* Clinking Beer Mugs SVG */}
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transform hover:scale-110 transition-transform duration-200"
      >
        {/* Left Beer Mug */}
        <g transform="translate(-5, 5) rotate(-15 50 50)">
          {/* Handle */}
          <path
            d="M30 45 H20 V75 H30"
            stroke="#FF8C00"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Glass Body */}
          <rect
            x="30"
            y="35"
            width="25"
            height="45"
            rx="4"
            fill="#FFB300"
            stroke="#00264D"
            strokeWidth="5"
          />
          {/* Glass Highlights/Stripes */}
          <line x1="38" y1="42" x2="38" y2="72" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          <line x1="47" y1="42" x2="47" y2="72" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          {/* Beer Foam */}
          <path
            d="M26 35 C26 27 34 25 38 29 C40 25 48 24 52 28 C55 24 59 27 59 35 Z"
            fill="#FFFFFF"
            stroke="#00264D"
            strokeWidth="4"
          />
        </g>

        {/* Right Beer Mug */}
        <g transform="translate(10, 5) rotate(15 50 50)">
          {/* Handle */}
          <path
            d="M70 45 H80 V75 H70"
            stroke="#FF8C00"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Glass Body */}
          <rect
            x="45"
            y="35"
            width="25"
            height="45"
            rx="4"
            fill="#FFB300"
            stroke="#00264D"
            strokeWidth="5"
          />
          {/* Glass Highlights/Stripes */}
          <line x1="53" y1="42" x2="53" y2="72" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          <line x1="62" y1="42" x2="62" y2="72" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          {/* Beer Foam */}
          <path
            d="M41 35 C41 27 49 25 53 29 C55 25 63 24 67 28 C70 24 74 27 74 35 Z"
            fill="#FFFFFF"
            stroke="#00264D"
            strokeWidth="4"
          />
        </g>

        {/* Sparks / Clinking Lines */}
        <path d="M50 15 L50 5" stroke="#FF8C00" strokeWidth="4" strokeLinecap="round" />
        <path d="M40 18 L32 10" stroke="#FF8C00" strokeWidth="4" strokeLinecap="round" />
        <path d="M60 18 L68 10" stroke="#FF8C00" strokeWidth="4" strokeLinecap="round" />
      </svg>

      {/* Typography with Speech Bubble */}
      <div className={`flex items-center font-black tracking-tight ${textSize}`}>
        {/* "bier" inside the orange speech bubble */}
        <div
          className={`bg-primary text-white ${bubblePadding} ${bubbleRoundness} shadow-sm border-2 md:border-[3px] border-white flex items-center justify-center relative leading-none`}
        >
          <span>bier</span>
          {/* Little speech bubble tail */}
          <div className="absolute -bottom-2 right-4 w-4 h-4 bg-primary border-r-2 border-b-2 border-white rotate-45 transform origin-top-left hidden md:block"></div>
        </div>

        {/* "haben" in dark blue (or white/light in dark mode) */}
        <span className="text-secondary dark:text-foreground ml-1.5 leading-none">haben</span>

        {/* ".com" in orange */}
        <span className="text-primary leading-none">.com</span>
      </div>
    </div>
  );
}
