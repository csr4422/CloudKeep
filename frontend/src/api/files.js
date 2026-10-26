import { api } from '@/api/client'

export async function getFileDownloadUrl(id) {
  const { data } = await api.get(`/api/files/${encodeURIComponent(id)}/download-url/`)
  return data
}

export async function renameFile(id, name) {
  const { data } = await api.patch(`/api/files/files/${encodeURIComponent(id)}/`, { name })
  return data
}

export async function moveFile(id, folder) {
  const { data } = await api.patch(`/api/files/files/${encodeURIComponent(id)}/`, { folder })
  return data
}

export async function deleteFile(id) {
  await api.delete(`/api/files/files/${encodeURIComponent(id)}/`)
}

export async function listFolders({ account, folder, signal }) {
  const { data } = await api.get('/api/files/folders/', {
    params: { storage_account: account, parent: folder || 'root' },
    signal,
  })
  return data
}

export async function getFolder(id, signal) {
  const { data } = await api.get(`/api/files/folders/${encodeURIComponent(id)}/`, { signal })
  return data
}

export async function listFiles({ account, folder, search, ordering, next, signal }) {
  // Keep requests on our configured API, taking the page from the server's next link.
  const page = next ? new URL(next, api.defaults.baseURL).searchParams.get('page') : 1
  const { data } = await api.get('/api/files/files/', {
    params: { storage_account: account, folder: folder || 'root', search, ordering, page },
    signal,
  })
  return data
}
