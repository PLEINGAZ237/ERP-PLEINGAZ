import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DGCommLayout from '@/components/commercial/DGCommLayout'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function RapportsCaisse({ Layout = DGCommLayout }) {
  const [journees, setJournees] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [mouvements, setMouvements] = useState({})

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase.from('journees_caisse')
        .select('*, caisses(nom), profiles!ouverte_par(nom, prenom)')
        .order('date_journee', { ascending: false })
      setJournees(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

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

  const TYPE_LABELS = { encaissement: 'Encaissement', decaissement: 'Décaissement', versement_banque: 'Versement banque', transfert_in: 'Transfert entrant', transfert_out: 'Transfert sortant' }

  if (loading) return <Layout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" size={28} /></div></Layout>

  return (
    <Layout>
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Rapports caisse</h1>
      <p className="text-sm text-gray-400 mb-6">Historique des journées de caisse avec détails des mouvements.</p>

      {journees.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">Aucune journée de caisse.</p>
      ) : (
        <div className="space-y-3">
          {journees.map(jc => {
            const soldeTheo = jc.solde_ouverture + jc.total_encaissements - jc.total_decaissements - jc.total_versements + jc.total_transferts_in - jc.total_transferts_out
            const isOpen = expanded === jc.id
            return (
              <div key={jc.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/50" onClick={() => toggleExpand(jc.id)}>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{jc.caisses?.nom}</p>
                    <p className="text-xs text-gray-400">{new Date(jc.date_journee).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-400">Ouverture: {fmt(jc.solde_ouverture)}</p>
                      <p className="text-sm font-bold text-gray-800">Clôture: {fmt(jc.solde_cloture ?? soldeTheo)}</p>
                      {jc.ecart !== 0 && jc.ecart !== null && <p className={`text-xs font-bold ${jc.ecart > 0 ? 'text-green-600' : 'text-red-600'}`}>Écart: {fmt(jc.ecart)}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${jc.statut === 'CLOTUREE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {jc.statut === 'CLOTUREE' ? 'Clôturée' : 'Ouverte'}
                    </span>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t px-5 py-4 bg-gray-50/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <p className="text-[10px] font-bold text-green-600 uppercase">Encaissements</p>
                        <p className="text-sm font-bold text-green-700">+{fmt(jc.total_encaissements)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <p className="text-[10px] font-bold text-red-600 uppercase">Décaissements</p>
                        <p className="text-sm font-bold text-red-700">-{fmt(jc.total_decaissements)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <p className="text-[10px] font-bold text-blue-600 uppercase">Versements banque</p>
                        <p className="text-sm font-bold text-blue-700">-{fmt(jc.total_versements)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Transferts (in/out)</p>
                        <p className="text-sm font-bold text-gray-700">+{fmt(jc.total_transferts_in)} / -{fmt(jc.total_transferts_out)}</p>
                      </div>
                    </div>

                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Détail des mouvements</p>
                    {(mouvements[jc.id] ?? []).length === 0 ? (
                      <p className="text-xs text-gray-400">Aucun mouvement.</p>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {(mouvements[jc.id] ?? []).map(m => (
                          <div key={m.id} className="py-2 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-gray-700">{TYPE_LABELS[m.type]} — {m.description ?? '—'}</p>
                              <p className="text-[10px] text-gray-400">{m.profiles?.prenom} {m.profiles?.nom} · {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <p className={`text-xs font-bold ${['encaissement', 'transfert_in'].includes(m.type) ? 'text-green-600' : 'text-red-600'}`}>
                              {['encaissement', 'transfert_in'].includes(m.type) ? '+' : '-'}{fmt(m.montant)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
