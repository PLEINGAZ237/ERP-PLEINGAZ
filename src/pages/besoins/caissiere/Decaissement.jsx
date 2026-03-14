import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import CaissiereLayout from '@/components/besoins/caissiere/CaissiereLayout'
import { Upload, X, Paperclip } from 'lucide-react'

const fmt   = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '—'
const fmtDT = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    + ' à ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const STATUT_STYLE = {
  VALIDE_DG:                'bg-green-100 text-green-700',
  DECAISSE:                 'bg-purple-100 text-purple-700',
  EN_ATTENTE_RETOUR_CAISSE: 'bg-amber-100 text-amber-700',
  BOUCLE:                   'bg-gray-100 text-gray-500',
}
const STATUT_LABEL = {
  VALIDE_DG:                'À décaisser',
  DECAISSE:                 'Décaissé',
  EN_ATTENTE_RETOUR_CAISSE: 'Retour en caisse attendu',
  BOUCLE:                   'Bouclé',
}

// Ligne acteur : Prénom NOM · badge rôle
const ActeurLine = ({ prenom, nom, role, className = '' }) => (
  <p className={`text-xs text-gray-500 flex items-center gap-1.5 flex-wrap ${className}`}>
    <span className='font-medium text-gray-600'>{prenom} {nom}</span>
    {role && (
      <span className='text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full border border-gray-200'>
        {role}
      </span>
    )}
  </p>
)

