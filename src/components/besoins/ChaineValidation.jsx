import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DocumentsBesoin from '@/components/besoins/DocumentsBesoin'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '—'
const fmtDT = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR') + ' à ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const Info = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-bold text-gray-400 uppercase">{label}</p>
    <p className="text-sm text-gray-700 mt-0.5">{value || '—'}</p>
  </div>
)

export default function ChaineValidation({ besoinId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!besoinId) return
    const load = async () => {
      setLoading(true)
      const { data: b } = await supabase
        .from('besoins')
        .select(`
          statut, created_at,
          profiles!employe_id(nom, prenom),
          validations_dfc(montant_valide, commentaire, statut, created_at, profiles!dfc_id(nom, prenom)),
          validations_dg(montant_valide, mode_decaissement, commentaire, action, created_at, profiles!dg_id(nom, prenom)),
          decaissements(montant_decaisse, justification_si_inferieur, created_at, profiles!caissiere_id(nom, prenom),
            justificatifs(numero_facture, montant_facture, document_url, created_at, profiles!agent_id(nom, prenom),
              retours_caisse(montant_retour, date_confirmation, profiles!confirme_par_caissiere_id(nom, prenom))
            )
          )
        `)
        .eq('id', besoinId)
        .single()
      if (b) setData(b)
      setLoading(false)
    }
    load()
  }, [besoinId])

  if (loading) return <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-400 text-sm">Chargement du circuit...</div>
  if (!data) return null

  const s = data.statut
  const emp = data.profiles
  const vdfcAll = data.validations_dfc?.slice(-1)[0]
  const vdg = data.validations_dg?.slice(-1)[0]
  const dec = data.decaissements?.[0]
  const justif = dec?.justificatifs?.[0]
  const retour = justif?.retours_caisse?.[0]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
      <h2 className="text-[10px] font-bold text-gray-400 uppercase mb-4">Circuit de validation complet</h2>
      <div className="space-y-4">

        {/* Création */}
        <div className="rounded-lg p-3 bg-blue-50 border border-blue-100">
          <p className="text-xs font-bold text-blue-700 uppercase mb-2">Création du besoin</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Info label="Par" value={`${emp?.prenom} ${emp?.nom}`} />
            <Info label="Date" value={fmtDT(data.created_at)} />
          </div>
        </div>

        {/* Documents joints par l'émetteur */}
        <div className="rounded-lg p-3 bg-gray-50 border border-gray-200">
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Documents joints par l'émetteur</p>
          <DocumentsBesoin besoinId={besoinId} editable={false} />
        </div>

        {/* DFC */}
        {vdfcAll && (
          <div className={`rounded-lg p-3 ${s === 'REJETE_DFC' ? 'bg-red-50 border border-red-100' : 'bg-indigo-50 border border-indigo-100'}`}>
            <p className={`text-xs font-bold uppercase mb-2 ${s === 'REJETE_DFC' ? 'text-red-700' : 'text-indigo-700'}`}>
              {s === 'REJETE_DFC' ? 'Rejeté par DFC' : 'Validation DFC'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Info label="Par" value={`${vdfcAll.profiles?.prenom} ${vdfcAll.profiles?.nom}`} />
              <Info label="Date" value={fmtDT(vdfcAll.created_at)} />
              {vdfcAll.montant_valide && <Info label="Montant validé" value={fmt(vdfcAll.montant_valide)} />}
              {vdfcAll.commentaire && <Info label={s === 'REJETE_DFC' ? 'Motif du rejet' : 'Commentaire'} value={vdfcAll.commentaire} />}
            </div>
          </div>
        )}

        {/* DG */}
        {vdg && (
          <div className={`rounded-lg p-3 ${s === 'REJETE_DG' ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'}`}>
            <p className={`text-xs font-bold uppercase mb-2 ${s === 'REJETE_DG' ? 'text-red-700' : 'text-emerald-700'}`}>
              {s === 'REJETE_DG' ? 'Rejeté par DG' : 'Validation DG'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Info label="Par" value={`${vdg.profiles?.prenom} ${vdg.profiles?.nom}`} />
              <Info label="Date" value={fmtDT(vdg.created_at)} />
              {vdg.montant_valide && <Info label="Montant validé" value={fmt(vdg.montant_valide)} />}
              {vdg.mode_decaissement && <Info label="Mode" value={vdg.mode_decaissement} />}
              {vdg.commentaire && <Info label={s === 'REJETE_DG' ? 'Motif du rejet' : 'Commentaire'} value={vdg.commentaire} />}
            </div>
          </div>
        )}

        {/* Décaissement */}
        {dec && (
          <div className="rounded-lg p-3 bg-purple-50 border border-purple-100">
            <p className="text-xs font-bold text-purple-700 uppercase mb-2">Décaissement</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Info label="Par" value={`${dec.profiles?.prenom} ${dec.profiles?.nom}`} />
              <Info label="Date" value={fmtDT(dec.created_at)} />
              <Info label="Montant" value={fmt(dec.montant_decaisse)} />
              {dec.justification_si_inferieur && <Info label="Justification écart" value={dec.justification_si_inferieur} />}
            </div>
          </div>
        )}

        {/* Justificatif */}
        {justif && (
          <div className="rounded-lg p-3 bg-orange-50 border border-orange-100">
            <p className="text-xs font-bold text-orange-700 uppercase mb-2">Justificatif</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Info label="N° facture" value={justif.numero_facture} />
              <Info label="Montant facture" value={fmt(justif.montant_facture)} />
              <Info label="Par" value={`${justif.profiles?.prenom} ${justif.profiles?.nom}`} />
              <Info label="Date" value={fmtDT(justif.created_at)} />
            </div>
            {justif.document_url && (
              <a href={justif.document_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-orange-700 underline mt-2 inline-block">Voir le document</a>
            )}
          </div>
        )}

        {/* Retour caisse */}
        {retour && (
          <div className={`rounded-lg p-3 ${retour.date_confirmation ? 'bg-teal-50 border border-teal-100' : 'bg-amber-50 border border-amber-100'}`}>
            <p className={`text-xs font-bold uppercase mb-2 ${retour.date_confirmation ? 'text-teal-700' : 'text-amber-700'}`}>Retour en caisse</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Info label="Montant" value={fmt(retour.montant_retour)} />
              <Info label="Statut" value={retour.date_confirmation ? 'Confirmé' : 'En attente'} />
              {retour.date_confirmation && retour.profiles && (
                <Info label="Confirmé par" value={`${retour.profiles.prenom} ${retour.profiles.nom}`} />
              )}
              {retour.date_confirmation && (
                <Info label="Date" value={fmtDT(retour.date_confirmation)} />
              )}
            </div>
          </div>
        )}

        {/* Aucune validation */}
        {!vdfcAll && !vdg && !dec && (
          <p className="text-sm text-gray-400 italic">Aucune validation enregistrée.</p>
        )}

        {/* Statut en cours */}
        {s === 'EN_ATTENTE_DFC' && <p className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-100 rounded-lg p-2">En attente de validation DFC...</p>}
        {s === 'EN_ATTENTE_DG' && vdfcAll && <p className="text-xs text-blue-600 font-medium bg-blue-50 border border-blue-100 rounded-lg p-2">En attente de validation DG...</p>}
        {s === 'VALIDE_DG' && !dec && <p className="text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-100 rounded-lg p-2">En attente de décaissement...</p>}
        {s === 'DECAISSE' && !justif && <p className="text-xs text-purple-600 font-medium bg-purple-50 border border-purple-100 rounded-lg p-2">En attente de justificatif...</p>}
        {s === 'EN_ATTENTE_RETOUR_CAISSE' && <p className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-100 rounded-lg p-2">Retour en caisse attendu...</p>}
        {s === 'BOUCLE' && <p className="text-xs text-gray-500 font-medium bg-gray-50 border border-gray-100 rounded-lg p-2">Besoin bouclé</p>}
      </div>
    </div>
  )
}