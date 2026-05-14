import { useEffect, useState } from 'react'
import api from '../services/api'
import ModalEditarRegisto from '../components/ModalEditarRegisto'

export default function Arquivo() {
  const [nascAprovados, setNascAprovados] = useState([])
  const [nascRejeitados, setNascRejeitados] = useState([])
  const [obitAprovados, setObitAprovados] = useState([])
  const [obitRejeitados, setObitRejeitados] = useState([])

  const [tipo, setTipo] = useState('nascimentos')   // nascimentos | obitos
  const [tab, setTab] = useState('aprovados')        // aprovados | rejeitados
  const [pesquisa, setPesquisa] = useState('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const [modalAberto, setModalAberto] = useState(false)
  const [registoSelecionado, setRegistoSelecionado] = useState(null)
  const [tipoRegisto, setTipoRegisto] = useState('nascimento')

  const carregarDados = () => {
    setLoading(true)
    setErro(null)
    Promise.all([
      api.get('/nascimento/historico')
        .then(r => {
          setNascAprovados(r.data.aprovados || [])
          setNascRejeitados(r.data.rejeitados || [])
        })
        .catch(e => setErro(`Nascimentos: ${e.response?.data?.detail || e.message}`)),
      api.get('/obito/historico')
        .then(r => {
          setObitAprovados(r.data.aprovados || [])
          setObitRejeitados(r.data.rejeitados || [])
        })
        .catch(e => setErro(`Óbitos: ${e.response?.data?.detail || e.message}`)),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { carregarDados() }, [])

  // ── Dados activos conforme tipo/tab ──────────────────────────────────────
  const aprovados = tipo === 'nascimentos' ? nascAprovados : obitAprovados
  const rejeitados = tipo === 'nascimentos' ? nascRejeitados : obitRejeitados
  const lista = tab === 'aprovados' ? aprovados : rejeitados

  const filtrados = lista.filter(r =>
    pesquisa === '' ||
    r.nome_completo?.toLowerCase().includes(pesquisa.toLowerCase()) ||
    r.nuic?.toLowerCase().includes(pesquisa.toLowerCase()) ||
    r.nome_pai?.toLowerCase().includes(pesquisa.toLowerCase()) ||
    r.nome_mae?.toLowerCase().includes(pesquisa.toLowerCase()) ||
    r.numero_assento?.toLowerCase().includes(pesquisa.toLowerCase())
  )

  // ── Helpers ───────────────────────────────────────────────────────────────
  const tipoBtn = (val, label) => (
    <button
      key={val}
      onClick={() => { setTipo(val); setTab('aprovados'); setPesquisa('') }}
      className={`px-5 py-2 rounded text-xs font-semibold uppercase tracking-wide border transition-all ${
        tipo === val
          ? 'bg-[#003F20] text-white border-[#003F20]'
          : 'bg-white text-[#4A5568] border-[#CBD5E0] hover:border-[#009A44]'
      }`}
    >
      {label}
    </button>
  )

  const tabBtn = (val, label) => (
    <button
      key={val}
      onClick={() => setTab(val)}
      className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-wide border transition-all ${
        tab === val
          ? 'bg-[#003F20] text-white border-[#003F20]'
          : 'bg-white text-[#4A5568] border-[#CBD5E0] hover:border-[#009A44]'
      }`}
    >
      {label}
    </button>
  )

  const abrirModal = (r, tipoM) => {
    setRegistoSelecionado(r)
    setTipoRegisto(tipoM)
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setRegistoSelecionado(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-8" style={{ fontFamily: "'Georgia', serif" }}>
      <div className="mb-6 pb-4 border-b-2 border-[#003F20]">
        <h2 className="text-2xl font-bold text-[#003F20]">Arquivo do Registo Civil</h2>
        <p className="text-sm text-[#718096] mt-1">
          {nascAprovados.length + obitAprovados.length} aprovado(s) ·{' '}
          {nascRejeitados.length + obitRejeitados.length} rejeitado(s)
        </p>
      </div>

      {erro && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">{erro}</div>
      )}
      {loading && <p className="text-sm text-[#718096] mb-4">A carregar...</p>}

      {/* Tabs: tipo de registo */}
      <div className="flex gap-2 mb-4">
        {tipoBtn('nascimentos', `Nascimentos (${nascAprovados.length + nascRejeitados.length})`)}
        {tipoBtn('obitos', `Óbitos (${obitAprovados.length + obitRejeitados.length})`)}
      </div>

      {/* Tabs: estado */}
      <div className="flex gap-2 mb-5">
        {tabBtn('aprovados', `Aprovados (${aprovados.length})`)}
        {tabBtn('rejeitados', `Rejeitados (${rejeitados.length})`)}
      </div>

      {/* Pesquisa */}
      <div className="mb-5">
        <input
          value={pesquisa}
          onChange={e => setPesquisa(e.target.value)}
          placeholder="Pesquisar por nome, NUIC, pai ou mãe..."
          className="w-full max-w-lg border border-[#CBD5E0] rounded px-4 py-2.5 text-sm focus:outline-none focus:border-[#009A44]"
        />
      </div>

      {/* ── APROVADOS ─ NASCIMENTOS ── */}
      {tipo === 'nascimentos' && tab === 'aprovados' && (
        <div className="bg-white border border-[#E2E8F0] rounded divide-y divide-[#F0F4F8]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="grid grid-cols-12 px-5 py-3 bg-[#F7FAFC] border-b border-[#E2E8F0]">
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">NUIC</p>
            <p className="col-span-3 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Nome</p>
            <p className="col-span-1 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Sexo</p>
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Data Nasc.</p>
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Pai / Mãe</p>
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Conservador</p>
          </div>
          {filtrados.map(r => (
            <div
              key={r.id}
              className="grid grid-cols-12 px-5 py-4 hover:bg-[#F7FAFC] cursor-pointer transition-colors items-center"
              onClick={() => abrirModal(r, 'nascimento')}
            >
              <p className="col-span-2 text-xs font-mono text-[#009A44] font-semibold">{r.nuic || '—'}</p>
              <div className="col-span-3">
                <p className="text-sm font-semibold text-[#2D3748]">{r.nome_completo}</p>
                <p className="text-xs text-[#A0AEC0]">Assento nº {r.numero_assento || '—'}</p>
              </div>
              <p className="col-span-1 text-xs text-[#718096]">{r.sexo === 'M' ? 'Masc.' : r.sexo === 'F' ? 'Fem.' : '—'}</p>
              <p className="col-span-2 text-xs text-[#718096]">{r.data_nascimento || '—'}</p>
              <div className="col-span-2">
                <p className="text-xs text-[#4A5568]">{r.nome_pai || '—'}</p>
                <p className="text-xs text-[#718096]">{r.nome_mae || '—'}</p>
              </div>
              <p className="col-span-2 text-xs text-[#4A5568]">{r.conservador || '—'}</p>
            </div>
          ))}
          {filtrados.length === 0 && !loading && (
            <p className="px-5 py-8 text-sm text-[#A0AEC0] text-center">Nenhum registo aprovado</p>
          )}
        </div>
      )}

      {/* ── REJEITADOS ─ NASCIMENTOS ── */}
      {tipo === 'nascimentos' && tab === 'rejeitados' && (
        <div className="bg-white border border-[#E2E8F0] rounded divide-y divide-[#F0F4F8]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="grid grid-cols-12 px-5 py-3 bg-[#F7FAFC] border-b border-[#E2E8F0]">
            <p className="col-span-3 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Nome</p>
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Pai / Mãe</p>
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Data Nasc.</p>
            <p className="col-span-3 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Motivo</p>
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Rejeitado por</p>
          </div>
          {filtrados.map(r => (
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
          {filtrados.length === 0 && !loading && (
            <p className="px-5 py-8 text-sm text-[#A0AEC0] text-center">Nenhum registo rejeitado</p>
          )}
        </div>
      )}

      {/* ── APROVADOS ─ ÓBITOS ── */}
      {tipo === 'obitos' && tab === 'aprovados' && (
        <div className="bg-white border border-[#E2E8F0] rounded divide-y divide-[#F0F4F8]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="grid grid-cols-12 px-5 py-3 bg-[#F7FAFC] border-b border-[#E2E8F0]">
            <p className="col-span-1 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Assento</p>
            <p className="col-span-3 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Nome do Falecido</p>
            <p className="col-span-1 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Sexo</p>
            <p className="col-span-1 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Idade</p>
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Data Falec.</p>
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Causa</p>
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Conservador</p>
          </div>
          {filtrados.map(r => (
            <div
              key={r.id}
              className="grid grid-cols-12 px-5 py-4 hover:bg-[#F7FAFC] cursor-pointer transition-colors items-center"
              onClick={() => abrirModal(r, 'obito')}
            >
              <p className="col-span-1 text-xs font-mono text-[#A0AEC0]">{r.numero_assento}</p>
              <p className="col-span-3 text-sm font-semibold text-[#2D3748]">{r.nome_completo}</p>
              <p className="col-span-1 text-xs text-[#718096]">{r.sexo === 'M' ? 'Masc.' : r.sexo === 'F' ? 'Fem.' : '—'}</p>
              <p className="col-span-1 text-xs text-[#718096]">{r.idade ? `${r.idade}a` : '—'}</p>
              <p className="col-span-2 text-xs text-[#718096]">{r.dia_falecimento}</p>
              <p className="col-span-2 text-xs text-[#4A5568]">{r.causa_morte}</p>
              <p className="col-span-2 text-xs text-[#4A5568]">{r.conservador || '—'}</p>
            </div>
          ))}
          {filtrados.length === 0 && !loading && (
            <p className="px-5 py-8 text-sm text-[#A0AEC0] text-center">Nenhum registo aprovado</p>
          )}
        </div>
      )}

      {/* ── REJEITADOS ─ ÓBITOS ── */}
      {tipo === 'obitos' && tab === 'rejeitados' && (
        <div className="bg-white border border-[#E2E8F0] rounded divide-y divide-[#F0F4F8]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="grid grid-cols-12 px-5 py-3 bg-[#F7FAFC] border-b border-[#E2E8F0]">
            <p className="col-span-3 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Nome do Falecido</p>
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Data Falec.</p>
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Causa</p>
            <p className="col-span-3 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Motivo Rejeição</p>
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Rejeitado por</p>
          </div>
          {filtrados.map(r => (
            <div key={r.id} className="grid grid-cols-12 px-5 py-4 hover:bg-[#F7FAFC] transition-colors items-start">
              <div className="col-span-3">
                <p className="text-sm font-semibold text-[#2D3748]">{r.nome_completo}</p>
                <p className="text-xs text-[#A0AEC0] font-mono">{r.ref_hospital}</p>
              </div>
              <p className="col-span-2 text-xs text-[#718096]">{r.dia_falecimento}</p>
              <p className="col-span-2 text-xs text-[#4A5568]">{r.causa_morte}</p>
              <p className="col-span-3 text-xs text-red-600">{r.motivo_rejeicao || '—'}</p>
              <p className="col-span-2 text-xs text-[#4A5568]">{r.rejeitado_por || '—'}</p>
            </div>
          ))}
          {filtrados.length === 0 && !loading && (
            <p className="px-5 py-8 text-sm text-[#A0AEC0] text-center">Nenhum registo rejeitado</p>
          )}
        </div>
      )}

      <ModalEditarRegisto
        isOpen={modalAberto}
        onClose={fecharModal}
        tipo={tipoRegisto}
        registo={registoSelecionado}
        onSave={() => { fecharModal(); carregarDados() }}
      />
    </div>
  )
}
