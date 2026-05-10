import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function Dashboard() {
  const [nascimentos, setNascimentos] = useState([])
  const [obitos, setObitos] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/nascimento/pendentes').then(r => setNascimentos(r.data.registos)).catch(()=>{})
    api.get('/obito/pendentes').then(r => setObitos(r.data.registos)).catch(()=>{})
  }, [])

  const incompletos_nasc = nascimentos.filter(r => r.status === 'incompleto').length
  const aguarda_nasc = nascimentos.filter(r => r.status === 'aguarda_aprovacao').length
  const incompletos_ob = obitos.filter(r => r.status === 'incompleto').length
  const aguarda_ob = obitos.filter(r => r.status === 'aguarda_aprovacao').length

  const statusBadge = (status) => {
    const map = {
      incompleto: 'bg-amber-50 text-amber-700 border border-amber-200',
      aguarda_aprovacao: 'bg-blue-50 text-blue-700 border border-blue-200',
      aprovado: 'bg-green-50 text-green-700 border border-green-200',
      rejeitado: 'bg-red-50 text-red-700 border border-red-200',
    }
    const labels = {
      incompleto: 'Incompleto',
      aguarda_aprovacao: 'Aguarda Aprovação',
      aprovado: 'Aprovado',
      rejeitado: 'Rejeitado',
    }
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status]}`}>{labels[status]}</span>
  }

  return (
    <div className="p-8" style={{fontFamily: "'Georgia', serif"}}>

      {/* Título institucional */}
      <div className="mb-8 pb-4 border-b-2 border-[#009A44]">
        <h2 className="text-2xl font-bold text-[#003F20] tracking-tight">Painel Geral</h2>
        <p className="text-sm text-[#718096] mt-1">Visão geral dos processos em curso — 1ª Conservatória do Registo Civil da Beira</p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Nascimentos incompletos', value: incompletos_nasc, color: '#92400E', bg: '#FFFBEB', border: '#FCD34D' },
          { label: 'Nascimentos aguardam aprovação', value: aguarda_nasc, color: '#1E40AF', bg: '#EFF6FF', border: '#93C5FD' },
          { label: 'Óbitos incompletos', value: incompletos_ob, color: '#92400E', bg: '#FFFBEB', border: '#FCD34D' },
          { label: 'Óbitos aguardam aprovação', value: aguarda_ob, color: '#1E40AF', bg: '#EFF6FF', border: '#93C5FD' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded border-l-4 p-5" style={{borderLeftColor: c.border, boxShadow: '0 1px 3px rgba(0,0,0,0.06)'}}>
            <p className="text-xs text-[#718096] uppercase tracking-wide leading-tight">{c.label}</p>
            <p className="text-4xl font-bold mt-2" style={{color: c.color, fontFamily: 'Georgia, serif'}}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Tabelas */}
      <div className="grid grid-cols-2 gap-6">

        {/* Nascimentos */}
        <div className="bg-white rounded border border-[#E2E8F0]" style={{boxShadow: '0 1px 3px rgba(0,0,0,0.06)'}}>
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F7FAFC]">
            <h3 className="font-bold text-[#003F20] text-sm uppercase tracking-wide">Nascimentos Pendentes</h3>
            <button onClick={() => navigate('/nascimentos')} className="text-xs text-[#009A44] hover:underline font-medium">Ver todos</button>
          </div>
          <div className="divide-y divide-[#F0F4F8]">
            {nascimentos.slice(0,5).map(r => (
              <div key={r.id} className="px-5 py-3 hover:bg-[#F7FAFC] cursor-pointer transition-colors" onClick={() => navigate(`/nascimentos/${r.id}`)}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-[#2D3748]">{r.nome_completo || '— sem nome atribuído —'}</p>
                    <p className="text-xs text-[#718096] mt-0.5">{r.nome_pai} & {r.nome_mae}</p>
                    <p className="text-xs text-[#A0AEC0]">{r.data_nascimento}</p>
                  </div>
                  {statusBadge(r.status)}
                </div>
              </div>
            ))}
            {nascimentos.length === 0 && <p className="px-5 py-6 text-sm text-[#A0AEC0] text-center">Nenhum processo pendente</p>}
          </div>
        </div>

        {/* Óbitos */}
        <div className="bg-white rounded border border-[#E2E8F0]" style={{boxShadow: '0 1px 3px rgba(0,0,0,0.06)'}}>
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F7FAFC]">
            <h3 className="font-bold text-[#003F20] text-sm uppercase tracking-wide">Óbitos Pendentes</h3>
            <button onClick={() => navigate('/obitos')} className="text-xs text-[#009A44] hover:underline font-medium">Ver todos</button>
          </div>
          <div className="divide-y divide-[#F0F4F8]">
            {obitos.slice(0,5).map(r => (
              <div key={r.id} className="px-5 py-3 hover:bg-[#F7FAFC] cursor-pointer transition-colors" onClick={() => navigate(`/obitos/${r.id}`)}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-[#2D3748]">{r.nome_completo}</p>
                    <p className="text-xs text-[#718096] mt-0.5">{r.causa_morte}</p>
                    <p className="text-xs text-[#A0AEC0]">{r.dia_falecimento}</p>
                  </div>
                  {statusBadge(r.status)}
                </div>
              </div>
            ))}
            {obitos.length === 0 && <p className="px-5 py-6 text-sm text-[#A0AEC0] text-center">Nenhum processo pendente</p>}
          </div>
        </div>

      </div>
    </div>
  )
}