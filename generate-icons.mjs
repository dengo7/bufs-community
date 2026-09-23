import sharp from 'sharp';
import { mkdirSync } from 'fs';

const sizes = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024];

mkdirSync('./icons', { recursive: true });

for (const size of sizes) {
  await sharp('./logo.jpg')
    .resize(size, size, { fit: 'contain', background: '#1B7CC0' })
    .png()
    .toFile(`./icons/icon-${size}.png`);
  console.log(`✅ icon-${size}.png`);
}
