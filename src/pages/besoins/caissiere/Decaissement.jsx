import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import CaissiereLayout from '@/components/besoins/caissiere/CaissiereLayout'

export default function Decaissement() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [besoin, setBesoin]               = useState(null)
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')
  const [success, setSuccess]             = useState('')
  const [confirmAction, setConfirmAction] = useState(null) // 'decaisser' | 'retour'

  // Formulaire de décaissement
  const [montantDecaisse, setMontantDecaisse]                 = useState('')
  const [justificationSiInferieur, setJustificationSiInferieur] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('besoins')
        .select(`
          *,
          profiles!employe_id(nom, prenom, email,
            entreprises(nom, code),
            departements(nom, code)
          ),
          validations_dfc(montant_valide, commentaire, statut, created_at,
            profiles!dfc_id(nom, prenom)
          ),
          validations_dg(montant_valide, mode_decaissement, caisse_id, virement_id, created_at,
            profiles!dg_id(nom, prenom),
            caisses(nom),
            virements(nom)
          ),
          decaissements(id, montant_decaisse, justification_si_inferieur, created_at,
            profiles!caissiere_id(nom, prenom),
            justificatifs(id, numero_facture, montant_facture, document_url,
              retours_caisse(id, montant_retour, date_confirmation,
                profiles!confirme_par_caissiere_id(nom, prenom)
              )
            )
          )
        `)
        .eq('id', id)
        .single()

      if (data) {
        setBesoin(data)
        // Pré-remplir le montant avec le montant validé par le DG
        const vdg = data.validations_dg?.[0]
        if (vdg && data.statut === 'VALIDE_DG') {
          setMontantDecaisse(vdg.montant_valide?.toString() ?? '')
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  const validationDG   = besoin?.validations_dg?.[0]
  const validationDFC  = besoin?.validations_dfc?.[besoin.validations_dfc.length - 1]
  const decaissement   = besoin?.decaissements?.[0]
  // retours_caisse est imbriqué : besoins → decaissements → justificatifs → retours_caisse
  const retourCaisse   = decaissement?.justificatifs?.[0]?.retours_caisse?.[0]
  const montantValide  = validationDG?.montant_valide ?? 0
  const employe        = besoin?.profiles

  const peutDecaisser        = besoin?.statut === 'VALIDE_DG'
  const peutConfirmerRetour  = besoin?.statut === 'EN_ATTENTE_RETOUR_CAISSE'
  const montantInferieur     = montantDecaisse && Number(montantDecaisse) < Number(montantValide)

  // Effectuer le décaissement
  const handleDecaisser = async () => {
    setError('')
    const montant = Number(montantDecaisse)

    // Validation côté client
    if (!montant || montant <= 0) {
      setError('Veuillez saisir un montant valide.')
      setConfirmAction(null)
      return
    }
    if (montant > Number(montantValide)) {
      setError(`Le montant décaissé ne peut pas dépasser le montant validé (${Number(montantValide).toLocaleString('fr-FR')} FCFA).`)
      setConfirmAction(null)
      return
    }
    if (montant < Number(montantValide) && !justificationSiInferieur.trim()) {
      setError('Veuillez justifier pourquoi le montant décaissé est inférieur au montant validé.')
      setConfirmAction(null)
      return
    }

    setSaving(true)

    // 1. Insérer le décaissement
    const { error: errInsert } = await supabase
      .from('decaissements')
      .insert({
        besoin_id:                id,
        caissiere_id:             user.id,
        montant_decaisse:         montant,
        justification_si_inferieur: montant < Number(montantValide)
          ? justificationSiInferieur.trim()
          : null,
      })

    if (errInsert) {
      setSaving(false)
      setConfirmAction(null)
      setError(errInsert.message)
      return
    }

    // 2. Mettre à jour le statut du besoin
    const { error: errUpdate } = await supabase
      .from('besoins')
      .update({ statut: 'DECAISSE' })
      .eq('id', id)

    setSaving(false)
    setConfirmAction(null)

    if (errUpdate) {
      setError(errUpdate.message)
      return
    }

    setSuccess('Décaissement enregistré avec succès.')
    setTimeout(() => navigate('/caissiere'), 1800)
  }

  // Confirmer le retour en caisse
  const handleConfirmerRetour = async () => {
    setError('')
    setSaving(true)

    // Calculer le montant du retour : montant_decaisse - montant_facture
    // Le retour_caisse a déjà le montant_retour calculé par l'agent justif
    const justificatifId = decaissement?.justificatifs?.[0]?.id
    const { data: retourData } = await supabase
      .from('retours_caisse')
      .select('id, montant_retour')
      .eq('justificatif_id', justificatifId)
      .is('date_confirmation', null)
      .single()

    if (!retourData) {
      // S'il n'y a pas encore de retour_caisse créé, on met juste à jour le statut
      const { error: errUpdate } = await supabase
        .from('besoins')
        .update({ statut: 'BOUCLE' })
        .eq('id', id)

      setSaving(false)
      setConfirmAction(null)
      if (errUpdate) { setError(errUpdate.message); return }
      setSuccess('Retour en caisse confirmé — besoin bouclé.')
      setTimeout(() => navigate('/caissiere'), 1800)
      return
    }

    // Confirmer le retour
    const { error: errRetour } = await supabase
      .from('retours_caisse')
      .update({
        confirme_par_caissiere_id: user.id,
        date_confirmation:        new Date().toISOString(),
      })
      .eq('id', retourData.id)

    if (errRetour) {
      setSaving(false)
      setConfirmAction(null)
      setError(errRetour.message)
      return
    }

    // Mettre le besoin en BOUCLE
    const { error: errUpdate } = await supabase
      .from('besoins')
      .update({ statut: 'BOUCLE' })
      .eq('id', id)

    setSaving(false)
    setConfirmAction(null)

    if (errUpdate) { setError(errUpdate.message); return }

    setSuccess('Retour en caisse confirmé — besoin bouclé.')
    setTimeout(() => navigate('/caissiere'), 1800)
  }

  if (loading) {
    return (
      <CaissiereLayout>
        <p className="text-gray-400 text-center py-20">Chargement...</p>
      </CaissiereLayout>
    )
  }

  if (!besoin) {
    return (
      <CaissiereLayout>
        <p className="text-red-500 text-center py-20">Besoin introuvable.</p>
      </CaissiereLayout>
    )
  }

  return (
    <CaissiereLayout>
      {/* En-tête */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/caissiere')}
          className="text-teal-600 hover:underline text-sm"
        >
          ← Retour
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 font-mono">{besoin.numero}</h1>
          <p className="text-xs text-gray-400">
            Soumis le {new Date(besoin.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${
          besoin.statut === 'VALIDE_DG'                ? 'bg-green-100 text-green-700' :
          besoin.statut === 'DECAISSE'                 ? 'bg-purple-100 text-purple-700' :
          besoin.statut === 'EN_ATTENTE_RETOUR_CAISSE' ? 'bg-amber-100 text-amber-700' :
          besoin.statut === 'BOUCLE'                   ? 'bg-gray-100 text-gray-500' : ''
        }`}>
          {besoin.statut.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* Colonne gauche : infos du besoin (lecture seule) */}
        <div className="col-span-1 space-y-4">
          {/* Demandeur */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
              Demandeur
            </h2>
            <p className="text-gray-800 font-medium">{employe?.prenom} {employe?.nom}</p>
            <p className="text-gray-500 text-sm">{employe?.email}</p>
            <p className="text-gray-500 text-sm mt-1">
              {employe?.entreprises?.nom} — {employe?.departements?.nom}
            </p>
          </div>

          {/* Montants */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
              Montants
            </h2>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-400">Montant demandé</p>
                <p className="text-lg font-bold text-gray-600">
                  {Number(besoin.montant_demande).toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              {validationDFC && (
                <div>
                  <p className="text-xs text-gray-400">Montant validé DFC</p>
                  <p className="text-lg font-bold text-indigo-600">
                    {Number(validationDFC.montant_valide).toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Montant validé DG (à décaisser)</p>
                <p className="text-2xl font-bold text-green-700">
                  {Number(montantValide).toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>
          </div>

          {/* Mode de décaissement */}
          {validationDG && (
            <div className="bg-teal-50 rounded-xl p-5 border border-teal-100">
              <h2 className="font-semibold text-teal-700 mb-2 text-sm uppercase tracking-wide">
                Mode de décaissement
              </h2>
              <p className="text-sm text-teal-600">
                Mode : <strong className="capitalize">{validationDG.mode_decaissement}</strong>
              </p>
              {validationDG.caisses && (
                <p className="text-sm text-teal-600">
                  Caisse : <strong>{validationDG.caisses.nom}</strong>
                </p>
              )}
              {validationDG.virements && (
                <p className="text-sm text-teal-600">
                  Virement : <strong>{validationDG.virements.nom}</strong>
                </p>
              )}
              <p className="text-xs text-teal-500 mt-1">
                Validé par {validationDG.profiles?.prenom} {validationDG.profiles?.nom}
              </p>
            </div>
          )}

          {/* Description et justification */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">
              Description
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">{besoin.description}</p>
            {besoin.justification && (
              <>
                <h3 className="font-semibold text-gray-700 mt-3 mb-1 text-sm uppercase tracking-wide">
                  Justification
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{besoin.justification}</p>
              </>
            )}
          </div>

          {/* Décaissement déjà effectué (lecture seule) */}
          {decaissement && (
            <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
              <h2 className="font-semibold text-purple-700 mb-2 text-sm uppercase tracking-wide">
                Décaissement effectué
              </h2>
              <p className="text-sm text-purple-600">
                Montant : <strong>{Number(decaissement.montant_decaisse).toLocaleString('fr-FR')} FCFA</strong>
              </p>
              {decaissement.justification_si_inferieur && (
                <p className="text-sm text-purple-600 mt-1">
                  Justification : {decaissement.justification_si_inferieur}
                </p>
              )}
              <p className="text-xs text-purple-500 mt-1">
                Par {decaissement.profiles?.prenom} {decaissement.profiles?.nom} le{' '}
                {new Date(decaissement.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          )}
        </div>

        {/* Colonne droite : formulaire d'action */}
        <div className="col-span-2 space-y-4">

          {/* Formulaire de décaissement (si VALIDE_DG) */}
          {peutDecaisser && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">
                Effectuer le décaissement
              </h2>

              <div className="space-y-4">
                {/* Montant à décaisser */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant à décaisser (FCFA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={montantDecaisse}
                    onChange={e => setMontantDecaisse(e.target.value)}
                    min="1"
                    max={montantValide}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Maximum autorisé : {Number(montantValide).toLocaleString('fr-FR')} FCFA
                  </p>

                  {/* Alerte si montant inférieur */}
                  {montantInferieur && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-700 font-medium mb-1">
                        Le montant est inférieur au montant validé. Justification obligatoire :
                      </p>
                    </div>
                  )}
                </div>

                {/* Justification si montant inférieur */}
                {montantInferieur && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Justification du montant inférieur <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={justificationSiInferieur}
                      onChange={e => setJustificationSiInferieur(e.target.value)}
                      rows={3}
                      placeholder="Expliquez pourquoi le montant décaissé est inférieur au montant validé..."
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    />
                  </div>
                )}

                {/* Récapitulatif */}
                {montantDecaisse && Number(montantDecaisse) > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Récapitulatif</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-gray-500">Montant validé DG :</p>
                      <p className="text-gray-700 font-medium">{Number(montantValide).toLocaleString('fr-FR')} FCFA</p>
                      <p className="text-gray-500">Montant à décaisser :</p>
                      <p className="text-gray-700 font-medium">{Number(montantDecaisse).toLocaleString('fr-FR')} FCFA</p>
                      {montantInferieur && (
                        <>
                          <p className="text-gray-500">Différence :</p>
                          <p className="text-amber-600 font-medium">
                            {(Number(montantValide) - Number(montantDecaisse)).toLocaleString('fr-FR')} FCFA
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p className="mt-4 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              {success && (
                <p className="mt-4 text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  {success}
                </p>
              )}

              {/* Bouton décaisser */}
              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setConfirmAction('decaisser')}
                  disabled={saving || !montantDecaisse || Number(montantDecaisse) <= 0}
                  className="px-5 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium"
                >
                  Effectuer le décaissement
                </button>
              </div>
            </div>
          )}

          {/* Confirmation retour en caisse (si EN_ATTENTE_RETOUR_CAISSE) */}
          {peutConfirmerRetour && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">
                Retour en caisse attendu
              </h2>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800">
                  Un retour en caisse est attendu pour ce besoin. Le montant de la facture est inférieur
                  au montant décaissé. Confirmez la réception du reliquat.
                </p>
                {decaissement && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <p className="text-amber-700">Montant décaissé :</p>
                    <p className="text-amber-800 font-medium">
                      {Number(decaissement.montant_decaisse).toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <p className="mt-4 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              {success && (
                <p className="mt-4 text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  {success}
                </p>
              )}

              <div className="flex gap-3 mt-4 pt-4 border-t">
                <button
                  onClick={() => setConfirmAction('retour')}
                  disabled={saving}
                  className="px-5 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium"
                >
                  Confirmer la réception du retour en caisse
                </button>
              </div>
            </div>
          )}

          {/* Détail en lecture seule (si DECAISSE ou BOUCLE) */}
          {(besoin.statut === 'DECAISSE' || besoin.statut === 'BOUCLE') && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">
                Détail du besoin (lecture seule)
              </h2>
              <p className="text-gray-500 text-sm">
                Ce besoin a été {besoin.statut === 'BOUCLE' ? 'bouclé' : 'décaissé'}.
                Aucune modification n'est possible.
              </p>

              {retourCaisse && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-green-700 mb-2">Retour en caisse</h3>
                  <p className="text-sm text-green-600">
                    Montant retourné : <strong>{Number(retourCaisse.montant_retour).toLocaleString('fr-FR')} FCFA</strong>
                  </p>
                  {retourCaisse.date_confirmation && (
                    <p className="text-xs text-green-500 mt-1">
                      Confirmé le {new Date(retourCaisse.date_confirmation).toLocaleDateString('fr-FR')}
                      {retourCaisse.profiles && ` par ${retourCaisse.profiles.prenom} ${retourCaisse.profiles.nom}`}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Historique des étapes */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">
              Historique des étapes
            </h2>
            <div className="space-y-3">
              {/* Création */}
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm text-gray-700 font-medium">Besoin créé</p>
                  <p className="text-xs text-gray-400">
                    {new Date(besoin.created_at).toLocaleDateString('fr-FR')} — {employe?.prenom} {employe?.nom}
                  </p>
                </div>
              </div>

              {/* Validation DFC */}
              {validationDFC && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700 font-medium">
                      Validé par DFC — {Number(validationDFC.montant_valide).toLocaleString('fr-FR')} FCFA
                    </p>
                    {validationDFC.commentaire && (
                      <p className="text-xs text-gray-500">{validationDFC.commentaire}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(validationDFC.created_at).toLocaleDateString('fr-FR')} — {validationDFC.profiles?.prenom} {validationDFC.profiles?.nom}
                    </p>
                  </div>
                </div>
              )}

              {/* Validation DG */}
              {validationDG && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700 font-medium">
                      Validé par DG — {Number(validationDG.montant_valide).toLocaleString('fr-FR')} FCFA ({validationDG.mode_decaissement})
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(validationDG.created_at).toLocaleDateString('fr-FR')} — {validationDG.profiles?.prenom} {validationDG.profiles?.nom}
                    </p>
                  </div>
                </div>
              )}

              {/* Décaissement */}
              {decaissement && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700 font-medium">
                      Décaissé — {Number(decaissement.montant_decaisse).toLocaleString('fr-FR')} FCFA
                    </p>
                    {decaissement.justification_si_inferieur && (
                      <p className="text-xs text-gray-500">
                        Justification : {decaissement.justification_si_inferieur}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(decaissement.created_at).toLocaleDateString('fr-FR')} — {decaissement.profiles?.prenom} {decaissement.profiles?.nom}
                    </p>
                  </div>
                </div>
              )}

              {/* Retour en caisse */}
              {retourCaisse?.date_confirmation && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700 font-medium">
                      Retour en caisse confirmé — {Number(retourCaisse.montant_retour).toLocaleString('fr-FR')} FCFA
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(retourCaisse.date_confirmation).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmation */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2">
              {confirmAction === 'decaisser'
                ? 'Confirmer le décaissement'
                : 'Confirmer le retour en caisse'}
            </h3>
            <p className="text-gray-600 text-sm mb-1">Besoin : <strong>{besoin.numero}</strong></p>

            {confirmAction === 'decaisser' && (
              <>
                <p className="text-gray-600 text-sm mb-1">
                  Montant à décaisser : <strong>{Number(montantDecaisse).toLocaleString('fr-FR')} FCFA</strong>
                </p>
                {montantInferieur && (
                  <p className="text-amber-600 text-sm mb-1">
                    Montant inférieur au validé ({Number(montantValide).toLocaleString('fr-FR')} FCFA)
                  </p>
                )}
                <p className="text-gray-500 text-xs mt-2 mb-4">
                  Cette action est irréversible. Vous ne pourrez plus modifier ce décaissement.
                </p>
              </>
            )}
            {confirmAction === 'retour' && (
              <p className="text-gray-600 text-sm mb-4">
                Vous confirmez avoir reçu le retour en caisse. Le besoin sera marqué comme bouclé.
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmAction === 'decaisser' ? handleDecaisser : handleConfirmerRetour}
                disabled={saving}
                className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 font-medium ${
                  confirmAction === 'decaisser'
                    ? 'bg-teal-600 hover:bg-teal-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {saving ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </CaissiereLayout>
  )
}