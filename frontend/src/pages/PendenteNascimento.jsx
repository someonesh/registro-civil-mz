import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function PendenteNascimento() {
  const [registos, setRegistos] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/nascimento/pendentes').then(r => setRegistos(r.data.registos)).catch(()=>{})
  }, [])

  const filtrados = filtro === 'todos' ? registos : registos.filter(r => r.status === filtro)

  const statusBadge = (status) => {
    const map = { incompleto: 'bg-amber-50 text-amber-700 border-amber-200', aguarda_aprovacao: 'bg-blue-50 text-blue-700 border-blue-200' }
    const labels = { incompleto: 'Incompleto', aguarda_aprovacao: 'Aguarda Aprovação' }
    return <span className={`px-2 py-0.5 rounded text-xs font-medium border ${map[status]}`}>{labels[status]}</span>
  }

  return (
    <div className="p-8" style={{fontFamily: "'Georgia', serif"}}>
      <div className="mb-6 pb-4 border-b-2 border-[#009A44]">
        <h2 className="text-2xl font-bold text-[#003F20]">Registos de Nascimento</h2>
        <p className="text-sm text-[#718096] mt-1">{registos.length} processo(s) encontrado(s)</p>
      </div>

      <div className="flex gap-2 mb-5">
        {[['todos','Todos'],['incompleto','Incompletos'],['aguarda_aprovacao','Aguarda Aprovação']].map(([val, label]) => (
          <button key={val} onClick={() => setFiltro(val)}
            className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-wide border transition-all ${
              filtro === val ? 'bg-[#003F20] text-white border-[#003F20]' : 'bg-white text-[#4A5568] border-[#CBD5E0] hover:border-[#009A44]'
            }`}>{label}</button>
        ))}
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded divide-y divide-[#F0F4F8]" style={{boxShadow: '0 1px 3px rgba(0,0,0,0.06)'}}>
        <div className="grid grid-cols-12 px-5 py-3 bg-[#F7FAFC] border-b border-[#E2E8F0]">
          <p className="col-span-3 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Nome</p>
          <p className="col-span-3 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Filiação</p>
          <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Data</p>
          <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Referência</p>
          <p className="col-span-2 text-xs font-bold text-[#4A5568] uppercase tracking-wide">Estado</p>
        </div>
        {filtrados.map(r => (
          <div key={r.id} className="grid grid-cols-12 px-5 py-4 hover:bg-[#F7FAFC] cursor-pointer transition-colors items-center"
            onClick={() => navigate(`/nascimentos/${r.id}`)}>
            <p className="col-span-3 text-sm font-semibold text-[#2D3748]">{r.nome_completo || '— sem nome —'}</p>
            <div className="col-span-3">
              <p className="text-xs text-[#4A5568]">{r.nome_pai}</p>
              <p className="text-xs text-[#718096]">{r.nome_mae}</p>
            </div>
            <p className="col-span-2 text-xs text-[#718096]">{r.data_nascimento}</p>
            <p className="col-span-2 text-xs text-[#A0AEC0]" style={{fontFamily:'monospace'}}>{r.ref_hospital}</p>
            <div className="col-span-2">{statusBadge(r.status)}</div>
          </div>
        ))}
        {filtrados.length === 0 && <p className="px-5 py-8 text-sm text-[#A0AEC0] text-center">Nenhum registo encontrado</p>}
      </div>
    </div>
  )
}