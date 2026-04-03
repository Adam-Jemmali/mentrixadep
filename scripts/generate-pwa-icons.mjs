/**
 * Generates PNG icons for the web app manifest from public/mentrixa-checkout-icon.svg
 * Run: node scripts/generate-pwa-icons.mjs
 */
import sharp from "sharp";
import { mkdir, readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "public", "mentrixa-checkout-icon.svg");
const outDir = join(root, "public", "icons");

const sizes = [192, 512];

async function main() {
  await mkdir(outDir, { recursive: true });
  const buf = await readFile(svgPath);
  for (const size of sizes) {
    const png = await sharp(buf).resize(size, size).png().toBuffer();
    const file = join(outDir, `icon-${size}.png`);
    await import("fs/promises").then((fs) => fs.writeFile(file, png));
    console.log("Wrote", file);
  }
  // Maskable: extra padding via resize onto larger canvas (safe zone)
  const maskSize = 512;
  const inner = Math.round(maskSize * 0.8);
  const pngInner = await sharp(buf).resize(inner, inner).png().toBuffer();
  const maskable = await sharp({
    create: {
      width: maskSize,
      height: maskSize,
      channels: 4,
      background: { r: 30, g: 99, b: 235, alpha: 1 },
    },
  })
    .composite([{ input: pngInner, left: Math.round((maskSize - inner) / 2), top: Math.round((maskSize - inner) / 2) }])
    .png()
    .toBuffer();
  const maskPath = join(outDir, "icon-maskable-512.png");
  await import("fs/promises").then((fs) => fs.writeFile(maskPath, maskable));
  console.log("Wrote", maskPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
