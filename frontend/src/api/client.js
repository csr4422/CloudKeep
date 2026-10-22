import axios from 'axios'

const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
const authPrefix = '/api/auth/'
const tokenKeys = {
  access: 'cloudkeep.access',
  refresh: 'cloudkeep.refresh',
}

export const tokenStorage = {
  getAccess: () => localStorage.getItem(tokenKeys.access),
  getRefresh: () => localStorage.getItem(tokenKeys.refresh),
  set: ({ access, refresh }) => {
    if (access) localStorage.setItem(tokenKeys.access, access)
    if (refresh) localStorage.setItem(tokenKeys.refresh, refresh)
  },
  clear: () => {
    localStorage.removeItem(tokenKeys.access)
    localStorage.removeItem(tokenKeys.refresh)
  },
}

export const api = axios.create({ baseURL })

let isRefreshing = false
let refreshQueue = []

function settleRefreshQueue(error, accessToken) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(accessToken)
  })
  refreshQueue = []
}

function clearSessionAndRedirect() {
  tokenStorage.clear()
  window.dispatchEvent(new Event('cloudkeep:logout'))
  if (!['/login', '/register'].includes(window.location.pathname)) {
    window.location.assign('/login')
  }
}

api.interceptors.request.use((config) => {
  const access = tokenStorage.getAccess()
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config
    const isAuthRequest = request?.url?.startsWith(authPrefix)
    if (error.response?.status !== 401 || !request || isAuthRequest) {
      return Promise.reject(error)
    }

    const currentAccess = tokenStorage.getAccess()
    const requestAccess = request.headers?.Authorization?.replace(/^Bearer\s+/, '')
    if (currentAccess && requestAccess && requestAccess !== currentAccess) {
      request._retry = true
      request.headers.Authorization = `Bearer ${currentAccess}`
      return api(request)
    }

    if (request._retry) {
      clearSessionAndRedirect()
      return Promise.reject(error)
    }

    const refresh = tokenStorage.getRefresh()
    if (!refresh) {
      clearSessionAndRedirect()
      return Promise.reject(error)
    }

    request._retry = true
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject })
      }).then((access) => {
        request.headers.Authorization = `Bearer ${access}`
        return api(request)
      })
    }

    isRefreshing = true
    try {
      const response = await axios.post(`${baseURL}${authPrefix}refresh/`, { refresh })
      const { access, refresh: nextRefresh } = response.data
      tokenStorage.set({ access, refresh: nextRefresh || refresh })
      isRefreshing = false
      settleRefreshQueue(null, access)
      request.headers.Authorization = `Bearer ${access}`
      return await api(request)
    } catch (refreshError) {
      settleRefreshQueue(refreshError)
      clearSessionAndRedirect()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export { baseURL }
