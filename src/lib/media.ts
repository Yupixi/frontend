// Uploads are stored as `<uuid>.webp` (max 1600 px) with a 480 px sibling
// `<uuid>-w480.webp` for cards (Backend MinioService.upload). Older uploads
// have neither and are returned unchanged.
const OPTIMIZED = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/

export function thumbnailUrl(url: string): string {
  return OPTIMIZED.test(url) ? url.replace(/\.webp$/, '-w480.webp') : url
}

// Full-width photos (the listing gallery): the browser picks the 480, 960
// or 1600 px version for the screen (a phone no longer downloads the
// 1600 px one). `<uuid>-w960.webp` exists for every upload since the
// medium size was added (Backend MinioService; older ones get it from the
// media backfill): until then a missing size falls back to the full photo
// (the gallery drops the srcset on a load error). Same srcset and sizes as
// the listing page's preload in the HTML (Backend seo-html gallerySrcset).
export const GALLERY_SIZES = '(min-width: 1024px) 720px, 100vw'

export function gallerySrcSet(url: string): string | undefined {
  if (!OPTIMIZED.test(url)) return undefined
  return `${url.replace(/\.webp$/, '-w480.webp')} 480w, ${url.replace(/\.webp$/, '-w960.webp')} 960w, ${url} 1600w`
}
