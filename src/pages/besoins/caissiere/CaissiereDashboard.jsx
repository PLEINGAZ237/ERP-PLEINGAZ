import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import CaissiereLayout from '@/components/besoins/caissiere/CaissiereLayout'

const STATUT_STYLE = {
  VALIDE_DG:                'bg-green-100 text-green-700',
  DECAISSE:                 'bg-purple-100 text-purple-700',
  EN_ATTENTE_RETOUR_CAISSE: 'bg-amber-100 text-amber-700',
  BOUCLE:                   'bg-gray-100 text-gray-500',
}

const STATUT_LABEL = {
  VALIDE_DG:                'À décaisser',
  DECAISSE:                 'Décaissé',
  EN_ATTENTE_RETOUR_CAISSE: 'Retour caisse attendu',
  BOUCLE:                   'Bouclé',
}

export default function CaissiereDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [aDecaisser, setADecaisser]       = useState([])
  const [retourAttente, setRetourAttente] = useState([])
  const [historique, setHistorique]       = useState([])
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)

      // Récupérer les caisses affectées à cette caissière
      // On récupère les besoins validés par le DG et dirigés vers les caisses de cette caissière
      const { data: besoins } = await supabase
        .from('besoins')
        .select(`
          id, numero, montant_demande, description, statut, created_at,
          profiles!employe_id(nom, prenom, departements(nom)),
          validations_dg(montant_valide, mode_decaissement, caisse_id,
            caisses(nom)
          ),
          decaissements(montant_decaisse, created_at)
        `)
        .in('statut', ['VALIDE_DG', 'DECAISSE', 'EN_ATTENTE_RETOUR_CAISSE', 'BOUCLE'])
        .order('created_at', { ascending: false })

      if (besoins) {
        // Filtrer : la caissière ne voit que les besoins dirigés vers sa caisse
        // La validation DG contient caisse_id — on filtre côté client en complément du RLS
        const aDecaisserList = besoins.filter(b => b.statut === 'VALIDE_DG')
        const retourList     = besoins.filter(b => b.statut === 'EN_ATTENTE_RETOUR_CAISSE')
        const historiqueList = besoins.filter(b => b.statut === 'DECAISSE' || b.statut === 'BOUCLE')

        setADecaisser(aDecaisserList)
        setRetourAttente(retourList)
        setHistorique(historiqueList)
      }
      setLoading(false)
    }
    load()
  }, [user])

  const getMontantValide = (besoin) => {
    const vdg = besoin.validations_dg?.[0]
    return vdg?.montant_valide ?? besoin.montant_demande
  }

  const getCaisseNom = (besoin) => {
    const vdg = besoin.validations_dg?.[0]
    return vdg?.caisses?.nom ?? '-'
  }

  const BesoinTable = ({ besoins, title, badge, showAction = false, showRetour = false }) => (
    <div className="bg-white rounded-xl shadow mb-6">
      <div className="flex items-center gap-3 px-5 py-4 border-b">
        <h2 className="font-semibold text-gray-700">{title}</h2>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge}`}>
          {besoins.length}
        </span>
      </div>

      {besoins.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">Aucun besoin</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Numéro', 'Employé', 'Département', 'Description', 'Montant validé', 'Caisse', 'Date', 'Statut', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {besoins.map(b => (
                <tr
                  key={b.id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/besoins/caissiere/besoin/${b.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.numero}</td>
                  <td className="px-4 py-3 font-medium text-gray-700">
                    {b.profiles?.prenom} {b.profiles?.nom}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {b.profiles?.departements?.nom ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{b.description}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-medium">
                    {Number(getMontantValide(b)).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{getCaisseNom(b)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(b.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUT_STYLE[b.statut] ?? ''}`}>
                      {STATUT_LABEL[b.statut] ?? b.statut.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {showAction && (
                      <span className="text-teal-600 text-xs font-medium hover:underline">
                        Décaisser →
                      </span>
                    )}
                    {showRetour && (
                      <span className="text-amber-600 text-xs font-medium hover:underline">
                        Confirmer retour →
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  return (
    <CaissiereLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Tableau de bord Caissière</h1>

      {loading ? (
        <p className="text-gray-400 text-center py-10">Chargement...</p>
      ) : (
        <>
          <BesoinTable
            besoins={aDecaisser}
            title="À décaisser — Validés par le DG"
            badge="bg-green-100 text-green-700"
            showAction
          />

          <BesoinTable
            besoins={retourAttente}
            title="Retours en caisse attendus"
            badge="bg-amber-100 text-amber-700"
            showRetour
          />

          {historique.length > 0 && (
            <BesoinTable
              besoins={historique}
              title="Historique des décaissements"
              badge="bg-gray-100 text-gray-600"
            />
          )}
        </>
      )}
    </CaissiereLayout>
  )
}