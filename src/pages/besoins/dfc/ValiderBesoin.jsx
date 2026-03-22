import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import DFCLayout from '@/components/besoins/dfc/DFCLayout'
import ChaineValidation from '@/components/besoins/ChaineValidation'
import { Loader2, ArrowLeft } from 'lucide-react'

const STATUT_STYLE = {
  EN_ATTENTE_DFC: 'bg-amber-100 text-amber-700',
  EN_ATTENTE_DG:  'bg-blue-100 text-blue-700',
  REJETE_DFC:     'bg-red-100 text-red-700',
  VALIDE_DG:      'bg-emerald-100 text-emerald-700',
  REJETE_DG:      'bg-red-200 text-red-900',
  DECAISSE:       'bg-purple-100 text-purple-700',
}
const STATUT_LABEL = {
  EN_ATTENTE_DFC: 'En attente DFC',
  EN_ATTENTE_DG: 'En attente DG',
  REJETE_DFC: 'Rejeté DFC',
  VALIDE_DG: 'Validé DG',
  REJETE_DG: 'Rejeté DG',
  DECAISSE: 'Décaissé',
}

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
          commentaire: derVal?.commentaire ?? ''
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
        p_besoin_id: id,
        p_action: action === 'valide' ? 'valide' : 'rejete',
        p_montant_valide: action === 'valide' ? parseFloat(form.montant_valide) : null,
        p_commentaire: form.commentaire,
        p_description: besoin.description
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
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return <DFCLayout><div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="animate-spin" /></div></DFCLayout>
  if (!besoin) return <DFCLayout><p className="text-center py-20 text-red-500">Besoin introuvable.</p></DFCLayout>

  const derValDfc = besoin.validations_dfc?.[besoin.validations_dfc.length - 1]
  const derValDg = besoin.validations_dg?.[besoin.validations_dg.length - 1]
  const s = besoin.statut
  const fmtM = (n) => Number(n).toLocaleString('fr-FR') + ' FCFA'

  const ReadOnly = ({ label, value, rows = 2 }) => (
    <div>
      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{label}</label>
      <div className="w-full border border-gray-100 rounded-lg p-3 text-sm bg-gray-50 text-gray-500 whitespace-pre-wrap">{value || '(aucun)'}</div>
    </div>
  )

  return (
    <DFCLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <button onClick={() => navigate('/besoins/dfc')} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-sm font-medium w-fit">
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg md:text-xl font-bold text-gray-800">{besoin.numero}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUT_STYLE[s] ?? 'bg-gray-100 text-gray-500'}`}>
            {STATUT_LABEL[s] ?? s.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Colonne gauche */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase mb-3">Demandeur</h2>
            <p className="font-medium text-gray-800">{besoin.profiles?.prenom} {besoin.profiles?.nom}</p>
            <p className="text-sm text-gray-500 mt-1">{besoin.profiles?.departements?.nom ?? '—'}</p>
            <p className="text-xs text-gray-400 mt-0.5">{besoin.profiles?.email}</p>
            <p className="text-xs text-gray-400">{besoin.profiles?.entreprises?.nom ?? '—'}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase mb-1">Montant demandé</h2>
            <p className="text-xl md:text-2xl font-bold text-gray-800">{fmtM(besoin.montant_demande)}</p>
          </div>

          {(s === 'EN_ATTENTE_DG' || s === 'VALIDE_DG' || s === 'REJETE_DG') && derValDfc?.montant_valide && (
            <div className="bg-white rounded-xl shadow-sm border-l-4 border-emerald-400 p-4 md:p-5">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase mb-1">Montant validé DFC</h2>
              <p className="text-lg md:text-xl font-bold text-emerald-700">{fmtM(derValDfc.montant_valide)}</p>
            </div>
          )}

          {s === 'VALIDE_DG' && derValDg?.montant_valide && (
            <div className="bg-white rounded-xl shadow-sm border-l-4 border-blue-400 p-4 md:p-5">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase mb-1">Montant validé DG</h2>
              <p className="text-lg md:text-xl font-bold text-blue-700">{fmtM(derValDg.montant_valide)}</p>
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
          <div className="space-y-4">
            <ReadOnly label="Description" value={besoin.description} />
            <ReadOnly label="Justification du demandeur" value={besoin.justification} />

            {/* EN_ATTENTE_DFC */}
            {s === 'EN_ATTENTE_DFC' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Montant à valider</label>
                  <input type="number" value={form.montant_valide} onChange={e => setForm({ ...form, montant_valide: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Commentaire DFC</label>
                  <textarea value={form.commentaire} onChange={e => setForm({ ...form, commentaire: e.target.value })} rows={2}
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                </div>
              </>
            )}

            {/* EN_ATTENTE_DG */}
            {s === 'EN_ATTENTE_DG' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Montant validé</label>
                  <input type="number" value={form.montant_valide} onChange={e => setForm({ ...form, montant_valide: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Commentaire DFC</label>
                  <textarea value={form.commentaire} onChange={e => setForm({ ...form, commentaire: e.target.value })} rows={2}
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                </div>
                {derValDg?.commentaire && <ReadOnly label="Commentaire DG" value={derValDg.commentaire} />}
              </>
            )}

            {/* VALIDE_DG */}
            {s === 'VALIDE_DG' && (
              <>
                {derValDfc?.commentaire && <ReadOnly label="Commentaire DFC" value={derValDfc.commentaire} />}
                {derValDg?.commentaire && <ReadOnly label="Commentaire DG" value={derValDg.commentaire} />}
              </>
            )}

            {/* REJETE_DFC */}
            {s === 'REJETE_DFC' && <ReadOnly label="Motif de rejet DFC" value={derValDfc?.commentaire} />}

            {/* REJETE_DG */}
            {s === 'REJETE_DG' && (
              <>
                {derValDfc?.commentaire && <ReadOnly label="Commentaire DFC" value={derValDfc.commentaire} />}
                <ReadOnly label="Motif de rejet DG" value={derValDg?.commentaire} />
              </>
            )}
          </div>

          {/* Messages */}
          {(error || success) && (
            <div className={`mt-4 p-3 text-sm rounded-xl ${error ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
              {error || success}
            </div>
          )}

          {/* Boutons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t">
            {s === 'EN_ATTENTE_DFC' && (
              <>
                <button onClick={() => setConfirmAction('valide')}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors">
                  Valider
                </button>
                <button onClick={() => {
                    if (!form.commentaire.trim()) {
                      setError('Le commentaire est obligatoire en cas de rejet.')
                      return
                    }
                    setConfirmAction('rejete')
                  }}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-red-700 transition-colors">
                  Rejeter
                </button>
              </>
            )}
            {s === 'EN_ATTENTE_DG' && (
              <button onClick={handleUpdate} disabled={saving}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {saving ? 'Mise à jour...' : 'Mettre à jour la validation'}
              </button>
            )}
            {/* {s === 'REJETE_DFC' && (
              <button onClick={() => setConfirmAction('reactiver')}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors">
                Réactiver ce besoin
              </button>
            )} */}
          </div>
        </div>
      </div>

      {/* Circuit de validation complet */}
      <ChaineValidation besoinId={id} />

      {/* Modal confirmation — bottom sheet mobile, centered desktop */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center z-50" onClick={() => setConfirmAction(null)}>
          <div className="bg-white w-full md:max-w-sm md:rounded-xl rounded-t-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-2">Confirmer l'action ?</h3>
            {/* <p className="text-sm text-gray-500 mb-5">
              {confirmAction === 'valide' ? 'Valider ce besoin et le transmettre au DG.' :
               confirmAction === 'rejete' ? 'Rejeter ce besoin.' :
               'Réactiver ce besoin pour un nouveau traitement.'}
            </p> */}
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 font-medium transition-colors">Annuler</button>
              <button onClick={() => handleAction(confirmAction)} disabled={saving}
                className={`flex-1 py-2.5 text-sm text-white rounded-lg font-bold transition-colors disabled:opacity-50 ${
                  confirmAction === 'rejete' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}>
                {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DFCLayout>
  )
}