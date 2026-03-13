import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import EmployeLayout from '@/components/besoins/employe/EmployeLayout'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
const fmtDateTime = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    + ' à ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const STATUT_STYLE = {
  EN_ATTENTE_DFC:          'bg-amber-100 text-amber-700',
  EN_ATTENTE_DG:           'bg-blue-100 text-blue-700',
  VALIDE_DG:               'bg-green-100 text-green-700',
  REJETE_DFC:              'bg-red-100 text-red-700',
  REJETE_DG:               'bg-red-200 text-red-800',
  DECAISSE:                'bg-purple-100 text-purple-700',
  EN_ATTENTE_RETOUR_CAISSE:'bg-orange-100 text-orange-700',
  BOUCLE:                  'bg-gray-100 text-gray-600',
}

const STATUT_LABEL = {
  EN_ATTENTE_DFC:          'En attente DFC',
  EN_ATTENTE_DG:           'Validé DFC — En attente DG',
  VALIDE_DG:               'Validé DG — En attente décaissement',
  REJETE_DFC:              'Rejeté DFC',
  REJETE_DG:               'Rejeté DG',
  DECAISSE:                'Décaissé',
  EN_ATTENTE_RETOUR_CAISSE:'En attente retour en caisse',
  BOUCLE:                  'Bouclé',
}

// ── Blocs réutilisables ──────────────────────────────────────────────────────

// Bloc montant + titre/détails (pour le demandeur)
const BlocDemandeur = ({ besoin }) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Besoin du demandeur</p>
    <p className="text-2xl font-black text-gray-800 mb-3">{fmt(besoin.montant_demande)}</p>
    <div className="space-y-2 border-t border-gray-200 pt-3">
      <div>
        <p className="text-[10px] font-bold uppercase text-gray-400 mb-0.5">Titre</p>
        <p className="text-sm text-gray-700">{besoin.description}</p>
      </div>
      {besoin.justification && (
        <div>
          <p className="text-[10px] font-bold uppercase text-gray-400 mb-0.5">Détails</p>
          <p className="text-sm text-gray-600 leading-relaxed">{besoin.justification}</p>
        </div>
      )}
    </div>
  </div>
)

// Bloc validation (DFC ou DG)
const BlocValidation = ({ label, montant, commentaire, couleur }) => {
  const c = {
    indigo: { border: 'border-indigo-200', bg: 'bg-indigo-50', title: 'text-indigo-400', value: 'text-indigo-700', comment: 'bg-indigo-100/60 text-indigo-700' },
    green:  { border: 'border-green-200',  bg: 'bg-green-50',  title: 'text-green-400',  value: 'text-green-700',  comment: 'bg-green-100/60 text-green-700' },
    purple: { border: 'border-purple-200', bg: 'bg-purple-50', title: 'text-purple-400', value: 'text-purple-700', comment: 'bg-purple-100/60 text-purple-700' },
    red:    { border: 'border-red-200',    bg: 'bg-red-50',    title: 'text-red-400',    value: 'text-red-700',    comment: 'bg-red-100/60 text-red-700' },
  }[couleur]
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider ${c.title} mb-2`}>{label}</p>
      {montant != null && <p className={`text-2xl font-black ${c.value} mb-2`}>{fmt(montant)}</p>}
      {commentaire && (
        <div className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${c.comment}`}>
          <span className="font-bold uppercase text-[9px] tracking-wider block mb-1">Commentaire</span>
          {commentaire}
        </div>
      )}
    </div>
  )
}

// Bloc motif rejet
const BlocRejet = ({ label, motif }) => (
  <div className="rounded-xl border border-red-200 bg-red-50 p-5">
    <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-2">{label}</p>
    <p className="text-sm text-red-700 leading-relaxed">{motif || '(aucun motif renseigné)'}</p>
  </div>
)

