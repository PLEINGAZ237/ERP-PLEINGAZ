import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import DGLayout from '@/components/besoins/dg/DGLayout'

export default function ValiderBesoinDG() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [besoin, setBesoin]       = useState(null)
  const [caisses, setCaisses]     = useState([])
  const [virements, setVirements] = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const [confirmAction, setConfirmAction] = useState(null)

  // Snapshots calculés après chargement
  const [derniereVdfc, setDerniereVdfc] = useState(null)
  const [derniereVdg,  setDerniereVdg]  = useState(null)

  const [form, setForm] = useState({
    montant_valide:    '',
    mode_decaissement: 'caisse',
    caisse_id:         '',
    virement_id:       '',
    commentaire:       '',
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: b }, { data: c }, { data: v }] = await Promise.all([
        supabase
          .from('besoins')
          .select(`
            *,
            profiles!employe_id(nom, prenom, email,
              entreprises(nom, code),
              departements(nom)
            ),
            validations_dfc(
              montant_valide, commentaire, statut, created_at,
              profiles!dfc_id(nom, prenom)
            ),
            validations_dg(
              montant_valide, mode_decaissement, caisse_id, virement_id,
              commentaire, action, created_at,
              caisses(nom), virements(nom),
              profiles!dg_id(nom, prenom)
            )
          `)
          .eq('id', id)
          .single(),
        supabase.from('caisses').select('id, nom').eq('statut', 'actif').order('nom'),
        supabase.from('virements').select('id, nom').eq('statut', 'actif').order('nom'),
      ])
      if (b) {
        setBesoin(b)
        // Dernière validation DFC (statut = 'valide')
        const vdfcList = b.validations_dfc?.filter(v => v.statut === 'valide') ?? []
        const lastVdfc = vdfcList[vdfcList.length - 1] ?? null
        setDerniereVdfc(lastVdfc)
        // Dernière décision DG (quelle que soit l'action)
        const vdgList = b.validations_dg ?? []
        const lastVdg = vdgList[vdgList.length - 1] ?? null
        setDerniereVdg(lastVdg)
        // Pré-remplir le formulaire
        setForm({
          montant_valide:    lastVdg?.montant_valide    ?? lastVdfc?.montant_valide ?? b.montant_demande,
          mode_decaissement: lastVdg?.mode_decaissement ?? 'caisse',
          caisse_id:         lastVdg?.caisse_id         ?? '',
          virement_id:       lastVdg?.virement_id       ?? '',
          commentaire:       lastVdg?.commentaire       ?? '',
        })
      }
      setCaisses(c || [])
      setVirements(v || [])
      setLoading(false)
    }
    load()
  }, [id])

  const peutAgir    = besoin?.statut === 'EN_ATTENTE_DG' || besoin?.statut === 'VALIDE_DG'
  const peutStatuer = besoin?.statut === 'EN_ATTENTE_DG'

  const validateForm = () => {
    if (!form.montant_valide || Number(form.montant_valide) <= 0)
      return 'Veuillez saisir le montant à valider.'
    if (form.mode_decaissement === 'caisse'   && !form.caisse_id)
      return 'Veuillez sélectionner une caisse.'
    if (form.mode_decaissement === 'virement' && !form.virement_id)
      return 'Veuillez sélectionner un virement.'
    return null
  }

  const buildParams = (action) => ({
    p_besoin_id:         id,
    p_action:            action,
    p_montant_valide:    action !== 'rejete' ? parseFloat(form.montant_valide) : null,
    p_mode_decaissement: action !== 'rejete' ? form.mode_decaissement : null,
    p_caisse_id:         action !== 'rejete' && form.mode_decaissement === 'caisse'
                           ? (form.caisse_id   || null) : null,
    p_virement_id:       action !== 'rejete' && form.mode_decaissement === 'virement'
                           ? (form.virement_id || null) : null,
    p_commentaire:       form.commentaire || null,
  })

  const handleSaveOnly = async () => {
    const err = validateForm()
    if (err) { setError(err); return }
    setError('')
    setSaving(true)
    const { error: rpcErr } = await supabase.rpc('valider_besoin_dg', buildParams('modifier'))
    setSaving(false)
    if (rpcErr) { setError(rpcErr.message); return }
    setSuccess('Modifications enregistrées.')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleAction = async (action) => {
    setError('')
    if (action === 'valide') {
      const err = validateForm()
      if (err) { setError(err); setConfirmAction(null); return }
    }
    setSaving(true)
    const { error: rpcErr } = await supabase.rpc('valider_besoin_dg', buildParams(action))
    setSaving(false)
    setConfirmAction(null)
    if (rpcErr) { setError(rpcErr.message); return }
    setSuccess(action === 'valide' ? 'Besoin validé.' : 'Besoin rejeté.')
    setTimeout(() => navigate('/besoins/dg'), 1800)
  }

  if (loading) return <DGLayout><p className="text-gray-400 text-center py-20">Chargement...</p></DGLayout>
  if (!besoin)  return <DGLayout><p className="text-red-500 text-center py-20">Besoin introuvable.</p></DGLayout>

  const employe     = besoin.profiles
  const caisseSel   = caisses.find(c => c.id === form.caisse_id)
  const virementSel = virements.find(v => v.id === form.virement_id)

  return (
    <DGLayout>
      {/* En-tête */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/besoins/dg')} className="text-emerald-600 hover:underline text-sm">
          ← Retour
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 font-mono">{besoin.numero}</h1>
          <p className="text-xs text-gray-400">
            Soumis le {new Date(besoin.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${
          besoin.statut === 'EN_ATTENTE_DG' ? 'bg-blue-100 text-blue-700' :
          besoin.statut === 'VALIDE_DG'     ? 'bg-emerald-100 text-emerald-700' : ''
        }`}>
          {besoin.statut.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Colonne gauche */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Demandeur</h2>
            <p className="text-gray-800 font-medium">{employe?.prenom} {employe?.nom}</p>
            <p className="text-gray-500 text-sm">{employe?.email}</p>
            <p className="text-gray-500 text-sm mt-1">
              {employe?.entreprises?.nom} — {employe?.departements?.nom}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Montants</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400">Demandé par l'employé</p>
                <p className="text-lg font-bold text-gray-600">
                  {Number(besoin.montant_demande).toLocaleString('fr-FR')}
                  <span className="text-sm font-normal text-gray-400 ml-1">FCFA</span>
                </p>
              </div>
              {derniereVdfc && (
                <div>
                  <p className="text-xs text-gray-400">Validé par le DFC</p>
                  <p className="text-lg font-bold text-indigo-700">
                    {Number(derniereVdfc.montant_valide).toLocaleString('fr-FR')}
                    <span className="text-sm font-normal text-indigo-400 ml-1">FCFA</span>
                  </p>
                  {derniereVdfc.commentaire && (
                    <p className="text-xs text-gray-400 mt-1 italic">{derniereVdfc.commentaire}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {besoin.justification && (
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">Detail du Besoin</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{besoin.justification}</p>
            </div>
          )}

          {derniereVdg && (
            <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
              <h2 className="font-semibold text-emerald-700 mb-2 text-sm uppercase tracking-wide">
                Ma décision finale
              </h2>
              <p className="text-sm text-emerald-700">
                Montant : <strong>{Number(derniereVdg.montant_valide).toLocaleString('fr-FR')} FCFA</strong>
              </p>
              <p className="text-sm text-emerald-700">
                Via : <strong>
                  {derniereVdg.mode_decaissement === 'caisse'
                    ? `Caisse — ${derniereVdg.caisses?.nom ?? ''}`
                    : `Virement — ${derniereVdg.virements?.nom ?? ''}`}
                </strong>
              </p>
              {derniereVdg.commentaire && (
                <p className="text-sm text-emerald-600 mt-1 italic">{derniereVdg.commentaire}</p>
              )}
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">Description</h2>
            <p className="text-gray-600 text-sm">{besoin.description}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold text-gray-700 mb-5 text-sm uppercase tracking-wide">
              {peutAgir ? 'Décision du Directeur Général' : 'Détail (lecture seule)'}
            </h2>

            <div className="space-y-5">
              {/* Montant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant décidé (FCFA)
                  {peutStatuer && <span className="text-red-500 ml-1">*</span>}
                  {besoin.statut === 'VALIDE_DG' && (
                    <span className="ml-2 text-xs text-emerald-500 font-normal">(modifiable)</span>
                  )}
                </label>
                <input
                  type="number"
                  value={form.montant_valide}
                  onChange={e => setForm({ ...form, montant_valide: e.target.value })}
                  disabled={!peutAgir}
                  min="1"
                  placeholder={`Suggestion DFC : ${Number(derniereVdfc?.montant_valide ?? besoin.montant_demande).toLocaleString('fr-FR')} FCFA`}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50"
                />
                {form.montant_valide && derniereVdfc?.montant_valide &&
                  Number(form.montant_valide) !== Number(derniereVdfc.montant_valide) && (
                  <p className="text-xs text-amber-600 mt-1">
                    Différent du montant DFC ({Number(derniereVdfc.montant_valide).toLocaleString('fr-FR')} FCFA)
                  </p>
                )}
              </div>

              {/* Mode de décaissement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mode de décaissement
                  {peutStatuer && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="flex gap-6 mb-3">
                  {['caisse', 'virement'].map(mode => (
                    <label key={mode}
                      className={`flex items-center gap-2 text-sm cursor-pointer ${!peutAgir ? 'opacity-50' : ''}`}>
                      <input
                        type="radio"
                        name="mode_decaissement"
                        value={mode}
                        checked={form.mode_decaissement === mode}
                        onChange={() => setForm({ ...form, mode_decaissement: mode, caisse_id: '', virement_id: '' })}
                        disabled={!peutAgir}
                      />
                      <span className="font-medium">
                        {mode === 'caisse' ? 'Caisse' : 'Virement bancaire'}
                      </span>
                    </label>
                  ))}
                </div>

                {form.mode_decaissement === 'caisse' && (
                  <>
                    <select
                      value={form.caisse_id}
                      onChange={e => setForm({ ...form, caisse_id: e.target.value })}
                      disabled={!peutAgir}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50"
                    >
                      <option value="">— Sélectionner une caisse —</option>
                      {caisses.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                    {peutAgir && caisses.length === 0 && (
                      <p className="text-xs text-orange-500 mt-1">⚠ Aucune caisse active configurée.</p>
                    )}
                  </>
                )}

                {form.mode_decaissement === 'virement' && (
                  <>
                    <select
                      value={form.virement_id}
                      onChange={e => setForm({ ...form, virement_id: e.target.value })}
                      disabled={!peutAgir}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50"
                    >
                      <option value="">— Sélectionner un virement —</option>
                      {virements.map(v => <option key={v.id} value={v.id}>{v.nom}</option>)}
                    </select>
                    {peutAgir && virements.length === 0 && (
                      <p className="text-xs text-orange-500 mt-1">⚠ Aucun virement actif configuré.</p>
                    )}
                  </>
                )}
              </div>

              {/* Commentaire */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire DG</label>
                <textarea
                  value={form.commentaire}
                  onChange={e => setForm({ ...form, commentaire: e.target.value })}
                  rows={2}
                  disabled={!peutAgir}
                  placeholder="Observations, instructions particulières..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none disabled:bg-gray-50"
                />
              </div>
            </div>

            {error   && <p className="mt-4 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            {success && <p className="mt-4 text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>}

            {peutAgir && (
              <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
                {besoin.statut === 'VALIDE_DG' && (
                  <button onClick={handleSaveOnly} disabled={saving}
                    className="px-4 py-2 text-sm border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 disabled:opacity-50">
                    {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                  </button>
                )}
                {peutStatuer && (
                  <>
                    <button onClick={() => setConfirmAction('valide')} disabled={saving}
                      className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium">
                      ✓ Valider — transmettre à la caissière
                    </button>
                    <button onClick={() => setConfirmAction('rejete')} disabled={saving}
                      className="px-5 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium">
                      ✗ Rejeter
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal confirmation */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2">
              {confirmAction === 'valide' ? 'Confirmer la validation' : 'Confirmer le rejet'}
            </h3>
            <p className="text-gray-600 text-sm mb-1">Besoin : <strong>{besoin.numero}</strong></p>
            {confirmAction === 'valide' && (
              <>
                <p className="text-gray-600 text-sm">
                  Montant : <strong>{Number(form.montant_valide).toLocaleString('fr-FR')} FCFA</strong>
                </p>
                <p className="text-gray-600 text-sm mb-4">
                  Via : <strong>
                    {form.mode_decaissement === 'caisse'
                      ? `Caisse — ${caisseSel?.nom ?? ''}`
                      : `Virement — ${virementSel?.nom ?? ''}`}
                  </strong>
                </p>
              </>
            )}
            {confirmAction === 'rejete' && (
              <p className="text-gray-600 text-sm mb-4">
                L'employé et le DFC seront notifiés du rejet.
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={() => handleAction(confirmAction)} disabled={saving}
                className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 font-medium ${
                  confirmAction === 'valide' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}>
                {saving ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DGLayout>
  )
}