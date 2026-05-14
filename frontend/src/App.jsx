import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pendentes from './pages/Pendentes'
import Arquivo from './pages/Arquivo'
import DetalheNascimento from './pages/DetalheNascimento'
import DetalheObito from './pages/DetalheObito'
import Verificar from './pages/Verificar'
import Configuracoes from './pages/Configuracoes'
import BaseDados from './pages/BaseDados'
import ConfirmacaoPresencial from './pages/ConfirmacaoPresencial'

// Redireciona para /login se não autenticado
function RotaProtegida({ children }) {
  const { utilizador, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-sm text-gray-500">A carregar...</div>
  if (!utilizador) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Rota pública */}
      <Route path="/login" element={<Login />} />

      {/* Rotas protegidas */}
      <Route path="/" element={<RotaProtegida><Layout /></RotaProtegida>}>
        <Route index element={<Dashboard />} />
        <Route path="pendentes" element={<Pendentes />} />
        <Route path="nascimentos/:id" element={<DetalheNascimento />} />
        <Route path="obitos/:id" element={<DetalheObito />} />
        <Route path="arquivo" element={<Arquivo />} />
        <Route path="verificar" element={<Verificar />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="base-dados" element={<BaseDados />} />
        <Route path="presencial" element={<ConfirmacaoPresencial />} />
      </Route>
    </Routes>
  )
}
