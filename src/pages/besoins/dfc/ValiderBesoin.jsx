import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import DFCLayout from '@/components/besoins/dfc/DFCLayout'

export default function ValiderBesoin() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [besoin, setBesoin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)

  const [form, setForm] = useState({ montant_valide: '', commentaire: '' })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('besoins')
        .select(`
          *,
          profiles!employe_id(nom, prenom, email, entreprises(nom), departements(nom)),
          validations_dfc(montant_valide, commentaire, statut),
          validations_dg(montant_valide, commentaire, action)
        `)
        .eq('id', id).single()

      if (data) {
        setBesoin(data)
        const derVal = data.validations_dfc?.[data.validations_dfc.length - 1]
        setForm({
          montant_valide: derVal?.montant_valide ?? data.montant_demande,
          commentaire:    derVal?.commentaire ?? ''
        })
      }
      setLoading(false)
    }
    load()
  }, [id])

  const handleAction = async (action) => {
    setError(''); setSaving(true)
    let res
    if (action === 'reactiver') {
      res = await supabase.from('besoins').update({ statut: 'EN_ATTENTE_DFC' }).eq('id', id)
    } else {
      res = await supabase.rpc('valider_besoin_dfc', {
        p_besoin_id:      id,
        p_action:         action === 'valide' ? 'valide' : 'rejete',
        p_montant_valide: action === 'valide' ? parseFloat(form.montant_valide) : null,
        p_commentaire:    form.commentaire,
        p_description:    besoin.description
      })
    }
    setSaving(false); setConfirmAction(null)
    if (res.error) { setError(res.error.message); return }
    setSuccess(action === 'reactiver' ? 'Besoin réactivé.' : 'Action enregistrée.')
    setTimeout(() => navigate('/besoins/dfc'), 1500)
  }

  const handleUpdate = async () => {
    setError(''); setSaving(true)
    try {
      const { error: err } = await supabase.from('validations_dfc')
        .update({ montant_valide: parseFloat(form.montant_valide), commentaire: form.commentaire })
        .eq('besoin_id', id)
      if (err) throw err
      setSuccess('Mise à jour réussie.')
      setTimeout(() => navigate('/besoins/dfc'), 1500)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <DFCLayout><p className="text-center py-20">Chargement...</p></DFCLayout>
  if (!besoin) return <DFCLayout><p className="text-center py-20 text-red-500">Introuvable.</p></DFCLayout>

  const derValDfc = besoin.validations_dfc?.[besoin.validations_dfc.length - 1]
  const derValDg  = besoin.validations_dg?.[besoin.validations_dg.length - 1]
  const s = besoin.statut
  const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' FCFA'

  // Champ lecture seule réutilisable
  const ReadOnly = ({ label, value, rows = 2 }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value || '(aucun)'}
        className="w-full border rounded-lg p-2 text-sm bg-gray-50 text-gray-500 outline-none resize-none"
        rows={rows}
        disabled
      />
    </div>
  )

  return (
    <DFCLayout>
      {/* ─── Header ─── */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/besoins/dfc')} className="text-indigo-600 hover:underline text-sm font-medium">← Retour</button>
        <h1 className="text-xl font-bold text-gray-800">{besoin.numero}</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          s === 'REJETE_DFC' || s === 'REJETE_DG' ? 'bg-red-100 text-red-700' :
          s === 'EN_ATTENTE_DG'                   ? 'bg-blue-100 text-blue-700' :
          s === 'VALIDE_DG'                        ? 'bg-green-100 text-green-700' :
          'bg-amber-100 text-amber-700'
        }`}>
          {s.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* ─── Colonne gauche ─── */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase mb-3">Demandeur</h2>
            <p className="font-medium text-gray-800">{besoin.profiles?.prenom} {besoin.profiles?.nom}</p>
            <p className="text-sm text-gray-500 mt-1">{besoin.profiles?.departements?.nom ?? '—'}</p>
            <p className="text-xs text-gray-400 mt-0.5">{besoin.profiles?.entreprises?.nom ?? '—'}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase mb-1">Montant demandé</h2>
            <p className="text-2xl font-bold text-gray-800">{fmt(besoin.montant_demande)}</p>
          </div>

          {/* Montant validé DFC */}
          {(s === 'EN_ATTENTE_DG' || s === 'VALIDE_DG' || s === 'REJETE_DG') && derValDfc?.montant_valide && (
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-indigo-400">
              <h2 className="text-xs font-bold text-gray-400 uppercase mb-1">Montant validé DFC</h2>
              <p className="text-xl font-bold text-indigo-700">{fmt(derValDfc.montant_valide)}</p>
            </div>
          )}

          {/* Montant validé DG */}
          {s === 'VALIDE_DG' && derValDg?.montant_valide && (
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-400">
              <h2 className="text-xs font-bold text-gray-400 uppercase mb-1">Montant validé DG</h2>
              <p className="text-xl font-bold text-green-700">{fmt(derValDg.montant_valide)}</p>
            </div>
          )}
        </div>

        {/* ─── Colonne droite ─── */}
        <div className="col-span-2 bg-white rounded-xl shadow p-6">
          <div className="space-y-4">

            {/* Description — jamais modifiable */}
            <ReadOnly label="Description" value={besoin.description} rows={3} />

            {/* Justification du demandeur — toujours visible, jamais modifiable */}
            <ReadOnly label="Justification du demandeur" value={besoin.justification} rows={2} />

            {/* ══ EN_ATTENTE_DFC ══ */}
            {s === 'EN_ATTENTE_DFC' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant à valider</label>
                  <input
                    type="number"
                    value={form.montant_valide}
                    onChange={e => setForm({ ...form, montant_valide: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire DFC</label>
                  <textarea
                    value={form.commentaire}
                    onChange={e => setForm({ ...form, commentaire: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    rows={2}
                  />
                </div>
              </>
            )}

            {/* ══ EN_ATTENTE_DG ══ */}
            {s === 'EN_ATTENTE_DG' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant à valider</label>
                  <input
                    type="number"
                    value={form.montant_valide}
                    onChange={e => setForm({ ...form, montant_valide: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire DFC</label>
                  <textarea
                    value={form.commentaire}
                    onChange={e => setForm({ ...form, commentaire: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    rows={2}
                  />
                </div>
                {derValDg?.commentaire && <ReadOnly label="Commentaire DG" value={derValDg.commentaire} />}
              </>
            )}

            {/* ══ VALIDE_DG ══ */}
            {s === 'VALIDE_DG' && (
              <>
                {derValDfc?.commentaire && <ReadOnly label="Commentaire DFC" value={derValDfc.commentaire} />}
                {derValDg?.commentaire  && <ReadOnly label="Commentaire DG"  value={derValDg.commentaire} />}
              </>
            )}

            {/* ══ REJETE_DFC ══ */}
            {s === 'REJETE_DFC' && (
              <ReadOnly label="Motif de rejet DFC" value={derValDfc?.commentaire} />
            )}

            {/* ══ REJETE_DG ══ */}
            {s === 'REJETE_DG' && (
              <>
                {derValDfc?.commentaire && <ReadOnly label="Commentaire DFC" value={derValDfc.commentaire} />}
                <ReadOnly label="Motif de rejet DG" value={derValDg?.commentaire} />
              </>
            )}

          </div>

          {/* Messages */}
          {(error || success) && (
            <p className={`mt-4 p-2 text-xs rounded ${error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
              {error || success}
            </p>
          )}

          {/* ─── Boutons d'action ─── */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            {s === 'EN_ATTENTE_DFC' && (
              <>
                <button onClick={() => setConfirmAction('valide')}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-green-700">
                  Valider
                </button>
                <button onClick={() => setConfirmAction('rejete')}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-red-700">
                  Rejeter
                </button>
              </>
            )}
            {s === 'EN_ATTENTE_DG' && (
              <button onClick={handleUpdate} disabled={saving}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Mise à jour...' : 'Mettre à jour la validation'}
              </button>
            )}
            {s === 'REJETE_DFC' && (
              <button onClick={() => setConfirmAction('reactiver')}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700">
                Réactiver ce besoin
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Modal confirmation ─── */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-bold mb-4">Confirmer l'action ?</h3>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Annuler</button>
              <button onClick={() => handleAction(confirmAction)} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </DFCLayout>
  )
}