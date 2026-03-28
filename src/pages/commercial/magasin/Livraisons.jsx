import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import MagasinLayout from '@/components/commercial/MagasinLayout'
import { Loader2, CheckCircle, Package } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function Livraisons() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [livraisons, setLivraisons] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [filtre, setFiltre] = useState('A_LIVRER')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('bons_livraison')
      .select('*, factures(numero, montant_total, commandes(numero, clients(nom_interne), lignes_commande(quantite, articles(nom)))), magasins(nom)')
      .order('created_at', { ascending: false })
    setLivraisons(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const confirmerLivraison = async (bl) => {
    setSaving(bl.id)
    const { error: err } = await supabase.rpc('confirmer_livraison', { p_bl_id: bl.id })
    if (err) console.error(err)
    setSaving(null)
    load()
  }

  const filtered = livraisons.filter(l => filtre ? l.statut === filtre : true)

  if (loading) return <MagasinLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-green-500" size={28} /></div></MagasinLayout>

  return (
    <MagasinLayout>
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Livraisons</h1>
      <p className="text-sm text-gray-400 mb-6">Confirmez les livraisons des commandes réglées.</p>

      <div className="flex gap-2 mb-5">
        {[{ v: 'A_LIVRER', l: 'À livrer' }, { v: 'LIVRE', l: 'Livrées' }, { v: '', l: 'Toutes' }].map(f => (
          <button key={f.v} onClick={() => setFiltre(f.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filtre === f.v ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {f.l} {f.v === 'A_LIVRER' ? `(${livraisons.filter(l => l.statut === 'A_LIVRER').length})` : ''}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">Aucune livraison.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(bl => {
            const cmd = bl.factures?.commandes
            const articles = cmd?.lignes_commande ?? []
            return (
              <div key={bl.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono text-xs text-green-600 font-medium">{bl.numero}</p>
                    <p className="font-bold text-gray-800 mt-0.5">{cmd?.clients?.nom_interne}</p>
                    <p className="text-xs text-gray-400">{bl.magasins?.nom} — Facture {bl.factures?.numero}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${bl.statut === 'LIVRE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {bl.statut === 'LIVRE' ? 'Livré' : 'À livrer'}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Articles à livrer</p>
                  <div className="space-y-1">
                    {articles.map((lc, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">{lc.articles?.nom}</span>
                        <span className="font-bold text-gray-800">{lc.quantite} unités</span>
                      </div>
                    ))}
                  </div>
                </div>

                {bl.statut === 'A_LIVRER' && (
                  <button onClick={() => confirmerLivraison(bl)} disabled={saving === bl.id}
                    className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    <CheckCircle size={16} /> {saving === bl.id ? 'Confirmation...' : 'Confirmer la livraison'}
                  </button>
                )}

                {bl.statut === 'LIVRE' && bl.date_livraison && (
                  <p className="text-xs text-green-600 mt-2">Livré le {new Date(bl.date_livraison).toLocaleDateString('fr-FR')} à {new Date(bl.date_livraison).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </MagasinLayout>
  )
}
