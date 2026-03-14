import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import CaissiereLayout from '@/components/besoins/caissiere/CaissiereLayout'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '—'
const fmtDT = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR') + ' · ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const STATUT_LABEL = {
  VALIDE_DG:                'À décaisser',
  DECAISSE:                 'Décaissé',
  EN_ATTENTE_RETOUR_CAISSE: 'Retour attendu',
  BOUCLE:                   'Bouclé',
}
const STATUT_STYLE = {
  VALIDE_DG:                'bg-green-100 text-green-700',
  DECAISSE:                 'bg-purple-100 text-purple-700',
  EN_ATTENTE_RETOUR_CAISSE: 'bg-amber-100 text-amber-700',
  BOUCLE:                   'bg-gray-100 text-gray-500',
}

const COLS = ['Numéro','Entreprise','Employé','Département','Service','Montant validé DG','Caisse','Date & Heure','Statut','']

export default function CaissiereDashboard() {
  const navigate  = useNavigate()
  const { user, profile } = useAuth()
  const [besoins, setBesoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [actif, setActif]     = useState('DECAISSER')

  // Infos caisse du responsable connecté
  const nomCaisse     = profile?.caisses?.nom ?? '—'
  const nomResponsable = `${profile?.prenom ?? ''} ${profile?.nom ?? ''}`.trim()
  const nomEntreprise  = profile?.entreprises?.nom ?? '—'
  const nomDepartement = profile?.departements?.nom ?? '—'
  const nomService     = profile?.services?.nom ?? null

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_besoins_caissiere')

      if (error) {
        console.error('[CaissiereDashboard] RPC error:', error.message)
        // Fallback sans filtre caisse
        const { data: fallback } = await supabase
          .from('besoins')
          .select('id, numero, montant_demande, description, statut, created_at, employe_id')
          .in('statut', ['VALIDE_DG','DECAISSE','EN_ATTENTE_RETOUR_CAISSE','BOUCLE'])
          .order('created_at', { ascending: false })
        setBesoins((fallback ?? []).map(b => ({ ...b, _fromFallback: true })))
      } else {
        setBesoins(data ?? [])
      }
      setLoading(false)
    }
    load()
  }, [user])

  const aDecaisser    = besoins.filter(b => b.statut === 'VALIDE_DG')
  const retourAttente = besoins.filter(b => b.statut === 'EN_ATTENTE_RETOUR_CAISSE')
  const historique    = besoins.filter(b => ['DECAISSE','BOUCLE'].includes(b.statut))

  const displayed = actif === 'DECAISSER' ? aDecaisser
    : actif === 'RETOUR'   ? retourAttente
    : historique

  const BLOCS = [
    {
      key: 'HISTORIQUE',
      titre: 'Historique des décaissements',
      count: historique.length,
      bg: 'bg-gray-50', activeBorder: 'border-gray-400', dot: 'bg-gray-400',
      titleColor: 'text-gray-700', badge: 'bg-gray-200 text-gray-600',
    },
    {
      key: 'DECAISSER',
      titre: 'À décaisser — Validés par le DG',
      count: aDecaisser.length,
      bg: 'bg-green-50', activeBorder: 'border-green-500', dot: 'bg-green-500',
      titleColor: 'text-green-800', badge: 'bg-green-100 text-green-700',
    },
    {
      key: 'RETOUR',
      titre: 'Retours en caisse attendus',
      count: retourAttente.length,
      bg: 'bg-amber-50', activeBorder: 'border-amber-500', dot: 'bg-amber-500',
      titleColor: 'text-amber-800', badge: 'bg-amber-100 text-amber-700',
    },
  ]

  return (
    <CaissiereLayout>

      {/* ── En-tête dynamique caisse ── */}
      <div className='mb-8'>
        <p className='text-xs font-bold uppercase tracking-widest text-teal-500 mb-1'>Caisse</p>
        <h1 className='text-3xl font-black text-gray-900 tracking-tight'>{nomCaisse}</h1>
        <div className='mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-gray-500'>
          <span className='font-semibold text-gray-700'>{nomResponsable}</span>
          <span className='text-gray-300'>·</span>
          <span>{nomEntreprise}</span>
          <span className='text-gray-300'>·</span>
          <span>{nomDepartement}</span>
        </div>
        {nomService && (
          <p className='text-xs text-gray-400 mt-1'>
            Responsable <span className='font-semibold text-gray-600'>{nomService}</span>
          </p>
        )}
      </div>

      {/* ── Blocs catégories ── */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-8'>
        {BLOCS.map(b => (
          <div key={b.key} onClick={() => setActif(b.key)}
            className={`text-left p-5 rounded-xl border-2 transition-all cursor-pointer ${b.bg}
              ${actif === b.key ? b.activeBorder : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className='flex items-center justify-between mb-3'>
              <div className={`w-3 h-3 rounded-full ${b.dot}`} />
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${b.badge}`}>{b.count}</span>
            </div>
            <p className={`text-sm font-bold leading-snug ${b.titleColor}`}>{b.titre}</p>
          </div>
        ))}
      </div>

      {/* ── Tableau ── */}
      {loading ? (
        <div className='flex items-center justify-center py-16'>
          <div className='w-7 h-7 border-4 border-gray-200 border-t-teal-500 rounded-full animate-spin' />
        </div>
      ) : (
        <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>
          <div className='px-5 py-4 border-b flex items-center gap-3'>
            <h2 className='font-semibold text-gray-700 text-sm'>
              {BLOCS.find(b => b.key === actif)?.titre}
            </h2>
            <span className='text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full'>
              {displayed.length}
            </span>
          </div>

          {displayed.length === 0 ? (
            <p className='text-gray-400 text-sm text-center py-12'>Aucun besoin dans cette catégorie</p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm min-w-[1100px]'>
                <thead className='bg-gray-50 border-b'>
                  <tr>
                    {COLS.map(h => (
                      <th key={h} className='text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider'>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-50'>
                  {displayed.map(b => (
                    <tr key={b.id}
                      onClick={() => navigate(`/besoins/caissiere/besoin/${b.id}`)}
                      className='cursor-pointer hover:bg-gray-50/50 transition-colors'>
                      <td className='px-4 py-3 font-mono text-xs text-teal-600 font-medium whitespace-nowrap'>{b.numero}</td>
                      <td className='px-4 py-3 text-gray-600 text-xs'>{b.entreprise_nom ?? '—'}</td>
                      <td className='px-4 py-3 font-medium text-gray-700 whitespace-nowrap'>
                        {b.employe_prenom} {b.employe_nom}
                      </td>
                      <td className='px-4 py-3 text-gray-500 text-xs'>{b.departement_nom ?? '—'}</td>
                      <td className='px-4 py-3 text-gray-500 text-xs'>{b.service_nom ?? '—'}</td>
                      <td className='px-4 py-3 font-bold text-green-700 whitespace-nowrap'>
                        {fmt(b.montant_valide_dg ?? b.montant_demande)}
                      </td>
                      <td className='px-4 py-3 text-gray-500 text-xs'>{b.caisse_nom ?? '—'}</td>
                      <td className='px-4 py-3 text-gray-400 text-xs whitespace-nowrap'>{fmtDT(b.created_at)}</td>
                      <td className='px-4 py-3'>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUT_STYLE[b.statut] ?? ''}`}>
                          {STATUT_LABEL[b.statut] ?? b.statut}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-xs font-bold'>
                        {actif === 'DECAISSER'  && <span className='text-teal-600 uppercase'>Décaisser →</span>}
                        {actif === 'RETOUR'     && <span className='text-amber-600 uppercase'>Confirmer →</span>}
                        {actif === 'HISTORIQUE' && <span className='text-gray-400 uppercase'>Voir →</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </CaissiereLayout>
  )
}