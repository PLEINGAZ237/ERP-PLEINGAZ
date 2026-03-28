import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import CaisseLayout from '@/components/commercial/CaisseLayout'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

const TYPE_LABELS = {
  encaissement: 'Encaissement', decaissement: 'Décaissement',
  versement_banque: 'Versement banque', transfert_in: 'Transfert reçu', transfert_out: 'Transfert envoyé',
}

export default function MesRapportsCaisse() {
  const [caisses, setCaisses] = useState([])
  const [selectedCaisse, setSelectedCaisse] = useState('')
  const [journees, setJournees] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [mouvements, setMouvements] = useState({})

  useEffect(() => {
    const load = async () => {
      const { data: cs } = await supabase.from('caisses').select('id, nom').eq('statut', 'actif').order('nom')
      setCaisses(cs ?? [])
      if (cs?.length > 0) setSelectedCaisse(cs[0].id)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedCaisse) return
    const loadJournees = async () => {
      const { data } = await supabase.from('journees_caisse')
        .select('*, profiles!ouverte_par(nom, prenom)')
        .eq('caisse_id', selectedCaisse)
        .order('date_journee', { ascending: false })
        .limit(30)
      setJournees(data ?? [])
    }
    loadJournees()
  }, [selectedCaisse])

  const toggleExpand = async (jcId) => {
    if (expanded === jcId) { setExpanded(null); return }
    setExpanded(jcId)
    if (!mouvements[jcId]) {
      const { data } = await supabase.from('mouvements_caisse')
        .select('*, profiles!effectue_par(nom, prenom), banques(nom)')
        .eq('journee_caisse_id', jcId)
        .order('created_at')
      setMouvements(prev => ({ ...prev, [jcId]: data ?? [] }))
    }
  }

  if (loading) return <CaisseLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" size={28} /></div></CaisseLayout>

  return (
    <CaisseLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Mes rapports de caisse</h1>
          <p className="text-sm text-gray-400">Historique avec solde cumulé à chaque opération.</p>
        </div>
        <select value={selectedCaisse} onChange={e => setSelectedCaisse(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none">
          {caisses.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
      </div>

      {journees.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">Aucune journée de caisse.</p>
      ) : (
        <div className="space-y-3">
          {journees.map(jc => {
            const isOpen = expanded === jc.id
            const mvts = mouvements[jc.id] ?? []

            // Calculer solde cumulé ligne par ligne
            let soldeCumule = jc.solde_ouverture
            const mvtsAvecSolde = mvts.map(m => {
              if (['encaissement', 'transfert_in'].includes(m.type)) {
                soldeCumule += Number(m.montant)
              } else {
                soldeCumule -= Number(m.montant)
              }
              return { ...m, solde_apres: soldeCumule }
            })

            return (
              <div key={jc.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/50" onClick={() => toggleExpand(jc.id)}>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{new Date(jc.date_journee).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <p className="text-xs text-gray-400">{jc.profiles?.prenom} {jc.profiles?.nom}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-400">Ouverture: {fmt(jc.solde_ouverture)}</p>
                      <p className="text-sm font-bold text-gray-800">Clôture: {fmt(jc.solde_cloture ?? (jc.solde_ouverture + jc.total_encaissements - jc.total_decaissements - jc.total_versements + jc.total_transferts_in - jc.total_transferts_out))}</p>
                      {jc.ecart !== 0 && jc.ecart !== null && <p className={`text-xs font-bold ${jc.ecart > 0 ? 'text-green-600' : 'text-red-600'}`}>Écart: {fmt(jc.ecart)}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      jc.statut === 'VALIDEE' ? 'bg-green-100 text-green-700' :
                      jc.statut === 'CLOTUREE' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>{jc.statut}</span>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t bg-gray-50/50">
                    {/* Résumé */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-5 py-4">
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <p className="text-[10px] font-bold text-green-600 uppercase">Encaissements</p>
                        <p className="text-sm font-bold text-green-700">+{fmt(jc.total_encaissements)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <p className="text-[10px] font-bold text-red-600 uppercase">Décaissements</p>
                        <p className="text-sm font-bold text-red-700">-{fmt(jc.total_decaissements)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <p className="text-[10px] font-bold text-blue-600 uppercase">Versements</p>
                        <p className="text-sm font-bold text-blue-700">-{fmt(jc.total_versements)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Transferts</p>
                        <p className="text-sm font-bold text-gray-700">+{fmt(jc.total_transferts_in)} / -{fmt(jc.total_transferts_out)}</p>
                      </div>
                    </div>

                    {/* Détail avec solde cumulé */}
                    <div className="px-5 pb-4">
                      <table className="w-full text-xs">
                        <thead className="bg-white border-b"><tr>
                          {['Heure', 'Type', 'Description', 'Montant', 'Solde après'].map(h => (
                            <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          <tr className="bg-amber-50">
                            <td className="px-3 py-2 text-gray-400">—</td>
                            <td className="px-3 py-2 font-bold text-amber-700">Solde d'ouverture</td>
                            <td className="px-3 py-2"></td>
                            <td className="px-3 py-2"></td>
                            <td className="px-3 py-2 font-bold text-amber-800">{fmt(jc.solde_ouverture)}</td>
                          </tr>
                          {mvtsAvecSolde.map(m => (
                            <tr key={m.id} className="border-t border-gray-100">
                              <td className="px-3 py-2 text-gray-400">{new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="px-3 py-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  ['encaissement', 'transfert_in'].includes(m.type) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>{TYPE_LABELS[m.type]}</span>
                              </td>
                              <td className="px-3 py-2 text-gray-600">{m.description ?? '—'}</td>
                              <td className={`px-3 py-2 font-bold ${['encaissement', 'transfert_in'].includes(m.type) ? 'text-green-600' : 'text-red-600'}`}>
                                {['encaissement', 'transfert_in'].includes(m.type) ? '+' : '-'}{fmt(m.montant)}
                              </td>
                              <td className="px-3 py-2 font-bold text-gray-800">{fmt(m.solde_apres)}</td>
                            </tr>
                          ))}
                          {jc.solde_cloture !== null && (
                            <tr className="bg-gray-100 border-t-2 border-gray-300">
                              <td className="px-3 py-2 text-gray-400">—</td>
                              <td className="px-3 py-2 font-bold text-gray-700">Solde de clôture</td>
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2 font-bold text-gray-800">{fmt(jc.solde_cloture)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </CaisseLayout>
  )
}
