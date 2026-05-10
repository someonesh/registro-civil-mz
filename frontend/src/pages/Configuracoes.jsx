import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Configuracoes() {
  const [frequencia, setFrequencia] = useState('')
  const [mensagem, setMensagem] = useState(null)

  useEffect(() => {
    api.get('/configuracoes').then(r => {
      const freq = r.data.find(c => c.chave === 'frequencia_notificacao_minutos')
      if (freq) setFrequencia(freq.valor)
    }).catch(()=>{})
  }, [])

  const salvar = () => {
    api.put('/configuracoes/frequencia_notificacao_minutos', { valor: frequencia })
      .then(() => setMensagem({ tipo: 'sucesso', texto: 'Configuração guardada com sucesso.' }))
      .catch(() => setMensagem({ tipo: 'erro', texto: 'Erro ao guardar.' }))
  }

  const presets = [
    { label: '1 minuto (teste em sala)', valor: '1' },
    { label: '5 minutos (demonstração)', valor: '5' },
    { label: '1 dia', valor: '1440' },
    { label: '15 dias (padrão)', valor: '21600' },
  ]

  return (
    <div className="p-8 max-w-2xl" style={{fontFamily: "'Georgia', serif"}}>
      <div className="mb-8 pb-4 border-b-2 border-[#009A44]">
        <h2 className="text-2xl font-bold text-[#003F20]">Configurações do Sistema</h2>
        <p className="text-sm text-[#718096] mt-1">Parâmetros operacionais da 1ª Conservatória do Registo Civil da Beira</p>
      </div>

      {mensagem && (
        <div className={`mb-4 p-3 rounded text-sm border ${mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {mensagem.texto}
        </div>
      )}

      <div className="bg-white border border-[#E2E8F0] rounded p-6" style={{boxShadow: '0 1px 3px rgba(0,0,0,0.06)'}}>
        <h3 className="font-bold text-[#003F20] text-sm uppercase tracking-wide mb-1">Frequência de Notificações</h3>
        <p className="text-sm text-[#718096] mb-5">
          Define o intervalo de reenvio automático de notificações a encarregados com processos pendentes.
        </p>

        <div className="flex flex-wrap gap-2 mb-5">
          {presets.map(p => (
            <button key={p.valor} onClick={() => setFrequencia(p.valor)}
              className={`px-3 py-2 rounded text-xs font-medium border transition-all ${
                frequencia === p.valor
                  ? 'bg-[#003F20] text-white border-[#003F20]'
                  : 'bg-white text-[#4A5568] border-[#CBD5E0] hover:border-[#009A44]'
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-[#718096] uppercase tracking-wide mb-1">Valor em minutos</label>
            <input value={frequencia} onChange={e => setFrequencia(e.target.value)} type="number"
              className="w-full border border-[#CBD5E0] rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#009A44]"
              style={{fontFamily: 'monospace'}}/>
          </div>
          <div className="flex items-end">
            <button onClick={salvar}
              className="px-6 py-2.5 rounded text-sm font-semibold text-white transition-colors"
              style={{backgroundColor: '#003F20'}}>
              Guardar
            </button>
          </div>
        </div>
        <p className="text-xs text-[#A0AEC0] mt-2">Valor actual: {frequencia} minuto(s)</p>
      </div>
    </div>
  )
}