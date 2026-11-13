/**
 * Hand-drawn style SVG artwork for the MADHU SMRUTI landing page.
 * Line-art illustrations in the brand palette — no external image assets.
 */

interface ArtProps {
  className?: string;
}

/** Small ornamental divider: gold rules meeting a lotus glyph. */
export function LotusDivider({ className = "" }: ArtProps) {
  return (
    <svg
      viewBox="0 0 160 28"
      className={`h-7 w-40 text-gold-500 ${className}`}
      fill="none"
      aria-hidden="true"
    >
      <line x1="0" y1="14" x2="62" y2="14" stroke="currentColor" strokeWidth="1" />
      <line x1="0" y1="17" x2="50" y2="17" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
      <line x1="98" y1="14" x2="160" y2="14" stroke="currentColor" strokeWidth="1" />
      <line x1="110" y1="17" x2="160" y2="17" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
      {/* lotus */}
      <path
        d="M80 6 C76.5 10 76.5 16 80 21 C83.5 16 83.5 10 80 6 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M80 21 C74 19 71 14 71.5 9 C76 11.5 78.5 15.5 80 21 Z M80 21 C86 19 89 14 88.5 9 C84 11.5 81.5 15.5 80 21 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Decorative ogee arch with lotus finial — hero backdrop watermark. */
export function ArchWatermark({ className = "" }: ArtProps) {
  return (
    <svg
      viewBox="0 0 480 320"
      className={className}
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMax meet"
    >
      {/* outer ogee arch */}
      <path
        d="M56 320 V150 C56 78 138 34 240 34 C342 34 424 78 424 150 V320"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* inner arch */}
      <path
        d="M84 320 V156 C84 94 152 58 240 58 C328 58 396 94 396 156 V320"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.7"
      />
      {/* lotus finial */}
      <circle cx="240" cy="22" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M240 27 C235 33 235 40 240 46 C245 40 245 33 240 27 Z" fill="currentColor" />
      {/* radiating petals inside the arch */}
      <path
        d="M240 46 L240 64 M198 56 L206 70 M282 56 L274 70 M164 78 L178 88 M316 78 L302 88"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* baseline */}
      <line x1="24" y1="320" x2="456" y2="320" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/** Quill pen and inkwell — Write Up card illustration. */
export function QuillArt({ className = "" }: ArtProps) {
  return (
    <svg
      viewBox="0 0 160 160"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {/* feather barbs */}
      <path
        d="M116 16 C86 32 56 66 42 104 M116 16 C104 44 88 62 66 78 M104 30 C86 46 72 58 56 68 M92 46 C78 58 66 66 54 74 M80 62 C68 72 58 80 48 88 M68 80 C58 88 50 96 44 100"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* feather outline */}
      <path
        d="M118 14 C120 26 114 42 100 58 C88 72 68 88 46 102 C50 84 62 62 76 46 C90 30 104 18 118 14 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* nib */}
      <path d="M46 102 L36 126 L54 118 Z" fill="#c09a3e" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      {/* ink drop */}
      <path d="M40 132 C37 137 38 141 41 142 C44 141 45 137 42 132 Z" fill="currentColor" />
      {/* inkwell */}
      <path
        d="M70 138 H114 C120 138 124 142 124 148 C124 158 114 162 92 162 C70 162 60 158 60 148 C60 142 64 138 70 138 Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M74 138 V130 C74 127 77 125 92 125 C107 125 110 127 110 130 V138" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="92" cy="125" rx="18" ry="4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** Easel with a small landscape painting — Painting card illustration. */
export function EaselArt({ className = "" }: ArtProps) {
  return (
    <svg
      viewBox="0 0 160 160"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {/* legs */}
      <path
        d="M76 24 L30 152 M84 24 L130 152 M80 28 V152"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* crossbar */}
      <path d="M44 118 L116 118" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* canvas */}
      <rect x="34" y="34" width="92" height="72" fill="#fdfbf5" stroke="currentColor" strokeWidth="2.5" />
      {/* little landscape sketch */}
      <circle cx="102" cy="54" r="9" stroke="#c09a3e" strokeWidth="2" />
      <path d="M42 88 Q58 68 74 82 Q92 96 118 80" stroke="#4e7a5f" strokeWidth="2" strokeLinecap="round" />
      <path d="M56 76 C53 70 55 64 60 62 C65 64 66 70 62 76" stroke="#4e7a5f" strokeWidth="2" strokeLinecap="round" />
      {/* canvas tray */}
      <rect x="30" y="104" width="100" height="7" rx="2" fill="currentColor" />
    </svg>
  );
}
