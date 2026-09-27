// Crop a tall screenshot into viewable chunks: node scripts/qa-crop.mjs <file> <chunkHeight>
import sharp from 'sharp';
const [file, chunk = '1400'] = process.argv.slice(2);
const meta = await sharp(file).metadata();
const h = Number(chunk);
for (let i = 0, y = 0; y < meta.height; i++, y += h) {
  await sharp(file).extract({ left: 0, top: y, width: meta.width, height: Math.min(h, meta.height - y) }).toFile(file.replace('.png', `.part${i}.png`));
}
console.log(Math.ceil(meta.height / h), 'parts');
