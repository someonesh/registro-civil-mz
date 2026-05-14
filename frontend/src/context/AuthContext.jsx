import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [utilizador, setUtilizador] = useState(null)  // { nome, papel, username }
  const [loading, setLoading] = useState(true)

  // Ao arrancar, verificar se há token guardado
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }

    // Injectar token em todas as chamadas
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`

    api.get('/auth/me')
      .then(r => setUtilizador(r.data))
      .catch(() => {
        // Token expirado ou inválido
        localStorage.removeItem('token')
        delete api.defaults.headers.common['Authorization']
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const r = await api.post('/auth/login', { username, password })
    const { access_token, nome, papel } = r.data
    localStorage.setItem('token', access_token)
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    setUtilizador({ nome, papel, username })
    return r.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setUtilizador(null)
  }

  return (
    <AuthContext.Provider value={{ utilizador, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
