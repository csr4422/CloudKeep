import { api } from '@/api/client'

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
