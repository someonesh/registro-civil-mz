import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function Registados() {
  const [nascimentos, setNascimentos] = useState([])
  const [obitos, setObitos] = useState([])
  const [tab, setTab] = useState('nascimentos')
  const [pesquisa, setPesquisa] = useState('')
  const [erroNasc, setErroNasc] = useState(null)
  const [erroObit, setErroObit] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    const p1 = api.get('/nascimento/registados')
      .then(r => setNascimentos(r.data.registos || []))
      .catch(e => {
        const d = e.response?.data?.detail
        setErroNasc(`Erro ${e.response?.status || ''}: ${Array.isArray(d) ? d.map(x => x.msg).join(', ') : d || e.message}`)
      })
    const p2 = api.get('/obito/registados')
      .then(r => setObitos(r.data.registos || []))
      .catch(e => {
        const d = e.response?.data?.detail
        setErroObit(`Erro ${e.response?.status || ''}: ${Array.isArray(d) ? d.map(x => x.msg).join(', ') : d || e.message}`)
      })
    Promise.all([p1, p2]).finally(() => setLoading(false))
  }, [])

  const nascimentosFiltrados = nascimentos.filter(r =>
    pesquisa === '' ||
    r.nome_completo?.toLowerCase().includes(pesquisa.toLowerCase()) ||
    r.nuic?.toLowerCase().includes(pesquisa.toLowerCase()) ||
    r.nome_pai?.toLowerCase().includes(pesquisa.toLowerCase()) ||
    r.nome_mae?.toLowerCase().includes(pesquisa.toLowerCase())
  )
  const obitosFiltrados = obitos.filter(r =>
    pesquisa === '' ||
    r.nome_completo?.toLowerCase().includes(pesquisa.toLowerCase()) ||
    r.numero_assento?.toLowerCase().includes(pesquisa.toLowerCase())
  )

  return (
    <div className="p-8" style={{ fontFamily: "'Georgia', serif" }}>
      <div className="mb-6 pb-4 border-b-2 border-[#003F20]">
        <h2 className="text-2xl font-bold text-[#003F20]">Arquivo do Registo Civil</h2>
        <p className="text-sm text-[#718096] mt-1">{nascimentos.length} nascimento(s) · {obitos.length} óbito(s)</p>
      </div>
      {loading && <p className="text-sm text-[#718096] mb-4">A carregar...</p>}
      {erroNasc && <div className="mb-3 p-3 rounded border bg-red-50 border-red-200 text-red-700 text-sm"><strong>Nascimentos:</strong> {erroNasc}</div>}
      {erroObit && <div className="mb-3 p-3 rounded border bg-red-50 border-red-200 text-red-700 text-sm"><strong>Óbitos:</strong> {erroObit}</div>}
      <div className="mb-5">
        <input value={pesquisa} onChange={e => setPesquisa(e.target.value)}
          placeholder="Pesquisar por nome, NUIC, pai ou mãe..."
          className="w-full max-w-lg border border-[#CBD5E0] rounded px-4 py-2.5 text-sm focus:outline-none focus:border-[#009A44]" />
      </div>
      <div className="flex gap-2 mb-5">
        {[['nascimentos', `Nascimentos (${nascimentosFiltrados.length})`], ['obitos', `Óbitos (${obitosFiltrados.length})`]].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`px-5 py-2 rounded text-xs font-semibold uppercase tracking-wide border transition-all ${tab === val ? 'bg-[#003F20] text-white border-[#003F20]' : 'bg-white text-[#4A5568] border-[#CBD5E0] hover:border-[#009A44]'}`}>{label}</button>
        ))}
      </div>
      {tab === 'nascimentos' && (
        <div className="bg-white border border-[#E2E8F0] rounded divide-y divide-[#F0F4F8]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="grid grid-cols-12 px-5 py-3 bg-[#F7FAFC] border-b border-[#E2E8F0]">
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">NUIC</p>
            <p className="col-span-3 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Nome Completo</p>
            <p className="col-span-1 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Sexo</p>
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Data Nasc.</p>
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Pai</p>
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Mãe</p>
          </div>
          {nascimentosFiltrados.map(r => (
            <div key={r.id} className="grid grid-cols-12 px-5 py-4 hover:bg-[#F7FAFC] cursor-pointer transition-colors items-center" onClick={() => navigate(`/nascimentos/${r.id}`)}>
              <p className="col-span-2 text-xs font-mono text-[#009A44] font-semibold">{r.nuic || '—'}</p>
              <div className="col-span-3"><p className="text-sm font-semibold text-[#2D3748]">{r.nome_completo}</p><p className="text-xs text-[#A0AEC0]">Assento nº {r.numero_assento || '—'}</p></div>
              <p className="col-span-1 text-xs text-[#718096]">{r.sexo === 'M' ? 'Masc.' : r.sexo === 'F' ? 'Fem.' : '—'}</p>
              <p className="col-span-2 text-xs text-[#718096]">{r.data_nascimento || '—'}</p>
              <p className="col-span-2 text-xs text-[#4A5568]">{r.nome_pai || '—'}</p>
              <p className="col-span-2 text-xs text-[#4A5568]">{r.nome_mae || '—'}</p>
            </div>
          ))}
          {!loading && nascimentosFiltrados.length === 0 && <p className="px-5 py-8 text-sm text-[#A0AEC0] text-center">Nenhum registo encontrado</p>}
        </div>
      )}
      {tab === 'obitos' && (
        <div className="bg-white border border-[#E2E8F0] rounded divide-y divide-[#F0F4F8]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="grid grid-cols-12 px-5 py-3 bg-[#F7FAFC] border-b border-[#E2E8F0]">
            <p className="col-span-1 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Assento</p>
            <p className="col-span-3 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Nome do Falecido</p>
            <p className="col-span-1 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Sexo</p>
            <p className="col-span-1 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Idade</p>
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Data Falec.</p>
            <p className="col-span-3 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Causa da Morte</p>
            <p className="col-span-1 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Conservador</p>
          </div>
          {obitosFiltrados.map(r => (
            <div key={r.id} className="grid grid-cols-12 px-5 py-4 hover:bg-[#F7FAFC] cursor-pointer transition-colors items-center" onClick={() => navigate(`/obitos/${r.id}`)}>
              <p className="col-span-1 text-xs font-mono text-[#A0AEC0]">{r.numero_assento || '—'}</p>
              <p className="col-span-3 text-sm font-semibold text-[#2D3748]">{r.nome_completo}</p>
              <p className="col-span-1 text-xs text-[#718096]">{r.sexo === 'M' ? 'Masc.' : r.sexo === 'F' ? 'Fem.' : '—'}</p>
              <p className="col-span-1 text-xs text-[#718096]">{r.idade ? `${r.idade} anos` : '—'}</p>
              <p className="col-span-2 text-xs text-[#718096]">{r.dia_falecimento || '—'}</p>
              <p className="col-span-3 text-xs text-[#4A5568]">{r.causa_morte || '—'}</p>
              <p className="col-span-1 text-xs text-[#A0AEC0]">{r.conservador || '—'}</p>
            </div>
          ))}
          {!loading && obitosFiltrados.length === 0 && <p className="px-5 py-8 text-sm text-[#A0AEC0] text-center">Nenhum registo encontrado</p>}
        </div>
      )}
    </div>
  )
}
