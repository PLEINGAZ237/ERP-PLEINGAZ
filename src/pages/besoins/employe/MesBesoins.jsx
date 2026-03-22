import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import EmployeLayout from '@/components/besoins/employe/EmployeLayout'

const STATUT_STYLE = {
  EN_ATTENTE_DFC:          'bg-amber-100 text-amber-700',
  EN_ATTENTE_DG:           'bg-red-100 text-red-700',
  VALIDE_DG:               'bg-green-100 text-green-700',
  REJETE_DFC:              'bg-red-100 text-red-700',
  REJETE_DG:               'bg-red-100 text-red-700',
  DECAISSE:                'bg-purple-100 text-purple-700',
  EN_ATTENTE_RETOUR_CAISSE:'bg-orange-100 text-orange-700',
  BOUCLE:                  'bg-gray-200 text-gray-700',
}

const STATUT_LABEL = {
  EN_ATTENTE_DFC:          'En attente DFC',
  EN_ATTENTE_DG:           'Validé DFC — En attente DG',
  VALIDE_DG:               'Validé DG — En attente décaissement',
  REJETE_DFC:              'Rejeté DFC',
  REJETE_DG:               'Rejeté DG',
  DECAISSE:                'Décaissé',
  EN_ATTENTE_RETOUR_CAISSE:'En attente retour en caisse',
  BOUCLE:                  'Bouclé',
}

const DETAIL_STATUTS = [
  'DECAISSE','REJETE_DFC','REJETE_DG','BOUCLE',
  'EN_ATTENTE_RETOUR_CAISSE','EN_ATTENTE_DG','VALIDE_DG'
]

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '—'
const fmtDateTime = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR') + ' · ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const getMontant = (b) => {
  switch (b.statut) {
    case 'EN_ATTENTE_DFC': return b.montant_demande
    case 'EN_ATTENTE_DG':  return b.validations_dfc?.slice(-1)[0]?.montant_valide ?? b.montant_demande
    case 'VALIDE_DG':      return b.validations_dg?.slice(-1)[0]?.montant_valide ?? b.montant_demande
    case 'REJETE_DFC':     return b.montant_demande
    case 'REJETE_DG':      return b.validations_dg?.slice(-1)[0]?.montant_valide ?? b.montant_demande
    case 'DECAISSE':       return b.decaissements?.[0]?.montant_decaisse ?? b.montant_demande
    case 'BOUCLE':         return b.decaissements?.[0]?.montant_decaisse ?? b.montant_demande
    case 'EN_ATTENTE_RETOUR_CAISSE':
      return b.decaissements?.[0]?.justificatifs?.[0]?.retours_caisse?.[0]?.montant_retour
        ?? b.decaissements?.[0]?.montant_decaisse
        ?? b.montant_demande
    default: return b.montant_demande
  }
}

