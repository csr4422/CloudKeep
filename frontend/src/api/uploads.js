import axios from 'axios'
import { api } from '@/api/client'

// This client has no application interceptors or JWT defaults.
const storageClient = axios.create()

export async function uploadFile(item, { signal, onProgress, onFinishing }) {
  const contentType = item.file.type || 'application/octet-stream'
  const payload = {
    storage_account: item.account,
    ...(item.folder ? { folder: item.folder } : {}),
    name: item.file.name,
    content_type: contentType,
  }
  const { data } = await api.post('/api/files/upload-url/', payload, { signal })
  await storageClient.put(data.upload_url, item.file, {
    signal,
    withCredentials: false,
    headers: { 'Content-Type': contentType, Authorization: null },
    onUploadProgress: ({ loaded, total }) => {
      const size = total || item.file.size
      onProgress(size ? Math.min(100, Math.round(loaded / size * 100)) : 0)
    },
  })
  signal.throwIfAborted()
  onFinishing()
  await api.post('/api/files/complete/', { ...payload, object_key: data.object_key }, { signal })
}

export function uploadErrorMessage(error) {
  if (error.response?.status === 400 && error.response.data && typeof error.response.data === 'object') {
    return Object.entries(error.response.data).map(([field, value]) => {
      const message = Array.isArray(value) ? value.join(' ') : String(value)
      return ['detail', 'non_field_errors'].includes(field) ? message : `${field.replaceAll('_', ' ')}: ${message}`
    }).join(' ') || 'The upload was rejected. Check the file and destination.'
  }
  return error.response
    ? 'The upload failed. Please try again.'
    : 'Could not upload the file. Check your connection and storage CORS settings, then retry.'
}
