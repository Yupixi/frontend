import { getAccessToken } from './auth'
import { localeHeaders } from '../i18n/headers'

const defaultGraphqlUrl = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:3000/graphql'
  : `${window.location.origin}/graphql`
const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_API_URL || defaultGraphqlUrl
const UPLOADS_URL = GRAPHQL_URL.replace(/\/graphql\/?$/, '/uploads')

// One voice message, stored as recorded.
// Converted to AAC/M4A by the server, which then answers the measured length.
export async function uploadAudio(blob: Blob, filename: string): Promise<{ url: string; duration?: number }> {
  const token = getAccessToken()
  const formData = new FormData()
  formData.append('file', blob, filename)
  const res = await fetch(`${UPLOADS_URL}/audio`, {
    method: 'POST',
    headers: { ...localeHeaders(), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message || "Échec de l'envoi du message vocal")
  }
  return (await res.json()) as { url: string; duration?: number }
}

// Phone photos weigh 3 to 12 MB each: sent as taken, a few of them made one
// request of 20+ MB that slow mobile networks dropped (« Failed to fetch »)
// and the server refused above 8 MB a photo. Each photo is shrunk in the
// browser first (longest side ≤ 2048 px, JPEG), small ones are kept as is.
const MAX_SIDE = 2048
const KEEP_BELOW_BYTES = 1.5 * 1024 * 1024
const JPEG_QUALITY = 0.82

async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size <= KEEP_BELOW_BYTES) return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) { bitmap.close(); return file }
    // JPEG has no transparency: a white background instead of black.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file // undecodable here: the server decides
  }
}

async function uploadOne(file: File, token: string | null): Promise<string> {
  const formData = new FormData()
  formData.append('files', await shrinkImage(file))
  let res: Response
  try {
    res = await fetch(UPLOADS_URL, {
      method: 'POST',
      headers: { ...localeHeaders(), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: formData,
    })
  } catch {
    throw new Error('La connexion a été interrompue pendant l’envoi des photos. Vérifiez votre réseau et réessayez.')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    if (res.status === 413) throw new Error('Une photo est trop lourde. Choisissez une photo plus légère.')
    throw new Error(body?.message || "Échec de l'envoi des photos")
  }
  const data = (await res.json()) as { urls: string[] }
  return data.urls[0]
}

// One request per photo, in order: small requests survive slow networks.
export async function uploadImages(files: File[]): Promise<string[]> {
  const token = getAccessToken()
  const urls: string[] = []
  for (const file of files) urls.push(await uploadOne(file, token))
  return urls
}

// Identity-document photo (KYC): stored privately, answers a storage key
// (there is no public URL for these files).
export async function uploadKycPhoto(file: Blob, filename = 'photo.jpg'): Promise<string> {
  const token = getAccessToken()
  const formData = new FormData()
  formData.append('file', file, filename)
  const res = await fetch(GRAPHQL_URL.replace(/\/graphql\/?$/, '/kyc/uploads'), {
    method: 'POST',
    headers: { ...localeHeaders(), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message || "Échec de l'envoi de la photo")
  }
  return ((await res.json()) as { key: string }).key
}

// Company registration of an official shop (PDF or photo): private storage,
// answers a storage key.
export async function uploadShopDocument(file: File): Promise<string> {
  const token = getAccessToken()
  const formData = new FormData()
  formData.append('file', file, file.name)
  const res = await fetch(GRAPHQL_URL.replace(/\/graphql\/?$/, '/shops/uploads'), {
    method: 'POST',
    headers: { ...localeHeaders(), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message || "Échec de l'envoi du document")
  }
  return ((await res.json()) as { key: string }).key
}
