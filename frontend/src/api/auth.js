import { api } from '@/api/client'

const authBase = '/api/auth/'

export async function registerUser(values) {
  const { data } = await api.post(`${authBase}register/`, values)
  return data
}

export async function loginUser(values) {
  const { data } = await api.post(`${authBase}login/`, values)
  return data
}
