import { useState } from 'react'
import api from '../services/api'

export default function ConfirmacaoPresencial() {
  const [tipoBusca, setTipoBusca] = useState('id')
  const [valorBusca, setValorBusca] = useState('')
  const [resultados, setResultados] = useState([])
  const [preRegisto, setPreRegisto] = useState(null)
  const [tipo, setTipo] = useState('nascimento')
  const [erro, setErro] = useState(null)
  const [mensagem, setMensagem] = useState(null)
  const [conservador, setConservador] = useState('Rollins da Conceição Chanesa')
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    nome_completo: '', apelidos: '',
    avo_paterno: '', avo_paterna: '',
    avo_materno: '', avo_materna: '',
    nome_declarante: '', bi_declarante: '',
    estado_civil_declarante: '', residencia_declarante: '',
    relacao_declarante: 'outro',
    cemiterio: '', herdeiros: '',
    bens_inventario: false, testamento: false
  })

  const buscar = () => {
    setErro(null)
    setMensagem(null)
    setPreRegisto(null)
    setResultados([])
    setLoading(true)

    if (tipoBusca === 'id') {
      // Busca directa por ID
      const url = tipo === 'nascimento' ? `/nascimento/${valorBusca}` : `/obito/${valorBusca}`
      api.get(url)
        .then(r => {
          selecionar(r.data)
          setLoading(false)
        })
        .catch(() => {
          setErro('Pré-registo não encontrado.')
          setLoading(false)
        })
    } else {
      // Busca por nome ou ref — busca nos pendentes
      const url = tipo === 'nascimento' ? '/nascimento/pendentes' : '/obito/pendentes'
      api.get(url)
        .then(r => {
          const lista = r.data.registos || []
          const v = valorBusca.toLowerCase()
          let filtrados = []

          if (tipoBusca === 'nome_pai') {
            filtrados = lista.filter(r => r.nome_pai?.toLowerCase().includes(v))
          } else if (tipoBusca === 'nome_mae') {
            filtrados = lista.filter(r => r.nome_mae?.toLowerCase().includes(v))
          } else if (tipoBusca === 'nome_crianca') {
            filtrados = lista.filter(r => r.nome_completo?.toLowerCase().includes(v))
          } else if (tipoBusca === 'ref_hospital') {
            filtrados = lista.filter(r => r.ref_hospital?.toLowerCase().includes(v))
          } else if (tipoBusca === 'nome_falecido') {
            filtrados = lista.filter(r => r.nome_completo?.toLowerCase().includes(v))
          }

          if (filtrados.length === 0) {
            setErro('Nenhum registo encontrado com esses dados.')
          } else if (filtrados.length === 1) {
            // Se só um resultado, selecciona directamente
            const url2 = tipo === 'nascimento' ? `/nascimento/${filtrados[0].id}` : `/obito/${filtrados[0].id}`
            api.get(url2).then(r2 => {
              selecionar(r2.data)
              setLoading(false)
            })
          } else {
            setResultados(filtrados)
            setLoading(false)
          }
          setLoading(false)
        })
        .catch(() => {
          setErro('Erro ao pesquisar.')
          setLoading(false)
        })
    }
  }

  const selecionar = (dados) => {
    setPreRegisto(dados)
    setResultados([])
    if (tipo === 'nascimento') {
      setForm(f => ({
        ...f,
        nome_completo: dados.nome_completo || '',
        apelidos: dados.apelidos || '',
        avo_paterno: dados.avo_paterno || '',
        avo_paterna: dados.avo_paterna || '',
        avo_materno: dados.avo_materno || '',
        avo_materna: dados.avo_materna || '',
        nome_declarante: dados.nome_declarante || '',
        bi_declarante: dados.bi_declarante || '',
        estado_civil_declarante: dados.estado_civil_declarante || '',
        residencia_declarante: dados.residencia_declarante || '',
        relacao_declarante: dados.relacao_declarante || 'outro',
      }))
    } else {
      setForm(f => ({
        ...f,
        cemiterio: dados.cemiterio || '',
        herdeiros: dados.herdeiros || '',
        bens_inventario: dados.bens_inventario || false,
        testamento: dados.testamento || false,
      }))
    }
  }

  const selecionarDaLista = (item) => {
    const url = tipo === 'nascimento' ? `/nascimento/${item.id}` : `/obito/${item.id}`
    api.get(url).then(r => selecionar(r.data))
  }

  const confirmar = () => {
    setErro(null)
    if (tipo === 'nascimento') {
      api.post('/nascimento/fase2', {
        ref_hospital: preRegisto.ref_hospital,
        api_key: 'PRESENCIAL',
        ...form
      }).then(() => {
        setMensagem('Dados confirmados. O registo aguarda aprovação do conservador.')
        setPreRegisto(null)
        setValorBusca('')
      }).catch(e => setErro(e.response?.data?.detail || 'Erro ao confirmar.'))
    } else {
      api.post('/obito/fase2', {
        ref_hospital: preRegisto.ref_hospital,
        api_key: 'PRESENCIAL',
        cemiterio: form.cemiterio,
        herdeiros: form.herdeiros,
        bens_inventario: form.bens_inventario,
        testamento: form.testamento,
      }).then(() => {
        setMensagem('Dados confirmados. O registo aguarda aprovação do conservador.')
        setPreRegisto(null)
        setValorBusca('')
      }).catch(e => setErro(e.response?.data?.detail || 'Erro ao confirmar.'))
    }
  }

  const Campo = ({ label, value, onChange }) => (
    <div>
      <label className="block text-xs text-[#718096] uppercase tracking-wide mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-[#CBD5E0] rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#009A44]" />
    </div>
  )

  const opcoesBusca = tipo === 'nascimento'
    ? [
        { value: 'id', label: 'ID do sistema' },
        { value: 'ref_hospital', label: 'Referência do hospital' },
        { value: 'nome_pai', label: 'Nome do pai' },
        { value: 'nome_mae', label: 'Nome da mãe' },
        { value: 'nome_crianca', label: 'Nome da criança' },
      ]
    : [
        { value: 'id', label: 'ID do sistema' },
        { value: 'ref_hospital', label: 'Referência do hospital' },
        { value: 'nome_falecido', label: 'Nome do falecido' },
      ]

  return (
    <div className="p-8 max-w-4xl" style={{ fontFamily: "'Georgia', serif" }}>
      <div className="mb-6 pb-4 border-b-2 border-[#003F20]">
        <h2 className="text-2xl font-bold text-[#003F20]">Confirmação Presencial</h2>
        <p className="text-sm text-[#718096] mt-1">Para encarregados que se deslocam ao balcão do registo civil</p>
      </div>

      {mensagem && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-sm text-green-700">{mensagem}</div>
      )}
      {erro && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">{erro}</div>
      )}

      {/* Busca */}
      <div className="bg-white border border-[#E2E8F0] rounded p-5 mb-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h3 className="text-xs font-bold text-[#003F20] uppercase tracking-wide mb-4">Localizar Pré-registo</h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs text-[#718096] uppercase tracking-wide mb-1">Tipo de registo</label>
            <select value={tipo} onChange={e => { setTipo(e.target.value); setValorBusca(''); setResultados([]); setPreRegisto(null) }}
              className="w-full border border-[#CBD5E0] rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#009A44]">
              <option value="nascimento">Nascimento</option>
              <option value="obito">Óbito</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#718096] uppercase tracking-wide mb-1">Pesquisar por</label>
            <select value={tipoBusca} onChange={e => { setTipoBusca(e.target.value); setValorBusca('') }}
              className="w-full border border-[#CBD5E0] rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#009A44]">
              {opcoesBusca.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#718096] uppercase tracking-wide mb-1">Valor</label>
            <input value={valorBusca} onChange={e => setValorBusca(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              placeholder={tipoBusca === 'id' ? 'Ex: 3' : 'Escreve para pesquisar...'}
              className="w-full border border-[#CBD5E0] rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#009A44]" />
          </div>
        </div>
        <button onClick={buscar} disabled={!valorBusca || loading}
          className="px-6 py-2.5 rounded text-sm font-bold text-white disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: '#003F20' }}>
          {loading ? 'A pesquisar...' : 'Localizar'}
        </button>
      </div>

      {/* Lista de resultados quando há vários */}
      {resultados.length > 1 && (
        <div className="bg-white border border-[#E2E8F0] rounded mb-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="px-5 py-3 bg-[#F7FAFC] border-b border-[#E2E8F0]">
            <h3 className="text-xs font-bold text-[#003F20] uppercase tracking-wide">
              {resultados.length} resultados encontrados — selecciona o correcto
            </h3>
          </div>
          <div className="divide-y divide-[#F0F4F8]">
            {resultados.map(r => (
              <div key={r.id}
                className="px-5 py-4 hover:bg-[#F7FAFC] cursor-pointer transition-colors flex items-center justify-between"
                onClick={() => selecionarDaLista(r)}>
                <div>
                  {tipo === 'nascimento' ? (
                    <>
                      <p className="text-sm font-semibold text-[#2D3748]">{r.nome_completo || '— sem nome —'}</p>
                      <p className="text-xs text-[#718096]">{r.nome_pai} & {r.nome_mae} · {r.data_nascimento}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-[#2D3748]">{r.nome_completo}</p>
                      <p className="text-xs text-[#718096]">{r.causa_morte} · {r.dia_falecimento}</p>
                    </>
                  )}
                  <p className="text-xs text-[#A0AEC0] font-mono">ID: {r.id} · Ref: {r.ref_hospital}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                  r.status === 'incompleto' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>{r.status === 'incompleto' ? 'Incompleto' : 'Aguarda Aprovação'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dados do pré-registo encontrado */}
      {preRegisto && (
        <div className="bg-white border border-[#E2E8F0] rounded p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-[#003F20] uppercase tracking-wide">Dados Recebidos do Hospital</h3>
            <span className="text-xs text-[#A0AEC0] font-mono">ID: {preRegisto.id} · {preRegisto.ref_hospital}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mb-5 p-4 bg-[#F7FAFC] rounded">
            {tipo === 'nascimento' && (
              <>
                <div><p className="text-xs text-[#A0AEC0] uppercase">Sexo</p><p className="font-semibold">{preRegisto.sexo_bebe === 'M' ? 'Masculino' : 'Feminino'}</p></div>
                <div><p className="text-xs text-[#A0AEC0] uppercase">Data Nascimento</p><p className="font-semibold">{preRegisto.data_nascimento}</p></div>
                <div><p className="text-xs text-[#A0AEC0] uppercase">Pai</p><p className="font-semibold">{preRegisto.nome_pai || 'Não declarado'}</p></div>
                <div><p className="text-xs text-[#A0AEC0] uppercase">Mãe</p><p className="font-semibold">{preRegisto.nome_mae}</p></div>
                <div><p className="text-xs text-[#A0AEC0] uppercase">Local</p><p className="font-semibold">{preRegisto.local_nascimento}, {preRegisto.provincia_nascimento}</p></div>
                <div><p className="text-xs text-[#A0AEC0] uppercase">Estado</p>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                    preRegisto.status === 'incompleto' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>{preRegisto.status}</span>
                </div>
              </>
            )}
            {tipo === 'obito' && (
              <>
                <div><p className="text-xs text-[#A0AEC0] uppercase">Falecido</p><p className="font-semibold">{preRegisto.nome_completo}</p></div>
                <div><p className="text-xs text-[#A0AEC0] uppercase">Data</p><p className="font-semibold">{preRegisto.dia_falecimento}</p></div>
                <div><p className="text-xs text-[#A0AEC0] uppercase">Causa</p><p className="font-semibold">{preRegisto.causa_morte}</p></div>
                <div><p className="text-xs text-[#A0AEC0] uppercase">Local</p><p className="font-semibold">{preRegisto.local_falecimento}</p></div>
              </>
            )}
          </div>

          <h3 className="text-xs font-bold text-[#003F20] uppercase tracking-wide mb-4 pt-4 border-t border-[#E2E8F0]">
            Preencher Dados em Falta
          </h3>

          {tipo === 'nascimento' && (
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Nome da criança" value={form.nome_completo} onChange={v => setForm(f => ({ ...f, nome_completo: v }))} />
              <Campo label="Apelidos" value={form.apelidos} onChange={v => setForm(f => ({ ...f, apelidos: v }))} />
              <Campo label="Avô paterno" value={form.avo_paterno} onChange={v => setForm(f => ({ ...f, avo_paterno: v }))} />
              <Campo label="Avó paterna" value={form.avo_paterna} onChange={v => setForm(f => ({ ...f, avo_paterna: v }))} />
              <Campo label="Avô materno" value={form.avo_materno} onChange={v => setForm(f => ({ ...f, avo_materno: v }))} />
              <Campo label="Avó materna" value={form.avo_materna} onChange={v => setForm(f => ({ ...f, avo_materna: v }))} />
              <Campo label="Nome do declarante" value={form.nome_declarante} onChange={v => setForm(f => ({ ...f, nome_declarante: v }))} />
              <Campo label="BI do declarante" value={form.bi_declarante} onChange={v => setForm(f => ({ ...f, bi_declarante: v }))} />
              <Campo label="Estado civil do declarante" value={form.estado_civil_declarante} onChange={v => setForm(f => ({ ...f, estado_civil_declarante: v }))} />
              <Campo label="Residência do declarante" value={form.residencia_declarante} onChange={v => setForm(f => ({ ...f, residencia_declarante: v }))} />
              <div className="col-span-2">
                <label className="block text-xs text-[#718096] uppercase tracking-wide mb-1">Relação com o menor</label>
                <select value={form.relacao_declarante} onChange={e => setForm(f => ({ ...f, relacao_declarante: e.target.value }))}
                  className="w-full border border-[#CBD5E0] rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#009A44]">
                  <option value="pai">Pai</option>
                  <option value="mae">Mãe</option>
                  <option value="familiar">Familiar</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>
          )}

          {tipo === 'obito' && (
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Cemitério" value={form.cemiterio} onChange={v => setForm(f => ({ ...f, cemiterio: v }))} />
              <Campo label="Herdeiros" value={form.herdeiros} onChange={v => setForm(f => ({ ...f, herdeiros: v }))} />
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={form.bens_inventario} onChange={e => setForm(f => ({ ...f, bens_inventario: e.target.checked }))} />
                <label className="text-sm text-[#4A5568]">Bens sujeitos a inventário</label>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={form.testamento} onChange={e => setForm(f => ({ ...f, testamento: e.target.checked }))} />
                <label className="text-sm text-[#4A5568]">Testamento</label>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-end gap-4">
            <div className="flex-1 max-w-sm">
              <label className="block text-xs text-[#718096] uppercase tracking-wide mb-1">Funcionário responsável</label>
              <input value={conservador} onChange={e => setConservador(e.target.value)}
                className="w-full border border-[#CBD5E0] rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#009A44]" />
            </div>
            <button onClick={confirmar}
              className="px-8 py-2.5 rounded text-sm font-bold text-white uppercase tracking-wide"
              style={{ backgroundColor: '#003F20' }}>
              Confirmar e Enviar para Aprovação
            </button>
            <button onClick={() => { setPreRegisto(null); setValorBusca('') }}
              className="px-6 py-2.5 rounded text-sm font-medium border border-[#CBD5E0] text-[#4A5568] hover:bg-[#F7FAFC]">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}