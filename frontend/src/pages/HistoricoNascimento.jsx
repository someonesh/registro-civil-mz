import { useEffect, useState } from 'react'
import api from '../services/api'

export default function HistoricoNascimento() {
  const [aprovados, setAprovados] = useState([])
  const [rejeitados, setRejeitados] = useState([])
  const [tab, setTab] = useState('aprovados')
  const [erro, setErro] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/nascimento/historico')
      .then(r => {
        setAprovados(r.data.aprovados || [])
        setRejeitados(r.data.rejeitados || [])
      })
      .catch(e => setErro(`Erro: ${e.response?.data?.detail || e.message}`))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8" style={{ fontFamily: "'Georgia', serif" }}>
      <div className="mb-6 pb-4 border-b-2 border-[#003F20]">
        <h2 className="text-2xl font-bold text-[#003F20]">Histórico de Nascimentos</h2>
        <p className="text-sm text-[#718096] mt-1">
          {aprovados.length} aprovado(s) · {rejeitados.length} rejeitado(s)
        </p>
      </div>

      {erro && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">{erro}</div>}
      {loading && <p className="text-sm text-[#718096]">A carregar...</p>}

      {!loading && !erro && (
        <>
          <div className="flex gap-2 mb-5">
            {[['aprovados', `Aprovados (${aprovados.length})`], ['rejeitados', `Rejeitados (${rejeitados.length})`]].map(([val, label]) => (
              <button key={val} onClick={() => setTab(val)}
                className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-wide border transition-all ${
                  tab === val ? 'bg-[#003F20] text-white border-[#003F20]' : 'bg-white text-[#4A5568] border-[#CBD5E0] hover:border-[#009A44]'
                }`}>{label}</button>
            ))}
          </div>

          {tab === 'aprovados' && (
            <div className="bg-white border border-[#E2E8F0] rounded divide-y divide-[#F0F4F8]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="grid grid-cols-12 px-5 py-3 bg-[#F7FAFC] border-b border-[#E2E8F0]">
                <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">NUIC</p>
                <p className="col-span-3 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Nome</p>
                <p className="col-span-1 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Sexo</p>
                <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Data Nasc.</p>
                <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Pai / Mãe</p>
                <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Conservador</p>
              </div>
              {aprovados.map(r => (
                <div key={r.id} className="grid grid-cols-12 px-5 py-4 hover:bg-[#F7FAFC] transition-colors items-center">
                  <p className="col-span-2 text-xs font-mono text-[#009A44] font-semibold">{r.nuic}</p>
                  <div className="col-span-3">
                    <p className="text-sm font-semibold text-[#2D3748]">{r.nome_completo}</p>
                    <p className="text-xs text-[#A0AEC0]">Assento nº {r.numero_assento}</p>
                  </div>
                  <p className="col-span-1 text-xs text-[#718096]">{r.sexo === 'M' ? 'Masc.' : 'Fem.'}</p>
                  <p className="col-span-2 text-xs text-[#718096]">{r.data_nascimento}</p>
                  <div className="col-span-2">
                    <p className="text-xs text-[#4A5568]">{r.nome_pai || '—'}</p>
                    <p className="text-xs text-[#718096]">{r.nome_mae || '—'}</p>
                  </div>
                  <p className="col-span-2 text-xs text-[#4A5568]">{r.conservador || '—'}</p>
                </div>
              ))}
              {aprovados.length === 0 && <p className="px-5 py-8 text-sm text-[#A0AEC0] text-center">Nenhum registo aprovado</p>}
            </div>
          )}

          {tab === 'rejeitados' && (
            <div className="bg-white border border-[#E2E8F0] rounded divide-y divide-[#F0F4F8]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="grid grid-cols-12 px-5 py-3 bg-[#F7FAFC] border-b border-[#E2E8F0]">
                <p className="col-span-3 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Nome</p>
                <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Pai / Mãe</p>
                <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Data Nasc.</p>
                <p className="col-span-3 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Motivo</p>
                <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Rejeitado por</p>
              </div>
              {rejeitados.map(r => (
                <div key={r.id} className="grid grid-cols-12 px-5 py-4 hover:bg-[#F7FAFC] transition-colors items-start">
                  <div className="col-span-3">
                    <p className="text-sm font-semibold text-[#2D3748]">{r.nome_completo}</p>
                    <p className="text-xs text-[#A0AEC0] font-mono">{r.ref_hospital}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-[#4A5568]">{r.nome_pai || '—'}</p>
                    <p className="text-xs text-[#718096]">{r.nome_mae || '—'}</p>
                  </div>
                  <p className="col-span-2 text-xs text-[#718096]">{r.data_nascimento}</p>
                  <p className="col-span-3 text-xs text-red-600">{r.motivo_rejeicao || '—'}</p>
                  <p className="col-span-2 text-xs text-[#4A5568]">{r.rejeitado_por || '—'}</p>
                </div>
              ))}
              {rejeitados.length === 0 && <p className="px-5 py-8 text-sm text-[#A0AEC0] text-center">Nenhum registo rejeitado</p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}