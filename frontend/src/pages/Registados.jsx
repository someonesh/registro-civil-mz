import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Registados() {
  const [cidadaos, setCidadaos] = useState([])
  const [pesquisa, setPesquisa] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [erro, setErro] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/configuracoes/cidadaos')
      .then(r => setCidadaos(r.data.cidadaos || []))
      .catch(e => setErro(`Erro: ${e.response?.data?.detail || e.message}`))
      .finally(() => setLoading(false))
  }, [])

  const filtrados = cidadaos.filter(c => {
    const matchPesquisa = pesquisa === '' ||
      c.nome_completo?.toLowerCase().includes(pesquisa.toLowerCase()) ||
      c.numero_bi?.toLowerCase().includes(pesquisa.toLowerCase())
    const matchFiltro = filtro === 'todos' ||
      (filtro === 'vivos' && c.vivo) ||
      (filtro === 'falecidos' && !c.vivo)
    return matchPesquisa && matchFiltro
  })

  return (
    <div className="p-8" style={{ fontFamily: "'Georgia', serif" }}>
      <div className="mb-6 pb-4 border-b-2 border-[#003F20]">
        <h2 className="text-2xl font-bold text-[#003F20]">Arquivo de Cidadãos</h2>
        <p className="text-sm text-[#718096] mt-1">
          {cidadaos.filter(c => c.vivo).length} vivo(s) · {cidadaos.filter(c => !c.vivo).length} falecido(s)
        </p>
      </div>

      {erro && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">{erro}</div>}
      {loading && <p className="text-sm text-[#718096]">A carregar...</p>}

      {!loading && !erro && (
        <>
          <div className="flex gap-3 mb-5 items-center">
            <input
              value={pesquisa}
              onChange={e => setPesquisa(e.target.value)}
              placeholder="Pesquisar por nome ou BI..."
              className="flex-1 max-w-sm border border-[#CBD5E0] rounded px-4 py-2.5 text-sm focus:outline-none focus:border-[#009A44]"
            />
            <div className="flex gap-2">
              {[['todos', 'Todos'], ['vivos', 'Vivos'], ['falecidos', 'Falecidos']].map(([val, label]) => (
                <button key={val} onClick={() => setFiltro(val)}
                  className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-wide border transition-all ${
                    filtro === val ? 'bg-[#003F20] text-white border-[#003F20]' : 'bg-white text-[#4A5568] border-[#CBD5E0] hover:border-[#009A44]'
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded divide-y divide-[#F0F4F8]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="grid grid-cols-12 px-5 py-3 bg-[#F7FAFC] border-b border-[#E2E8F0]">
              <p className="col-span-3 text-xs font-bold text-[#4A5568] uppercase tracking-wide">N.º BI</p>
              <p className="col-span-3 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Nome Completo</p>
              <p className="col-span-1 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Sexo</p>
              <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Data Nasc.</p>
              <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Naturalidade</p>
              <p className="col-span-1 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Estado</p>
            </div>

            {filtrados.map(c => (
              <div key={c.id} className="grid grid-cols-12 px-5 py-4 hover:bg-[#F7FAFC] transition-colors items-center">
                <p className="col-span-3 text-xs font-mono text-[#2D3748]">{c.numero_bi}</p>
                <p className="col-span-3 text-sm font-semibold text-[#2D3748]">{c.nome_completo}</p>
                <p className="col-span-1 text-xs text-[#718096]">{c.sexo === 'M' ? 'Masc.' : 'Fem.'}</p>
                <p className="col-span-2 text-xs text-[#718096]">{c.data_nasc}</p>
                <div className="col-span-2">
                  <p className="text-xs text-[#4A5568]">{c.naturalidade || '—'}</p>
                  <p className="text-xs text-[#A0AEC0]">{c.provincia || ''}</p>
                </div>
                <div className="col-span-1">
                  {c.vivo
                    ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">Vivo</span>
                    : <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">Falecido</span>
                  }
                </div>
              </div>
            ))}

            {filtrados.length === 0 && (
              <p className="px-5 py-8 text-sm text-[#A0AEC0] text-center">Nenhum cidadão encontrado</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}