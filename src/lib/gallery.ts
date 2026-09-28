import 'server-only';
import { gallery, images } from './content';
import { tx, type Lang } from './i18n';

/** A photo resolved for one language: everything the gallery grid, lightbox and teasers need (serialisable). */
export type Photo = {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  category: string;
};

function resolve(id: string, lang: Lang): Photo {
  const img = images[id];
  return {
    id,
    src: img.src,
    width: img.width,
    height: img.height,
    alt: tx(img.alt, lang),
    caption: img.caption ? tx(img.caption, lang) : tx(img.alt, lang),
    category: img.category ?? 'clinic',
  };
}

/** The /gallery page, in gallery.json order. */
export const galleryPhotos = (lang: Lang): Photo[] => gallery.items.map((id) => resolve(id, lang));

/** Gallery filter chips: only categories that have at least one photo. */
export function galleryCategories(lang: Lang) {
  const used = new Set(gallery.items.map((id) => images[id].category));
  return gallery.categories.filter((c) => used.has(c.id)).map((c) => ({ id: c.id, label: tx(c.label, lang) }));
}

/** Photos tagged with a placement (e.g. "home", "about"), in gallery order first, then any others. */
export function photosFor(placement: string, lang: Lang): Photo[] {
  const ordered = [...gallery.items, ...Object.keys(images).filter((id) => !gallery.items.includes(id))];
  return ordered.filter((id) => images[id].placement.includes(placement)).map((id) => resolve(id, lang));
}
