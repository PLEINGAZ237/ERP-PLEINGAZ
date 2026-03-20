import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import JustifLayout from '@/components/besoins/justif/JustifLayout'
import { Loader2 } from 'lucide-react'

const STATUT_STYLE = {
  DECAISSE:                 'bg-purple-100 text-purple-700',
  EN_ATTENTE_RETOUR_CAISSE: 'bg-amber-100 text-amber-700',
  BOUCLE:                   'bg-gray-100 text-gray-500',
}
const STATUT_LABEL = {
  DECAISSE:                 'En attente justificatif',
  EN_ATTENTE_RETOUR_CAISSE: 'Retour caisse attendu',
  BOUCLE:                   'Bouclé',
}
const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' FCFA'

export default function JustifDashboard() {
  const navigate = useNavigate()
  const [enAttente, setEnAttente] = useState([])
  const [historique, setHistorique] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('attente')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('besoins')
        .select(`
          id, numero, montant_demande, description, statut, created_at,
          profiles!employe_id(nom, prenom, departements(nom)),
          decaissements(montant_decaisse, created_at,
            justificatifs(id, numero_facture, montant_facture, created_at)
          )
        `)
        .order('created_at', { ascending: false })

      const besoins = (data ?? []).filter(b =>
        ['DECAISSE', 'EN_ATTENTE_RETOUR_CAISSE', 'BOUCLE'].includes(b.statut)
      )

      const aDesJustificatifs = (b) => {
        const justifs = b.decaissements?.[0]?.justificatifs
        return justifs && justifs.length > 0
      }

      setEnAttente(besoins.filter(b => b.statut === 'DECAISSE' && !aDesJustificatifs(b)))
      setHistorique(besoins.filter(b =>
        b.statut === 'BOUCLE' || b.statut === 'EN_ATTENTE_RETOUR_CAISSE' ||
        (b.statut === 'DECAISSE' && aDesJustificatifs(b))
      ))
      setLoading(false)
    }
    load()
  }, [])

  const currentList = filtre === 'attente' ? enAttente : historique
  const getMontantDecaisse = (b) => b.decaissements?.[0]?.montant_decaisse ?? 0

  return (
    <JustifLayout>
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Justificatifs</h1>
      <p className="text-sm text-gray-400 mb-6">Saisie et suivi des justificatifs de dépenses.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
        <div onClick={() => setFiltre('attente')}
          className={`p-3 md:p-4 rounded-xl shadow-sm bg-white border-2 cursor-pointer transition-all ${
            filtre === 'attente' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-transparent hover:border-gray-200'
          }`}>
          <p className="text-purple-600 text-[10px] md:text-xs font-bold uppercase">À saisir</p>
          <p className="text-xl md:text-2xl font-bold text-gray-800 mt-1">{enAttente.length}</p>
        </div>
        <div onClick={() => setFiltre('historique')}
          className={`p-3 md:p-4 rounded-xl shadow-sm bg-white border-2 cursor-pointer transition-all ${
            filtre === 'historique' ? 'border-gray-500 ring-2 ring-gray-500/20' : 'border-transparent hover:border-gray-200'
          }`}>
          <p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase">Historique</p>
          <p className="text-xl md:text-2xl font-bold text-gray-800 mt-1">{historique.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <Loader2 className="animate-spin mb-2" /><p className="text-sm">Chargement...</p>
        </div>
      ) : currentList.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">
          {filtre === 'attente' ? 'Aucun justificatif à saisir.' : 'Aucun historique.'}
        </p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b">
            <h2 className="font-semibold text-gray-700 text-sm">
              {filtre === 'attente' ? 'En attente de justificatif' : 'Historique'}
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              filtre === 'attente' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
            }`}>{currentList.length}</span>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {currentList.map(b => (
              <div key={b.id} onClick={() => navigate(`/besoins/justif/besoin/${b.id}`)} className="p-4 active:bg-gray-50 cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-mono text-xs text-orange-600 font-medium">{b.numero}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUT_STYLE[b.statut] ?? ''}`}>
                    {STATUT_LABEL[b.statut] ?? b.statut}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800">{b.profiles?.prenom} {b.profiles?.nom}</p>
                <p className="text-xs text-gray-500 truncate">{b.description}</p>
                <div className="flex justify-between mt-2">
                  <p className="text-sm font-bold text-purple-700">{fmt(getMontantDecaisse(b))}</p>
                  <p className="text-[10px] text-gray-400">
                    {b.decaissements?.[0]?.created_at
                      ? new Date(b.decaissements[0].created_at).toLocaleDateString('fr-FR')
                      : '-'}
                  </p>
                </div>
                {filtre === 'attente' && (
                  <p className="text-[10px] text-orange-600 font-medium mt-1">Saisir justificatif →</p>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Numéro', 'Employé', 'Département', 'Description', 'Montant décaissé', 'Date', 'Statut', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentList.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/besoins/justif/besoin/${b.id}`)}>
                    <td className="px-4 py-3 font-mono text-xs text-orange-600">{b.numero}</td>
                    <td className="px-4 py-3 font-medium text-gray-700">{b.profiles?.prenom} {b.profiles?.nom}</td>
                    <td className="px-4 py-3 text-gray-500">{b.profiles?.departements?.nom ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{b.description}</td>
                    <td className="px-4 py-3 font-bold text-purple-700 whitespace-nowrap">{fmt(getMontantDecaisse(b))}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {b.decaissements?.[0]?.created_at
                        ? new Date(b.decaissements[0].created_at).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUT_STYLE[b.statut] ?? ''}`}>
                        {STATUT_LABEL[b.statut] ?? b.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {filtre === 'attente' && (
                        <span className="text-orange-600 text-xs font-medium">Saisir →</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </JustifLayout>
  )
}