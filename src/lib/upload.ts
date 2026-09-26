import { getAccessToken } from './auth'

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
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message || "Échec de l'envoi du message vocal")
  }
  return (await res.json()) as { url: string; duration?: number }
}

export async function uploadImages(files: File[]): Promise<string[]> {
  const token = getAccessToken()
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  const res = await fetch(UPLOADS_URL, {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message || "Échec de l'envoi des photos")
  }
  const data = await res.json()
  return data.urls as string[]
}
