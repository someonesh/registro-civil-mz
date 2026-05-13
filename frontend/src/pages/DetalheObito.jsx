import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'

// COMPONENTES AUXILIARES
const Campo = ({ label, valor }) => (
  <div>
    <p className="text-xs text-[#718096] uppercase tracking-wide">{label}</p>
    <p className="text-sm font-semibold text-[#2D3748] mt-0.5">
      {valor || '—'}
    </p>
  </div>
)

const Secao = ({ titulo, children }) => (
  <div
    className="bg-white border border-[#E2E8F0] rounded mb-4"
    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
  >
    <div className="px-5 py-3 border-b border-[#E2E8F0] bg-[#F7FAFC]">
      <h3 className="text-xs font-bold text-[#003F20] uppercase tracking-wide">
        {titulo}
      </h3>
    </div>

    <div className="p-5">{children}</div>
  </div>
)

const CampoInput = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs text-[#718096] uppercase tracking-wide mb-1">
      {label}
    </label>

    <input
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-[#CBD5E0] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#009A44]"
    />
  </div>
)

export default function DetalheObito() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [registo, setRegisto] = useState(null)

  const [conservador, setConservador] = useState(
    'Rollins da Conceição Chanesa'
  )

  const [motivo, setMotivo] = useState('')
  const [mensagem, setMensagem] = useState(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const [form, setForm] = useState({})

  const carregar = () => {
    api
      .get(`/obito/${id}`)
      .then(r => {
        setRegisto(r.data)

        setForm({
          nome_completo: r.data.nome_completo || '',
          idade: r.data.idade || '',
          estado_civil: r.data.estado_civil || '',
          naturalidade: r.data.naturalidade || '',
          provincia_naturalidade:
            r.data.provincia_naturalidade || '',
          ultima_residencia:
            r.data.ultima_residencia || '',
          nome_pai_falecido:
            r.data.nome_pai_falecido || '',
          nome_mae_falecida:
            r.data.nome_mae_falecida || '',
          causa_morte: r.data.causa_morte || '',
          cemiterio: r.data.cemiterio || '',
          nome_declarante:
            r.data.nome_declarante || '',
          bi_declarante:
            r.data.bi_declarante || '',
          residencia_declarante:
            r.data.residencia_declarante || '',
        })
      })
      .catch(() => {})
  }

  useEffect(() => {
    carregar()
  }, [id])

  const set = campo => valor =>
    setForm(f => ({
      ...f,
      [campo]: valor,
    }))

  const notificarHospital = async (estado, detalhes) => {
    try {
      await api.post('/notificacao/hospital', {
        ref_hospital: registo.ref_hospital,
        tipo: 'obito',
        estado,
        detalhes,
      })
    } catch (_) {}
  }

  const submeterForm = () => {
    if (!form.nome_completo) {
      setMensagem({
        tipo: 'erro',
        texto: 'Nome do falecido é obrigatório.',
      })

      return
    }

    setEnviando(true)

    api
      .post(`/obito/${id}/completar`, form)
      .then(r => {
        setMensagem({
          tipo: 'sucesso',
          texto: r.data.mensagem,
        })

        setMostrarForm(false)

        carregar()
      })
      .catch(e => {
        setMensagem({
          tipo: 'erro',
          texto:
            e.response?.data?.detail ||
            'Erro ao guardar.',
        })
      })
      .finally(() => setEnviando(false))
  }

  const aprovar = () => {
    api
      .post('/obito/aprovar', {
        pre_registo_id: parseInt(id),
        conservador,
        diario_numero: `DIA-OB-${new Date().getFullYear()}-${id}`,
      })
      .then(async r => {
        await notificarHospital('aprovado', {
          mensagem: `Registo de óbito de ${registo.nome_completo} aprovado.`,
          diario_numero: `DIA-OB-${new Date().getFullYear()}-${id}`,
        })

        setMensagem({
          tipo: 'sucesso',
          texto:
            r.data.mensagem +
            ' — Hospital notificado.',
        })

        setTimeout(() => navigate('/obitos'), 2000)
      })
      .catch(e =>
        setMensagem({
          tipo: 'erro',
          texto:
            e.response?.data?.detail ||
            'Erro ao aprovar.',
        })
      )
  }

  const rejeitar = () => {
    if (!motivo)
      return alert('Escreve o motivo de rejeição.')

    api
      .post('/obito/rejeitar', {
        pre_registo_id: parseInt(id),
        motivo_rejeicao: motivo,
        rejeitado_por: conservador,
      })
      .then(async r => {
        await notificarHospital('rejeitado', {
          mensagem: `Registo de óbito de ${registo.nome_completo} rejeitado.`,
          motivo_rejeicao: motivo,
        })

        setMensagem({
          tipo: 'aviso',
          texto:
            r.data.mensagem +
            ' — Hospital notificado.',
        })

        setTimeout(() => navigate('/obitos'), 2000)
      })
      .catch(e =>
        setMensagem({
          tipo: 'erro',
          texto:
            e.response?.data?.detail ||
            'Erro ao rejeitar.',
        })
      )
  }

  if (!registo)
    return (
      <div className="p-8 text-sm text-[#718096]">
        A carregar processo...
      </div>
    )

  return (
    <div
      className="p-8 max-w-4xl"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      {/* CABEÇALHO */}
      <div className="flex items-center gap-4 mb-6 pb-4 border-b-2 border-[#009A44]">
        <button
          onClick={() => navigate('/obitos')}
          className="text-xs text-[#009A44] hover:underline font-medium"
        >
          Voltar
        </button>

        <div className="w-px h-4 bg-[#E2E8F0]"></div>

        <div className="flex-1">
          <h2 className="text-xl font-bold text-[#003F20]">
            Processo de Registo de Óbito
          </h2>

          <p
            className="text-xs text-[#718096] mt-0.5"
            style={{ fontFamily: 'monospace' }}
          >
            Ref: {registo.ref_hospital}
          </p>
        </div>

        {{
          aguarda_aprovacao: (
            <span className="px-3 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">
              ⏳ Aguarda Aprovação
            </span>
          ),

          aprovado: (
            <span className="px-3 py-1 rounded-full text-xs font-bold border bg-green-50 text-green-700 border-green-200">
              ✓ Aprovado
            </span>
          ),

          rejeitado: (
            <span className="px-3 py-1 rounded-full text-xs font-bold border bg-red-50 text-red-700 border-red-200">
              ✗ Rejeitado
            </span>
          ),

          incompleto: (
            <span className="px-3 py-1 rounded-full text-xs font-bold border bg-gray-50 text-gray-500 border-gray-200">
              Incompleto
            </span>
          ),
        }[registo.status]}
      </div>

      {/* MENSAGEM */}
      {mensagem && (
        <div
          className={`mb-5 p-4 rounded border text-sm ${
            mensagem.tipo === 'sucesso'
              ? 'bg-green-50 border-green-200 text-green-700'
              : mensagem.tipo === 'erro'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      {/* ALERTA INCOMPLETO */}
      {registo.status === 'incompleto' &&
        !mostrarForm && (
          <div className="mb-5 border border-amber-200 bg-amber-50 rounded p-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-amber-800 mb-1">
                Processo incompleto
              </h3>

              <p className="text-sm text-amber-700">
                Faltam dados obrigatórios.
                Complete presencialmente para
                continuar.
              </p>
            </div>

            <button
              onClick={() => setMostrarForm(true)}
              className="px-5 py-2.5 rounded text-sm font-bold text-white whitespace-nowrap"
              style={{ backgroundColor: '#003F20' }}
            >
              Completar Dados
            </button>
          </div>
        )}

      {/* FORMULÁRIO */}
      {mostrarForm &&
        registo.status === 'incompleto' && (
          <div
            className="mb-5 bg-white border-2 border-[#009A44] rounded"
            style={{
              boxShadow:
                '0 2px 8px rgba(0,154,68,0.1)',
            }}
          >
            <div className="px-5 py-3 border-b border-[#E2E8F0] bg-[#F0FAF4] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#003F20] uppercase tracking-wide">
                Completar Dados Presencialmente
              </h3>

              <button
                onClick={() =>
                  setMostrarForm(false)
                }
                className="text-xs text-[#718096] hover:text-red-500"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <p className="text-xs font-bold text-[#003F20] uppercase tracking-wide mb-3 pb-1 border-b border-[#E2E8F0]">
                  Dados do Falecido
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <CampoInput
                    label="Nome completo"
                    value={form.nome_completo}
                    onChange={set(
                      'nome_completo'
                    )}
                  />

                  <CampoInput
                    label="Idade"
                    value={form.idade}
                    onChange={set('idade')}
                  />

                  <CampoInput
                    label="Estado civil"
                    value={form.estado_civil}
                    onChange={set(
                      'estado_civil'
                    )}
                  />

                  <CampoInput
                    label="Naturalidade"
                    value={form.naturalidade}
                    onChange={set(
                      'naturalidade'
                    )}
                  />

                  <CampoInput
                    label="Província"
                    value={
                      form.provincia_naturalidade
                    }
                    onChange={set(
                      'provincia_naturalidade'
                    )}
                  />

                  <CampoInput
                    label="Última residência"
                    value={
                      form.ultima_residencia
                    }
                    onChange={set(
                      'ultima_residencia'
                    )}
                  />

                  <CampoInput
                    label="Nome do pai"
                    value={
                      form.nome_pai_falecido
                    }
                    onChange={set(
                      'nome_pai_falecido'
                    )}
                  />

                  <CampoInput
                    label="Nome da mãe"
                    value={
                      form.nome_mae_falecida
                    }
                    onChange={set(
                      'nome_mae_falecida'
                    )}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-[#003F20] uppercase tracking-wide mb-3 pb-1 border-b border-[#E2E8F0]">
                  Falecimento
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <CampoInput
                    label="Causa da morte"
                    value={form.causa_morte}
                    onChange={set(
                      'causa_morte'
                    )}
                  />

                  <CampoInput
                    label="Cemitério"
                    value={form.cemiterio}
                    onChange={set(
                      'cemiterio'
                    )}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-[#003F20] uppercase tracking-wide mb-3 pb-1 border-b border-[#E2E8F0]">
                  Declarante
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <CampoInput
                    label="Nome do declarante"
                    value={
                      form.nome_declarante
                    }
                    onChange={set(
                      'nome_declarante'
                    )}
                  />

                  <CampoInput
                    label="N.º BI"
                    value={
                      form.bi_declarante
                    }
                    onChange={set(
                      'bi_declarante'
                    )}
                  />

                  <CampoInput
                    label="Residência"
                    value={
                      form.residencia_declarante
                    }
                    onChange={set(
                      'residencia_declarante'
                    )}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-[#E2E8F0]">
                <button
                  onClick={submeterForm}
                  disabled={enviando}
                  className="px-6 py-2.5 rounded text-sm font-bold text-white uppercase tracking-wide disabled:opacity-50"
                  style={{
                    backgroundColor: '#003F20',
                  }}
                >
                  {enviando
                    ? 'A guardar...'
                    : 'Guardar e Enviar para Aprovação'}
                </button>

                <button
                  onClick={() =>
                    setMostrarForm(false)
                  }
                  className="px-4 py-2.5 rounded text-sm font-medium border border-[#CBD5E0] text-[#4A5568]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

      {/* DADOS DO FALECIDO */}
      <Secao titulo="Dados do Falecido">
        <div className="grid grid-cols-3 gap-5">
          <Campo
            label="Nome completo"
            valor={registo.nome_completo}
          />

          <Campo
            label="Sexo"
            valor={
              registo.sexo === 'M'
                ? 'Masculino'
                : 'Feminino'
            }
          />

          <Campo
            label="Idade"
            valor={
              registo.idade
                ? `${registo.idade} anos`
                : null
            }
          />

          <Campo
            label="Estado civil"
            valor={registo.estado_civil}
          />

          <Campo
            label="Naturalidade"
            valor={registo.naturalidade}
          />

          <Campo
            label="Província"
            valor={
              registo.provincia_naturalidade
            }
          />

          <Campo
            label="Última residência"
            valor={
              registo.ultima_residencia
            }
          />

          <Campo
            label="Filho(a) de"
            valor={
              registo.nome_pai_falecido
            }
          />

          <Campo
            label="e de"
            valor={
              registo.nome_mae_falecida
            }
          />
        </div>
      </Secao>

      {/* DADOS DO FALECIMENTO */}
      <Secao titulo="Dados do Falecimento">
        <div className="grid grid-cols-3 gap-5">
          <Campo
            label="Data"
            valor={registo.dia_falecimento}
          />

          <Campo
            label="Hora"
            valor={registo.hora_falecimento}
          />

          <Campo
            label="Local"
            valor={registo.local_falecimento}
          />

          <Campo
            label="Localidade"
            valor={
              registo.localidade_falecimento
            }
          />

          <Campo
            label="Província"
            valor={
              registo.provincia_falecimento
            }
          />

          <Campo
            label="Causa da morte"
            valor={registo.causa_morte}
          />

          <Campo
            label="Boletim hospital"
            valor={
              registo.boletim_hospital
            }
          />

          <Campo
            label="Cemitério"
            valor={registo.cemiterio}
          />
        </div>
      </Secao>

      {/* DECLARANTE */}
      <Secao titulo="Declarante">
        <div className="grid grid-cols-3 gap-5">
          <Campo
            label="Nome"
            valor={
              registo.nome_declarante
            }
          />

          <Campo
            label="N.º BI"
            valor={
              registo.bi_declarante
            }
          />

          <Campo
            label="Estado civil"
            valor={
              registo.estado_civil_declarante
            }
          />

          <Campo
            label="Residência"
            valor={
              registo.residencia_declarante
            }
          />
        </div>
      </Secao>

      {/* DECISÃO */}
      {registo.status ===
        'aguarda_aprovacao' && (
        <Secao titulo="Decisão do Conservador">
          <div className="mb-4">
            <label className="block text-xs text-[#718096] uppercase tracking-wide mb-1">
              Conservador responsável
            </label>

            <input
              value={conservador}
              onChange={e =>
                setConservador(
                  e.target.value
                )
              }
              className="w-full border border-[#CBD5E0] rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#009A44]"
            />
          </div>

          <div className="mb-5">
            <label className="block text-xs text-[#718096] uppercase tracking-wide mb-1">
              Motivo de rejeição
              (obrigatório se rejeitar)
            </label>

            <textarea
              value={motivo}
              onChange={e =>
                setMotivo(e.target.value)
              }
              rows={3}
              placeholder="Descreve o motivo de rejeição..."
              className="w-full border border-[#CBD5E0] rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#009A44]"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={aprovar}
              className="px-6 py-2.5 rounded text-sm font-bold text-white uppercase tracking-wide"
              style={{
                backgroundColor: '#003F20',
              }}
            >
              Aprovar Registo
            </button>

            <button
              onClick={rejeitar}
              className="px-6 py-2.5 rounded text-sm font-bold uppercase tracking-wide border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
            >
              Rejeitar
            </button>
          </div>
        </Secao>
      )}
    </div>
  )
}