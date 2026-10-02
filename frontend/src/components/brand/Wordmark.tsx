import React from 'react';

/**
 * The Tudu wordmark: a handwritten brush-stroke "tudu" with the green
 * checkmark sweeping underneath, drawn as SVG paths so it stays crisp at
 * any size and picks up the theme's ink colour in dark mode.
 *
 * The paths approximate the brush lettering of the original raster artwork:
 * rounded caps and joins, slightly uneven control points, and a tapered
 * checkmark that flicks up on the right.
 */
const Wordmark: React.FC<{ className?: string; title?: string }> = ({
  className = '',
  title = 'Tudu',
}) => (
  <svg
    viewBox="0 0 250 104"
    className={className}
    role="img"
    aria-label={title}
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>{title}</title>

    {/* "tudu" in ink */}
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="7.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* t - tall stem with a crossbar */}
      <path d="M46 16 C44 40 41 62 43 80" />
      <path d="M25 38 C36 34 54 33 66 35" />

      {/* u */}
      <path d="M80 44 C77 62 78 76 88 76 C97 76 101 62 102 46" />
      <path d="M102 46 C101 62 103 76 113 76 C122 76 127 64 128 50" />

      {/* d - a bowl that climbs into its ascender */}
      <path d="M150 48 C142 58 139 72 144 79 C149 86 158 83 160 71 C161 63 161 55 160 49" />
      <path d="M160 49 C161 38 162 24 163 16 C164 40 168 62 172 80" />

      {/* u */}
      <path d="M182 44 C179 62 180 76 190 76 C199 76 203 62 204 46" />
      <path d="M204 46 C203 62 205 76 215 76 C224 76 228 64 229 50" />
    </g>

    {/* The green checkmark, sweeping low before flicking up on the right */}
    <path
      d="M10 96 C60 92 110 94 152 96 C174 97 186 93 196 80 C204 70 214 52 226 30 C231 24 235 20 239 18"
      fill="none"
      stroke="var(--color-accent)"
      strokeWidth="6.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default Wordmark;