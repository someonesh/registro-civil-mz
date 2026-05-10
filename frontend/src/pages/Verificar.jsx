import { useState } from 'react'
import api from '../services/api'

export default function Verificar() {
  const [nuic, setNuic] = useState('')
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState(null)
  const [loading, setLoading] = useState(false)

  const verificar = () => {
    setErro(null); setResultado(null); setLoading(true)
    api.get(`/nascimento/verificar/${nuic}`)
      .then(r => { setResultado(r.data); setLoading(false) })
      .catch(() => { setErro('Registo não encontrado para o NUIC fornecido.'); setLoading(false) })
  }

  return (
    <div className="p-8 max-w-2xl" style={{fontFamily: "'Georgia', serif"}}>
      <div className="mb-8 pb-4 border-b-2 border-[#009A44]">
        <h2 className="text-2xl font-bold text-[#003F20]">Verificação de Registo</h2>
        <p className="text-sm text-[#718096] mt-1">Consulta de autenticidade por Número Único de Identificação do Cidadão (NUIC)</p>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded p-6 mb-6" style={{boxShadow: '0 1px 3px rgba(0,0,0,0.06)'}}>
        <label className="block text-xs font-bold text-[#4A5568] uppercase tracking-wide mb-2">Número NUIC</label>
        <div className="flex gap-3">
          <input value={nuic} onChange={e => setNuic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && verificar()}
            placeholder="Ex: MZ-2025-000001"
            className="flex-1 border border-[#CBD5E0] rounded px-4 py-2.5 text-sm focus:outline-none focus:border-[#009A44] focus:ring-1 focus:ring-[#009A44]"
            style={{fontFamily: 'monospace'}}/>
          <button onClick={verificar} disabled={loading || !nuic}
            className="px-6 py-2.5 rounded text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{backgroundColor: '#003F20'}}>
            {loading ? 'A verificar...' : 'Verificar'}
          </button>
        </div>
      </div>

      {erro && (
        <div className="border border-red-200 bg-red-50 rounded p-4 text-sm text-red-700">
          {erro}
        </div>
      )}

      {resultado && (
        <div className="bg-white border-l-4 border-[#009A44] rounded p-6" style={{boxShadow: '0 1px 3px rgba(0,0,0,0.06)'}}>
          <p className="text-xs font-bold text-[#009A44] uppercase tracking-wide mb-4">Registo Válido e Autêntico</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['NUIC', resultado.nuic],
              ['Nome Completo', `${resultado.nome_completo} ${resultado.apelidos}`],
              ['Data de Nascimento', resultado.data_nascimento],
              ['Assento n.º', resultado.numero_assento],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs text-[#718096] uppercase tracking-wide">{label}</p>
                <p className="font-semibold text-[#2D3748] mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}