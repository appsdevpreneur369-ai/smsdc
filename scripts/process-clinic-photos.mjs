// Turns the clinic's supplied photos into web images for /public/images/gallery.
// Usage: npm run photos -- "D:\SMSDC\SMSDC-Images"   (the source folder stays outside git)
//  - descriptive kebab-case filenames, max 1600 px wide, progressive JPEG (next/image serves AVIF/WebP from these)
//  - ALL metadata (EXIF, GPS, ICC, XMP) is dropped: sharp writes none unless asked to
//  - prints each output's size so the <~200 KB gallery target can be checked
// To add a photo: add an entry to PHOTOS, run the script, then add the image to content/images.json + gallery.json.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const srcDir = process.argv[2] || process.env.CLINIC_PHOTOS_DIR;
if (!srcDir || !fs.existsSync(srcDir)) {
  console.error('Pass the folder with the clinic photos, e.g. npm run photos -- "D:\\SMSDC\\SMSDC-Images"');
  process.exit(1);
}
const outDir = path.join(root, 'public', 'images', 'gallery');
fs.mkdirSync(outDir, { recursive: true });

/** source file → output name; `extract` crops a region first (px of the source). */
const PHOTOS = [
  { src: 'Suhasini_Dental_Clinic_Gallery_4.jpg', out: 'suhasini-dental-clinic-tadepalle-entrance.jpg' },
  // The supplied image has a white band under the photo: keep only the photo itself.
  { src: 'Suhasini_Dental_Clinic_Gallery_1.jpg', out: 'suhasini-dental-clinic-treatment-room.jpg', extract: { left: 190, top: 62, width: 1218, height: 912 } },
  { src: 'Suhasini_Dental_Clinic_Gallery_2.jpg', out: 'suhasini-dental-clinic-dental-chair.jpg' },
  { src: 'Suhasini_Dental_Clinic_Gallery_3.jpg', out: 'suhasini-dental-clinic-dental-chair-side-view.jpg' },
  { src: 'suhasini-dental-care-services-banner.jpg', out: 'suhasini-dental-care-services-banner.jpg' },
  { src: 'Healthy_Gums_Healthy_Heart.png', out: 'healthy-gums-healthy-heart-poster.jpg', quality: 72, width: 1400 },
  // Open Graph card for the article: the poster's headline, 1200×630.
  { src: 'Healthy_Gums_Healthy_Heart.png', out: 'healthy-gums-healthy-heart-og.jpg', og: true, extract: { left: 146, top: 0, width: 2317, height: 1217 } },
];

for (const p of PHOTOS) {
  let img = sharp(path.join(srcDir, p.src)).rotate(); // honour EXIF orientation, then drop the metadata
  if (p.extract) img = img.extract(p.extract);
  img = p.og ? img.resize({ width: 1200, height: 630, fit: 'cover', position: 'top' }) : img.resize({ width: p.width ?? 1600, withoutEnlargement: true });
  const file = path.join(outDir, p.out);
  const info = await img.flatten({ background: '#ffffff' }).jpeg({ quality: p.quality ?? 66, mozjpeg: true, progressive: true }).toFile(file);
  const meta = await sharp(file).metadata();
  console.log(`${p.out.padEnd(52)} ${info.width}×${info.height}  ${Math.round(info.size / 1024)} KB  exif:${meta.exif ? 'YES' : 'none'} icc:${meta.icc ? 'yes' : 'none'}`);
}
