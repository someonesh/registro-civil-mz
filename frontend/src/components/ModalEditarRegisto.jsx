import { useState, useEffect } from 'react'
import api from '../services/api'

export default function ModalEditarRegisto({ isOpen, onClose, tipo, registo, onSave }) {
  const [formData, setFormData] = useState({})
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (registo) {
      setFormData(registo)
    }
  }, [registo])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErro(null)

    try {
      const endpoint = tipo === 'nascimento' 
        ? `/nascimento/registados/${registo.id}`
        : `/obito/registados/${registo.id}`
      
      await api.put(endpoint, formData)
      onSave()
      onClose()
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao actualizar registo')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-[#003F20]">
            Editar {tipo === 'nascimento' ? 'Nascimento' : 'Óbito'}
          </h3>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">
              {erro}
            </div>
          )}

          {tipo === 'nascimento' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  name="nome_completo"
                  value={formData.nome_completo || ''}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-[#009A44]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apelidos</label>
                <input
                  type="text"
                  name="apelidos"
                  value={formData.apelidos || ''}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-[#009A44]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                  <select
                    name="sexo"
                    value={formData.sexo || ''}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-[#009A44]"
                  >
                    <option value="">Seleccionar</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Nascimento</label>
                  <input
                    type="date"
                    name="data_nascimento"
                    value={formData.data_nascimento || ''}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-[#009A44]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Pai</label>
                <input
                  type="text"
                  name="nome_pai"
                  value={formData.nome_pai || ''}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-[#009A44]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Mãe</label>
                <input
                  type="text"
                  name="nome_mae"
                  value={formData.nome_mae || ''}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-[#009A44]"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Falecido</label>
                <input
                  type="text"
                  name="nome_completo"
                  value={formData.nome_completo || ''}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-[#009A44]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                  <select
                    name="sexo"
                    value={formData.sexo || ''}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-[#009A44]"
                  >
                    <option value="">Seleccionar</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Idade</label>
                  <input
                    type="number"
                    name="idade"
                    value={formData.idade || ''}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-[#009A44]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Falecimento</label>
                <input
                  type="date"
                  name="dia_falecimento"
                  value={formData.dia_falecimento || ''}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-[#009A44]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Causa da Morte</label>
                <textarea
                  name="causa_morte"
                  value={formData.causa_morte || ''}
                  onChange={handleChange}
                  rows="2"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-[#009A44]"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#003F20] text-white rounded hover:bg-[#009A44] disabled:opacity-50"
            >
              {loading ? 'A guardar...' : 'Guardar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}