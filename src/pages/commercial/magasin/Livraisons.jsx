import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { genererBonLivraisonPDF, genererBonSortiePDF } from '@/lib/generatePDF'
import MagasinLayout from '@/components/commercial/MagasinLayout'
import { Loader2, CheckCircle, Package, Truck, Download } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function Livraisons() {
  const { user } = useAuth()
  const [livraisons, setLivraisons] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [filtre, setFiltre] = useState('A_LIVRER')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
    setSaving(bl.id); setError(''); setSuccess('')
    const { data, error: err } = await supabase.rpc('confirmer_livraison', { p_bl_id: bl.id })
    setSaving(null)
    if (err) {
      setError(err.message)
      return
    }
    setSuccess('Livraison confirmée — bon de sortie généré.')

    // Générer le bon de sortie PDF automatiquement
    const lignesCmd = bl.factures?.commandes?.lignes_commande ?? []
    genererBonSortiePDF(bl, bl.factures, lignesCmd,
      { nom_interne: bl.factures?.commandes?.clients?.nom_interne },
      bl.magasins?.nom)

    load()
  }

  const filtered = livraisons.filter(l => filtre ? l.statut === filtre : true)

  if (loading) return <MagasinLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-green-500" size={28} /></div></MagasinLayout>

  return (
    <MagasinLayout>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Livraisons</h1>
        <p className="text-sm text-gray-400">Confirmez les livraisons des commandes réglées.</p>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}

      <div className="flex gap-2 mb-5">
        {[{ v: 'A_LIVRER', l: 'À livrer' }, { v: 'LIVRE', l: 'Livrés' }, { v: '', l: 'Tous' }].map(f => (
          <button key={f.v} onClick={() => setFiltre(f.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtre === f.v ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {f.l} {f.v === 'A_LIVRER' ? `(${livraisons.filter(l => l.statut === 'A_LIVRER').length})` : ''}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Truck size={32} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400 text-sm">Aucune livraison {filtre === 'A_LIVRER' ? 'en attente' : ''}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(bl => {
            const lignesCmd = bl.factures?.commandes?.lignes_commande ?? []
            return (
              <div key={bl.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono text-xs text-green-600">{bl.numero}</p>
                      <p className="font-bold text-gray-800">{bl.factures?.commandes?.clients?.nom_interne}</p>
                      <p className="text-xs text-gray-400">Facture {bl.factures?.numero} · {bl.magasins?.nom} · {fmt(bl.factures?.montant_total)}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${bl.statut === 'A_LIVRER' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {bl.statut === 'A_LIVRER' ? 'À livrer' : 'Livré'}
                    </span>
                  </div>

                  {/* Articles à livrer */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Articles à livrer</p>
                    <div className="space-y-1">
                      {lignesCmd.map((lc, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-gray-600">{lc.articles?.nom}</span>
                          <span className="font-bold text-gray-800">× {lc.quantite}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bouteilles pleines/vides pour GPL */}
                  {(() => {
                    const types = ['50KG', '12.5KG', '6KG']
                    const rows = types.map(t => {
                      const gpl = lignesCmd.find(lc => lc.articles?.nom === `GPL ${t}`)
                      const consigne = lignesCmd.find(lc => lc.articles?.nom === `CONSIGNE ${t}`)
                      if (!gpl) return null
                      const qGpl = gpl.quantite
                      const qCons = consigne?.quantite ?? 0
                      const pleines = qGpl
                      const vides = qGpl - qCons
                      return { type: t, pleines, vides }
                    }).filter(Boolean)
                    if (rows.length === 0) return null
                    return (
                      <div className="bg-blue-50 rounded-lg p-3 mb-3 border border-blue-100">
                        <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">Bouteilles pleines / vides</p>
                        <div className="space-y-1">
                          {rows.map(r => (
                            <div key={r.type} className="flex justify-between text-xs">
                              <span className="text-blue-700 font-medium">{r.type}</span>
                              <span className="text-blue-800">
                                <span className="text-green-700 font-bold">{r.pleines} pleines</span> à donner
                                {r.vides > 0 && <> · <span className="text-amber-700 font-bold">{r.vides} vides</span> à recevoir</>}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {bl.statut === 'A_LIVRER' && (
                    <button onClick={() => confirmerLivraison(bl)} disabled={saving === bl.id}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition-colors">
                      {saving === bl.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      {saving === bl.id ? 'Confirmation...' : 'Confirmer la livraison'}
                    </button>
                  )}

                  {bl.statut === 'LIVRE' && bl.date_livraison && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-400 mb-2">Livré le {new Date(bl.date_livraison).toLocaleDateString('fr-FR')} à {new Date(bl.date_livraison).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                      <div className="flex gap-2">
                        <button onClick={() => genererBonSortiePDF(bl, bl.factures, lignesCmd, { nom_interne: bl.factures?.commandes?.clients?.nom_interne }, bl.magasins?.nom)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-900">
                          <Download size={12} /> Bon de sortie
                        </button>
                        <button onClick={() => genererBonLivraisonPDF(bl, bl.factures, bl.factures?.commandes, lignesCmd, { nom_interne: bl.factures?.commandes?.clients?.nom_interne })}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">
                          <Download size={12} /> BL PDF
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </MagasinLayout>
  )
}
