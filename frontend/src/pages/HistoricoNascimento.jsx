import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function HistoricoNascimento() {
  const [registos, setRegistos] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [erro, setErro] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    api.get('/nascimento/historico')
      .then(r => {
        setRegistos(r.data.registos || [])
        setErro(null)
      })
      .catch(e => {
        setErro(`Erro ${e.response?.status || ''}: ${e.response?.data?.detail || e.message}`)
      })
      .finally(() => setLoading(false))
  }, [])

  const filtrados = filtro === 'todos' ? registos : registos.filter(r => r.status === filtro)

  const statusBadge = (status) => {
    const map = {
      aprovado: 'bg-green-50 text-green-700 border-green-200',
      rejeitado: 'bg-red-50 text-red-700 border-red-200',
    }
    const labels = { aprovado: 'Aprovado', rejeitado: 'Rejeitado' }
    return <span className={`px-2 py-0.5 rounded text-xs font-medium border ${map[status]}`}>{labels[status]}</span>
  }

  return (
    <div className="p-8" style={{ fontFamily: "'Georgia', serif" }}>
      <div className="mb-6 pb-4 border-b-2 border-[#003F20]">
        <h2 className="text-2xl font-bold text-[#003F20]">Histórico de Nascimentos</h2>
        <p className="text-sm text-[#718096] mt-1">{registos.length} registo(s) encontrado(s)</p>
      </div>

      {erro && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">{erro}</div>
      )}

      {loading && (
        <p className="text-sm text-[#718096]">A carregar...</p>
      )}

      {!loading && !erro && (
        <>
          <div className="flex gap-2 mb-5">
            {[['todos', 'Todos'], ['aprovado', 'Aprovados'], ['rejeitado', 'Rejeitados']].map(([val, label]) => (
              <button key={val} onClick={() => setFiltro(val)}
                className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-wide border transition-all ${
                  filtro === val ? 'bg-[#003F20] text-white border-[#003F20]' : 'bg-white text-[#4A5568] border-[#CBD5E0] hover:border-[#009A44]'
                }`}>{label}</button>
            ))}
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded divide-y divide-[#F0F4F8]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="grid grid-cols-12 px-5 py-3 bg-[#F7FAFC] border-b border-[#E2E8F0]">
              <p className="col-span-3 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Nome</p>
              <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Filiação</p>
              <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Data Nasc.</p>
              <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Decidido por</p>
              <p className="col-span-1 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Data</p>
              <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Estado</p>
            </div>

            {filtrados.map(r => (
              <div key={r.id}
                className="grid grid-cols-12 px-5 py-4 hover:bg-[#F7FAFC] cursor-pointer transition-colors items-start"
                onClick={() => navigate(`/nascimentos/${r.id}`)}>
                <div className="col-span-3">
                  <p className="text-sm font-semibold text-[#2D3748]">{r.nome_completo}</p>
                  <p className="text-xs text-[#A0AEC0] font-mono">{r.ref_hospital}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-[#4A5568]">{r.nome_pai}</p>
                  <p className="text-xs text-[#718096]">{r.nome_mae}</p>
                </div>
                <p className="col-span-2 text-xs text-[#718096]">{r.data_nascimento}</p>
                <p className="col-span-2 text-xs text-[#4A5568]">{r.confirmado_por || r.rejeitado_por || '—'}</p>
                <p className="col-span-1 text-xs text-[#A0AEC0]">
                  {r.data_confirmacao ? r.data_confirmacao.split('T')[0] : '—'}
                </p>
                <div className="col-span-2">
                  {statusBadge(r.status)}
                  {r.status === 'rejeitado' && r.motivo_rejeicao && (
                    <p className="text-xs text-red-500 mt-1">{r.motivo_rejeicao}</p>
                  )}
                </div>
              </div>
            ))}

            {filtrados.length === 0 && (
              <p className="px-5 py-8 text-sm text-[#A0AEC0] text-center">Nenhum registo encontrado</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}