export default function DetailBesoin() {
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
          profiles!employe_id(nom, prenom, departements(nom), entreprises(nom)),
          validations_dfc(montant_valide, commentaire, statut, created_at),
          validations_dg(montant_valide, commentaire, action, created_at, caisses(nom)),
          decaissements(montant_decaisse, created_at, justification_si_inferieur,
            profiles!caissiere_id(nom, prenom),
            justificatifs(id, montant_facture, created_at,
              retours_caisse(montant_retour, created_at, date_confirmation)
            )
          )
        `)
        .eq('id', id)
        .single()
      setBesoin(data)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <EmployeLayout>
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    </EmployeLayout>
  )

  if (!besoin) return (
    <EmployeLayout>
      <p className="text-center py-20 text-red-500">Besoin introuvable.</p>
    </EmployeLayout>
  )

  const s         = besoin.statut
  const derValDfc = besoin.validations_dfc?.slice(-1)[0]
  const derValDg  = besoin.validations_dg?.slice(-1)[0]
  const decaiss   = besoin.decaissements?.[0]
  const retour    = decaiss?.justificatifs?.[0]?.retours_caisse?.[0]

  return (
    <EmployeLayout>
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <button
          onClick={() => navigate('/besoins/employe/mes-besoins')}
          className="mt-1 text-blue-600 hover:underline text-sm font-medium shrink-0"
        >
          ← Retour
        </button>
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-black text-gray-800">{besoin.numero}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUT_STYLE[s] ?? 'bg-gray-100 text-gray-600'}`}>
              {STATUT_LABEL[s] ?? s}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Soumis le {fmtDateTime(besoin.created_at)}
          </p>
        </div>
      </div>

      {/* ══ EN_ATTENTE_DG ══ */}
      {s === 'EN_ATTENTE_DG' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <BlocDemandeur besoin={besoin} />
          <BlocValidation
            label="Validation DFC"
            montant={derValDfc?.montant_valide}
            commentaire={derValDfc?.commentaire}
            couleur="indigo"
          />
        </div>
      )}

      {/* ══ VALIDE_DG ══ */}
      {s === 'VALIDE_DG' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <BlocDemandeur besoin={besoin} />
          <BlocValidation label="Validation DFC" montant={derValDfc?.montant_valide} commentaire={derValDfc?.commentaire} couleur="indigo" />
          <BlocValidation label="Validation DG"  montant={derValDg?.montant_valide}  commentaire={derValDg?.commentaire}  couleur="green" />
        </div>
      )}

      {/* ══ EN_ATTENTE_RETOUR_CAISSE ══ */}
      {s === 'EN_ATTENTE_RETOUR_CAISSE' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <BlocDemandeur besoin={besoin} />
            <BlocValidation label="Validation DFC" montant={derValDfc?.montant_valide} commentaire={derValDfc?.commentaire} couleur="indigo" />
            <BlocValidation label="Validation DG"  montant={derValDg?.montant_valide}  commentaire={derValDg?.commentaire}  couleur="green" />
            <BlocValidation label="Décaissé"       montant={decaiss?.montant_decaisse} commentaire={decaiss?.justification_si_inferieur} couleur="purple" />
          </div>
          {/* Bloc retour caisse */}
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400 mb-3">En attente retour en caisse</p>
            <div className="flex flex-wrap gap-8">
              <div>
                <p className="text-xs text-orange-400 mb-1">Montant à retourner</p>
                <p className="text-2xl font-black text-orange-700">
                  {retour ? fmt(retour.montant_retour) : fmt(decaiss?.montant_decaisse)}
                </p>
              </div>
              <div>
                <p className="text-xs text-orange-400 mb-1">Caisse concernée</p>
                <p className="text-lg font-bold text-orange-700">{derValDg?.caisses?.nom ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ DECAISSE ══ */}
      {s === 'DECAISSE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <BlocDemandeur besoin={besoin} />
          <BlocValidation label="Validation DFC"       montant={derValDfc?.montant_valide} commentaire={derValDfc?.commentaire}               couleur="indigo" />
          <BlocValidation label="Validation DG"        montant={derValDg?.montant_valide}  commentaire={derValDg?.commentaire}                couleur="green" />
          <BlocValidation label="Décaissé par caissière" montant={decaiss?.montant_decaisse} commentaire={decaiss?.justification_si_inferieur} couleur="purple" />
        </div>
      )}

      {/* ══ REJETE_DFC ══ */}
      {s === 'REJETE_DFC' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <BlocDemandeur besoin={besoin} />
          <BlocRejet label="Motif de rejet DFC" motif={derValDfc?.commentaire} />
        </div>
      )}

      {/* ══ REJETE_DG ══ */}
      {s === 'REJETE_DG' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <BlocDemandeur besoin={besoin} />
          <BlocValidation label="Validation DFC" montant={derValDfc?.montant_valide} commentaire={derValDfc?.commentaire} couleur="indigo" />
          <BlocRejet label="Motif de rejet DG" motif={derValDg?.commentaire} />
        </div>
      )}

      {/* ══ BOUCLE ══ */}
      {s === 'BOUCLE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <BlocDemandeur besoin={besoin} />
            <BlocValidation label="Validation DFC"       montant={derValDfc?.montant_valide} commentaire={derValDfc?.commentaire}               couleur="indigo" />
            <BlocValidation label="Validation DG"        montant={derValDg?.montant_valide}  commentaire={derValDg?.commentaire}                couleur="green" />
            <BlocValidation label="Décaissé par caissière" montant={decaiss?.montant_decaisse} commentaire={decaiss?.justification_si_inferieur} couleur="purple" />
          </div>

          {/* Historique */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-6">Historique des étapes</h2>
            <div className="relative pl-7">
              <div className="absolute left-2.5 top-1 bottom-1 w-0.5 bg-gray-200 rounded-full" />
              <div className="space-y-7">
                {[
                  { label: 'Besoin soumis',         date: besoin.created_at,        dot: 'bg-blue-500' },
                  derValDfc ? { label: 'Validé par DFC',   date: derValDfc.created_at,     dot: 'bg-indigo-500' } : null,
                  derValDg  ? { label: 'Validé par DG',    date: derValDg.created_at,      dot: 'bg-green-500' } : null,
                  decaiss   ? { label: 'Décaissé',          date: decaiss.created_at,       dot: 'bg-purple-500' } : null,
                  retour    ? { label: 'Retour caisse confirmé', date: retour.date_confirmation ?? retour.created_at, dot: 'bg-orange-500' } : null,
                ].filter(Boolean).map((e, i) => (
                  <div key={i} className="relative flex items-start gap-4">
                    <div className={`absolute -left-7 mt-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${e.dot}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{e.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDateTime(e.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </EmployeLayout>
  )
}