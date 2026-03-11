import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import EmployeLayout from '@/components/besoins/employe/EmployeLayout'

const STATUT_STYLE = {
  EN_ATTENTE_DFC:          'bg-amber-100 text-amber-700',
  EN_ATTENTE_DG:           'bg-blue-100 text-blue-700',
  VALIDE_DG:               'bg-green-100 text-green-700',
  REJETE_DFC:              'bg-red-100 text-red-700',
  REJETE_DG:               'bg-red-100 text-red-700',
  DECAISSE:                'bg-purple-100 text-purple-700',
  EN_ATTENTE_RETOUR_CAISSE:'bg-orange-100 text-orange-700',
  BOUCLE:                  'bg-gray-100 text-gray-700',
}

export default function EmployeDashboard() {
  const { profile } = useAuth()
  const [besoins, setBesoins] = useState([])
  const [stats, setStats] = useState({ total: 0, en_cours: 0, boucles: 0 })

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('besoins')
        .select('id, numero, montant_demande, statut, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
      if (data) {
        setBesoins(data)
        setStats({
          total:    data.length,
          en_cours: data.filter(b => !['BOUCLE','REJETE_DFC','REJETE_DG'].includes(b.statut)).length,
          boucles:  data.filter(b => b.statut === 'BOUCLE').length,
        })
      }
    }
    load()
  }, [])

  return (
    <EmployeLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Bonjour, {profile?.prenom || 'Employé'} 👋
      </h1>
      <p className="text-gray-500 mb-8 text-sm">
        {profile?.entreprises?.nom ?? ''} — {profile?.departements?.nom ?? ''}
      </p>

      {/* Cartes stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Besoins créés',   value: stats.total,    color: 'blue' },
          { label: 'En cours',        value: stats.en_cours, color: 'amber' },
          { label: 'Bouclés',         value: stats.boucles,  color: 'green' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl shadow p-5">
            <p className="text-3xl font-bold text-gray-800">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Derniers besoins */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-700">Derniers besoins</h2>
          <Link to="/besoins/employe/mes-besoins" className="text-sm text-blue-600 hover:underline">
            Voir tout →
          </Link>
        </div>

        {besoins.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">Vous n'avez pas encore de besoins.</p>
            <Link
              to="/besoins/employe/creer-besoin"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              Créer mon premier besoin
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left border-b">
              <tr>
                {['Numéro','Montant','Statut','Date'].map(h => (
                  <th key={h} className="pb-2 font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {besoins.map(b => (
                <tr key={b.id} className="border-b last:border-0">
                  <td className="py-2 font-mono text-xs text-gray-600">{b.numero}</td>
                  <td className="py-2 text-gray-700">
                    {Number(b.montant_demande).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_STYLE[b.statut] ?? ''}`}>
                      {b.statut.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-2 text-gray-400 text-xs">
                    {new Date(b.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </EmployeLayout>
  )
}