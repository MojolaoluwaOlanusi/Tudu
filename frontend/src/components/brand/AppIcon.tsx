import React from 'react';

/**
 * The Tudu app icon: a green brush-textured circle containing a white
 * checkmark. Used for the favicon, the login screen and anywhere the brand
 * needs a compact mark.
 *
 * The speckle overlay gives the circle the same brush/paper texture as the
 * rest of the UI, so it does not read as a flat sticker.
 */
const AppIcon: React.FC<{ className?: string; title?: string }> = ({
  className = '',
  title = 'Tudu',
}) => (
  <svg
    viewBox="0 0 128 128"
    className={className}
    role="img"
    aria-label={title}
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>{title}</title>
    <defs>
      {/* Brush texture for the green disc */}
      <filter id="tudu-brush">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="3"
          seed="7"
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="3"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
      <clipPath id="tudu-circle">
        <circle cx="64" cy="64" r="60" />
      </clipPath>
    </defs>

    <g filter="url(#tudu-brush)">
      <circle cx="64" cy="64" r="60" fill="#22c55e" />
    </g>

    {/* Speckle inside the disc only */}
    <g clipPath="url(#tudu-circle)" opacity="0.22">
      <rect width="128" height="128" filter="url(#tudu-brush)" />
    </g>

    {/* White checkmark */}
    <path
      d="M40 66 L58 84 L90 46"
      fill="none"
      stroke="#ffffff"
      strokeWidth="13"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default AppIcon;