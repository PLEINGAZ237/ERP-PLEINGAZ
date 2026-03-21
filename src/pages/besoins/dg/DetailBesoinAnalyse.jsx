import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import AnalyseLayout from '@/components/besoins/analyse/AnalyseLayout'
import { Loader2, ArrowLeft } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '—'
const fmtDT = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR') + ' à ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const STATUT_STYLE = {
  EN_ATTENTE_DFC: 'bg-amber-100 text-amber-700', EN_ATTENTE_DG: 'bg-blue-100 text-blue-700',
  VALIDE_DG: 'bg-emerald-100 text-emerald-700', REJETE_DFC: 'bg-red-100 text-red-700',
  REJETE_DG: 'bg-red-200 text-red-900', DECAISSE: 'bg-purple-100 text-purple-700',
  EN_ATTENTE_RETOUR_CAISSE: 'bg-amber-100 text-amber-700', BOUCLE: 'bg-gray-100 text-gray-500',
}
const STATUT_LABEL = {
  EN_ATTENTE_DFC: 'En attente DFC', EN_ATTENTE_DG: 'En attente DG',
  VALIDE_DG: 'Validé DG', REJETE_DFC: 'Rejeté DFC', REJETE_DG: 'Rejeté DG',
  DECAISSE: 'Décaissé', EN_ATTENTE_RETOUR_CAISSE: 'Retour caisse', BOUCLE: 'Bouclé',
}

export default function DetailBesoinAnalyse() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [besoin, setBesoin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('besoins')
        .select(`
          *,
          profiles!employe_id(nom, prenom, email, entreprises(nom), departements(nom)),
          validations_dfc(montant_valide, commentaire, statut, created_at, profiles!dfc_id(nom, prenom)),
          validations_dg(montant_valide, mode_decaissement, commentaire, action, created_at, profiles!dg_id(nom, prenom)),
          decaissements(montant_decaisse, justification_si_inferieur, created_at, profiles!caissiere_id(nom, prenom),
            justificatifs(numero_facture, montant_facture, document_url, created_at, profiles!agent_id(nom, prenom),
              retours_caisse(montant_retour, date_confirmation, profiles!confirme_par_caissiere_id(nom, prenom))
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

  if (loading) return <AnalyseLayout><div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="animate-spin" /></div></AnalyseLayout>
  if (!besoin) return <AnalyseLayout><p className="text-center py-20 text-red-500">Besoin introuvable.</p></AnalyseLayout>

  const emp = besoin.profiles
  const vdfc = besoin.validations_dfc?.filter(v => v.statut === 'valide')?.slice(-1)[0]
  const vdfcAll = besoin.validations_dfc?.slice(-1)[0]
  const vdg = besoin.validations_dg?.slice(-1)[0]
  const dec = besoin.decaissements?.[0]
  const justif = dec?.justificatifs?.[0]
  const retour = justif?.retours_caisse?.[0]
  const s = besoin.statut

  const Info = ({ label, value }) => (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase">{label}</p>
      <p className="text-sm text-gray-700 mt-0.5">{value || '—'}</p>
    </div>
  )

  return (
    <AnalyseLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <button onClick={() => navigate('/besoins/analyse')}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium w-fit">
          <ArrowLeft size={16} /> Retour à l'analyse
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg md:text-xl font-bold text-gray-800 font-mono">{besoin.numero}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUT_STYLE[s] ?? 'bg-gray-100 text-gray-500'}`}>
            {STATUT_LABEL[s] ?? s}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Colonne gauche */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase mb-3">Demandeur</h2>
            <p className="font-medium text-gray-800">{emp?.prenom} {emp?.nom}</p>
            <p className="text-sm text-gray-500">{emp?.email}</p>
            <p className="text-xs text-gray-400 mt-1">{emp?.departements?.nom ?? '—'} · {emp?.entreprises?.nom ?? '—'}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 space-y-3">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase">Montants</h2>
            <div>
              <p className="text-[10px] text-gray-400">Demandé</p>
              <p className="text-lg font-bold text-gray-700">{fmt(besoin.montant_demande)}</p>
            </div>
            {vdfc && (
              <div>
                <p className="text-[10px] text-gray-400">Validé DFC</p>
                <p className="text-lg font-bold text-indigo-600">{fmt(vdfc.montant_valide)}</p>
              </div>
            )}
            {vdg && vdg.action !== 'rejete' && (
              <div>
                <p className="text-[10px] text-gray-400">Validé DG</p>
                <p className="text-xl font-bold text-emerald-700">{fmt(vdg.montant_valide)}</p>
              </div>
            )}
            {dec && (
              <div>
                <p className="text-[10px] text-gray-400">Décaissé</p>
                <p className="text-xl font-bold text-purple-700">{fmt(dec.montant_decaisse)}</p>
              </div>
            )}
            {justif && (
              <div>
                <p className="text-[10px] text-gray-400">Facture justificatif</p>
                <p className="text-lg font-bold text-orange-600">{fmt(justif.montant_facture)}</p>
              </div>
            )}
            {retour && (
              <div>
                <p className="text-[10px] text-gray-400">Retour caisse</p>
                <p className="text-lg font-bold text-teal-600">{fmt(retour.montant_retour)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Description du besoin</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{besoin.description}</p>
            {besoin.justification && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h2 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Justification</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{besoin.justification}</p>
              </div>
            )}
          </div>

          {/* Chaîne de validation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase mb-4">Chaîne de validation</h2>
            <div className="space-y-4">
              {/* DFC */}
              {(vdfcAll) && (
                <div className={`rounded-lg p-3 ${s === 'REJETE_DFC' ? 'bg-red-50 border border-red-100' : 'bg-indigo-50 border border-indigo-100'}`}>
                  <p className="text-xs font-bold text-indigo-700 uppercase mb-2">Validation DFC</p>
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
                  <p className="text-xs font-bold text-emerald-700 uppercase mb-2">Validation DG</p>
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
                      <Info label="Date confirmation" value={fmtDT(retour.date_confirmation)} />
                    )}
                  </div>
                </div>
              )}

              {/* Aucune validation */}
              {!vdfcAll && !vdg && !dec && (
                <p className="text-sm text-gray-400 italic">Aucune validation enregistrée.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AnalyseLayout>
  )
}