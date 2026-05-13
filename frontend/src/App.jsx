import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import PendenteNascimento from './pages/PendenteNascimento'
import PendenteObito from './pages/PendenteObito'
import DetalheNascimento from './pages/DetalheNascimento'
import DetalheObito from './pages/DetalheObito'
import Verificar from './pages/Verificar'
import Configuracoes from './pages/Configuracoes'
import HistoricoNascimento from './pages/HistoricoNascimento'
import HistoricoObito from './pages/HistoricoObito'
import Registados from './pages/Registados'
import BaseDados from './pages/BaseDados'
import ConfirmacaoPresencial from './pages/ConfirmacaoPresencial'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="nascimentos" element={<PendenteNascimento />} />
        <Route path="nascimentos/historico" element={<HistoricoNascimento />} />
        <Route path="nascimentos/:id" element={<DetalheNascimento />} />
        <Route path="obitos" element={<PendenteObito />} />
        <Route path="obitos/historico" element={<HistoricoObito />} />
        <Route path="obitos/:id" element={<DetalheObito />} />
        <Route path="verificar" element={<Verificar />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="registados" element={<Registados />} />
        <Route path="base-dados" element={<BaseDados />} />
        <Route path="presencial" element={<ConfirmacaoPresencial />} />
      </Route>
    </Routes>
  )
}