export default function MesBesoins() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [besoins, setBesoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [selected, setSelected] = useState(null)
  const [editForm, setEditForm] = useState({ description: '', montant: '', justification: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('besoins')
      .select(`
        id, numero, montant_demande, description, justification, statut, created_at,
        validations_dfc(montant_valide),
        validations_dg(montant_valide),
        decaissements(montant_decaisse,
          justificatifs(retours_caisse(montant_retour))
        )
      `)
      .order('created_at', { ascending: false })
    setBesoins(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openEdit = (b) => {
    setSelected(b)
    setEditForm({ description: b.description, montant: b.montant_demande, justification: b.justification ?? '' })
    setError('')
    setShowEdit(true)
  }

  const handleRowClick = (e, b) => {
    if (window.getSelection()?.toString()) return
    if (b.statut === 'EN_ATTENTE_DFC') { openEdit(b); return }
    if (DETAIL_STATUTS.includes(b.statut)) navigate(`/besoins/employe/besoin/${b.id}`)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setError('')
    if (!editForm.description.trim() || !editForm.montant || Number(editForm.montant) <= 0 || !editForm.justification.trim()) {
      setError('Veuillez remplir tous les champs correctement.')
      return
    }
    setSaving(true)
    const { error: updateError } = await supabase.from('besoins')
      .update({ description: editForm.description.trim(), montant_demande: parseFloat(editForm.montant), justification: editForm.justification.trim() })
      .eq('id', selected.id).eq('statut', 'EN_ATTENTE_DFC')
    setSaving(false)
    if (updateError) { setError(updateError.message); return }
    setShowEdit(false)
    load()
  }

  return (
    <EmployeLayout>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
        <h1 className='text-xl md:text-2xl font-bold text-gray-800'>Historique des besoins</h1>
        <Link
          to='/besoins/employe/creer-besoin'
          className='w-full sm:w-auto bg-red-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-red-700 text-center transition-all shadow-lg shadow-red-500/20'
        >
          + Nouveau besoin
        </Link>
      </div>

      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
        <div className='overflow-x-auto'>
          {loading ? (
            <div className='py-20 text-center'>
              <div className='animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-red-600 rounded-full mb-2' />
              <p className='text-gray-400 text-xs font-medium'>Chargement de vos dossiers...</p>
            </div>
          ) : besoins.length === 0 ? (
            <div className='p-10 text-center'>
              <p className='text-gray-400 text-sm'>Aucun besoin pour le moment.</p>
            </div>
          ) : (
            <table className='w-full text-left border-collapse min-w-[900px]'>
              <thead className='bg-gray-50/50'>
                <tr>
                  {['Numéro','Titre','Montant','Statut','Date & Heure','Action'].map(h => (
                    <th key={h} className='px-5 py-3 text-[11px] uppercase font-bold text-gray-400 tracking-wider'>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-50'>
                {besoins.map(b => {
                  const isClickable = b.statut === 'EN_ATTENTE_DFC' || DETAIL_STATUTS.includes(b.statut)
                  return (
                    <tr
                      key={b.id}
                      onClick={(e) => handleRowClick(e, b)}
                      className={`transition-colors ${isClickable ? 'cursor-pointer hover:bg-gray-50/30' : ''}`}
                    >
                      <td className='px-5 py-4 font-mono text-xs text-red-600 font-medium'>{b.numero}</td>
                      <td className='px-5 py-4 text-sm text-gray-600 max-w-[180px] truncate'>{b.description}</td>
                      <td className='px-5 py-4 text-sm font-semibold text-gray-800 whitespace-nowrap'>
                        {fmt(getMontant(b))}
                      </td>
                      <td className='px-5 py-4'>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${STATUT_STYLE[b.statut] ?? ''}`}>
                          {STATUT_LABEL[b.statut] ?? b.statut}
                        </span>
                      </td>
                      <td className='px-5 py-4 text-gray-400 text-xs whitespace-nowrap'>{fmtDateTime(b.created_at)}</td>
                      <td className='px-5 py-4'>
                        {b.statut === 'EN_ATTENTE_DFC'
                          ? <span className='text-red-600 hover:text-red-800 font-bold text-xs uppercase'>Modifier</span>
                          : DETAIL_STATUTS.includes(b.statut)
                            ? <span className='text-gray-500 font-bold text-xs uppercase'>Voir →</span>
                            : <span className='text-gray-300 text-xs'>—</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal édition */}
      {showEdit && selected && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4'>
          <div className='bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-lg'>
            <div className='w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden' />
            <h3 className='text-lg font-black text-gray-800 mb-1'>Modifier le dossier</h3>
            <p className='text-[10px] font-mono text-red-500 mb-6 uppercase tracking-widest'>{selected.numero}</p>
            <form onSubmit={handleEdit} className='space-y-4'>
              <div>
                <label className='block text-[10px] font-bold text-gray-400 uppercase mb-1'>Titre</label>
                <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}
                  rows={3} className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500/20 outline-none resize-none' required />
              </div>
              <div>
                <label className='block text-[10px] font-bold text-gray-400 uppercase mb-1'>Montant demandée (FCFA)</label>
                <input type='number' value={editForm.montant} onChange={e => setEditForm({...editForm, montant: e.target.value})}
                  className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500/20 outline-none font-bold' required />
              </div>
              <div>
                <label className='block text-[10px] font-bold text-gray-400 uppercase mb-1'>Détails</label>
                <textarea value={editForm.justification} onChange={e => setEditForm({...editForm, justification: e.target.value})}
                  rows={3} className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500/20 outline-none resize-none' required />
              </div>
              {error && <div className='p-3 bg-red-50 text-red-600 text-[11px] font-bold rounded-lg border border-red-100'>{error}</div>}
              <div className='flex gap-3 pt-4 pb-6 sm:pb-0'>
                <button type='submit' disabled={saving}
                  className='flex-1 bg-red-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50'>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button type='button' onClick={() => setShowEdit(false)}
                  className='flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm hover:bg-gray-200'>
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