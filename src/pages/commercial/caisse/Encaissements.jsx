import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import CaisseLayout from '@/components/commercial/CaisseLayout'
import { Loader2, Search } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function Encaissements() {
  const [reglements, setReglements] = useState([])
  const [loading, setLoading] = useState(true)
  const [modeFilter, setModeFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase.from('reglements')
        .select('*, factures(numero, commandes(clients(nom_interne))), profiles!encaisse_par(nom, prenom), banques(nom), caisses(nom)')
        .order('created_at', { ascending: false })
      setReglements(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = modeFilter ? reglements.filter(r => r.mode === modeFilter) : reglements
  const totalCash = filtered.filter(r => r.mode === 'cash').reduce((s, r) => s + Number(r.montant), 0)
  const totalBanque = filtered.filter(r => r.mode === 'banque').reduce((s, r) => s + Number(r.montant), 0)
  const totalCheque = filtered.filter(r => r.mode === 'cheque').reduce((s, r) => s + Number(r.montant), 0)

  if (loading) return <CaisseLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-amber-500" size={28} /></div></CaisseLayout>

  return (
    <CaisseLayout>
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Encaissements</h1>
      <p className="text-sm text-gray-400 mb-6">Historique de tous les règlements encaissés.</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase text-green-600">Cash</p>
          <p className="text-lg font-bold text-green-700">{fmt(totalCash)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase text-blue-600">Banque</p>
          <p className="text-lg font-bold text-blue-700">{fmt(totalBanque)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase text-purple-600">Chèque</p>
          <p className="text-lg font-bold text-purple-700">{fmt(totalCheque)}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        {[{ v: '', l: 'Tous' }, { v: 'cash', l: 'Cash' }, { v: 'banque', l: 'Banque' }, { v: 'cheque', l: 'Chèque' }].map(f => (
          <button key={f.v} onClick={() => setModeFilter(f.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${modeFilter === f.v ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {f.l}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">Aucun encaissement.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">{r.factures?.commandes?.clients?.nom_interne ?? '—'}</p>
                  <p className="text-xs text-gray-400">
                    {r.factures?.numero} · {r.mode}{r.banques ? ` (${r.banques.nom})` : ''}{r.reference_cheque ? ` #${r.reference_cheque}` : ''} · {r.profiles?.prenom} {r.profiles?.nom} · {new Date(r.created_at).toLocaleDateString('fr-FR')} {new Date(r.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className="font-bold text-green-600">+{fmt(r.montant)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </CaisseLayout>
  )
}
