// Renders public/og.png (1200×630) from an inline SVG with sharp: the mark, the site name, the title.
// Run by hand (`pnpm og`) when the wording changes; the PNG is committed.
import { realpathSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

// sharp is a dependency of astro, not of this package: resolve it from astro's real folder in the pnpm
// store (node_modules/astro is a symlink, and Node resolves siblings from the real path)
const astro = realpathSync(new URL("../node_modules/astro", import.meta.url));
const sharp = createRequire(`${astro}/package.json`)("sharp");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#121212"/>
  <g transform="translate(96 150) scale(1.5)">
    <path d="M100 18 L168 58 L168 142 L100 182 L32 142 L32 58 Z" fill="#f0c23b" stroke="#1a1a1a" stroke-width="14" stroke-linejoin="round"/>
    <path d="M46 118 H154" stroke="#1a1a1a" stroke-width="14" stroke-linecap="round"/>
    <path d="M58 144 H142" stroke="#1a1a1a" stroke-width="14" stroke-linecap="round"/>
    <path d="M40 72 H160" stroke="#1a1a1a" stroke-width="32" stroke-linecap="round"/>
    <circle cx="82" cy="72" r="7" fill="#f0c23b"/>
    <circle cx="118" cy="72" r="7" fill="#f0c23b"/>
  </g>
  <g font-family="Noto Sans, DejaVu Sans, sans-serif" fill="#ededed">
    <text x="440" y="265" font-size="72" font-weight="700">ANVISA em</text>
    <text x="440" y="350" font-size="72" font-weight="700">dados abertos</text>
    <text x="440" y="430" font-size="28" fill="#9a9a9a">está liberado? · em que posição? · quanto pode custar?</text>
    <text x="440" y="520" font-size="34" fill="#f0c23b">anvisa.abelhaninja.de</text>
  </g>
</svg>`;

const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
await writeFile(new URL("../public/og.png", import.meta.url), png);
console.log(`public/og.png: ${png.length} bytes`);
