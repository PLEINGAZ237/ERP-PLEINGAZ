import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import EmployeLayout from '@/components/besoins/employe/EmployeLayout'

export default function CreerBesoin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    description: '',
    montant: '',
    justification: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.description.trim()) {
      setError('La description est obligatoire.')
      return
    }
    if (!form.montant || Number(form.montant) <= 0) {
      setError('Le montant doit être supérieur à 0.')
      return
    }
    if (!form.justification.trim()) {
      setError('La justification est obligatoire.')
      return
    }

    setLoading(true)
    const { data, error: rpcError } = await supabase.rpc('creer_besoin', {
      p_description: form.description.trim(),
      p_montant_demande: parseFloat(form.montant),
      p_justification: form.justification.trim(),
    })
    setLoading(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setSuccess(`Besoin créé avec succès ! Numéro : ${data.numero}`)
    setForm({ description: '', montant: '', justification: '' })
    setTimeout(() => navigate('/besoins/employe/mes-besoins'), 2000)
  }

  return (
    <EmployeLayout>
      <div className='max-w-2xl mx-auto px-1'>
        <h1 className='text-xl md:text-2xl font-bold text-gray-800 mb-2'>
          Nouveau besoin
        </h1>
        <p className='text-gray-500 text-xs md:text-sm mb-6'>
          Votre besoin sera transmis au DFC pour validation.
        </p>

        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-8'>
          <form onSubmit={handleSubmit} className='space-y-6'>
            <div>
              <label className='block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2'>
                Titre <span className='text-red-500'>*</span>
              </label>
              <textarea
                name='description'
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder='Ex: Achat de fournitures de bureau...'
                className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none'
                required
              />
            </div>

            <div>
              <label className='block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2'>
                Montant demandée <span className='text-red-500'>*</span>
              </label>
              <div className='relative'>
                <input
                  type='number'
                  name='montant'
                  value={form.montant}
                  onChange={handleChange}
                  placeholder='0'
                  className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold'
                  required
                />
                <span className='absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400'>
                  FCFA
                </span>
              </div>
            </div>

            <div>
              <label className='block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2'>
                Détails <span className='text-red-500'>*</span>
              </label>
              <textarea
                name='justification'
                value={form.justification}
                onChange={handleChange}
                rows={3}
                placeholder='Expliquez pourquoi ce besoin est nécessaire...'
                className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none'
                required
              />
            </div>

            {error && (
              <div className='bg-red-50 text-red-600 text-xs font-bold p-4 rounded-xl border border-red-100'>
                {error}
              </div>
            )}
            {success && (
              <div className='bg-green-50 text-green-700 text-xs font-bold p-4 rounded-xl border border-green-100'>
                {success}
              </div>
            )}

            <div className='flex flex-col sm:flex-row gap-3 pt-2'>
              <button
                type='submit'
                disabled={loading}
                className='sm:order-2 w-full sm:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-bold text-sm shadow-lg shadow-blue-500/20 transition-all'
              >
                {loading ? 'Envoi...' : 'Soumettre le besoin'}
              </button>
              <button
                type='button'
                onClick={() => navigate('/besoins/employe')}
                className='sm:order-1 w-full sm:w-auto px-6 py-3 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 font-bold'
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </EmployeLayout>
  )
}