import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import JustifLayout from '@/components/besoins/justif/JustifLayout'

const STATUT_STYLE = {
  DECAISSE:                 'bg-purple-100 text-purple-700',
  EN_ATTENTE_RETOUR_CAISSE: 'bg-amber-100 text-amber-700',
  BOUCLE:                   'bg-gray-100 text-gray-500',
}

const STATUT_LABEL = {
  DECAISSE:                 'En attente de justificatif',
  EN_ATTENTE_RETOUR_CAISSE: 'Retour caisse attendu',
  BOUCLE:                   'Bouclé',
}

export default function JustifDashboard() {
  const navigate = useNavigate()

  const [enAttente, setEnAttente]   = useState([])
  const [historique, setHistorique] = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data: besoins } = await supabase
        .from('besoins')
        .select(`
          id, numero, montant_demande, description, statut, created_at,
          profiles!employe_id(nom, prenom, departements(nom)),
          decaissements(montant_decaisse, created_at,
            profiles!caissiere_id(nom, prenom)
          ),
          justificatifs(id)
        `)
        .in('statut', ['DECAISSE', 'EN_ATTENTE_RETOUR_CAISSE', 'BOUCLE'])
        .order('created_at', { ascending: false })

      if (besoins) {
        // En attente = DECAISSE sans justificatif déjà saisi
        const enAttenteList = besoins.filter(
          b => b.statut === 'DECAISSE' && (!b.justificatifs || b.justificatifs.length === 0)
        )
        // Historique = ceux déjà traités ou avec justificatif
        const historiqueList = besoins.filter(
          b => b.statut === 'BOUCLE' ||
               b.statut === 'EN_ATTENTE_RETOUR_CAISSE' ||
               (b.statut === 'DECAISSE' && b.justificatifs?.length > 0)
        )
        setEnAttente(enAttenteList)
        setHistorique(historiqueList)
      }
      setLoading(false)
    }
    load()
  }, [])

  const getMontantDecaisse = (besoin) => {
    return besoin.decaissements?.[0]?.montant_decaisse ?? 0
  }

  const BesoinTable = ({ besoins, title, badge, showAction = false }) => (
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
                {['Numéro', 'Employé', 'Département', 'Description', 'Montant décaissé', 'Date décaissement', 'Statut', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {besoins.map(b => (
                <tr
                  key={b.id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/justif/besoin/${b.id}`)}
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
                    {Number(getMontantDecaisse(b)).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {b.decaissements?.[0]?.created_at
                      ? new Date(b.decaissements[0].created_at).toLocaleDateString('fr-FR')
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUT_STYLE[b.statut] ?? ''}`}>
                      {STATUT_LABEL[b.statut] ?? b.statut.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {showAction && (
                      <span className="text-orange-600 text-xs font-medium hover:underline">
                        Saisir justificatif →
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
    <JustifLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Tableau de bord Justificatifs</h1>

      {loading ? (
        <p className="text-gray-400 text-center py-10">Chargement...</p>
      ) : (
        <>
          <BesoinTable
            besoins={enAttente}
            title="En attente de justificatif"
            badge="bg-purple-100 text-purple-700"
            showAction
          />

          {historique.length > 0 && (
            <BesoinTable
              besoins={historique}
              title="Historique"
              badge="bg-gray-100 text-gray-600"
            />
          )}
        </>
      )}
    </JustifLayout>
  )
}