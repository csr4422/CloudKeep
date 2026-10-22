import { useEffect, useMemo, useState } from 'react'
import { loginUser, registerUser } from '@/api/auth'
import { tokenStorage } from '@/api/client'
import { AuthContext } from '@/auth/context'

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(tokenStorage.getAccess()),
  )

  useEffect(() => {
    const handleLogout = () => setIsAuthenticated(false)
    window.addEventListener('cloudkeep:logout', handleLogout)
    return () => window.removeEventListener('cloudkeep:logout', handleLogout)
  }, [])

  const value = useMemo(
    () => ({
      isAuthenticated,
      async login(credentials) {
        const tokens = await loginUser(credentials)
        tokenStorage.set(tokens)
        setIsAuthenticated(true)
      },
      async register(details) {
        const result = await registerUser(details)
        tokenStorage.set(result)
        setIsAuthenticated(true)
      },
      logout() {
        tokenStorage.clear()
        setIsAuthenticated(false)
      },
    }),
    [isAuthenticated],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
