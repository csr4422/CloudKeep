import { api } from '@/api/client'

const storageAccountsPath = '/api/storage-accounts/'

export async function listStorageAccounts() {
  const { data } = await api.get(storageAccountsPath)
  return data
}

export async function createStorageAccount(values) {
  const { data } = await api.post(storageAccountsPath, values)
  return data
}

export async function updateStorageAccount({ id, values }) {
  const { data } = await api.patch(`${storageAccountsPath}${id}/`, values)
  return data
}

export async function deleteStorageAccount(id) {
  await api.delete(`${storageAccountsPath}${id}/`)
}

export async function testStorageAccountConnection(id) {
  const { data } = await api.post(
    `${storageAccountsPath}${id}/test_connection/`,
  )
  return data
}
