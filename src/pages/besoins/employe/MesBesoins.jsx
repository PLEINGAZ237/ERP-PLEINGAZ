import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import EmployeLayout from '@/components/besoins/employe/EmployeLayout'

const STATUT_STYLE = {
  EN_ATTENTE_DFC: 'bg-amber-100 text-amber-700',
  EN_ATTENTE_DG: 'bg-blue-100 text-blue-700',
  VALIDE_DG: 'bg-green-100 text-green-700',
  REJETE_DFC: 'bg-red-100 text-red-700',
  REJETE_DG: 'bg-red-100 text-red-700',
  DECAISSE: 'bg-purple-100 text-purple-700',
  EN_ATTENTE_RETOUR_CAISSE: 'bg-orange-100 text-orange-700',
  BOUCLE: 'bg-gray-200 text-gray-700',
}

const STATUT_LABEL = {
  EN_ATTENTE_DFC: 'En attente DFC',
  EN_ATTENTE_DG: 'En attente DG',
  VALIDE_DG: 'Validé DG',
  REJETE_DFC: 'Rejeté DFC',
  REJETE_DG: 'Rejeté DG',
  DECAISSE: 'Décaissé',
  EN_ATTENTE_RETOUR_CAISSE: 'Retour caisse attendu',
  BOUCLE: 'Bouclé',
}

export default function MesBesoins() {
  const { user } = useAuth()
  const [besoins, setBesoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [selected, setSelected] = useState(null)
  const [editForm, setEditForm] = useState({
    description: '',
    montant: '',
    justification: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('besoins')
      .select('*')
      .order('created_at', { ascending: false })
    setBesoins(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const openEdit = (besoin) => {
    setSelected(besoin)
    setEditForm({
      description: besoin.description,
      montant: besoin.montant_demande,
      justification: besoin.justification ?? '',
    })
    setError('')
    setShowEdit(true)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setError('')
    if (
      !editForm.description.trim() ||
      !editForm.montant ||
      Number(editForm.montant) <= 0 ||
      !editForm.justification.trim()
    ) {
      setError('Veuillez remplir tous les champs correctement.')
      return
    }

    setSaving(true)
    const { error: updateError } = await supabase
      .from('besoins')
      .update({
        description: editForm.description.trim(),
        montant_demande: parseFloat(editForm.montant),
        justification: editForm.justification.trim(),
      })
      .eq('id', selected.id)
      .eq('statut', 'EN_ATTENTE_DFC')
    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }
    setShowEdit(false)
    load()
  }

  return (
    <EmployeLayout>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
        <h1 className='text-xl md:text-2xl font-bold text-gray-800'>
          Historique des besoins
        </h1>
        <Link
          to='/besoins/employe/creer-besoin'
          className='w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 text-center transition-all shadow-lg shadow-blue-500/20'
        >
          + Nouveau besoin
        </Link>
      </div>

      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
        <div className='overflow-x-auto'>
          {loading ? (
            <div className='py-20 text-center'>
              <div className='animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full mb-2'></div>
              <p className='text-gray-400 text-xs font-medium'>
                Chargement de vos dossiers...
              </p>
            </div>
          ) : besoins.length === 0 ? (
            <div className='p-10 text-center'>
              <p className='text-gray-400 text-sm'>
                Aucun besoin pour le moment.
              </p>
            </div>
          ) : (
            <table className='w-full text-left border-collapse min-w-[800px]'>
              <thead className='bg-gray-50/50'>
                <tr>
                  {[
                    'Numéro',
                    'Description',
                    'Montant',
                    'Statut',
                    'Date',
                    'Action',
                  ].map((h) => (
                    <th
                      key={h}
                      className='px-5 py-3 text-[11px] uppercase font-bold text-gray-400 tracking-wider'
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-50'>
                {besoins.map((b) => (
                  <tr
                    key={b.id}
                    className='hover:bg-gray-50/30 transition-colors'
                  >
                    <td className='px-5 py-4 font-mono text-xs text-blue-600 font-medium'>
                      {b.numero}
                    </td>
                    <td className='px-5 py-4 text-sm text-gray-600 max-w-[200px] truncate'>
                      {b.description}
                    </td>
                    <td className='px-5 py-4 text-sm font-semibold text-gray-800'>
                      {Number(b.montant_demande).toLocaleString('fr-FR')}{' '}
                      <span className='text-[10px]'>FCFA</span>
                    </td>
                    <td className='px-5 py-4'>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${STATUT_STYLE[b.statut] ?? ''}`}
                      >
                        {STATUT_LABEL[b.statut] ?? b.statut}
                      </span>
                    </td>
                    <td className='px-5 py-4 text-gray-400 text-xs'>
                      {new Date(b.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className='px-5 py-4'>
                      {b.statut === 'EN_ATTENTE_DFC' ? (
                        <button
                          onClick={() => openEdit(b)}
                          className='text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-tighter transition-colors'
                        >
                          Modifier
                        </button>
                      ) : (
                        <span className='text-gray-300 text-xs'>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal - Responsive full screen on mobile */}
      {showEdit && selected && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4'>
          <div className='bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-lg animate-in slide-in-from-bottom duration-300'>
            <div className='w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden' />
            <h3 className='text-lg font-black text-gray-800 mb-1'>
              Modifier le dossier
            </h3>
            <p className='text-[10px] font-mono text-blue-500 mb-6 uppercase tracking-widest'>
              {selected.numero}
            </p>

            <form onSubmit={handleEdit} className='space-y-4'>
              <div>
                <label className='block text-[10px] font-bold text-gray-400 uppercase mb-1'>
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  rows={3}
                  className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none'
                  required
                />
              </div>

              <div>
                <label className='block text-[10px] font-bold text-gray-400 uppercase mb-1'>
                  Montant (FCFA)
                </label>
                <input
                  type='number'
                  value={editForm.montant}
                  onChange={(e) =>
                    setEditForm({ ...editForm, montant: e.target.value })
                  }
                  className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-bold'
                  required
                />
              </div>

              <div>
                <label className='block text-[10px] font-bold text-gray-400 uppercase mb-1'>
                  Justification
                </label>
                <textarea
                  value={editForm.justification}
                  onChange={(e) =>
                    setEditForm({ ...editForm, justification: e.target.value })
                  }
                  rows={3}
                  className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none'
                  required
                />
              </div>

              {error && (
                <div className='p-3 bg-red-50 text-red-600 text-[11px] font-bold rounded-lg border border-red-100'>
                  {error}
                </div>
              )}

              <div className='flex gap-3 pt-4 pb-6 sm:pb-0'>
                <button
                  type='submit'
                  disabled={saving}
                  className='flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20 transition-all'
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  type='button'
                  onClick={() => setShowEdit(false)}
                  className='flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all'
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </EmployeLayout>
  )
}