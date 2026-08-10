import { getAccessToken } from './auth'

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_API_URL || 'http://localhost:3000/graphql'
const UPLOADS_URL = GRAPHQL_URL.replace(/\/graphql\/?$/, '/uploads')

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
