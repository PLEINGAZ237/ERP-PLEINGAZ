import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import DGLayout from '@/components/besoins/dg/DGLayout'
import { Loader2 } from 'lucide-react'

const STATUT_STYLE = {
  EN_ATTENTE_DG: 'bg-blue-100 text-blue-700',
  VALIDE_DG:     'bg-emerald-100 text-emerald-700',
  REJETE_DG:     'bg-red-200 text-red-900',
}
const STATUT_LABEL = {
  EN_ATTENTE_DG: 'En attente',
  VALIDE_DG:     'Validé',
  REJETE_DG:     'Rejeté',
}
const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '—'

export default function DGDashboard() {
  const navigate = useNavigate()
  const [besoins, setBesoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('A_DECIDER')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('besoins')
        .select(`
          id, numero, montant_demande, description, statut, created_at,
          profiles!employe_id(nom, prenom, departements(nom)),
          validations_dfc(montant_valide, statut),
          validations_dg(montant_valide)
        `)
        .in('statut', ['EN_ATTENTE_DG', 'VALIDE_DG', 'REJETE_DG'])
        .order('created_at', { ascending: false })
      if (data) setBesoins(data)
      setLoading(false)
    }
    load()
  }, [])

  const stats = {
    aDecider: besoins.filter(b => b.statut === 'EN_ATTENTE_DG').length,
    valides:  besoins.filter(b => b.statut === 'VALIDE_DG').length,
    rejetes:  besoins.filter(b => b.statut === 'REJETE_DG').length,
  }

  const filtered = besoins.filter(b => {
    if (filtre === 'A_DECIDER') return b.statut === 'EN_ATTENTE_DG'
    if (filtre === 'VALIDES')   return b.statut === 'VALIDE_DG'
    if (filtre === 'REJETES')   return b.statut === 'REJETE_DG'
    return true
  })

  const StatCard = ({ label, value, color, filterKey }) => (
    <button
      onClick={() => setFiltre(filterKey)}
      className={`p-4 md:p-5 rounded-xl shadow-sm bg-white text-left transition-all w-full ${
        filtre === filterKey ? 'ring-2 ring-offset-1 ring-emerald-500' : 'hover:shadow-md'
      }`}
    >
      <p className={`text-${color}-600 text-[10px] md:text-xs font-bold uppercase`}>{label}</p>
      <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{value}</p>
    </button>
  )

  return (
    <DGLayout>
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Tableau de bord DG</h1>
      <p className="text-sm text-gray-400 mb-6">Validez les besoins soumis par le DFC.</p>

      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        <StatCard label="À décider" value={stats.aDecider} color="blue"    filterKey="A_DECIDER" />
        <StatCard label="Validés"   value={stats.valides}  color="emerald" filterKey="VALIDES" />
        <StatCard label="Rejetés"   value={stats.rejetes}  color="red"     filterKey="REJETES" />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="animate-spin mb-2" />
          <p className="text-sm">Chargement...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 md:px-5 py-3 md:py-4 border-b">
            <h2 className="font-semibold text-gray-700 text-sm md:text-base">
              {filtre === 'A_DECIDER' ? 'En attente de décision' : filtre === 'VALIDES' ? 'Validés' : 'Rejetés'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">{filtered.length}</span>
          </div>

          {filtered.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">Aucun besoin</p>
          ) : (
            <>
              {/* Mobile */}
              <div className="md:hidden divide-y divide-gray-50">
                {filtered.map(b => {
                  const montantDfc = b.validations_dfc?.[0]?.montant_valide
                  return (
                    <div key={b.id} onClick={() => navigate(`/besoins/dg/besoin/${b.id}`)} className="p-4 active:bg-gray-50 cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-mono text-xs text-emerald-600 font-medium">{b.numero}</p>
                          <p className="text-sm font-medium text-gray-800 mt-0.5">{b.profiles?.prenom} {b.profiles?.nom}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${STATUT_STYLE[b.statut] ?? ''}`}>
                          {STATUT_LABEL[b.statut]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mb-2">{b.description}</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-800">{fmt(b.montant_demande)}</p>
                          {montantDfc && <p className="text-[10px] text-indigo-500">DFC : {fmt(montantDfc)}</p>}
                        </div>
                        <p className="text-[10px] text-gray-400">{new Date(b.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Numéro','Employé','Département','Montant demandé','Avis DFC','Date','Statut'].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(b => {
                      const montantDfc = b.validations_dfc?.[0]?.montant_valide
                      return (
                        <tr key={b.id} className="hover:bg-gray-50/50 cursor-pointer transition-colors" onClick={() => navigate(`/besoins/dg/besoin/${b.id}`)}>
                          <td className="px-4 py-3.5 font-mono text-xs text-emerald-600 font-medium">{b.numero}</td>
                          <td className="px-4 py-3.5 font-medium text-gray-700">{b.profiles?.prenom} {b.profiles?.nom}</td>
                          <td className="px-4 py-3.5 text-gray-500">{b.profiles?.departements?.nom ?? '-'}</td>
                          <td className="px-4 py-3.5 text-gray-700 font-bold whitespace-nowrap">{fmt(b.montant_demande)}</td>
                          <td className="px-4 py-3.5">{montantDfc ? <span className="font-medium text-indigo-700">{fmt(montantDfc)}</span> : <span className="text-gray-400">—</span>}</td>
                          <td className="px-4 py-3.5 text-gray-400 text-xs whitespace-nowrap">{new Date(b.created_at).toLocaleDateString('fr-FR')}</td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUT_STYLE[b.statut] ?? ''}`}>
                              {STATUT_LABEL[b.statut]}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </DGLayout>
  )
}