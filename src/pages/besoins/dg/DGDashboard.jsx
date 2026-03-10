import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import DGLayout from '@/components/besoins/dg/DGLayout'

const STATUT_STYLE = {
  EN_ATTENTE_DFC: 'bg-amber-100 text-amber-700',
  EN_ATTENTE_DG:  'bg-blue-100 text-blue-700',
  VALIDE_DG:      'bg-emerald-100 text-emerald-700',
  REJETE_DFC:     'bg-red-100 text-red-700',
  REJETE_DG:      'bg-red-200 text-red-900 border border-red-300',
  DECAISSE:       'bg-purple-100 text-purple-700',
}

const STATUT_LABEL = {
  EN_ATTENTE_DFC: 'En attente DFC',
  EN_ATTENTE_DG:  'En attente votre validation',
  VALIDE_DG:      'Validé — En attente décaissement',
  REJETE_DFC:     'Rejeté par DFC',
  REJETE_DG:      'Rejeté par vous (DG)',
  DECAISSE:       'Décaissé / Terminé',
}

export default function DGDashboard() {
  const navigate = useNavigate()
  const [besoins, setBesoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('TOUT')

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
        .order('created_at', { ascending: false })
      if (data) setBesoins(data)
      setLoading(false)
    }
    load()
  }, [])

  const stats = {
    total: besoins.length,
    aDecider: besoins.filter(b => b.statut === 'EN_ATTENTE_DG').length,
    valides: besoins.filter(b => b.statut === 'VALIDE_DG').length,
    rejetes: besoins.filter(b => b.statut === 'REJETE_DG').length,
  }

  const BesoinTable = ({ data, title, badgeColor }) => (
    <div className="bg-white rounded-xl shadow mb-6 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h2 className="font-semibold text-gray-700">{title}</h2>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badgeColor}`}>{data.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Numéro</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Employé</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Montant</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Avis DFC</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Date</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500">Statut</th>
            </tr>
          </thead>
          <tbody>
            {data.map(b => {
              const montantDfc = b.validations_dfc?.[0]?.montant_valide
              const montantDg = b.validations_dg?.[0]?.montant_valide
              
              // LOGIQUE : Montant DG si validé, sinon montant initial
              const estValideOuDecaisse = ['VALIDE_DG', 'DECAISSE'].includes(b.statut)
              const montantAffiche = estValideOuDecaisse ? (montantDg || b.montant_demande) : b.montant_demande

              return (
                <tr key={b.id} className="border-b hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate(`/dg/besoin/${b.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.numero}</td>
                  <td className="px-4 py-3 font-medium text-gray-700">{b.profiles?.prenom} {b.profiles?.nom}</td>
                  <td className="px-4 py-3 text-gray-600 font-bold">{Number(montantAffiche).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    {montantDfc 
                      ? <span className="font-medium text-indigo-700">{Number(montantDfc).toLocaleString('fr-FR')}</span> 
                      : <span className="text-gray-400">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(b.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUT_STYLE[b.statut]}`}>
                      {STATUT_LABEL[b.statut]}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <DGLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Tableau de bord DG</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div onClick={() => setFiltre('TOUT')} className={`p-4 rounded-xl shadow bg-white border-2 cursor-pointer transition-all ${filtre === 'TOUT' ? 'border-emerald-600' : 'border-transparent'}`}>
            <p className="text-gray-500 text-[10px] font-bold uppercase">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div onClick={() => setFiltre('A_DECIDER')} className={`p-4 rounded-xl shadow bg-white border-2 cursor-pointer transition-all ${filtre === 'A_DECIDER' ? 'border-blue-600' : 'border-transparent'}`}>
            <p className="text-blue-600 text-[10px] font-bold uppercase">À décider</p>
            <p className="text-2xl font-bold">{stats.aDecider}</p>
          </div>
          <div onClick={() => setFiltre('VALIDES')} className={`p-4 rounded-xl shadow bg-white border-2 cursor-pointer transition-all ${filtre === 'VALIDES' ? 'border-emerald-600' : 'border-transparent'}`}>
            <p className="text-emerald-600 text-[10px] font-bold uppercase">Validés</p>
            <p className="text-2xl font-bold">{stats.valides}</p>
          </div>
          <div onClick={() => setFiltre('REJETES')} className={`p-4 rounded-xl shadow bg-white border-2 cursor-pointer transition-all ${filtre === 'REJETES' ? 'border-red-600' : 'border-transparent'}`}>
            <p className="text-red-600 text-[10px] font-bold uppercase">Rejetés</p>
            <p className="text-2xl font-bold">{stats.rejetes}</p>
          </div>
        </div>

        {loading ? <p className="text-center py-10 text-gray-400 italic text-sm">Chargement des données...</p> : (
          <div className="space-y-6">
            {(filtre === 'TOUT' || filtre === 'A_DECIDER') && (
              <BesoinTable data={besoins.filter(b => ['EN_ATTENTE_DFC', 'EN_ATTENTE_DG'].includes(b.statut))} title="Besoins en attente de signature" badgeColor="bg-blue-100 text-blue-700" />
            )}
            {(filtre === 'TOUT' || filtre === 'VALIDES') && (
              <BesoinTable data={besoins.filter(b => ['VALIDE_DG', 'DECAISSE'].includes(b.statut))} title="Besoins validés & Décaissements" badgeColor="bg-emerald-100 text-emerald-700" />
            )}
            {(filtre === 'TOUT' || filtre === 'REJETES') && (
              <BesoinTable data={besoins.filter(b => b.statut === 'REJETE_DG')} title="Historique des rejets" badgeColor="bg-red-100 text-red-700" />
            )}
          </div>
        )}
      </div>
    </DGLayout>
  )
}