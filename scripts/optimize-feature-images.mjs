import sharp from "sharp";
import { readdir } from "node:fs/promises";
import path from "node:path";

const FEATURES_DIR = path.join(process.cwd(), "public/images/features");
const MAX_WIDTH = 640;
const WEBP_QUALITY = 72;

const files = (await readdir(FEATURES_DIR)).filter((f) => f.endsWith(".png"));

for (const file of files) {
  const input = path.join(FEATURES_DIR, file);
  const output = path.join(FEATURES_DIR, file.replace(/\.png$/, ".webp"));

  const info = await sharp(input)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toFile(output);

  console.log(`${file} → ${path.basename(output)} (${Math.round(info.size / 1024)} KB, ${info.width}x${info.height})`);
}
