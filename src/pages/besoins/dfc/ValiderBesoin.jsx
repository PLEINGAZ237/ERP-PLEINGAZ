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

  const [form, setForm] = useState({ description: '', montant_valide: '', commentaire: '' })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('besoins')
        .select(`*, profiles!employe_id(nom, prenom, email, entreprises(nom), departements(nom)), validations_dfc(montant_valide, commentaire, statut)`)
        .eq('id', id).single()

      if (data) {
        setBesoin(data)
        const derVal = data.validations_dfc?.[data.validations_dfc.length - 1]
        setForm({
          description: data.description,
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
    
    let res;
    if (action === 'reactiver') {
      res = await supabase.from('besoins').update({ statut: 'EN_ATTENTE_DFC' }).eq('id', id)
    } else {
      res = await supabase.rpc('valider_besoin_dfc', {
        p_besoin_id: id,
        p_action: action === 'valide' ? 'valide' : 'rejete',
        p_montant_valide: action === 'valide' ? parseFloat(form.montant_valide) : null,
        p_commentaire: form.commentaire,
        p_description: form.description
      })
    }

    setSaving(false); setConfirmAction(null)
    if (res.error) { setError(res.error.message); return }
    setSuccess(action === 'reactiver' ? 'Besoin réactivé.' : 'Action enregistrée.')
    setTimeout(() => navigate('/besoins/dfc'), 1500)
  }

  // Nouvelle fonction pour mettre à jour un besoin déjà envoyé au DG
  const handleUpdate = async () => {
    setError(''); setSaving(true)
    try {
      // Mise à jour de la table besoins (description) et de la table validations_dfc (montant/commentaire)
      const { error: err1 } = await supabase.from('besoins').update({ description: form.description }).eq('id', id)
      if (err1) throw err1

      const { error: err2 } = await supabase.from('validations_dfc')
        .update({ 
          montant_valide: parseFloat(form.montant_valide), 
          commentaire: form.commentaire 
        })
        .eq('besoin_id', id)
      
      if (err2) throw err2

      setSuccess('Mise à jour réussie.')
      setTimeout(() => navigate('/dfc'), 1500)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <DFCLayout><p className="text-center py-20">Chargement...</p></DFCLayout>
  if (!besoin) return <DFCLayout><p className="text-center py-20 text-red-500">Introuvable.</p></DFCLayout>

  return (
    <DFCLayout>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/besoins/dfc')} className="text-indigo-600 hover:underline text-sm font-medium">← Retour</button>
        <h1 className="text-xl font-bold text-gray-800">{besoin.numero}</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${besoin.statut === 'REJETE_DFC' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
          {besoin.statut.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase mb-2">Demandeur</h2>
            <p className="font-medium">{besoin.profiles?.prenom} {besoin.profiles?.nom}</p>
            <p className="text-sm text-gray-500">{besoin.profiles?.departements?.nom}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase mb-2">Montant Demandé</h2>
            <p className="text-2xl font-bold">{Number(besoin.montant_demande).toLocaleString('fr-FR')} FCFA</p>
          </div>
        </div>

        <div className="col-span-2 bg-white rounded-xl shadow p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea 
                value={form.description} 
                onChange={e => setForm({...form, description: e.target.value})} 
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                rows={3} 
                disabled={besoin.statut === 'REJETE_DFC' || (besoin.statut !== 'EN_ATTENTE_DFC' && besoin.statut !== 'EN_ATTENTE_DG')} 
              />
            </div>
            {besoin.statut !== 'REJETE_DFC' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant à valider</label>
                  <input 
                    type="number" 
                    value={form.montant_valide} 
                    onChange={e => setForm({...form, montant_valide: e.target.value})} 
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    disabled={besoin.statut !== 'EN_ATTENTE_DFC' && besoin.statut !== 'EN_ATTENTE_DG'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
                  <textarea 
                    value={form.commentaire} 
                    onChange={e => setForm({...form, commentaire: e.target.value})} 
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                    rows={2}
                    disabled={besoin.statut !== 'EN_ATTENTE_DFC' && besoin.statut !== 'EN_ATTENTE_DG'}
                  />
                </div>
              </>
            )}
          </div>

          {(error || success) && <p className={`mt-4 p-2 text-xs rounded ${error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{error || success}</p>}

          <div className="flex gap-3 mt-6 pt-4 border-t">
            {besoin.statut === 'EN_ATTENTE_DFC' && (
              <>
                <button onClick={() => setConfirmAction('valide')} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow-sm">Valider</button>
                <button onClick={() => setConfirmAction('rejete')} className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow-sm">Rejeter</button>
              </>
            )}

            {/* Bouton de mise à jour si le besoin est chez le DG */}
            {besoin.statut === 'EN_ATTENTE_DG' && (
              <button 
                onClick={handleUpdate} 
                disabled={saving}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Mise à jour...' : 'Mettre à jour la validation'}
              </button>
            )}

            {besoin.statut === 'REJETE_DFC' && (
              <button onClick={() => setConfirmAction('reactiver')} className="w-full py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm">Réactiver ce besoin</button>
            )}
          </div>
        </div>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-bold mb-4">Confirmer l'action ?</h3>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors">Annuler</button>
              <button onClick={() => handleAction(confirmAction)} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </DFCLayout>
  )
}