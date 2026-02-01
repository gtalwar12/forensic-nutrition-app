#!/usr/bin/env node
/**
 * Generate PWA icons for FNA
 * Creates green "FNA" icons at required sizes
 */

const sharp = require('sharp');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');

// SVG template for FNA icon - green background with white text
const createSvg = (size) => {
  const fontSize = Math.floor(size * 0.35);
  const borderRadius = Math.floor(size * 0.15);

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#22c55e;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#16a34a;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${borderRadius}" fill="url(#bg)"/>
      <text
        x="50%"
        y="54%"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif"
        font-size="${fontSize}"
        font-weight="700"
        fill="white"
        text-anchor="middle"
        dominant-baseline="middle"
        letter-spacing="-2"
      >FNA</text>
    </svg>
  `;
};

async function generateIcons() {
  console.log('Generating PWA icons...\n');

  // Generate 192x192
  await sharp(Buffer.from(createSvg(192)))
    .png()
    .toFile(path.join(OUTPUT_DIR, 'icon-192.png'));
  console.log('✓ Created icon-192.png (192x192)');

  // Generate 512x512
  await sharp(Buffer.from(createSvg(512)))
    .png()
    .toFile(path.join(OUTPUT_DIR, 'icon-512.png'));
  console.log('✓ Created icon-512.png (512x512)');

  // Generate apple-touch-icon (180x180 is standard)
  await sharp(Buffer.from(createSvg(180)))
    .png()
    .toFile(path.join(OUTPUT_DIR, 'apple-touch-icon.png'));
  console.log('✓ Created apple-touch-icon.png (180x180)');

  // Generate favicon (32x32)
  await sharp(Buffer.from(createSvg(32)))
    .png()
    .toFile(path.join(OUTPUT_DIR, 'favicon-32.png'));
  console.log('✓ Created favicon-32.png (32x32)');

  console.log('\n✅ All icons generated successfully!');
  console.log(`   Location: ${OUTPUT_DIR}`);
}

generateIcons().catch(console.error);
