import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import DFCLayout from '@/components/besoins/dfc/DFCLayout'
import { Loader2 } from 'lucide-react'

const STATUT_STYLE = {
  EN_ATTENTE_DFC: 'bg-amber-100 text-amber-700',
  EN_ATTENTE_DG:  'bg-blue-100 text-blue-700',
  REJETE_DFC:     'bg-red-100 text-red-700',
  VALIDE_DG:      'bg-emerald-100 text-emerald-700',
  REJETE_DG:      'bg-red-200 text-red-900',
  DECAISSE:       'bg-purple-100 text-purple-700',
  EN_ATTENTE_RETOUR_CAISSE: 'bg-amber-100 text-amber-700',
  BOUCLE:         'bg-gray-100 text-gray-500',
}

const STATUT_LABEL = {
  EN_ATTENTE_DFC: 'En attente DFC',
  EN_ATTENTE_DG:  'En attente DG',
  REJETE_DFC:     'Rejeté DFC',
  VALIDE_DG:      'Validé DG',
  REJETE_DG:      'Rejeté DG',
  DECAISSE:       'Décaissé',
  EN_ATTENTE_RETOUR_CAISSE: 'Retour caisse',
  BOUCLE:         'Bouclé',
}

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '—'

export default function DFCDashboard() {
  const navigate = useNavigate()
  const [besoins, setBesoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('EN_ATTENTE_DFC')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('besoins')
        .select(`
          id, numero, montant_demande, description, statut, created_at,
          profiles!employe_id(nom, prenom, departements(nom)),
          validations_dfc(montant_valide),
          validations_dg(montant_valide)
        `)
        .order('created_at', { ascending: false })
      if (data) setBesoins(data)
      setLoading(false)
    }
    load()
  }, [])

  const stats = {
    enAttente: besoins.filter(b => b.statut === 'EN_ATTENTE_DFC').length,
    valide:    besoins.filter(b => ['EN_ATTENTE_DG', 'VALIDE_DG'].includes(b.statut)).length,
    rejete:    besoins.filter(b => ['REJETE_DFC', 'REJETE_DG'].includes(b.statut)).length,
  }

  const filteredBesoins = besoins.filter(b => {
    if (filtre === 'EN_ATTENTE_DFC') return b.statut === 'EN_ATTENTE_DFC'
    if (filtre === 'VALIDES') return ['EN_ATTENTE_DG', 'VALIDE_DG'].includes(b.statut)
    if (filtre === 'REJETES') return ['REJETE_DFC', 'REJETE_DG'].includes(b.statut)
    return true
  })

  const getMontant = (b) => {
    if (filtre === 'VALIDES') {
      return b.statut === 'VALIDE_DG'
        ? b.validations_dg?.[b.validations_dg.length - 1]?.montant_valide
        : b.validations_dfc?.[b.validations_dfc.length - 1]?.montant_valide
    }
    return b.montant_demande
  }

  const montantLabel = filtre === 'VALIDES' ? 'Montant validé' : filtre === 'REJETES' ? 'Montant demandé' : 'Montant demandé'

  // Mapping des styles pour éviter les classes dynamiques cassées
  const STATS_CARDS = [
    { 
      key: 'EN_ATTENTE_DFC', 
      label: 'À traiter', 
      value: stats.enAttente, 
      border: 'border-amber-500 ring-amber-500/20',
      text: 'text-amber-600'
    },
    { 
      key: 'VALIDES', 
      label: 'Validés', 
      value: stats.valide, 
      border: 'border-green-500 ring-green-500/20',
      text: 'text-green-600'
    },
    { 
      key: 'REJETES', 
      label: 'Rejetés', 
      value: stats.rejete, 
      border: 'border-red-500 ring-red-500/20',
      text: 'text-red-600'
    },
  ]

  return (
    <DFCLayout>
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Tableau de bord DFC</h1>
      <p className="text-sm text-gray-400 mb-6">Validation et suivi des besoins.</p>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
        {STATS_CARDS.map(c => (
          <div
            key={c.key}
            onClick={() => setFiltre(c.key)}
            className={`p-3 md:p-4 rounded-xl shadow-sm bg-white border-2 cursor-pointer transition-all ${
              filtre === c.key ? `${c.border} ring-2` : 'border-transparent hover:border-gray-200'
            }`}
          >
            <p className={`${c.text} text-[10px] md:text-xs font-bold uppercase`}>{c.label}</p>
            <p className="text-xl md:text-2xl font-bold text-gray-800 mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <Loader2 className="animate-spin mb-2" />
          <p className="text-sm">Chargement...</p>
        </div>
      ) : filteredBesoins.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">Aucun besoin dans cette catégorie.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b">
            <h2 className="font-semibold text-gray-700 text-sm">
              {filtre === 'EN_ATTENTE_DFC' ? 'À traiter' : filtre === 'VALIDES' ? 'Validés / Suivi' : 'Rejetés'}
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              filtre === 'EN_ATTENTE_DFC' ? 'bg-amber-100 text-amber-700' :
              filtre === 'VALIDES' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
            }`}>{filteredBesoins.length}</span>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {filteredBesoins.map(b => (
              <div key={b.id} onClick={() => navigate(`/besoins/dfc/besoin/${b.id}`)} className="p-4 active:bg-gray-50 cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-mono text-xs text-emerald-600 font-medium">{b.numero}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUT_STYLE[b.statut] ?? ''}`}>
                    {STATUT_LABEL[b.statut] ?? b.statut}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800">{b.profiles?.prenom} {b.profiles?.nom}</p>
                <p className="text-xs text-gray-500 truncate">{b.description}</p>
                <div className="flex justify-between mt-2">
                  <p className="text-sm font-bold">{fmt(getMontant(b))}</p>
                  <p className="text-[10px] text-gray-400">{new Date(b.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Numéro', 'Employé', 'Département', 'Description', montantLabel, 'Date', 'Statut'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredBesoins.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50/50 cursor-pointer transition-colors" onClick={() => navigate(`/besoins/dfc/besoin/${b.id}`)}>
                    <td className="px-4 py-3 font-mono text-xs text-emerald-600">{b.numero}</td>
                    <td className="px-4 py-3 font-medium text-gray-700">{b.profiles?.prenom} {b.profiles?.nom}</td>
                    <td className="px-4 py-3 text-gray-500">{b.profiles?.departements?.nom ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-200px truncate">{b.description}</td>
                    <td className="px-4 py-3 font-bold whitespace-nowrap">{fmt(getMontant(b))}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(b.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUT_STYLE[b.statut] ?? ''}`}>
                        {STATUT_LABEL[b.statut] ?? b.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DFCLayout>
  )
}