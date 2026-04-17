import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DGCommLayout from '@/components/commercial/DGCommLayout'
import { Loader2, CheckCircle, XCircle, AlertTriangle, Users } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function DGDettes() {
  const [factures, setFactures] = useState([])
  const [dettesClients, setDettesClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tab, setTab] = useState('attente')

  const load = async () => {
    setLoading(true)

    // Factures en attente DG
    const { data: fac } = await supabase.from('factures')
      .select('*, commandes(numero, clients(nom_interne, telephone, ville)), profiles!facture_par(nom, prenom), reglements(mode, montant, created_at)')
      .eq('statut', 'EN_ATTENTE_DG')
      .order('created_at', { ascending: false })
    setFactures(fac ?? [])

    // Toutes les dettes validées non soldées
    const { data: dettes } = await supabase.from('factures')
      .select('*, commandes(numero, clients(id, nom_interne, telephone, ville)), reglements(mode, montant, created_at)')
      .eq('statut', 'DETTE_VALIDEE')
      .order('created_at', { ascending: false })

    // Grouper par client
    const clientMap = {}
    ;(dettes ?? []).forEach(f => {
      const cId = f.commandes?.clients?.id
      if (!cId) return
      if (!clientMap[cId]) clientMap[cId] = { client: f.commandes.clients, factures: [], totalDette: 0 }
      const dette = f.montant_total - f.montant_regle
      clientMap[cId].factures.push(f)
      clientMap[cId].totalDette += dette
    })
    setDettesClients(Object.values(clientMap).sort((a, b) => b.totalDette - a.totalDette))

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAction = async (factureId, action) => {
    setError(''); setSaving(factureId)
    const { error: err } = await supabase.rpc('valider_dette_dg', { p_facture_id: factureId, p_action: action })
    setSaving(null)
    if (err) { setError(err.message); return }
    setSuccess(action === 'valide' ? 'Dette validée — bon de livraison généré. Magasinier notifié.' : 'Facture annulée.')
    load()
  }

  if (loading) return <DGCommLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-orange-500" size={28} /></div></DGCommLayout>

  return (
    <DGCommLayout>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Dettes clients</h1>
      <p className="text-sm text-gray-400 mb-6">Validez les paiements partiels et suivez les créances.</p>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('attente')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'attente' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
          <AlertTriangle size={14} className="inline mr-1" /> En attente ({factures.length})
        </button>
        <button onClick={() => setTab('suivi')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'suivi' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
          <Users size={14} className="inline mr-1" /> Suivi par client ({dettesClients.length})
        </button>
      </div>

      {/* Onglet : Dettes en attente de validation */}
      {tab === 'attente' && (
        <>
          {factures.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">Aucune dette en attente de validation.</p>
          ) : (
            <div className="space-y-3">
              {factures.map(f => {
                const dette = f.montant_total - f.montant_regle
                return (
                  <div key={f.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-mono text-xs text-orange-600">{f.numero}</p>
                        <p className="font-bold text-gray-800">{f.commandes?.clients?.nom_interne}</p>
                        <p className="text-xs text-gray-400">{f.commandes?.clients?.ville} · {f.commandes?.clients?.telephone} · Commande {f.commandes?.numero}</p>
                        <p className="text-xs text-gray-400">Facturé par {f.profiles?.prenom} {f.profiles?.nom} · {new Date(f.created_at).toLocaleDateString('fr-FR')} à {new Date(f.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                        {f.reglements?.length > 0 && (
                          <div className="mt-2 bg-gray-50 rounded-lg p-2 space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Paiements effectués</p>
                            {f.reglements.map((r, i) => (
                              <div key={i} className="flex justify-between text-xs">
                                <span className="text-gray-600">{r.mode === 'cash' ? 'Cash' : r.mode === 'cheque' ? 'Chèque' : 'Banque'} · {new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
                                <span className="font-bold text-green-700">{fmt(r.montant)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-red-600">{fmt(dette)}</p>
                        <p className="text-xs text-gray-400">sur {fmt(f.montant_total)}</p>
                        <p className="text-xs text-green-600">Réglé : {fmt(f.montant_regle)}</p>
                        {f.echeance_dette && (
                          <p className={`text-xs font-bold mt-1 ${new Date(f.echeance_dette) < new Date() ? 'text-red-600' : 'text-amber-600'}`}>
                            Échéance : {new Date(f.echeance_dette).toLocaleDateString('fr-FR')}
                            {new Date(f.echeance_dette) < new Date() && ' ⚠️ EXPIRÉE'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(f.id, 'valide')} disabled={saving === f.id}
                        className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50">
                        <CheckCircle size={14} /> {saving === f.id ? 'Validation...' : 'Valider la dette — livrer'}
                      </button>
                      <button onClick={() => handleAction(f.id, 'rejete')} disabled={saving === f.id}
                        className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                        <XCircle size={14} /> Rejeter — annuler
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Onglet : Suivi des dettes par client */}
      {tab === 'suivi' && (
        <>
          {dettesClients.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">Aucune créance en cours.</p>
          ) : (
            <div className="space-y-3">
              {dettesClients.map((dc, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-gray-800">{dc.client.nom_interne}</p>
                      <p className="text-xs text-gray-400">{dc.client.ville} · {dc.client.telephone} · {dc.factures.length} facture(s)</p>
                    </div>
                    <p className="text-xl font-bold text-red-600">{fmt(dc.totalDette)}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    {dc.factures.map(f => (
                      <div key={f.id} className="py-2 border-b border-red-100 last:border-0">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">{f.numero} · {new Date(f.created_at).toLocaleDateString('fr-FR')}</span>
                          <span className="font-bold text-red-700">{fmt(f.montant_total - f.montant_regle)}</span>
                        </div>
                        {f.reglements?.length > 0 && (
                          <div className="mt-1 text-[10px] text-gray-500">
                            Payé : {f.reglements.map(r => `${r.mode === 'cash' ? 'Cash' : r.mode === 'cheque' ? 'Chèque' : 'Banque'} ${fmt(r.montant)}`).join(' + ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="bg-red-100 rounded-xl p-4 text-center">
                <p className="text-sm text-red-800 font-bold">Total créances : {fmt(dettesClients.reduce((s, dc) => s + dc.totalDette, 0))}</p>
              </div>
            </div>
          )}
        </>
      )}
    </DGCommLayout>
  )
}
