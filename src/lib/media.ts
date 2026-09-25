// Uploads are stored as `<uuid>.webp` (max 1600 px) with a 480 px sibling
// `<uuid>-w480.webp` for cards (Backend MinioService.upload). Older uploads
// have neither and are returned unchanged.
const OPTIMIZED = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/

export function thumbnailUrl(url: string): string {
  return OPTIMIZED.test(url) ? url.replace(/\.webp$/, '-w480.webp') : url
}
