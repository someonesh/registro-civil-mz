import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function DetalheNascimento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [registo, setRegisto] = useState(null)
  const [conservador, setConservador] = useState('Dr. João Carlos Gotoro')
  const [motivo, setMotivo] = useState('')
  const [mensagem, setMensagem] = useState(null)

  useEffect(() => {
    api.get(`/nascimento/${id}`).then(r => setRegisto(r.data)).catch(()=>{})
  }, [id])

  const aprovar = () => {
    api.post('/nascimento/aprovar', {
      pre_registo_id: parseInt(id), conservador,
      cedula_numero: `CED-${new Date().getFullYear()}-${id}`,
      diario_numero: `DIA-${new Date().getFullYear()}-${id}`
    }).then(r => {
      setMensagem({ tipo: 'sucesso', texto: r.data.mensagem })
      setTimeout(() => navigate('/nascimentos'), 2000)
    }).catch(e => setMensagem({ tipo: 'erro', texto: e.response?.data?.detail || 'Erro ao aprovar.' }))
  }

  const rejeitar = () => {
    if (!motivo) return alert('Escreve o motivo de rejeição.')
    api.post('/nascimento/rejeitar', {
      pre_registo_id: parseInt(id), motivo_rejeicao: motivo, rejeitado_por: conservador
    }).then(r => {
      setMensagem({ tipo: 'aviso', texto: r.data.mensagem })
      setTimeout(() => navigate('/nascimentos'), 2000)
    })
  }

  if (!registo) return <div className="p-8 text-sm text-[#718096]">A carregar processo...</div>

  const Campo = ({ label, valor }) => (
    <div>
      <p className="text-xs text-[#718096] uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-[#2D3748] mt-0.5">{valor || '—'}</p>
    </div>
  )

  const Secao = ({ titulo, children }) => (
    <div className="bg-white border border-[#E2E8F0] rounded mb-4" style={{boxShadow: '0 1px 3px rgba(0,0,0,0.06)'}}>
      <div className="px-5 py-3 border-b border-[#E2E8F0] bg-[#F7FAFC]">
        <h3 className="text-xs font-bold text-[#003F20] uppercase tracking-wide">{titulo}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )

  return (
    <div className="p-8 max-w-4xl" style={{fontFamily: "'Georgia', serif"}}>
      <div className="flex items-center gap-4 mb-6 pb-4 border-b-2 border-[#009A44]">
        <button onClick={() => navigate('/nascimentos')}
          className="text-xs text-[#009A44] hover:underline font-medium">Voltar</button>
        <div className="w-px h-4 bg-[#E2E8F0]"></div>
        <div>
          <h2 className="text-xl font-bold text-[#003F20]">Processo de Registo de Nascimento</h2>
          <p className="text-xs text-[#718096] mt-0.5" style={{fontFamily:'monospace'}}>Ref: {registo.ref_hospital}</p>
        </div>
      </div>

      {mensagem && (
        <div className={`mb-5 p-4 rounded border text-sm ${
          mensagem.tipo === 'sucesso' ? 'bg-green-50 border-green-200 text-green-700' :
          mensagem.tipo === 'erro' ? 'bg-red-50 border-red-200 text-red-700' :
          'bg-amber-50 border-amber-200 text-amber-700'
        }`}>{mensagem.texto}</div>
      )}

      <Secao titulo="Dados do Recém-nascido">
        <div className="grid grid-cols-3 gap-5">
          <Campo label="Nome completo" valor={registo.nome_completo}/>
          <Campo label="Apelidos" valor={registo.apelidos}/>
          <Campo label="Sexo" valor={registo.sexo_bebe === 'M' ? 'Masculino' : 'Feminino'}/>
          <Campo label="Data de nascimento" valor={registo.data_nascimento}/>
          <Campo label="Hora" valor={registo.hora_nascimento}/>
          <Campo label="Local" valor={registo.local_nascimento}/>
          <Campo label="Província" valor={registo.provincia_nascimento}/>
          <Campo label="Distrito" valor={registo.distrito_nascimento}/>
        </div>
      </Secao>

      <Secao titulo="Filiação">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-bold text-[#4A5568] uppercase tracking-wide mb-3 pb-1 border-b border-[#E2E8F0]">Pai</p>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Nome" valor={registo.nome_pai}/>
              <Campo label="N.º BI" valor={registo.bi_pai}/>
              <Campo label="Naturalidade" valor={registo.naturalidade_pai}/>
              <Campo label="Estado civil" valor={registo.estado_civil_pai}/>
              <Campo label="Vivo" valor={registo.pai_vivo ? 'Sim' : 'Não'}/>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-[#4A5568] uppercase tracking-wide mb-3 pb-1 border-b border-[#E2E8F0]">Mãe</p>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Nome" valor={registo.nome_mae}/>
              <Campo label="N.º BI" valor={registo.bi_mae}/>
              <Campo label="Naturalidade" valor={registo.naturalidade_mae}/>
              <Campo label="Estado civil" valor={registo.estado_civil_mae}/>
              <Campo label="Viva" valor={registo.mae_viva ? 'Sim' : 'Não'}/>
            </div>
          </div>
        </div>
      </Secao>

      <Secao titulo="Avós">
        <div className="grid grid-cols-4 gap-4">
          <Campo label="Avô paterno" valor={registo.avo_paterno}/>
          <Campo label="Avó paterna" valor={registo.avo_paterna}/>
          <Campo label="Avô materno" valor={registo.avo_materno}/>
          <Campo label="Avó materna" valor={registo.avo_materna}/>
        </div>
      </Secao>

      <Secao titulo="Declarante">
        <div className="grid grid-cols-3 gap-4">
          <Campo label="Nome" valor={registo.nome_declarante}/>
          <Campo label="N.º BI" valor={registo.bi_declarante}/>
          <Campo label="Estado civil" valor={registo.estado_civil_declarante}/>
          <Campo label="Residência" valor={registo.residencia_declarante}/>
          <Campo label="Relação com o menor" valor={registo.relacao_declarante}/>
        </div>
      </Secao>

      {registo.status === 'aguarda_aprovacao' && (
        <Secao titulo="Decisão do Conservador">
          <div className="mb-4">
            <label className="block text-xs text-[#718096] uppercase tracking-wide mb-1">Conservador responsável</label>
            <input value={conservador} onChange={e => setConservador(e.target.value)}
              className="w-full border border-[#CBD5E0] rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#009A44]"/>
          </div>
          <div className="mb-5">
            <label className="block text-xs text-[#718096] uppercase tracking-wide mb-1">Motivo de rejeição (obrigatório se rejeitar)</label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3}
              className="w-full border border-[#CBD5E0] rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#009A44]"
              placeholder="Descreve o motivo de rejeição..."/>
          </div>
          <div className="flex gap-3">
            <button onClick={aprovar}
              className="px-6 py-2.5 rounded text-sm font-bold text-white uppercase tracking-wide transition-colors"
              style={{backgroundColor: '#003F20'}}>
              Aprovar Registo
            </button>
            <button onClick={rejeitar}
              className="px-6 py-2.5 rounded text-sm font-bold uppercase tracking-wide border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors">
              Rejeitar
            </button>
          </div>
        </Secao>
      )}

      {registo.status === 'incompleto' && (
        <div className="border border-amber-200 bg-amber-50 rounded p-4 text-sm text-amber-700">
          Este processo ainda está incompleto. O hospital deverá enviar os dados complementares (fase 2) com o nome da criança, avós e declarante.
        </div>
      )}
    </div>
  )
}