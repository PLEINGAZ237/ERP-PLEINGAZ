import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import JustifLayout from '@/components/besoins/justif/JustifLayout'

export default function SaisirJustificatif() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  const [besoin, setBesoin]               = useState(null)
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [error, setError]                 = useState('')
  const [success, setSuccess]             = useState('')
  const [confirmAction, setConfirmAction] = useState(null) // 'transferer'

  // Formulaire
  const [numeroFacture, setNumeroFacture] = useState('')
  const [montantFacture, setMontantFacture] = useState('')
  const [fichier, setFichier]               = useState(null)
  const [fichierNom, setFichierNom]         = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
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
            justificatifs(id, numero_facture, montant_facture, document_url, created_at,
              profiles!agent_id(nom, prenom),
              retours_caisse(id, montant_retour, date_confirmation,
                profiles!confirme_par_caissiere_id(nom, prenom)
              )
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) console.error('Erreur chargement besoin:', error)
      if (data) setBesoin(data)
      setLoading(false)
    }
    load()
  }, [id])

  const validationDFC  = besoin?.validations_dfc?.[besoin.validations_dfc.length - 1]
  const validationDG   = besoin?.validations_dg?.[0]
  const decaissement   = besoin?.decaissements?.[0]
  const justificatif   = decaissement?.justificatifs?.[0]
  const retourCaisse   = justificatif?.retours_caisse?.[0]
  const employe        = besoin?.profiles
  const montantDecaisse = decaissement?.montant_decaisse ?? 0

  const peutSaisir      = besoin?.statut === 'DECAISSE' && !justificatif
  const dejaJustifie    = !!justificatif

  // Gestion du fichier
  const handleFichierChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Vérifier le type (PDF ou image)
    const typesAutorises = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!typesAutorises.includes(file.type)) {
      setError('Format non autorisé. Utilisez un PDF, JPG, PNG ou WebP.')
      return
    }

    // Vérifier la taille (max 10 Mo)
    if (file.size > 10 * 1024 * 1024) {
      setError('Le fichier ne doit pas dépasser 10 Mo.')
      return
    }

    setFichier(file)
    setFichierNom(file.name)
    setError('')
  }

  // Upload du fichier vers Supabase Storage
  const uploadFichier = async () => {
    if (!fichier) return null

    setUploading(true)
    const extension = fichier.name.split('.').pop()
    const nomFichier = `${id}_${Date.now()}.${extension}`
    const chemin = `justificatifs/${nomFichier}`

    const { error: errUpload } = await supabase.storage
      .from('justificatifs')
      .upload(chemin, fichier)

    setUploading(false)

    if (errUpload) {
      setError(`Erreur upload : ${errUpload.message}`)
      return null
    }

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from('justificatifs')
      .getPublicUrl(chemin)

    return urlData?.publicUrl ?? chemin
  }

  // Transférer à la comptabilité
  const handleTransferer = async () => {
    setError('')

    // Validations
    if (!numeroFacture.trim()) {
      setError('Veuillez saisir le numéro de facture.')
      setConfirmAction(null)
      return
    }
    const montant = Number(montantFacture)
    if (!montant || montant <= 0) {
      setError('Veuillez saisir un montant de facture valide.')
      setConfirmAction(null)
      return
    }
    if (montant > Number(montantDecaisse)) {
      setError(`Le montant de la facture ne peut pas dépasser le montant décaissé (${Number(montantDecaisse).toLocaleString('fr-FR')} FCFA).`)
      setConfirmAction(null)
      return
    }
    if (!fichier) {
      setError('Veuillez sélectionner un document justificatif (PDF ou image).')
      setConfirmAction(null)
      return
    }

    setSaving(true)

    // 1. Upload du fichier
    const documentUrl = await uploadFichier()
    if (!documentUrl) {
      setSaving(false)
      setConfirmAction(null)
      return
    }

    // 2. Insérer le justificatif
    const { error: errInsert } = await supabase
      .from('justificatifs')
      .insert({
        decaissement_id: decaissement.id,
        agent_id:        user.id,
        numero_facture:  numeroFacture.trim(),
        montant_facture: montant,
        document_url:    documentUrl,
      })

    if (errInsert) {
      setSaving(false)
      setConfirmAction(null)
      setError(errInsert.message)
      return
    }

    // 3. Déterminer le nouveau statut
    const reliquat = Number(montantDecaisse) - montant

    if (reliquat <= 0) {
      // Cas 1 : Montant facture = Montant décaissé → BOUCLE
      const { error: errUpdate } = await supabase
        .from('besoins')
        .update({ statut: 'BOUCLE' })
        .eq('id', id)

      setSaving(false)
      setConfirmAction(null)

      if (errUpdate) { setError(errUpdate.message); return }

      setSuccess('Justificatif enregistré — besoin bouclé.')
      setTimeout(() => navigate('/justif'), 1800)
    } else {
      // Cas 2 : Montant facture < Montant décaissé → retour en caisse
      // Créer l'enregistrement retour_caisse
      // Récupérer l'id du justificatif qu'on vient de créer
      const { data: justifData } = await supabase
        .from('justificatifs')
        .select('id')
        .eq('decaissement_id', decaissement.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (justifData) {
        await supabase
          .from('retours_caisse')
          .insert({
            justificatif_id: justifData.id,
            montant_retour:  reliquat,
          })
      }

      const { error: errUpdate } = await supabase
        .from('besoins')
        .update({ statut: 'EN_ATTENTE_RETOUR_CAISSE' })
        .eq('id', id)

      setSaving(false)
      setConfirmAction(null)

      if (errUpdate) { setError(errUpdate.message); return }

      setSuccess(
        `Justificatif enregistré — retour en caisse de ${reliquat.toLocaleString('fr-FR')} FCFA attendu.`
      )
      setTimeout(() => navigate('/justif'), 2500)
    }
  }

  if (loading) {
    return (
      <JustifLayout>
        <p className="text-gray-400 text-center py-20">Chargement...</p>
      </JustifLayout>
    )
  }

  if (!besoin) {
    return (
      <JustifLayout>
        <p className="text-red-500 text-center py-20">Besoin introuvable.</p>
      </JustifLayout>
    )
  }

  const reliquatPrevu = montantFacture && Number(montantFacture) > 0
    ? Number(montantDecaisse) - Number(montantFacture)
    : null

  return (
    <JustifLayout>
      {/* En-tête */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/justif')}
          className="text-orange-600 hover:underline text-sm"
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

          {/* Montants récapitulatifs */}
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
              {validationDG && (
                <div>
                  <p className="text-xs text-gray-400">Montant validé DG</p>
                  <p className="text-lg font-bold text-green-600">
                    {Number(validationDG.montant_valide).toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Montant décaissé</p>
                <p className="text-2xl font-bold text-purple-700">
                  {Number(montantDecaisse).toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              {decaissement?.justification_si_inferieur && (
                <p className="text-xs text-gray-500 italic">
                  Justification caissière : {decaissement.justification_si_inferieur}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">
              Description
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">{besoin.description}</p>
          </div>

          {/* Justificatif déjà saisi (lecture seule) */}
          {justificatif && (
            <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
              <h2 className="font-semibold text-orange-700 mb-2 text-sm uppercase tracking-wide">
                Justificatif saisi
              </h2>
              <p className="text-sm text-orange-600">
                N° facture : <strong>{justificatif.numero_facture}</strong>
              </p>
              <p className="text-sm text-orange-600">
                Montant facture : <strong>{Number(justificatif.montant_facture).toLocaleString('fr-FR')} FCFA</strong>
              </p>
              {justificatif.document_url && (
                <a
                  href={justificatif.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-orange-700 underline mt-2 inline-block"
                >
                  Voir le document
                </a>
              )}
              <p className="text-xs text-orange-500 mt-1">
                Par {justificatif.profiles?.prenom} {justificatif.profiles?.nom} le{' '}
                {new Date(justificatif.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          )}

          {/* Retour en caisse */}
          {retourCaisse && (
            <div className={`rounded-xl p-5 border ${
              retourCaisse.date_confirmation
                ? 'bg-green-50 border-green-100'
                : 'bg-amber-50 border-amber-100'
            }`}>
              <h2 className={`font-semibold mb-2 text-sm uppercase tracking-wide ${
                retourCaisse.date_confirmation ? 'text-green-700' : 'text-amber-700'
              }`}>
                Retour en caisse
              </h2>
              <p className={`text-sm ${retourCaisse.date_confirmation ? 'text-green-600' : 'text-amber-600'}`}>
                Montant : <strong>{Number(retourCaisse.montant_retour).toLocaleString('fr-FR')} FCFA</strong>
              </p>
              <p className={`text-sm ${retourCaisse.date_confirmation ? 'text-green-600' : 'text-amber-600'}`}>
                Statut : <strong>{retourCaisse.date_confirmation ? 'Confirmé' : 'En attente'}</strong>
              </p>
              {retourCaisse.date_confirmation && retourCaisse.profiles && (
                <p className="text-xs text-green-500 mt-1">
                  Confirmé le {new Date(retourCaisse.date_confirmation).toLocaleDateString('fr-FR')}
                  {' '}par {retourCaisse.profiles.prenom} {retourCaisse.profiles.nom}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div className="col-span-2 space-y-4">

          {/* Formulaire de saisie du justificatif (si DECAISSE et pas encore saisi) */}
          {peutSaisir && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">
                Saisir le justificatif
              </h2>

              <div className="space-y-4">
                {/* Numéro de facture */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de facture <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={numeroFacture}
                    onChange={e => setNumeroFacture(e.target.value)}
                    placeholder="Ex: FAC-2026-0042"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Montant de la facture */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant sur la facture (FCFA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={montantFacture}
                    onChange={e => setMontantFacture(e.target.value)}
                    min="1"
                    max={montantDecaisse}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Montant décaissé : {Number(montantDecaisse).toLocaleString('fr-FR')} FCFA
                  </p>

                  {/* Alerte reliquat */}
                  {reliquatPrevu !== null && reliquatPrevu > 0 && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-700 font-medium">
                        Reliquat détecté : {reliquatPrevu.toLocaleString('fr-FR')} FCFA
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        Un retour en caisse de ce montant sera automatiquement demandé à la caissière.
                      </p>
                    </div>
                  )}

                  {reliquatPrevu !== null && reliquatPrevu === 0 && Number(montantFacture) > 0 && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs text-green-700 font-medium">
                        Montant facture = Montant décaissé — le besoin sera automatiquement bouclé.
                      </p>
                    </div>
                  )}
                </div>

                {/* Upload document */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document justificatif (PDF ou image) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 text-sm border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50"
                    >
                      {fichierNom ? 'Changer le fichier' : 'Choisir un fichier'}
                    </button>
                    {fichierNom && (
                      <span className="text-sm text-gray-600 truncate max-w-xs">{fichierNom}</span>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFichierChange}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Formats acceptés : PDF, JPG, PNG, WebP. Taille max : 10 Mo.
                  </p>
                </div>

                {/* Récapitulatif */}
                {numeroFacture && montantFacture && fichier && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Récapitulatif</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-gray-500">N° facture :</p>
                      <p className="text-gray-700 font-medium">{numeroFacture}</p>
                      <p className="text-gray-500">Montant facture :</p>
                      <p className="text-gray-700 font-medium">{Number(montantFacture).toLocaleString('fr-FR')} FCFA</p>
                      <p className="text-gray-500">Montant décaissé :</p>
                      <p className="text-gray-700 font-medium">{Number(montantDecaisse).toLocaleString('fr-FR')} FCFA</p>
                      <p className="text-gray-500">Document :</p>
                      <p className="text-gray-700 font-medium truncate">{fichierNom}</p>
                      {reliquatPrevu > 0 && (
                        <>
                          <p className="text-gray-500">Reliquat (retour caisse) :</p>
                          <p className="text-amber-600 font-medium">{reliquatPrevu.toLocaleString('fr-FR')} FCFA</p>
                        </>
                      )}
                      <p className="text-gray-500">Résultat :</p>
                      <p className={`font-medium ${reliquatPrevu > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {reliquatPrevu > 0 ? 'Retour en caisse attendu' : 'Besoin bouclé'}
                      </p>
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

              {/* Bouton transférer */}
              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setConfirmAction('transferer')}
                  disabled={saving || uploading || !numeroFacture || !montantFacture || !fichier}
                  className="px-5 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
                >
                  {uploading ? 'Upload en cours...' : 'Transférer à la Comptabilité'}
                </button>
              </div>
            </div>
          )}

          {/* Détail en lecture seule si déjà justifié */}
          {dejaJustifie && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">
                Justificatif (lecture seule)
              </h2>
              <p className="text-gray-500 text-sm">
                Le justificatif a déjà été saisi pour ce besoin.
                {besoin.statut === 'BOUCLE' && ' Le besoin est bouclé.'}
                {besoin.statut === 'EN_ATTENTE_RETOUR_CAISSE' && ' Un retour en caisse est en attente de confirmation par la caissière.'}
              </p>
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

              {/* Justificatif */}
              {justificatif && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700 font-medium">
                      Justificatif saisi — Facture {justificatif.numero_facture} — {Number(justificatif.montant_facture).toLocaleString('fr-FR')} FCFA
                    </p>
                    {justificatif.document_url && (
                      <a
                        href={justificatif.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-orange-600 underline"
                      >
                        Voir le document
                      </a>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(justificatif.created_at).toLocaleDateString('fr-FR')} — {justificatif.profiles?.prenom} {justificatif.profiles?.nom}
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
                      {retourCaisse.profiles && ` — ${retourCaisse.profiles.prenom} ${retourCaisse.profiles.nom}`}
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
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-2">Confirmer le transfert</h3>
            <p className="text-gray-600 text-sm mb-1">Besoin : <strong>{besoin.numero}</strong></p>
            <p className="text-gray-600 text-sm mb-1">
              N° facture : <strong>{numeroFacture}</strong>
            </p>
            <p className="text-gray-600 text-sm mb-1">
              Montant facture : <strong>{Number(montantFacture).toLocaleString('fr-FR')} FCFA</strong>
            </p>
            <p className="text-gray-600 text-sm mb-1">
              Document : <strong>{fichierNom}</strong>
            </p>

            {reliquatPrevu > 0 && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700 font-medium">
                  Un retour en caisse de {reliquatPrevu.toLocaleString('fr-FR')} FCFA sera automatiquement demandé.
                </p>
              </div>
            )}
            {reliquatPrevu !== null && reliquatPrevu <= 0 && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-700 font-medium">
                  Le besoin sera automatiquement bouclé.
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleTransferer}
                disabled={saving || uploading}
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
              >
                {saving || uploading ? 'En cours...' : 'Transférer à la Comptabilité'}
              </button>
            </div>
          </div>
        </div>
      )}
    </JustifLayout>
  )
}