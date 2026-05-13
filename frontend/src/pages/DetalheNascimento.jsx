import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'

// Fora do componente — evita re-criação a cada render (causa perda de foco no textarea)
const Campo = ({ label, valor }) => (
  <div>
    <p className="text-xs text-[#718096] uppercase tracking-wide">{label}</p>
    <p className="text-sm font-semibold text-[#2D3748] mt-0.5">{valor || '—'}</p>
  </div>
)

const Secao = ({ titulo, children }) => (
  <div className="bg-white border border-[#E2E8F0] rounded mb-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
    <div className="px-5 py-3 border-b border-[#E2E8F0] bg-[#F7FAFC]">
      <h3 className="text-xs font-bold text-[#003F20] uppercase tracking-wide">{titulo}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
)

const CampoInput = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs text-[#718096] uppercase tracking-wide mb-1">{label}</label>
    <input value={value || ''} onChange={e => onChange(e.target.value)}
      className="w-full border border-[#CBD5E0] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#009A44]" />
  </div>
)

const CampoSelect = ({ label, value, onChange, opcoes }) => (
  <div>
    <label className="block text-xs text-[#718096] uppercase tracking-wide mb-1">{label}</label>
    <select value={value || ''} onChange={e => onChange(e.target.value)}
      className="w-full border border-[#CBD5E0] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#009A44]">
      <option value="">— seleccionar —</option>
      {opcoes.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
)

const ESTADO_CIVIL = ['solteiro','solteira','casado','casada','divorciado','divorciada','viuvo','viuva']
const RELACAO = ['pai','mae','familiar','outro']

export default function DetalheNascimento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [registo, setRegisto] = useState(null)
  const [conservador, setConservador] = useState('Rollins da Conceição Chanesa')
  const [motivo, setMotivo] = useState('')
  const [mensagem, setMensagem] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [form, setForm] = useState({})

  const carregar = () => {
    api.get(`/nascimento/${id}`)
      .then(r => {
        setRegisto(r.data)
        setForm({
          nome_completo:           r.data.nome_completo || '',
          apelidos:                r.data.apelidos || '',
          nome_pai:                r.data.nome_pai || '',
          bi_pai:                  r.data.bi_pai || '',
          naturalidade_pai:        r.data.naturalidade_pai || '',
          estado_civil_pai:        r.data.estado_civil_pai || '',
          nome_mae:                r.data.nome_mae || '',
          bi_mae:                  r.data.bi_mae || '',
          naturalidade_mae:        r.data.naturalidade_mae || '',
          estado_civil_mae:        r.data.estado_civil_mae || '',
          avo_paterno:             r.data.avo_paterno || '',
          avo_paterna:             r.data.avo_paterna || '',
          avo_materno:             r.data.avo_materno || '',
          avo_materna:             r.data.avo_materna || '',
          bi_declarante:           r.data.bi_declarante || '',
          nome_declarante:         r.data.nome_declarante || '',
          estado_civil_declarante: r.data.estado_civil_declarante || '',
          residencia_declarante:   r.data.residencia_declarante || '',
          relacao_declarante:      r.data.relacao_declarante || '',
        })
      })
      .catch(() => {})
  }

  useEffect(() => { carregar() }, [id])

  const set = campo => valor => setForm(f => ({ ...f, [campo]: valor }))

  const notificarHospital = async (estado, detalhes) => {
    try {
      await api.post('/notificacao/hospital', { ref_hospital: registo.ref_hospital, tipo: 'nascimento', estado, detalhes })
    } catch (_) {}
  }

  const submeterForm = () => {
    if (!form.nome_completo || !form.apelidos) {
      setMensagem({ tipo: 'erro', texto: 'Nome próprio e apelidos são obrigatórios.' })
      return
    }
    setEnviando(true)
    api.post(`/nascimento/${id}/completar`, form)
      .then(r => {
        setMensagem({ tipo: 'sucesso', texto: r.data.mensagem })
        setMostrarForm(false)
        carregar()
      })
      .catch(e => {
        const d = e.response?.data?.detail
        setMensagem({ tipo: 'erro', texto: typeof d === 'string' ? d : JSON.stringify(d) || 'Erro ao guardar.' })
      })
      .finally(() => setEnviando(false))
  }

  const aprovar = () => {
    api.post('/nascimento/aprovar', {
      pre_registo_id: parseInt(id), conservador,
      cedula_numero: `CED-${new Date().getFullYear()}-${id}`,
      diario_numero: `DIA-${new Date().getFullYear()}-${id}`
    }).then(async r => {
      await notificarHospital('aprovado', { mensagem: `Registo de ${registo.nome_completo} aprovado.`, cedula_numero: `CED-${new Date().getFullYear()}-${id}` })
      setMensagem({ tipo: 'sucesso', texto: r.data.mensagem + ' — Hospital notificado.' })
      setTimeout(() => navigate('/nascimentos'), 2000)
    }).catch(e => setMensagem({ tipo: 'erro', texto: e.response?.data?.detail || 'Erro ao aprovar.' }))
  }

  const rejeitar = () => {
    if (!motivo) return alert('Escreve o motivo de rejeição.')
    api.post('/nascimento/rejeitar', {
      pre_registo_id: parseInt(id), motivo_rejeicao: motivo, rejeitado_por: conservador
    }).then(async r => {
      await notificarHospital('rejeitado', { mensagem: `Registo de ${registo.nome_completo} rejeitado.`, motivo_rejeicao: motivo })
      setMensagem({ tipo: 'aviso', texto: r.data.mensagem + ' — Hospital notificado.' })
      setTimeout(() => navigate('/nascimentos'), 2000)
    }).catch(e => setMensagem({ tipo: 'erro', texto: e.response?.data?.detail || 'Erro ao rejeitar.' }))
  }

  if (!registo) return <div className="p-8 text-sm text-[#718096]">A carregar processo...</div>

  return (
    <div className="p-8 max-w-4xl" style={{ fontFamily: "'Georgia', serif" }}>

      {/* CABEÇALHO */}
      <div className="flex items-center gap-4 mb-6 pb-4 border-b-2 border-[#009A44]">
        <button onClick={() => navigate('/nascimentos')} className="text-xs text-[#009A44] hover:underline font-medium">Voltar</button>
        <div className="w-px h-4 bg-[#E2E8F0]"></div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-[#003F20]">Processo de Registo de Nascimento</h2>
          <p className="text-xs text-[#718096] mt-0.5" style={{ fontFamily: 'monospace' }}>Ref: {registo.ref_hospital}</p>
        </div>
        {{ aguarda_aprovacao: <span className="px-3 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">⏳ Aguarda Aprovação</span>, aprovado: <span className="px-3 py-1 rounded-full text-xs font-bold border bg-green-50 text-green-700 border-green-200">✓ Aprovado</span>, rejeitado: <span className="px-3 py-1 rounded-full text-xs font-bold border bg-red-50 text-red-700 border-red-200">✗ Rejeitado</span>, incompleto: <span className="px-3 py-1 rounded-full text-xs font-bold border bg-gray-50 text-gray-500 border-gray-200">Incompleto</span> }[registo.status]}
      </div>

      {/* MENSAGEM */}
      {mensagem && (
        <div className={`mb-5 p-4 rounded border text-sm ${ mensagem.tipo === 'sucesso' ? 'bg-green-50 border-green-200 text-green-700' : mensagem.tipo === 'erro' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700' }`}>
          {mensagem.texto}
        </div>
      )}

      {/* ALERTA INCOMPLETO */}
      {registo.status === 'incompleto' && !mostrarForm && (
        <div className="mb-5 border border-amber-200 bg-amber-50 rounded p-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-amber-800 mb-1">Processo incompleto</h3>
            <p className="text-sm text-amber-700">Faltam dados obrigatórios. Preencha presencialmente para avançar para aprovação.</p>
          </div>
          <button onClick={() => setMostrarForm(true)}
            className="px-5 py-2.5 rounded text-sm font-bold text-white whitespace-nowrap"
            style={{ backgroundColor: '#003F20' }}>
            Completar Dados
          </button>
        </div>
      )}

      {/* FORMULÁRIO DE COMPLETAR */}
      {mostrarForm && registo.status === 'incompleto' && (
        <div className="mb-5 bg-white border-2 border-[#009A44] rounded" style={{ boxShadow: '0 2px 8px rgba(0,154,68,0.1)' }}>
          <div className="px-5 py-3 border-b border-[#E2E8F0] bg-[#F0FAF4] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#003F20] uppercase tracking-wide">Completar Dados Presencialmente</h3>
            <button onClick={() => setMostrarForm(false)} className="text-xs text-[#718096] hover:text-red-500">✕ Fechar</button>
          </div>
          <div className="p-5 space-y-5">

            <div>
              <p className="text-xs font-bold text-[#003F20] uppercase tracking-wide mb-3 pb-1 border-b border-[#E2E8F0]">Nome da Criança <span className="text-red-500 normal-case font-normal">* obrigatório</span></p>
              <div className="grid grid-cols-2 gap-4">
                <CampoInput label="Nome próprio *" value={form.nome_completo} onChange={set('nome_completo')} />
                <CampoInput label="Apelidos *" value={form.apelidos} onChange={set('apelidos')} />
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-[#003F20] uppercase tracking-wide mb-3 pb-1 border-b border-[#E2E8F0]">Pai</p>
              <div className="grid grid-cols-2 gap-4">
                <CampoInput label="Nome do pai" value={form.nome_pai} onChange={set('nome_pai')} />
                <CampoInput label="N.º BI do pai" value={form.bi_pai} onChange={set('bi_pai')} />
                <CampoInput label="Naturalidade" value={form.naturalidade_pai} onChange={set('naturalidade_pai')} />
                <CampoSelect label="Estado civil" value={form.estado_civil_pai} onChange={set('estado_civil_pai')} opcoes={ESTADO_CIVIL} />
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-[#003F20] uppercase tracking-wide mb-3 pb-1 border-b border-[#E2E8F0]">Mãe</p>
              <div className="grid grid-cols-2 gap-4">
                <CampoInput label="Nome da mãe" value={form.nome_mae} onChange={set('nome_mae')} />
                <CampoInput label="N.º BI da mãe" value={form.bi_mae} onChange={set('bi_mae')} />
                <CampoInput label="Naturalidade" value={form.naturalidade_mae} onChange={set('naturalidade_mae')} />
                <CampoSelect label="Estado civil" value={form.estado_civil_mae} onChange={set('estado_civil_mae')} opcoes={ESTADO_CIVIL} />
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-[#003F20] uppercase tracking-wide mb-3 pb-1 border-b border-[#E2E8F0]">Avós</p>
              <div className="grid grid-cols-2 gap-4">
                <CampoInput label="Avô paterno" value={form.avo_paterno} onChange={set('avo_paterno')} />
                <CampoInput label="Avó paterna" value={form.avo_paterna} onChange={set('avo_paterna')} />
                <CampoInput label="Avô materno" value={form.avo_materno} onChange={set('avo_materno')} />
                <CampoInput label="Avó materna" value={form.avo_materna} onChange={set('avo_materna')} />
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-[#003F20] uppercase tracking-wide mb-3 pb-1 border-b border-[#E2E8F0]">Declarante</p>
              <div className="grid grid-cols-2 gap-4">
                <CampoInput label="Nome do declarante" value={form.nome_declarante} onChange={set('nome_declarante')} />
                <CampoInput label="N.º BI do declarante" value={form.bi_declarante} onChange={set('bi_declarante')} />
                <CampoSelect label="Estado civil" value={form.estado_civil_declarante} onChange={set('estado_civil_declarante')} opcoes={ESTADO_CIVIL} />
                <CampoInput label="Residência habitual" value={form.residencia_declarante} onChange={set('residencia_declarante')} />
                <CampoSelect label="Relação com o menor" value={form.relacao_declarante} onChange={set('relacao_declarante')} opcoes={RELACAO} />
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-[#E2E8F0]">
              <button onClick={submeterForm} disabled={enviando}
                className="px-6 py-2.5 rounded text-sm font-bold text-white uppercase tracking-wide disabled:opacity-50"
                style={{ backgroundColor: '#003F20' }}>
                {enviando ? 'A guardar...' : 'Guardar e Enviar para Aprovação'}
              </button>
              <button onClick={() => setMostrarForm(false)}
                className="px-4 py-2.5 rounded text-sm font-medium border border-[#CBD5E0] text-[#4A5568] hover:border-[#009A44] transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISUALIZAÇÃO DOS DADOS */}
      <Secao titulo="Dados do Recém-nascido">
        <div className="grid grid-cols-3 gap-5">
          <Campo label="Nome completo" valor={registo.nome_completo} />
          <Campo label="Apelidos" valor={registo.apelidos} />
          <Campo label="Sexo" valor={registo.sexo_bebe === 'M' ? 'Masculino' : 'Feminino'} />
          <Campo label="Data de nascimento" valor={registo.data_nascimento} />
          <Campo label="Hora" valor={registo.hora_nascimento} />
          <Campo label="Local" valor={registo.local_nascimento} />
          <Campo label="Província" valor={registo.provincia_nascimento} />
          <Campo label="Distrito" valor={registo.distrito_nascimento} />
        </div>
      </Secao>

      <Secao titulo="Filiação">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-bold text-[#4A5568] uppercase tracking-wide mb-3 pb-1 border-b border-[#E2E8F0]">Pai</p>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Nome" valor={registo.nome_pai} />
              <Campo label="N.º BI" valor={registo.bi_pai} />
              <Campo label="Naturalidade" valor={registo.naturalidade_pai} />
              <Campo label="Estado civil" valor={registo.estado_civil_pai} />
              <Campo label="Vivo" valor={registo.pai_vivo ? 'Sim' : 'Não'} />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-[#4A5568] uppercase tracking-wide mb-3 pb-1 border-b border-[#E2E8F0]">Mãe</p>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Nome" valor={registo.nome_mae} />
              <Campo label="N.º BI" valor={registo.bi_mae} />
              <Campo label="Naturalidade" valor={registo.naturalidade_mae} />
              <Campo label="Estado civil" valor={registo.estado_civil_mae} />
              <Campo label="Viva" valor={registo.mae_viva ? 'Sim' : 'Não'} />
            </div>
          </div>
        </div>
      </Secao>

      <Secao titulo="Avós">
        <div className="grid grid-cols-4 gap-4">
          <Campo label="Avô paterno" valor={registo.avo_paterno} />
          <Campo label="Avó paterna" valor={registo.avo_paterna} />
          <Campo label="Avô materno" valor={registo.avo_materno} />
          <Campo label="Avó materna" valor={registo.avo_materna} />
        </div>
      </Secao>

      <Secao titulo="Declarante">
        <div className="grid grid-cols-3 gap-4">
          <Campo label="Nome" valor={registo.nome_declarante} />
          <Campo label="N.º BI" valor={registo.bi_declarante} />
          <Campo label="Estado civil" valor={registo.estado_civil_declarante} />
          <Campo label="Residência" valor={registo.residencia_declarante} />
          <Campo label="Relação com menor" valor={registo.relacao_declarante} />
        </div>
      </Secao>

      {registo.status === 'aguarda_aprovacao' && (
        <Secao titulo="Decisão do Conservador">
          <div className="mb-4">
            <label className="block text-xs text-[#718096] uppercase tracking-wide mb-1">Conservador responsável</label>
            <input value={conservador} onChange={e => setConservador(e.target.value)}
              className="w-full border border-[#CBD5E0] rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#009A44]" />
          </div>
          <div className="mb-5">
            <label className="block text-xs text-[#718096] uppercase tracking-wide mb-1">Motivo de rejeição (obrigatório se rejeitar)</label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3}
              placeholder="Descreve o motivo de rejeição..."
              className="w-full border border-[#CBD5E0] rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#009A44]" />
          </div>
          <div className="flex gap-3">
            <button onClick={aprovar} className="px-6 py-2.5 rounded text-sm font-bold text-white uppercase tracking-wide" style={{ backgroundColor: '#003F20' }}>Aprovar Registo</button>
            <button onClick={rejeitar} className="px-6 py-2.5 rounded text-sm font-bold uppercase tracking-wide border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors">Rejeitar</button>
          </div>
        </Secao>
      )}

    </div>
  )
}