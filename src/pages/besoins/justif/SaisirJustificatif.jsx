import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import JustifLayout from '@/components/besoins/justif/JustifLayout'
import { Loader2, ArrowLeft, Upload, X, FileText, Image } from 'lucide-react'

const TYPES_AUTORISES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024

export default function SaisirJustificatif() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  const [besoin, setBesoin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)

  const [numeroFacture, setNumeroFacture] = useState('')
  const [montantFacture, setMontantFacture] = useState('')
  const [fichiers, setFichiers] = useState([]) // Array of File objects

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('besoins')
        .select(`
          *,
          profiles!employe_id(nom, prenom, email,
            entreprises(nom, code), departements(nom, code)
          ),
          validations_dfc(montant_valide, commentaire, statut, created_at,
            profiles!dfc_id(nom, prenom)
          ),
          validations_dg(montant_valide, mode_decaissement, caisse_id, virement_id, created_at,
            profiles!dg_id(nom, prenom), caisses(nom), virements(nom)
          ),
          decaissements(id, montant_decaisse, justification_si_inferieur, created_at,
            profiles!caissiere_id(nom, prenom),
            decaissement_documents(id, url, nom_fichier, created_at),
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
      if (data) setBesoin(data)
      setLoading(false)
    }
    load()
  }, [id])

  const validationDFC = besoin?.validations_dfc?.[besoin.validations_dfc.length - 1]
  const validationDG = besoin?.validations_dg?.[0]
  const decaissement = besoin?.decaissements?.[0]
  const justificatif = decaissement?.justificatifs?.[0]
  const retourCaisse = justificatif?.retours_caisse?.[0]
  const docsExistants = decaissement?.decaissement_documents ?? []
  const employe = besoin?.profiles
  const montantDecaisse = decaissement?.montant_decaisse ?? 0

  const peutSaisir = besoin?.statut === 'DECAISSE' && !justificatif
  const dejaJustifie = !!justificatif

  const reliquatPrevu = montantFacture && Number(montantFacture) > 0
    ? Number(montantDecaisse) - Number(montantFacture)
    : null

  // ── Multi-fichiers ──
  const handleFichiersChange = (e) => {
    const newFiles = Array.from(e.target.files || [])
    const errors = []

    for (const file of newFiles) {
      if (!TYPES_AUTORISES.includes(file.type)) {
        errors.push(`${file.name} : format non autorisé.`)
        continue
      }
      if (file.size > MAX_SIZE) {
        errors.push(`${file.name} : dépasse 10 Mo.`)
        continue
      }
    }

    if (errors.length > 0) {
      setError(errors.join(' '))
      return
    }

    setFichiers(prev => [...prev, ...newFiles])
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFichier = (idx) => {
    setFichiers(prev => prev.filter((_, i) => i !== idx))
  }

  const getFileIcon = (file) => {
    if (file.type === 'application/pdf') return <FileText size={14} className="text-red-500" />
    return <Image size={14} className="text-blue-500" />
  }

  // ── Upload tous les fichiers ──
  const uploadAllFichiers = async () => {
    const urls = []
    for (const fichier of fichiers) {
      const ext = fichier.name.split('.').pop()
      const nom = `${id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`
      const chemin = `justificatifs/${nom}`

      const { error: errUp } = await supabase.storage
        .from('justificatifs')
        .upload(chemin, fichier)
      if (errUp) return { error: `Upload de ${fichier.name} échoué : ${errUp.message}` }

      const { data: urlData } = supabase.storage.from('justificatifs').getPublicUrl(chemin)
      urls.push({ url: urlData?.publicUrl ?? chemin, nom_fichier: fichier.name })
    }
    return { urls }
  }

  // ── Transférer ──
  const handleTransferer = async () => {
    setError('')

    if (!numeroFacture.trim()) { setError('Veuillez saisir le numéro de facture.'); setConfirmAction(null); return }
    const montant = Number(montantFacture)
    if (!montant || montant <= 0) { setError('Montant de facture invalide.'); setConfirmAction(null); return }
    if (montant > Number(montantDecaisse)) {
      setError(`Le montant ne peut pas dépasser ${Number(montantDecaisse).toLocaleString('fr-FR')} FCFA.`)
      setConfirmAction(null); return
    }
    if (fichiers.length === 0) { setError('Veuillez ajouter au moins un document justificatif.'); setConfirmAction(null); return }

    setSaving(true)

    // 1. Upload fichiers
    const result = await uploadAllFichiers()
    if (result.error) { setSaving(false); setConfirmAction(null); setError(result.error); return }

    // 2. Insérer le justificatif (document_url = premier fichier pour compatibilité)
    const { error: errInsert } = await supabase.from('justificatifs').insert({
      decaissement_id: decaissement.id,
      agent_id: user.id,
      numero_facture: numeroFacture.trim(),
      montant_facture: montant,
      document_url: result.urls[0].url,
    })
    if (errInsert) { setSaving(false); setConfirmAction(null); setError(errInsert.message); return }

    // 3. Insérer tous les documents dans decaissement_documents
    const docRows = result.urls.map(u => ({
      decaissement_id: decaissement.id,
      uploaded_by: user.id,
      url: u.url,
      nom_fichier: u.nom_fichier,
    }))
    const { error: errDocs } = await supabase.from('decaissement_documents').insert(docRows)
    if (errDocs) console.error('Erreur insertion documents:', errDocs)

    // 4. Statut selon reliquat
    const reliquat = Number(montantDecaisse) - montant

    if (reliquat <= 0) {
      const { error: errUp } = await supabase.from('besoins').update({ statut: 'BOUCLE' }).eq('id', id)
      setSaving(false); setConfirmAction(null)
      if (errUp) { setError(errUp.message); return }
      setSuccess('Justificatif enregistré — besoin bouclé.')
      setTimeout(() => navigate('/besoins/justif'), 1800)
    } else {
      const { data: justifData } = await supabase
        .from('justificatifs').select('id')
        .eq('decaissement_id', decaissement.id)
        .order('created_at', { ascending: false }).limit(1).single()

      if (justifData) {
        await supabase.from('retours_caisse').insert({
          justificatif_id: justifData.id,
          montant_retour: reliquat,
        })
      }

      const { error: errUp } = await supabase.from('besoins').update({ statut: 'EN_ATTENTE_RETOUR_CAISSE' }).eq('id', id)
      setSaving(false); setConfirmAction(null)
      if (errUp) { setError(errUp.message); return }
      setSuccess(`Justificatif enregistré — retour en caisse de ${reliquat.toLocaleString('fr-FR')} FCFA attendu.`)
      setTimeout(() => navigate('/besoins/justif'), 2500)
    }
  }

  if (loading) return <JustifLayout><div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="animate-spin" /></div></JustifLayout>
  if (!besoin) return <JustifLayout><p className="text-center py-20 text-red-500">Besoin introuvable.</p></JustifLayout>

  return (
    <JustifLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <button onClick={() => navigate('/besoins/justif')}
          className="flex items-center gap-1 text-orange-600 hover:text-orange-700 text-sm font-medium w-fit">
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg md:text-xl font-bold text-gray-800 font-mono">{besoin.numero}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            besoin.statut === 'DECAISSE' ? 'bg-purple-100 text-purple-700' :
            besoin.statut === 'EN_ATTENTE_RETOUR_CAISSE' ? 'bg-amber-100 text-amber-700' :
            besoin.statut === 'BOUCLE' ? 'bg-gray-100 text-gray-500' : ''
          }`}>
            {besoin.statut.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* ── Colonne gauche ── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase mb-3">Demandeur</h2>
            <p className="font-medium text-gray-800">{employe?.prenom} {employe?.nom}</p>
            <p className="text-sm text-gray-500">{employe?.email}</p>
            <p className="text-xs text-gray-400 mt-1">{employe?.entreprises?.nom} — {employe?.departements?.nom}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 space-y-3">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase">Montants</h2>
            <div>
              <p className="text-[10px] text-gray-400">Montant demandé</p>
              <p className="text-lg font-bold text-gray-600">{Number(besoin.montant_demande).toLocaleString('fr-FR')} FCFA</p>
            </div>
            {validationDG && (
              <div>
                <p className="text-[10px] text-gray-400">Validé DG</p>
                <p className="text-lg font-bold text-green-600">{Number(validationDG.montant_valide).toLocaleString('fr-FR')} FCFA</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-gray-400">Décaissé</p>
              <p className="text-xl md:text-2xl font-bold text-purple-700">{Number(montantDecaisse).toLocaleString('fr-FR')} FCFA</p>
            </div>
            {decaissement?.justification_si_inferieur && (
              <p className="text-xs text-gray-500 italic">Justification : {decaissement.justification_si_inferieur}</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Description</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{besoin.description}</p>
          </div>

          {justificatif && (
            <div className="bg-orange-50 rounded-xl p-4 md:p-5 border border-orange-100">
              <h2 className="text-[10px] font-bold text-orange-700 uppercase mb-2">Justificatif saisi</h2>
              <p className="text-sm text-orange-600">N° : <strong>{justificatif.numero_facture}</strong></p>
              <p className="text-sm text-orange-600">Montant : <strong>{Number(justificatif.montant_facture).toLocaleString('fr-FR')} FCFA</strong></p>
              <p className="text-xs text-orange-500 mt-1">
                Par {justificatif.profiles?.prenom} {justificatif.profiles?.nom} le {new Date(justificatif.created_at).toLocaleDateString('fr-FR')}
              </p>
              {/* Afficher les documents uploadés */}
              {docsExistants.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-[10px] text-orange-600 font-bold uppercase">Documents ({docsExistants.length})</p>
                  {docsExistants.map(doc => (
                    <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-orange-700 underline">
                      <FileText size={12} /> {doc.nom_fichier || 'Document'}
                    </a>
                  ))}
                </div>
              )}
              {docsExistants.length === 0 && justificatif.document_url && (
                <a href={justificatif.document_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-orange-700 underline mt-2 inline-block">
                  Voir le document
                </a>
              )}
            </div>
          )}

          {retourCaisse && (
            <div className={`rounded-xl p-4 md:p-5 border ${
              retourCaisse.date_confirmation ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'
            }`}>
              <h2 className={`text-[10px] font-bold uppercase mb-2 ${
                retourCaisse.date_confirmation ? 'text-green-700' : 'text-amber-700'
              }`}>Retour en caisse</h2>
              <p className={`text-sm ${retourCaisse.date_confirmation ? 'text-green-600' : 'text-amber-600'}`}>
                Montant : <strong>{Number(retourCaisse.montant_retour).toLocaleString('fr-FR')} FCFA</strong>
              </p>
              <p className={`text-sm ${retourCaisse.date_confirmation ? 'text-green-600' : 'text-amber-600'}`}>
                {retourCaisse.date_confirmation ? 'Confirmé' : 'En attente'}
              </p>
              {retourCaisse.date_confirmation && retourCaisse.profiles && (
                <p className="text-xs text-green-500 mt-1">
                  {new Date(retourCaisse.date_confirmation).toLocaleDateString('fr-FR')} — {retourCaisse.profiles.prenom} {retourCaisse.profiles.nom}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Colonne droite ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Formulaire */}
          {peutSaisir && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
              <h2 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">Saisir le justificatif</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">N° de facture <span className="text-red-500">*</span></label>
                  <input type="text" value={numeroFacture} onChange={e => setNumeroFacture(e.target.value)}
                    placeholder="Ex: FAC-2026-0042"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Montant facture (FCFA) <span className="text-red-500">*</span></label>
                  <input type="number" value={montantFacture} onChange={e => setMontantFacture(e.target.value)}
                    min="1" max={montantDecaisse}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
                  <p className="text-[10px] text-gray-400 mt-1">Max : {Number(montantDecaisse).toLocaleString('fr-FR')} FCFA</p>

                  {reliquatPrevu !== null && reliquatPrevu > 0 && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-700 font-medium">Reliquat : {reliquatPrevu.toLocaleString('fr-FR')} FCFA</p>
                      <p className="text-[10px] text-amber-600 mt-0.5">Un retour en caisse sera automatiquement demandé.</p>
                    </div>
                  )}
                  {reliquatPrevu !== null && reliquatPrevu === 0 && Number(montantFacture) > 0 && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs text-green-700 font-medium">Montant exact — le besoin sera automatiquement bouclé.</p>
                    </div>
                  )}
                </div>

                {/* Multi-upload documents */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Documents justificatifs <span className="text-red-500">*</span>
                  </label>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-orange-200 rounded-xl p-6 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-colors"
                  >
                    <Upload size={24} className="mx-auto text-orange-400 mb-2" />
                    <p className="text-sm text-gray-600 font-medium">Cliquer pour ajouter des fichiers</p>
                    <p className="text-[10px] text-gray-400 mt-1">PDF, JPG, PNG, WebP — Max 10 Mo par fichier</p>
                  </div>

                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFichiersChange} className="hidden" />

                  {/* Liste des fichiers sélectionnés */}
                  {fichiers.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {fichiers.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                          {getFileIcon(f)}
                          <span className="text-sm text-gray-700 truncate flex-1">{f.name}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {(f.size / 1024 / 1024).toFixed(1)} Mo
                          </span>
                          <button type="button" onClick={() => removeFichier(idx)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded shrink-0">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <p className="text-[10px] text-gray-400">{fichiers.length} fichier{fichiers.length > 1 ? 's' : ''} sélectionné{fichiers.length > 1 ? 's' : ''}</p>
                    </div>
                  )}
                </div>

                {/* Récap */}
                {numeroFacture && montantFacture && fichiers.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Récapitulatif</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <p className="text-gray-500">N° facture :</p>
                      <p className="text-gray-700 font-medium">{numeroFacture}</p>
                      <p className="text-gray-500">Montant facture :</p>
                      <p className="text-gray-700 font-medium">{Number(montantFacture).toLocaleString('fr-FR')} FCFA</p>
                      <p className="text-gray-500">Décaissé :</p>
                      <p className="text-gray-700 font-medium">{Number(montantDecaisse).toLocaleString('fr-FR')} FCFA</p>
                      <p className="text-gray-500">Documents :</p>
                      <p className="text-gray-700 font-medium">{fichiers.length} fichier{fichiers.length > 1 ? 's' : ''}</p>
                      {reliquatPrevu > 0 && (
                        <>
                          <p className="text-gray-500">Retour caisse :</p>
                          <p className="text-amber-600 font-medium">{reliquatPrevu.toLocaleString('fr-FR')} FCFA</p>
                        </>
                      )}
                      <p className="text-gray-500">Résultat :</p>
                      <p className={`font-medium ${reliquatPrevu > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {reliquatPrevu > 0 ? 'Retour en caisse' : 'Besoin bouclé'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {error && <p className="mt-4 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
              {success && <p className="mt-4 text-green-700 text-sm bg-green-50 border border-green-100 rounded-xl px-3 py-2">{success}</p>}

              <div className="mt-6 pt-4 border-t">
                <button onClick={() => setConfirmAction('transferer')}
                  disabled={saving || !numeroFacture || !montantFacture || fichiers.length === 0}
                  className="w-full sm:w-auto px-6 py-3 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-bold transition-colors">
                  {saving ? 'Envoi en cours...' : 'Transférer à la Comptabilité'}
                </button>
              </div>
            </div>
          )}

          {/* Lecture seule si déjà justifié */}
          {dejaJustifie && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
              <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Justificatif (lecture seule)</h2>
              <p className="text-sm text-gray-500">
                Le justificatif a déjà été saisi.
                {besoin.statut === 'BOUCLE' && ' Le besoin est bouclé.'}
                {besoin.statut === 'EN_ATTENTE_RETOUR_CAISSE' && ' Un retour en caisse est en attente.'}
              </p>
            </div>
          )}

          {/* Historique */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
            <h2 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">Historique</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm text-gray-700 font-medium">Besoin créé</p>
                  <p className="text-xs text-gray-400">{new Date(besoin.created_at).toLocaleDateString('fr-FR')} — {employe?.prenom} {employe?.nom}</p>
                </div>
              </div>

              {validationDFC && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700 font-medium">Validé DFC — {Number(validationDFC.montant_valide).toLocaleString('fr-FR')} FCFA</p>
                    <p className="text-xs text-gray-400">{new Date(validationDFC.created_at).toLocaleDateString('fr-FR')} — {validationDFC.profiles?.prenom} {validationDFC.profiles?.nom}</p>
                  </div>
                </div>
              )}

              {validationDG && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700 font-medium">Validé DG — {Number(validationDG.montant_valide).toLocaleString('fr-FR')} FCFA ({validationDG.mode_decaissement})</p>
                    <p className="text-xs text-gray-400">{new Date(validationDG.created_at).toLocaleDateString('fr-FR')} — {validationDG.profiles?.prenom} {validationDG.profiles?.nom}</p>
                  </div>
                </div>
              )}

              {decaissement && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700 font-medium">Décaissé — {Number(decaissement.montant_decaisse).toLocaleString('fr-FR')} FCFA</p>
                    {decaissement.justification_si_inferieur && <p className="text-xs text-gray-500">{decaissement.justification_si_inferieur}</p>}
                    <p className="text-xs text-gray-400">{new Date(decaissement.created_at).toLocaleDateString('fr-FR')} — {decaissement.profiles?.prenom} {decaissement.profiles?.nom}</p>
                  </div>
                </div>
              )}

              {justificatif && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700 font-medium">Justificatif — {justificatif.numero_facture} — {Number(justificatif.montant_facture).toLocaleString('fr-FR')} FCFA</p>
                    {docsExistants.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {docsExistants.map(doc => (
                          <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-orange-600 underline">{doc.nom_fichier || 'Document'}</a>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400">{new Date(justificatif.created_at).toLocaleDateString('fr-FR')} — {justificatif.profiles?.prenom} {justificatif.profiles?.nom}</p>
                  </div>
                </div>
              )}

              {retourCaisse?.date_confirmation && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700 font-medium">Retour caisse — {Number(retourCaisse.montant_retour).toLocaleString('fr-FR')} FCFA</p>
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

      {/* Modal confirmation — bottom-sheet mobile */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center z-50" onClick={() => setConfirmAction(null)}>
          <div className="bg-white w-full md:max-w-md md:rounded-xl rounded-t-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-3">Confirmer le transfert</h3>
            <div className="space-y-1 text-sm text-gray-600 mb-3">
              <p>Besoin : <strong>{besoin.numero}</strong></p>
              <p>N° facture : <strong>{numeroFacture}</strong></p>
              <p>Montant : <strong>{Number(montantFacture).toLocaleString('fr-FR')} FCFA</strong></p>
              <p>Documents : <strong>{fichiers.length} fichier{fichiers.length > 1 ? 's' : ''}</strong></p>
            </div>

            {reliquatPrevu > 0 && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                <p className="text-xs text-amber-700 font-medium">Retour en caisse : {reliquatPrevu.toLocaleString('fr-FR')} FCFA</p>
              </div>
            )}
            {reliquatPrevu !== null && reliquatPrevu <= 0 && (
              <div className="p-2 bg-green-50 border border-green-200 rounded-lg mb-3">
                <p className="text-xs text-green-700 font-medium">Le besoin sera automatiquement bouclé.</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)}
                className="flex-1 py-2.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Annuler</button>
              <button onClick={handleTransferer} disabled={saving}
                className="flex-1 py-2.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-bold">
                {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Transférer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </JustifLayout>
  )
}