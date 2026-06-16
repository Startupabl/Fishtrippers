// Category-specific placeholder hero images for listings without a cover photo.
// Inline SVG keeps them in-bundle (no extra HTTP request, SSR-safe).
// Palette is strictly Lemon Green + neutral cream/charcoal.

import type { JourneyCategory } from "@/data/lesson-paths";

const GREEN = "#0A2540";
const GREEN_DARK = "#1F6B36";
const YELLOW = "#E8B547";
const CREAM = "#FFFDF5";
const INK = "#1F2A24";

function svg(inner: string, label: string): string {
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 675' preserveAspectRatio='xMidYMid slice'>
        <rect width='1200' height='675' fill='${CREAM}'/>
        ${inner}
        <g font-family='Inter, system-ui, sans-serif' fill='${INK}' fill-opacity='0.7'>
          <text x='60' y='90' font-size='22' font-weight='700' letter-spacing='6'>AIMENTORING.IO</text>
          <text x='60' y='122' font-size='16' font-weight='500' letter-spacing='2' fill-opacity='0.55'>${label.toUpperCase()}</text>
        </g>
      </svg>`,
    )
  );
}

const aiMusic = () => {
  // Equalizer bars
  let bars = "";
  const heights = [120, 220, 80, 300, 180, 260, 140, 340, 200, 110, 280, 160, 240, 90, 320, 180, 260, 130];
  heights.forEach((h, i) => {
    const x = 80 + i * 60;
    const y = 540 - h;
    bars += `<rect x='${x}' y='${y}' width='36' height='${h}' rx='8' fill='${GREEN}' fill-opacity='${0.55 + (i % 3) * 0.15}'/>`;
  });
  return svg(
    `<g>${bars}</g>
     <circle cx='960' cy='220' r='90' fill='${YELLOW}' fill-opacity='0.85'/>
     <circle cx='960' cy='220' r='28' fill='${INK}'/>`,
    "AI Music",
  );
};

const aiArt = () => {
  // Palette + brush
  return svg(
    `<g transform='translate(380 200)'>
       <path d='M260 0 C 380 0 460 100 460 200 C 460 280 400 320 340 320 C 300 320 280 300 280 270 C 280 240 310 230 340 230 C 380 230 410 210 410 180 C 410 90 340 40 260 40 C 160 40 80 110 80 220 C 80 320 160 380 260 380 C 280 380 300 376 320 370 L 320 420 C 300 426 280 430 260 430 C 130 430 30 340 30 220 C 30 100 130 0 260 0 Z'
             fill='${GREEN}' fill-opacity='0.92'/>
       <circle cx='130' cy='150' r='28' fill='${YELLOW}'/>
       <circle cx='200' cy='100' r='24' fill='${GREEN_DARK}'/>
       <circle cx='290' cy='90' r='26' fill='${YELLOW}'/>
       <circle cx='370' cy='130' r='22' fill='${GREEN_DARK}'/>
     </g>
     <g transform='translate(820 380) rotate(20)'>
       <rect x='0' y='0' width='260' height='28' rx='6' fill='${INK}'/>
       <rect x='260' y='-6' width='40' height='40' rx='4' fill='${YELLOW}'/>
       <path d='M300 -10 L 360 14 L 300 38 Z' fill='${GREEN_DARK}'/>
     </g>`,
    "AI Art",
  );
};

const aiWork = () => {
  // Gear + document
  return svg(
    `<g transform='translate(700 180)'>
       <path d='M150 0 L 180 0 L 192 50 L 232 60 L 264 28 L 286 50 L 254 82 L 264 122 L 314 134 L 314 164 L 264 176 L 254 216 L 286 248 L 264 270 L 232 238 L 192 248 L 180 298 L 150 298 L 138 248 L 98 238 L 66 270 L 44 248 L 76 216 L 66 176 L 16 164 L 16 134 L 66 122 L 76 82 L 44 50 L 66 28 L 98 60 L 138 50 Z'
             fill='${GREEN}'/>
       <circle cx='165' cy='149' r='52' fill='${CREAM}'/>
       <circle cx='165' cy='149' r='22' fill='${GREEN_DARK}'/>
     </g>
     <g transform='translate(160 200)'>
       <rect x='0' y='0' width='340' height='420' rx='18' fill='${YELLOW}' fill-opacity='0.25' stroke='${GREEN_DARK}' stroke-width='4'/>
       <rect x='40' y='60' width='260' height='14' rx='4' fill='${GREEN_DARK}' fill-opacity='0.7'/>
       <rect x='40' y='100' width='220' height='10' rx='3' fill='${GREEN_DARK}' fill-opacity='0.45'/>
       <rect x='40' y='130' width='240' height='10' rx='3' fill='${GREEN_DARK}' fill-opacity='0.45'/>
       <rect x='40' y='180' width='260' height='14' rx='4' fill='${GREEN}' fill-opacity='0.85'/>
       <rect x='40' y='220' width='180' height='10' rx='3' fill='${GREEN_DARK}' fill-opacity='0.45'/>
       <rect x='40' y='250' width='220' height='10' rx='3' fill='${GREEN_DARK}' fill-opacity='0.45'/>
       <rect x='40' y='320' width='120' height='40' rx='8' fill='${GREEN}'/>
     </g>`,
    "AI for Work",
  );
};

const aiLife = () => {
  // Sun + leaf
  return svg(
    `<circle cx='320' cy='300' r='130' fill='${YELLOW}' fill-opacity='0.9'/>
     <g stroke='${YELLOW}' stroke-width='10' stroke-linecap='round'>
       <line x1='320' y1='100' x2='320' y2='150'/>
       <line x1='320' y1='450' x2='320' y2='500'/>
       <line x1='120' y1='300' x2='170' y2='300'/>
       <line x1='470' y1='300' x2='520' y2='300'/>
       <line x1='180' y1='160' x2='215' y2='195'/>
       <line x1='425' y1='405' x2='460' y2='440'/>
       <line x1='460' y1='160' x2='425' y2='195'/>
       <line x1='215' y1='405' x2='180' y2='440'/>
     </g>
     <g transform='translate(700 160)'>
       <path d='M40 380 C 40 200 200 40 380 40 C 380 220 220 380 40 380 Z' fill='${GREEN}'/>
       <path d='M70 360 C 160 270 250 200 360 80' stroke='${CREAM}' stroke-width='6' fill='none' stroke-linecap='round'/>
     </g>`,
    "AI for Life",
  );
};

const design = () => {
  // Bezier + grid
  let grid = "";
  for (let i = 0; i <= 12; i++) {
    grid += `<line x1='${100 + i * 80}' y1='160' x2='${100 + i * 80}' y2='560' stroke='${GREEN_DARK}' stroke-opacity='0.12' stroke-width='1'/>`;
  }
  for (let j = 0; j <= 5; j++) {
    grid += `<line x1='100' y1='${160 + j * 80}' x2='1100' y2='${160 + j * 80}' stroke='${GREEN_DARK}' stroke-opacity='0.12' stroke-width='1'/>`;
  }
  return svg(
    `<g>${grid}</g>
     <path d='M180 480 C 380 200 720 200 920 480' stroke='${GREEN}' stroke-width='10' fill='none' stroke-linecap='round'/>
     <line x1='120' y1='540' x2='180' y2='480' stroke='${GREEN_DARK}' stroke-width='2'/>
     <line x1='980' y1='540' x2='920' y2='480' stroke='${GREEN_DARK}' stroke-width='2'/>
     <circle cx='180' cy='480' r='14' fill='${YELLOW}' stroke='${GREEN_DARK}' stroke-width='2'/>
     <circle cx='920' cy='480' r='14' fill='${YELLOW}' stroke='${GREEN_DARK}' stroke-width='2'/>
     <rect x='108' y='528' width='24' height='24' rx='3' fill='${INK}'/>
     <rect x='968' y='528' width='24' height='24' rx='3' fill='${INK}'/>`,
    "Design",
  );
};

const aiBasics = () => {
  // Node graph
  const nodes = [
    [220, 240], [400, 160], [600, 320], [800, 200], [980, 360],
    [320, 460], [560, 520], [820, 480],
  ];
  const edges: [number, number][] = [
    [0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [2, 5], [2, 6], [3, 4], [4, 7], [5, 6], [6, 7], [3, 6],
  ];
  let lines = "";
  edges.forEach(([a, b]) => {
    lines += `<line x1='${nodes[a][0]}' y1='${nodes[a][1]}' x2='${nodes[b][0]}' y2='${nodes[b][1]}' stroke='${GREEN_DARK}' stroke-opacity='0.4' stroke-width='2'/>`;
  });
  let dots = "";
  nodes.forEach(([x, y], i) => {
    const r = i % 3 === 0 ? 26 : 18;
    const fill = i % 2 === 0 ? GREEN : YELLOW;
    dots += `<circle cx='${x}' cy='${y}' r='${r}' fill='${fill}' stroke='${GREEN_DARK}' stroke-width='2'/>`;
  });
  return svg(`<g>${lines}</g><g>${dots}</g>`, "AI Basics");
};

const PLACEHOLDERS: Record<JourneyCategory, () => string> = {
  "AI Music": aiMusic,
  "AI Art": aiArt,
  "AI for Work": aiWork,
  "AI for Life": aiLife,
  Design: design,
  "AI Basics": aiBasics,
};

const cache = new Map<string, string>();

export function getCategoryPlaceholder(category: string): string {
  if (!cache.has(category)) {
    const fn = (PLACEHOLDERS as Record<string, () => string>)[category] ?? aiBasics;
    cache.set(category, fn());
  }
  return cache.get(category)!;
}
