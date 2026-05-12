import { useEffect, useState } from 'react'
import api from '../services/api'

const PROVINCIAS = [
  'Cabo Delgado', 'Gaza', 'Inhambane', 'Manica', 'Maputo',
  'Nampula', 'Niassa', 'Sofala', 'Tete', 'Zambézia',
]

const ESTADO_CIVIL = ['solteiro', 'solteira', 'casado', 'casada', 'divorciado', 'divorciada', 'viuvo', 'viuva']

const VAZIO = {
  numero_bi: '', nome_completo: '', sexo: 'M',
  data_nasc: '', naturalidade: '', provincia: '',
  estado_civil: 'solteiro', vivo: true, data_morte: '',
}

export default function BaseDados() {
  const [cidadaos, setCidadaos] = useState([])
  const [pesquisa, setPesquisa] = useState('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(VAZIO)
  const [enviando, setEnviando] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const carregar = () => {
    setLoading(true)
    setErro(null)
    api.get('/configuracoes/cidadaos')
      .then(r => setCidadaos(r.data.cidadaos || []))
      .catch(e => {
        const d = e.response?.data?.detail
        setErro(Array.isArray(d) ? d.map(x => x.msg).join(', ') : d || e.message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  const filtrados = cidadaos.filter(c =>
    pesquisa === '' ||
    c.nome_completo?.toLowerCase().includes(pesquisa.toLowerCase()) ||
    c.numero_bi?.toLowerCase().includes(pesquisa.toLowerCase()) ||
    c.provincia?.toLowerCase().includes(pesquisa.toLowerCase())
  )

  const handleSubmit = () => {
    if (!form.numero_bi || !form.nome_completo || !form.data_nasc) {
      setFeedback({ tipo: 'erro', texto: 'Nº BI, nome completo e data de nascimento são obrigatórios.' })
      return
    }
    setEnviando(true)
    setFeedback(null)

    const payload = {
      ...form,
      data_morte: form.vivo ? null : (form.data_morte || null),
    }

    api.post('/configuracoes/cidadaos', payload)
      .then(r => {
        setFeedback({ tipo: 'sucesso', texto: r.data.mensagem })
        setForm(VAZIO)
        setMostrarForm(false)
        carregar()
      })
      .catch(e => {
        const d = e.response?.data?.detail
        setFeedback({ tipo: 'erro', texto: Array.isArray(d) ? d.map(x => x.msg).join(', ') : d || e.message })
      })
      .finally(() => setEnviando(false))
  }

  const campo = (label, key, type = 'text', opts = null) => (
    <div>
      <label className="block text-xs font-semibold text-[#4A5568] mb-1">{label}</label>
      {opts ? (
        <select
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full border border-[#CBD5E0] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#009A44]"
        >
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: type === 'checkbox' ? e.target.checked : e.target.value }))}
          className="w-full border border-[#CBD5E0] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#009A44]"
        />
      )}
    </div>
  )

  return (
    <div className="p-8" style={{ fontFamily: "'Georgia', serif" }}>

      {/* Cabeçalho */}
      <div className="mb-6 pb-4 border-b-2 border-[#003F20] flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#003F20]">Base de Dados de Cidadãos</h2>
          <p className="text-sm text-[#718096] mt-1">
            {cidadaos.length} cidadão(s) registado(s) ·{' '}
            {cidadaos.filter(c => c.vivo).length} vivo(s) ·{' '}
            {cidadaos.filter(c => !c.vivo).length} falecido(s)
          </p>
        </div>
        <button
          onClick={() => { setMostrarForm(v => !v); setFeedback(null) }}
          className="px-5 py-2.5 rounded text-sm font-semibold bg-[#009A44] text-white hover:bg-[#007a35] transition-colors"
        >
          {mostrarForm ? '✕ Cancelar' : '+ Adicionar Cidadão'}
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mb-5 p-3 rounded border text-sm ${
          feedback.tipo === 'sucesso'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {feedback.texto}
        </div>
      )}

      {/* Erro de carregamento */}
      {erro && (
        <div className="mb-5 p-3 rounded border bg-red-50 border-red-200 text-red-700 text-sm">
          <strong>Erro ao carregar:</strong> {erro}
        </div>
      )}

      {/* Formulário de adição */}
      {mostrarForm && (
        <div className="mb-6 bg-white border border-[#E2E8F0] rounded p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <h3 className="text-base font-bold text-[#003F20] mb-4">Novo Cidadão</h3>
          <div className="grid grid-cols-3 gap-4">
            {campo('Número de BI *', 'numero_bi')}
            {campo('Nome Completo *', 'nome_completo')}
            {campo('Data de Nascimento *', 'data_nasc', 'date')}
            {campo('Sexo', 'sexo', 'text', ['M', 'F'])}
            {campo('Estado Civil', 'estado_civil', 'text', ESTADO_CIVIL)}
            {campo('Naturalidade', 'naturalidade')}
            {campo('Província', 'provincia', 'text', ['', ...PROVINCIAS])}
            <div>
              <label className="block text-xs font-semibold text-[#4A5568] mb-1">Estado</label>
              <select
                value={form.vivo ? 'vivo' : 'falecido'}
                onChange={e => setForm(f => ({ ...f, vivo: e.target.value === 'vivo' }))}
                className="w-full border border-[#CBD5E0] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#009A44]"
              >
                <option value="vivo">Vivo</option>
                <option value="falecido">Falecido</option>
              </select>
            </div>
            {!form.vivo && campo('Data de Morte', 'data_morte', 'date')}
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={enviando}
              className="px-6 py-2.5 rounded text-sm font-semibold bg-[#003F20] text-white hover:bg-[#002a15] disabled:opacity-50 transition-colors"
            >
              {enviando ? 'A guardar...' : 'Guardar Cidadão'}
            </button>
            <button
              onClick={() => { setForm(VAZIO); setFeedback(null) }}
              className="px-4 py-2.5 rounded text-sm font-medium border border-[#CBD5E0] text-[#4A5568] hover:border-[#009A44] transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* Pesquisa */}
      <div className="mb-4">
        <input
          value={pesquisa}
          onChange={e => setPesquisa(e.target.value)}
          placeholder="Pesquisar por nome, BI ou província..."
          className="w-full max-w-md border border-[#CBD5E0] rounded px-4 py-2.5 text-sm focus:outline-none focus:border-[#009A44]"
        />
      </div>

      {/* Tabela */}
      {loading ? (
        <p className="text-sm text-[#718096]">A carregar...</p>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded divide-y divide-[#F0F4F8]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {/* Cabeçalho */}
          <div className="grid grid-cols-12 px-5 py-3 bg-[#F7FAFC] border-b border-[#E2E8F0]">
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Nº BI</p>
            <p className="col-span-3 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Nome Completo</p>
            <p className="col-span-1 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Sexo</p>
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Data Nasc.</p>
            <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Província</p>
            <p className="col-span-1 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Est. Civil</p>
            <p className="col-span-1 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Estado</p>
          </div>

          {filtrados.map(c => (
            <div key={c.id} className="grid grid-cols-12 px-5 py-3 hover:bg-[#F7FAFC] transition-colors items-center">
              <p className="col-span-2 text-xs font-mono text-[#009A44] font-semibold">{c.numero_bi}</p>
              <div className="col-span-3">
                <p className="text-sm font-semibold text-[#2D3748]">{c.nome_completo}</p>
                {c.naturalidade && <p className="text-xs text-[#A0AEC0]">Natural de {c.naturalidade}</p>}
              </div>
              <p className="col-span-1 text-xs text-[#718096]">{c.sexo === 'M' ? 'Masc.' : 'Fem.'}</p>
              <p className="col-span-2 text-xs text-[#718096]">{c.data_nasc}</p>
              <p className="col-span-2 text-xs text-[#4A5568]">{c.provincia || '—'}</p>
              <p className="col-span-1 text-xs text-[#718096] capitalize">{c.estado_civil || '—'}</p>
              <div className="col-span-1">
                {c.vivo
                  ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">Vivo</span>
                  : (
                    <div>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">Falecido</span>
                      {c.data_morte && <p className="text-xs text-[#A0AEC0] mt-0.5">{c.data_morte}</p>}
                    </div>
                  )
                }
              </div>
            </div>
          ))}

          {filtrados.length === 0 && (
            <p className="px-5 py-8 text-sm text-[#A0AEC0] text-center">Nenhum cidadão encontrado</p>
          )}
        </div>
      )}
    </div>
  )
}