export default function Decaissement() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const fileInput = useRef(null)

  const [besoin, setBesoin]             = useState(null)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState('')
  const [confirmAction, setConfirmAction] = useState(null)

  const [montantDecaisse, setMontantDecaisse]               = useState('')
  const [justificationInferieur, setJustificationInferieur] = useState('')
  const [images, setImages]                                  = useState([]) // { file, preview }[]

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      const { data, error: rpcErr } = await supabase
        .rpc('get_besoin_detail_caissiere', { p_id: id })
      if (rpcErr) {
        console.error('[Decaissement] RPC error:', rpcErr.message)
        setLoading(false)
        return
      }
      const row = Array.isArray(data) ? data[0] : data
      if (row) {
        setBesoin(row)
        if (row.statut === 'VALIDE_DG' && row.dg_montant_valide) {
          setMontantDecaisse(row.dg_montant_valide.toString())
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  const montantValide       = besoin?.dg_montant_valide ?? 0
  const peutDecaisser       = besoin?.statut === 'VALIDE_DG'
  const peutConfirmerRetour = besoin?.statut === 'EN_ATTENTE_RETOUR_CAISSE'
  const montantInferieur    = montantDecaisse && Number(montantDecaisse) < Number(montantValide)
  const dejaDecaisse        = !!besoin?.dec_id

  // ── Images ──────────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    setImages(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))])
    // reset input pour permettre de re-sélectionner le même fichier
    e.target.value = ''
  }
  const removeImage = (idx) => {
    setImages(prev => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  // Upload vers Storage + enregistrement en table decaissement_documents
  const uploadImages = async (decaissementId) => {
    const urls = []
    for (const img of images) {
      const ext  = img.file.name.split('.').pop()
      const path = `decaissements/${decaissementId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('justificatifs')
        .upload(path, img.file, { upsert: true })

      if (!upErr) {
        const { data: urlData } = supabase.storage.from('justificatifs').getPublicUrl(path)
        const publicUrl = urlData.publicUrl

        // Enregistrer en base dans decaissement_documents
        await supabase.from('decaissement_documents').insert({
          decaissement_id: decaissementId,
          uploaded_by:     user.id,
          url:             publicUrl,
          nom_fichier:     img.file.name,
        })
        urls.push(publicUrl)
      } else {
        console.error('Upload error:', upErr.message)
      }
    }
    return urls
  }

  // ── Décaissement ────────────────────────────────────────────────────────────
  const handleDecaisser = async () => {
    setError('')
    const montant = Number(montantDecaisse)

    if (!montant || montant <= 0) {
      setError('Veuillez saisir un montant valide.'); setConfirmAction(null); return
    }
    if (montant > Number(montantValide)) {
      setError(`Maximum autorisé : ${fmt(montantValide)}`); setConfirmAction(null); return
    }
    if (montantInferieur && !justificationInferieur.trim()) {
      setError('Le commentaire est obligatoire quand le montant est inférieur au validé.')
      setConfirmAction(null); return
    }
    // Pièces justificatives obligatoires
    if (images.length === 0) {
      setError('Veuillez joindre au moins une pièce justificative.')
      setConfirmAction(null); return
    }

    setSaving(true)
    // Insert sans .single() pour éviter le blocage RLS sur le SELECT retour
    const { data: decData, error: errInsert } = await supabase
      .from('decaissements')
      .insert({
        besoin_id:    id,
        caissiere_id: user.id,
        montant_decaisse: montant,
        justification_si_inferieur: montantInferieur ? justificationInferieur.trim() : null,
      })
      .select('id')

    if (errInsert) {
      setSaving(false); setConfirmAction(null); setError(errInsert.message); return
    }

    const decId = decData?.[0]?.id
    await uploadImages(decId)

    const { error: errUpdate } = await supabase
      .from('besoins').update({ statut: 'DECAISSE' }).eq('id', id)

    setSaving(false); setConfirmAction(null)
    if (errUpdate) { setError(errUpdate.message); return }
    setSuccess('Décaissement enregistré avec succès.')
    setTimeout(() => navigate('/besoins/caissiere'), 1800)
  }

  // ── Retour en caisse ────────────────────────────────────────────────────────
  const handleConfirmerRetour = async () => {
    setError(''); setSaving(true)

    // On cherche un retour_caisse non confirmé lié au décaissement de ce besoin
    if (besoin?.dec_id) {
      const { data: justifs } = await supabase
        .from('justificatifs').select('id').eq('decaissement_id', besoin.dec_id)

      if (justifs?.length) {
        const justifId = justifs[0].id
        const { data: retourData } = await supabase
          .from('retours_caisse').select('id')
          .eq('justificatif_id', justifId).is('date_confirmation', null).maybeSingle()

        if (retourData) {
          await supabase.from('retours_caisse').update({
            confirme_par_caissiere_id: user.id,
            date_confirmation: new Date().toISOString(),
          }).eq('id', retourData.id)
        }
      }
    }

    const { error: errUpdate } = await supabase
      .from('besoins').update({ statut: 'BOUCLE' }).eq('id', id)
    setSaving(false); setConfirmAction(null)
    if (errUpdate) { setError(errUpdate.message); return }
    setSuccess('Retour en caisse confirmé — besoin bouclé.')
    setTimeout(() => navigate('/besoins/caissiere'), 1800)
  }

  if (loading) return (
    <CaissiereLayout>
      <div className='flex items-center justify-center py-32'>
        <div className='w-8 h-8 border-4 border-gray-200 border-t-teal-500 rounded-full animate-spin' />
      </div>
    </CaissiereLayout>
  )
  if (!besoin) return (
    <CaissiereLayout>
      <p className='text-red-500 text-center py-20'>Besoin introuvable.</p>
    </CaissiereLayout>
  )

  return (
    <CaissiereLayout>
      {/* Header */}
      <div className='flex items-start gap-4 mb-6'>
        <button onClick={() => navigate('/besoins/caissiere')}
          className='mt-1 text-teal-600 hover:underline text-sm shrink-0'>← Retour</button>
        <div className='flex-1'>
          <div className='flex items-center gap-3 flex-wrap'>
            <h1 className='text-xl font-black text-gray-800 font-mono'>{besoin.numero}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUT_STYLE[besoin.statut] ?? ''}`}>
              {STATUT_LABEL[besoin.statut] ?? besoin.statut}
            </span>
          </div>
          <p className='text-xs text-gray-400 mt-0.5'>Soumis le {fmtDT(besoin.created_at)}</p>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>

        {/* ── Colonne gauche ───────────────────────────────────────────── */}
        <div className='lg:col-span-1 space-y-4'>

          {/* Demandeur + description + justification */}
          <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-5'>
            <h2 className='text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3'>Demandeur</h2>
            <p className='font-bold text-gray-800 text-base'>
              {besoin.employe_prenom} {besoin.employe_nom}
            </p>
            <p className='text-xs text-gray-500 mt-0.5'>
              {besoin.entreprise_nom ?? '—'}
              {besoin.departement_nom ? ` · ${besoin.departement_nom}` : ''}
              {besoin.service_nom ? ` · ${besoin.service_nom}` : ''}
            </p>
            <div className='mt-4 pt-4 border-t border-gray-100 space-y-3'>
              <div>
                <p className='text-[10px] font-bold uppercase text-gray-400 mb-1'>Description</p>
                <p className='text-sm text-gray-700 leading-relaxed'>{besoin.description}</p>
              </div>
              {besoin.justification && (
                <div>
                  <p className='text-[10px] font-bold uppercase text-gray-400 mb-1'>Justification</p>
                  <p className='text-sm text-gray-600 leading-relaxed'>{besoin.justification}</p>
                </div>
              )}
            </div>
          </div>

          {/* Montants */}
          <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-5'>
            <h2 className='text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3'>Montants</h2>
            <div className='space-y-3'>
              <div>
                <p className='text-xs text-gray-400 mb-0.5'>Montant demandé</p>
                <p className='text-base font-bold text-gray-600'>{fmt(besoin.montant_demande)}</p>
              </div>
              {besoin.dfc_montant_valide && (
                <div>
                  <p className='text-xs text-gray-400 mb-0.5'>Montant validé DFC</p>
                  <p className='text-base font-bold text-indigo-600'>{fmt(besoin.dfc_montant_valide)}</p>
                  <ActeurLine prenom={besoin.dfc_prenom} nom={besoin.dfc_nom} role={besoin.dfc_role} className='mt-1' />
                </div>
              )}
              <div>
                <p className='text-xs text-gray-400 mb-0.5'>Montant validé DG (à décaisser)</p>
                <p className='text-2xl font-black text-green-700'>{fmt(besoin.dg_montant_valide)}</p>
                <ActeurLine prenom={besoin.dg_prenom} nom={besoin.dg_nom} role={besoin.dg_role} className='mt-1' />
              </div>
            </div>
          </div>

          {/* Mode décaissement */}
          {besoin.dg_mode_decaissement && (
            <div className='bg-teal-50 rounded-xl border border-teal-100 p-5'>
              <h2 className='text-[10px] font-bold uppercase tracking-wider text-teal-500 mb-3'>Mode de décaissement</h2>
              <p className='text-sm text-teal-700'>Mode : <strong className='capitalize'>{besoin.dg_mode_decaissement}</strong></p>
              {besoin.dg_caisse_nom   && <p className='text-sm text-teal-700'>Caisse : <strong>{besoin.dg_caisse_nom}</strong></p>}
              {besoin.dg_virement_nom && <p className='text-sm text-teal-700'>Virement : <strong>{besoin.dg_virement_nom}</strong></p>}
              <p className='text-xs text-teal-600 mt-2'>
                Validé par <strong>{besoin.dg_prenom} {besoin.dg_nom}</strong>
                {besoin.dg_role && <span className='text-teal-500'> — {besoin.dg_role}</span>}
              </p>
            </div>
          )}

          {/* Décaissement effectué */}
          {dejaDecaisse && (
            <div className='bg-purple-50 rounded-xl border border-purple-100 p-5'>
              <h2 className='text-[10px] font-bold uppercase tracking-wider text-purple-500 mb-2'>Décaissement effectué</h2>
              <p className='text-lg font-black text-purple-700'>{fmt(besoin.dec_montant_decaisse)}</p>
              {besoin.dec_justification && (
                <p className='text-xs text-purple-600 mt-1 italic'>"{besoin.dec_justification}"</p>
              )}
              <p className='text-xs text-purple-600 mt-1'>
                Par <strong>{besoin.dec_caissiere_prenom} {besoin.dec_caissiere_nom}</strong>
                {besoin.dec_caissiere_role && <span className='text-purple-400'> — {besoin.dec_caissiere_role}</span>}
              </p>
            </div>
          )}
        </div>

        {/* ── Colonne droite ───────────────────────────────────────────── */}
        <div className='lg:col-span-2 space-y-4'>

          {/* Formulaire décaissement */}
          {peutDecaisser && (
            <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
              <h2 className='text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-5'>
                Effectuer le décaissement
              </h2>
              <div className='space-y-5'>

                {/* Montant */}
                <div>
                  <label className='block text-xs font-bold text-gray-600 mb-1'>
                    Montant à décaisser (FCFA) <span className='text-red-500'>*</span>
                  </label>
                  <input type='number' value={montantDecaisse}
                    onChange={e => setMontantDecaisse(e.target.value)}
                    min='1' max={montantValide}
                    className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold'
                  />
                  <p className='text-xs text-gray-400 mt-1'>Maximum : {fmt(montantValide)}</p>
                </div>

                {/* Commentaire obligatoire si montant inférieur */}
                {montantInferieur && (
                  <div>
                    <div className='p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3'>
                      <p className='text-xs text-amber-700 font-medium'>
                        ⚠️ Montant inférieur au validé — commentaire obligatoire
                      </p>
                    </div>
                    <label className='block text-xs font-bold text-gray-600 mb-1'>
                      Commentaire <span className='text-red-500'>*</span>
                    </label>
                    <textarea value={justificationInferieur}
                      onChange={e => setJustificationInferieur(e.target.value)}
                      rows={3}
                      placeholder='Expliquez pourquoi le montant décaissé est inférieur...'
                      className='w-full border border-amber-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 resize-none'
                    />
                  </div>
                )}

                {/* Récap */}
                {montantDecaisse && Number(montantDecaisse) > 0 && (
                  <div className='bg-gray-50 rounded-xl p-4 border border-gray-100'>
                    <p className='text-[10px] font-bold uppercase text-gray-400 mb-2'>Récapitulatif</p>
                    <div className='grid grid-cols-2 gap-y-1 text-sm'>
                      <span className='text-gray-500'>Montant validé DG :</span>
                      <span className='font-bold text-gray-700'>{fmt(montantValide)}</span>
                      <span className='text-gray-500'>Montant à décaisser :</span>
                      <span className='font-bold text-gray-700'>{fmt(Number(montantDecaisse))}</span>
                      {montantInferieur && (
                        <>
                          <span className='text-gray-500'>Différence :</span>
                          <span className='font-bold text-amber-600'>
                            {fmt(Number(montantValide) - Number(montantDecaisse))}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Pièces justificatives — OBLIGATOIRES */}
                <div>
                  <label className='block text-xs font-bold text-gray-600 mb-2'>
                    Pièces justificatives <span className='text-red-500'>*</span>
                    <span className='ml-1 text-gray-400 font-normal'>(JPG, PNG, PDF)</span>
                  </label>

                  {/* Zone de dépôt */}
                  <div
                    onClick={() => fileInput.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer transition-all
                      ${images.length > 0
                        ? 'border-teal-300 bg-teal-50/20 hover:border-teal-500'
                        : 'border-gray-200 hover:border-teal-400 hover:bg-teal-50/30'}`}
                  >
                    {images.length > 0
                      ? <Paperclip size={20} className='text-teal-500' />
                      : <Upload size={20} className='text-gray-400' />
                    }
                    <p className='text-xs text-gray-500'>
                      {images.length > 0
                        ? `${images.length} fichier${images.length > 1 ? 's' : ''} sélectionné${images.length > 1 ? 's' : ''} — cliquez pour en ajouter`
                        : 'Cliquez pour importer des pièces justificatives'}
                    </p>
                  </div>
                  <input ref={fileInput} type='file' accept='image/*,application/pdf'
                    multiple className='hidden' onChange={handleFileChange} />

                  {/* Prévisualisations */}
                  {images.length > 0 && (
                    <div className='mt-3 grid grid-cols-3 gap-2'>
                      {images.map((img, i) => (
                        <div key={i} className='relative group rounded-lg overflow-hidden border border-gray-200'>
                          <img src={img.preview} alt=''
                            className='w-full h-20 object-cover'
                            onError={e => { e.target.style.display='none' }}
                          />
                          <div className='px-1.5 py-1 bg-gray-50'>
                            <p className='text-[9px] text-gray-500 truncate'>{img.file.name}</p>
                          </div>
                          <button type='button' onClick={() => removeImage(i)}
                            className='absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow'>
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {images.length === 0 && (
                    <p className='text-[10px] text-red-400 mt-1'>Au moins une pièce justificative est requise</p>
                  )}
                </div>
              </div>

              {error   && <div className='mt-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100'>{error}</div>}
              {success && <div className='mt-4 p-3 bg-green-50 text-green-700 text-xs font-bold rounded-xl border border-green-100'>{success}</div>}

              <div className='flex gap-3 mt-6 pt-4 border-t'>
                <button onClick={() => setConfirmAction('decaisser')}
                  disabled={saving || !montantDecaisse || Number(montantDecaisse) <= 0}
                  className='px-6 py-2.5 text-sm bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 font-bold transition-all'>
                  Effectuer le décaissement
                </button>
              </div>
            </div>
          )}

          {/* Confirmation retour */}
          {peutConfirmerRetour && (
            <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
              <h2 className='text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-4'>Retour en caisse attendu</h2>
              <div className='bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4'>
                <p className='text-sm text-amber-800 mb-3'>Confirmez la réception du reliquat.</p>
                {besoin.dec_montant_decaisse && (
                  <p className='text-sm'>
                    <span className='text-amber-600'>Montant décaissé : </span>
                    <span className='font-bold text-amber-800'>{fmt(besoin.dec_montant_decaisse)}</span>
                  </p>
                )}
              </div>
              {error   && <div className='p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl'>{error}</div>}
              {success && <div className='p-3 bg-green-50 text-green-700 text-xs font-bold rounded-xl'>{success}</div>}
              <div className='mt-4 pt-4 border-t'>
                <button onClick={() => setConfirmAction('retour')} disabled={saving}
                  className='px-6 py-2.5 text-sm bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-50 font-bold'>
                  Confirmer la réception du retour
                </button>
              </div>
            </div>
          )}

          {/* Lecture seule DECAISSE / BOUCLE */}
          {(besoin.statut === 'DECAISSE' || besoin.statut === 'BOUCLE') && !peutConfirmerRetour && (
            <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
              <p className='text-sm text-gray-400'>
                Ce besoin a été {besoin.statut === 'BOUCLE' ? 'bouclé' : 'décaissé'} — lecture seule.
              </p>
            </div>
          )}

          {/* ── Historique ──────────────────────────────────────────────── */}
          <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
            <h2 className='text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-5'>
              Historique des étapes
            </h2>
            <div className='relative pl-7'>
              <div className='absolute left-2.5 top-2 bottom-2 w-0.5 bg-gray-200 rounded-full' />
              <div className='space-y-6'>

                {/* Création */}
                <div className='relative'>
                  <div className='absolute -left-7 mt-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm bg-blue-500' />
                  <p className='text-sm font-semibold text-gray-700'>Besoin créé</p>
                  <p className='text-xs text-gray-500'>{besoin.employe_prenom} {besoin.employe_nom}</p>
                  <p className='text-xs text-gray-400'>{fmtDT(besoin.created_at)}</p>
                </div>

                {/* Validation DFC */}
                {besoin.dfc_montant_valide && (
                  <div className='relative'>
                    <div className='absolute -left-7 mt-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm bg-indigo-500' />
                    <p className='text-sm font-semibold text-gray-700'>
                      Besoin validé DFC — {fmt(besoin.dfc_montant_valide)}
                    </p>
                    <p className='text-xs text-gray-500'>{besoin.dfc_prenom} {besoin.dfc_nom}</p>
                    <p className='text-xs text-gray-400'>{fmtDT(besoin.dfc_created_at)}</p>
                  </div>
                )}

                {/* Validation DG */}
                {besoin.dg_montant_valide && (
                  <div className='relative'>
                    <div className='absolute -left-7 mt-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm bg-green-500' />
                    <p className='text-sm font-semibold text-gray-700'>
                      Besoin validé DG — {fmt(besoin.dg_montant_valide)}
                    </p>
                    <p className='text-xs text-gray-500'>{besoin.dg_prenom} {besoin.dg_nom}</p>
                    <p className='text-xs text-gray-400'>{fmtDT(besoin.dg_created_at)}</p>
                  </div>
                )}

                {/* En attente décaissement */}
                {!dejaDecaisse && besoin.dg_montant_valide && (
                  <div className='relative'>
                    <div className='absolute -left-7 mt-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm bg-gray-300' />
                    <p className='text-sm font-semibold text-gray-400'>En attente de décaissement</p>
                  </div>
                )}

                {/* Décaissé */}
                {dejaDecaisse && (
                  <div className='relative'>
                    <div className='absolute -left-7 mt-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm bg-purple-500' />
                    <p className='text-sm font-semibold text-gray-700'>
                      Décaissé — {fmt(besoin.dec_montant_decaisse)}
                    </p>
                    {besoin.dec_justification && (
                      <p className='text-xs text-purple-600 italic'>"{besoin.dec_justification}"</p>
                    )}
                    <p className='text-xs text-gray-500'>{besoin.dec_caissiere_prenom} {besoin.dec_caissiere_nom}</p>
                    <p className='text-xs text-gray-400'>{fmtDT(besoin.dec_created_at)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal confirmation */}
      {confirmAction && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm'>
            <h3 className='text-lg font-black text-gray-800 mb-2'>
              {confirmAction === 'decaisser' ? 'Confirmer le décaissement' : 'Confirmer le retour'}
            </h3>
            <p className='text-gray-500 text-sm mb-1'>Besoin : <strong className='text-gray-700'>{besoin.numero}</strong></p>
            {confirmAction === 'decaisser' && (
              <>
                <p className='text-gray-500 text-sm'>Montant : <strong className='text-teal-700'>{fmt(Number(montantDecaisse))}</strong></p>
                {montantInferieur && <p className='text-amber-600 text-xs mt-1'>Inférieur au validé ({fmt(montantValide)})</p>}
                <p className='text-xs text-gray-400 mt-1'>{images.length} pièce{images.length > 1 ? 's' : ''} justificative{images.length > 1 ? 's' : ''}</p>
                <p className='text-gray-400 text-xs mt-2'>Cette action est irréversible.</p>
              </>
            )}
            {confirmAction === 'retour' && (
              <p className='text-gray-500 text-sm mt-1'>Le besoin sera marqué comme bouclé.</p>
            )}
            <div className='flex gap-3 mt-5 justify-end'>
              <button onClick={() => setConfirmAction(null)}
                className='px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50'>Annuler</button>
              <button
                onClick={confirmAction === 'decaisser' ? handleDecaisser : handleConfirmerRetour}
                disabled={saving}
                className={`px-5 py-2 text-sm text-white rounded-xl disabled:opacity-50 font-bold ${
                  confirmAction === 'decaisser' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}>
                {saving ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </CaissiereLayout>
  )
}