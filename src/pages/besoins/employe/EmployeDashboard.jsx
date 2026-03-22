import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import EmployeLayout from '@/components/besoins/employe/EmployeLayout'

// ── Constantes statut ────────────────────────────────────────────────────────
const STATUT_STYLE = {
  EN_ATTENTE_DFC:          'bg-amber-100 text-amber-700',
  EN_ATTENTE_DG:           'bg-red-100 text-red-700',
  VALIDE_DG:               'bg-green-100 text-green-700',
  REJETE_DFC:              'bg-red-100 text-red-700',
  REJETE_DG:               'bg-red-100 text-red-700',
  DECAISSE:                'bg-purple-100 text-purple-700',
  EN_ATTENTE_RETOUR_CAISSE:'bg-orange-100 text-orange-700',
  BOUCLE:                  'bg-gray-100 text-gray-700',
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

// Statuts ouvrant une page détail
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

// Montant à afficher selon statut
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

// Filtre → statuts correspondants
const FILTRE_STATUTS = {
  EN_ATTENTE: ['EN_ATTENTE_DFC','EN_ATTENTE_DG','VALIDE_DG','EN_ATTENTE_RETOUR_CAISSE'],
  DECAISSE:   ['DECAISSE'],
  BOUCLE:     ['BOUCLE'],
  REJETE:     ['REJETE_DFC','REJETE_DG'],
}

export default function EmployeDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [besoins, setBesoins]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [filtre, setFiltre]       = useState(null)   // null = pas de filtre actif
  const [showEdit, setShowEdit]   = useState(false)
  const [selected, setSelected]   = useState(null)
  const [editForm, setEditForm]   = useState({ description: '', montant: '', justification: '' })
  const [editError, setEditError] = useState('')
  const [saving, setSaving]       = useState(false)

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
    if (data) setBesoins(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    enAttente: besoins.filter(b => FILTRE_STATUTS.EN_ATTENTE.includes(b.statut)).length,
    decaisse:  besoins.filter(b => b.statut === 'DECAISSE').length,
    boucle:    besoins.filter(b => b.statut === 'BOUCLE').length,
    rejete:    besoins.filter(b => ['REJETE_DFC','REJETE_DG'].includes(b.statut)).length,
  }

  const accord = (n, mot) => n > 1 ? mot + 's' : mot

  // ── Données affichées ─────────────────────────────────────────────────────
  // Sans filtre → 5 derniers. Avec filtre → tous les besoins du filtre
  const besoinsFiltres = filtre
    ? besoins.filter(b => FILTRE_STATUTS[filtre].includes(b.statut))
    : besoins.slice(0, 5)

  // ── Interactions ──────────────────────────────────────────────────────────
  const openEdit = (b) => {
    setSelected(b)
    setEditForm({ description: b.description, montant: b.montant_demande, justification: b.justification ?? '' })
    setEditError('')
    setShowEdit(true)
  }

  const handleRowClick = (e, b) => {
    if (window.getSelection()?.toString()) return  // ignore text selection
    if (b.statut === 'EN_ATTENTE_DFC') { openEdit(b); return }
    if (DETAIL_STATUTS.includes(b.statut)) navigate(`/besoins/employe/besoin/${b.id}`)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setEditError('')
    if (!editForm.description.trim() || !editForm.montant || Number(editForm.montant) <= 0 || !editForm.justification.trim()) {
      setEditError('Veuillez remplir tous les champs correctement.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('besoins')
      .update({ description: editForm.description.trim(), montant_demande: parseFloat(editForm.montant), justification: editForm.justification.trim() })
      .eq('id', selected.id).eq('statut', 'EN_ATTENTE_DFC')
    setSaving(false)
    if (error) { setEditError(error.message); return }
    setShowEdit(false)
    load()
  }

  const handleCardClick = (key) => setFiltre(prev => prev === key ? null : key)

  return (
    <EmployeLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">
        Bonjour, {profile?.prenom} {profile?.nom} 👋
      </h1>
      <div className="flex flex-col mb-8 gap-0.5">
        <div className="flex flex-wrap items-center gap-x-2">
          <span className="text-base font-semibold text-gray-700">{profile?.entreprises?.nom ?? '—'}</span>
          <span className="text-gray-300">•</span>
          <span className="text-base text-gray-500">{profile?.departements?.nom ?? '—'}</span>
        </div>
        {profile?.services?.nom && (
          <span className="text-lg text-red-800">
            Responsable <span className="font-semibold text-red-800">{profile.services.nom}</span>
          </span>
        )}
      </div>

      {/* ── Cartes stats cliquables ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            key: 'EN_ATTENTE', value: stats.enAttente,
            label: accord(stats.enAttente, 'Validé') + '/En attente',
            color: 'amber', border: 'border-amber-500',
          },
          {
            key: 'DECAISSE', value: stats.decaisse,
            label: accord(stats.decaisse, 'Décaissé'),
            color: 'purple', border: 'border-purple-500',
          },
          {
            key: 'BOUCLE', value: stats.boucle,
            label: accord(stats.boucle, 'Bouclé'),
            color: 'green', border: 'border-green-500',
          },
          {
            key: 'REJETE', value: stats.rejete,
            label: accord(stats.rejete, 'Rejeté'),
            color: 'red', border: 'border-red-500',
          },
        ].map(card => (
          <div
            key={card.key}
            onClick={() => handleCardClick(card.key)}
            className={`bg-white rounded-xl shadow p-5 cursor-pointer border-2 transition-all select-none
              ${filtre === card.key ? card.border : 'border-transparent hover:border-gray-200'}`}
          >
            <p className="text-3xl font-bold text-gray-800">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tableau besoins ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-gray-700">
              {filtre === 'EN_ATTENTE' ? (besoinsFiltres.length > 1 ? 'Besoins validés/en attente' : 'Besoin validé/en attente') : filtre === 'DECAISSE' ? (besoinsFiltres.length > 1 ? 'Besoins décaissés' : 'Besoin décaissé') : filtre === 'BOUCLE' ? (besoinsFiltres.length > 1 ? 'Besoins bouclés' : 'Besoin bouclé') : filtre === 'REJETE' ? (besoinsFiltres.length > 1 ? 'Besoins rejetés' : 'Besoin rejeté') : 'Derniers besoins'}
            </h2>
            {filtre && (
              <button onClick={() => setFiltre(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">
                Voir tout
              </button>
            )}
          </div>
          <Link to="/besoins/employe/mes-besoins" className="text-sm text-red-600 hover:underline">
            Voir tout →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-3 border-gray-200 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : besoinsFiltres.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm mb-4">
              {filtre ? 'Aucun besoin dans cette catégorie.' : "Vous n'avez pas encore de besoins."}
            </p>
            {!filtre && (
              <Link to="/besoins/employe/creer-besoin" className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">
                Créer mon premier besoin
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Numéro','Montant','Statut','Date & Heure','Action'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {besoinsFiltres.map(b => {
                  const isClickable = b.statut === 'EN_ATTENTE_DFC' || DETAIL_STATUTS.includes(b.statut)
                  return (
                    <tr
                      key={b.id}
                      onClick={(e) => handleRowClick(e, b)}
                      className={`border-b transition-colors ${isClickable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-red-600">{b.numero}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                        {fmt(getMontant(b))}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUT_STYLE[b.statut] ?? ''}`}>
                          {STATUT_LABEL[b.statut] ?? b.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {fmtDateTime(b.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {b.statut === 'EN_ATTENTE_DFC'
                          ? <span className="text-red-600 font-bold text-xs uppercase">Modifier</span>
                          : DETAIL_STATUTS.includes(b.statut)
                            ? <span className="text-gray-500 font-bold text-xs uppercase">Voir →</span>
                            : <span className="text-gray-300 text-xs">—</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal édition ───────────────────────────────────────────────── */}
      {showEdit && selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden" />
            <h3 className="text-lg font-black text-gray-800 mb-1">Modifier le dossier</h3>
            <p className="text-[10px] font-mono text-red-500 mb-6 uppercase tracking-widest">{selected.numero}</p>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Titre</label>
                <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}
                  rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500/20 outline-none resize-none" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Montant demandée (FCFA)</label>
                <input type="number" value={editForm.montant} onChange={e => setEditForm({...editForm, montant: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500/20 outline-none font-bold" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Détails</label>
                <textarea value={editForm.justification} onChange={e => setEditForm({...editForm, justification: e.target.value})}
                  rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500/20 outline-none resize-none" required />
              </div>
              {editError && <div className="p-3 bg-red-50 text-red-600 text-[11px] font-bold rounded-lg border border-red-100">{editError}</div>}
              <div className="flex gap-3 pt-4 pb-6 sm:pb-0">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button type="button" onClick={() => setShowEdit(false)}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm hover:bg-gray-200">
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