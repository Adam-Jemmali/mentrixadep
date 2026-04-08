/**
 * Generates PNG icons for the web app manifest from public/mentrixa-checkout-icon.svg
 * Also writes public/favicon.ico (Google uses this) and src/app/icon.png (Next.js metadata).
 * Run: node scripts/generate-pwa-icons.mjs
 */
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { mkdir, readFile, writeFile } from "fs/promises";
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
    await writeFile(file, png);
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
  await writeFile(maskPath, maskable);
  console.log("Wrote", maskPath);

  const icon16Path = join(outDir, "icon-16.png");
  const icon32Path = join(outDir, "icon-32.png");
  const png16 = await sharp(buf).resize(16, 16).png().toBuffer();
  const png32 = await sharp(buf).resize(32, 32).png().toBuffer();
  await writeFile(icon16Path, png16);
  await writeFile(icon32Path, png32);
  console.log("Wrote", icon16Path);
  console.log("Wrote", icon32Path);

  const icoBuf = await pngToIco([icon16Path, icon32Path]);
  const faviconPath = join(root, "public", "favicon.ico");
  await writeFile(faviconPath, icoBuf);
  console.log("Wrote", faviconPath);

  const appIconPath = join(root, "src", "app", "icon.png");
  const app512 = await sharp(buf).resize(512, 512).png().toBuffer();
  await writeFile(appIconPath, app512);
  console.log("Wrote", appIconPath);

  const applePath = join(root, "public", "apple-icon.png");
  const apple180 = await sharp(buf).resize(180, 180).png().toBuffer();
  await writeFile(applePath, apple180);
  console.log("Wrote", applePath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
