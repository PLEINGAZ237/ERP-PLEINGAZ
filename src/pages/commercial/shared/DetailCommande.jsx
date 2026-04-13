import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { genererFacturePDF, genererBonLivraisonPDF } from '@/lib/generatePDF'
import CommLayout from '@/components/commercial/CommLayout'
import { ArrowLeft, Loader2, FileText, CreditCard, Plus, Trash2, Download } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'
const STATUT_STYLE = {
  BROUILLON: 'bg-gray-100 text-gray-600', A_FACTURER: 'bg-amber-100 text-amber-700',
  FACTUREE: 'bg-blue-100 text-blue-700', REGLEE: 'bg-green-100 text-green-700',
  EN_ATTENTE_DG: 'bg-red-100 text-red-700', LIVREE: 'bg-purple-100 text-purple-700',
  ANNULEE: 'bg-gray-200 text-gray-500',
}
const STATUT_LABEL = {
  BROUILLON: 'Brouillon', A_FACTURER: 'À facturer', FACTUREE: 'Facturée',
  REGLEE: 'Réglée', EN_ATTENTE_DG: 'Attente DG', LIVREE: 'Livrée', ANNULEE: 'Annulée',
}

export default function DetailCommande({ Layout = CommLayout, backPath = '/commercial/comm/commandes' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getModuleRoles } = useAuth()

  // Rôles de l'utilisateur dans le module commercial
  const moduleRoles = getModuleRoles('commercial')
  // COMM et RESP_AGENCE facturent — CAISSE et VENTE encaissent — VENTE fait les deux
  const peutFacturer = moduleRoles.some(r => ['COMM', 'RESP_AGENCE', 'VENTE', 'CAISSE', 'DG', 'DFC'].includes(r))
  const peutEncaisser = moduleRoles.some(r => ['CAISSE', 'VENTE'].includes(r))

  const [commande, setCommande] = useState(null)
  const [magasins, setMagasins] = useState([])
  const [banques, setBanques]   = useState([])
  const [caisses, setCaisses]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  const [showFacturer, setShowFacturer] = useState(false)
  const [magasinId, setMagasinId]       = useState('')

  const [showRegler, setShowRegler]     = useState(false)
  const [typeReglement, setTypeReglement] = useState('')  // 'total' ou 'partiel'
  const [reglements, setReglements]     = useState([{ mode: 'cash', montant: '', banque_id: '', caisse_id: '', reference_cheque: '' }])

  const load = async () => {
    setLoading(true)
    const [{ data: cmd }, { data: mag }, { data: bq }, { data: cs }] = await Promise.all([
      supabase.from('commandes').select(`
        *, clients(nom_interne, categories_clients(nom)),
        profiles!cree_par(nom, prenom),
        lignes_commande(*, articles(nom, categorie)),
        factures(*, reglements(*))
      `).eq('id', id).single(),
      supabase.from('magasins').select('id, nom, est_centre_enfuteur').eq('statut', 'actif').order('nom'),
      supabase.from('banques').select('id, nom').eq('statut', 'actif').order('nom'),
      supabase.from('caisses').select('id, nom').eq('statut', 'actif').order('nom'),
    ])
    setCommande(cmd)
    setMagasins(mag ?? [])
    setBanques(bq ?? [])
    setCaisses(cs ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const total = commande?.lignes_commande?.reduce((s, l) => s + Number(l.montant || l.quantite * l.prix_unitaire), 0) ?? 0
  const facture = commande?.factures?.[0]

  const handleFacturer = async () => {
    if (!magasinId) { setError('Sélectionnez un magasin.'); return }
    setError(''); setSaving(true)

    const { data, error: err } = await supabase.rpc('facturer_commande', {
      p_commande_id: id,
      p_magasin_id: magasinId,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess(`Facture ${data.numero} créée — ${fmt(data.montant_total)}`)
    setShowFacturer(false)
    load()
  }

  const addReglement = () => setReglements(prev => [...prev, { mode: 'cash', montant: '', banque_id: '', caisse_id: '', reference_cheque: '' }])
  const removeReglement = (idx) => { if (reglements.length > 1) setReglements(prev => prev.filter((_, i) => i !== idx)) }
  const updateReglement = (idx, key, value) => setReglements(prev => prev.map((r, i) => i === idx ? { ...r, [key]: value } : r))

  const totalReglement = reglements.reduce((s, r) => s + (Number(r.montant) || 0), 0)

  const handleRegler = async () => {
    if (totalReglement <= 0) { setError('Montant invalide.'); return }
    setError(''); setSaving(true)

    const { data, error: err } = await supabase.rpc('enregistrer_reglement', {
      p_facture_id: facture.id,
      p_reglements: reglements.filter(r => Number(r.montant) > 0).map(r => ({
        mode: r.mode,
        montant: Number(r.montant),
        banque_id: r.mode === 'banque' ? r.banque_id || null : null,
        reference_cheque: r.mode === 'cheque' ? r.reference_cheque || null : null,
        caisse_id: r.mode === 'cash' ? r.caisse_id || null : null,
      })),
    })
    setSaving(false)
    if (err) { setError(err.message); return }

    const hasCash = reglements.some(r => r.mode === 'cash' && Number(r.montant) > 0)
    const cashTemp = hasCash && !peutEncaisser ? '' : hasCash && peutEncaisser && !moduleRoles.includes('CAISSE') ? ' Le cash reste dans votre caisse temporaire.' : ''

    if (data.statut === 'REGLEE') {
      setSuccess('Facture réglée — bon de livraison généré. Le magasinier a été notifié.' + cashTemp)
    } else {
      setSuccess('Paiement partiel — en attente de validation par le DG.' + cashTemp)
    }
    setShowRegler(false)
    setTypeReglement('')
    load()
  }

  if (loading) return <Layout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-blue-500" size={28} /></div></Layout>
  if (!commande) return <Layout><p className="text-center py-20 text-red-500">Commande introuvable.</p></Layout>

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(backPath)} className="text-blue-600 hover:underline text-sm flex items-center gap-1"><ArrowLeft size={16} /> Retour</button>
          <h1 className="text-lg font-bold text-gray-800 font-mono">{commande.numero}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUT_STYLE[commande.statut] ?? ''}`}>
            {STATUT_LABEL[commande.statut]}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase mb-3">Client</h2>
              <p className="font-bold text-gray-800">{commande.clients?.nom_interne}</p>
              <p className="text-xs text-gray-500">{commande.clients?.categories_clients?.nom}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total commande</h2>
              <p className="text-2xl font-black text-gray-800">{fmt(total)}</p>
            </div>
            {facture && (
              <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
                <h2 className="text-[10px] font-bold text-blue-600 uppercase mb-2">Facture {facture.numero}</h2>
                <p className="text-sm text-blue-700">Total : {fmt(facture.montant_total)}</p>
                <p className="text-sm text-blue-700">Réglé : {fmt(facture.montant_regle)}</p>
                {facture.montant_dette > 0 && <p className="text-sm text-red-600 font-bold">Dette : {fmt(facture.montant_dette)}</p>}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => genererFacturePDF(facture, commande, commande.lignes_commande, { nom_interne: commande.clients?.nom_interne, ville: commande.clients?.ville, quartier: commande.clients?.quartier, telephone: commande.clients?.telephone, categorie: commande.clients?.categories_clients?.nom }, facture.reglements)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">
                    <Download size={12} /> Facture PDF
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase mb-4">Articles commandés</h2>
              <div className="divide-y divide-gray-50">
                {commande.lignes_commande?.map(l => (
                  <div key={l.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{l.articles?.nom}</p>
                      <p className="text-[10px] text-gray-400">{l.quantite} × {fmt(l.prix_unitaire)}</p>
                    </div>
                    <p className="font-bold text-gray-800">{fmt(l.montant || l.quantite * l.prix_unitaire)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 mt-2 text-right">
                <p className="text-xl font-black text-gray-800">{fmt(total)}</p>
              </div>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>}
            {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl border border-green-100">{success}</div>}

            <div className="flex flex-wrap gap-3">
              {commande.statut === 'BROUILLON' && peutFacturer && (
                <button onClick={() => setShowFacturer(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">
                  <FileText size={16} /> Facturer
                </button>
              )}
              {facture && ['EN_ATTENTE', 'PARTIELLE'].includes(facture.statut) && peutEncaisser && (
                <button onClick={() => { setReglements([{ mode: 'cash', montant: '', banque_id: '', caisse_id: '', reference_cheque: '' }]); setTypeReglement(''); setShowRegler(true) }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700">
                  <CreditCard size={16} /> Régler
                </button>
              )}
              {facture && ['EN_ATTENTE', 'PARTIELLE'].includes(facture.statut) && !peutEncaisser && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                  <p className="text-xs text-amber-700 font-medium">En attente de règlement par la caisse</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Facturer */}
        {showFacturer && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Facturer la commande</h3>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Magasin de vente</label>
              <select value={magasinId} onChange={e => setMagasinId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none mb-4">
                <option value="">— Sélectionner —</option>
                {magasins.map(m => (
                  <option key={m.id} value={m.id}>{m.nom} {m.est_centre_enfuteur ? '(Centre enfûteur)' : ''}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <button onClick={() => setShowFacturer(false)} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Annuler</button>
                <button onClick={handleFacturer} disabled={saving}
                  className="flex-1 py-2.5 text-sm bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Facturation...' : 'Facturer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Règlement */}
        {showRegler && facture && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-800 mb-1">Règlement</h3>
              <p className="text-sm text-gray-500 mb-4">Facture {facture.numero} — Reste à payer : {fmt(facture.montant_total - facture.montant_regle)}</p>

              {/* Étape 1 : Choix total ou partiel */}
              {!typeReglement && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Type de règlement</p>
                  <button onClick={() => {
                    setTypeReglement('total')
                    const reste = facture.montant_total - facture.montant_regle
                    setReglements([{ mode: 'cash', montant: reste.toString(), banque_id: '', caisse_id: '', reference_cheque: '' }])
                  }} className="w-full text-left bg-green-50 border border-green-200 rounded-xl p-4 hover:bg-green-100 transition-colors">
                    <p className="font-bold text-green-800">Règlement total</p>
                    <p className="text-xs text-green-600">Le client paye la totalité : {fmt(facture.montant_total - facture.montant_regle)}</p>
                  </button>
                  <button onClick={() => {
                    setTypeReglement('partiel')
                    setReglements([{ mode: 'cash', montant: '', banque_id: '', caisse_id: '', reference_cheque: '' }])
                  }} className="w-full text-left bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors">
                    <p className="font-bold text-amber-800">Règlement partiel</p>
                    <p className="text-xs text-amber-600">Le client ne paye qu'une partie. Le reste ira en validation chez le DG.</p>
                  </button>
                  <button onClick={() => setShowRegler(false)} className="w-full py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 font-medium mt-2">Annuler</button>
                </div>
              )}

              {/* Étape 2 : Saisie des paiements */}
              {typeReglement && (
                <>
                  <div className={`rounded-xl px-3 py-2 mb-4 text-xs font-medium ${typeReglement === 'total' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    {typeReglement === 'total' ? 'Règlement total — le client paye tout' : 'Règlement partiel — la partie non payée sera une dette validée par le DG'}
                  </div>

              <div className="space-y-3 mb-4">
                {reglements.map((r, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Paiement {idx + 1}</span>
                      {reglements.length > 1 && (
                        <button onClick={() => removeReglement(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <select value={r.mode} onChange={e => updateReglement(idx, 'mode', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                          <option value="cash">Cash</option>
                          <option value="cheque">Chèque</option>
                          <option value="banque">Virement bancaire</option>
                        </select>
                      </div>
                      <div>
                        <input type="number" min="0" placeholder="Montant" value={r.montant}
                          onChange={e => updateReglement(idx, 'montant', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                      </div>
                    </div>
                    {r.mode === 'cash' && (
                      <select value={r.caisse_id} onChange={e => updateReglement(idx, 'caisse_id', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none mt-2">
                        <option value="">Caisse (optionnel)</option>
                        {caisses.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                    )}
                    {r.mode === 'banque' && (
                      <select value={r.banque_id} onChange={e => updateReglement(idx, 'banque_id', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none mt-2">
                        <option value="">Sélectionner la banque</option>
                        {banques.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                      </select>
                    )}
                    {r.mode === 'cheque' && (
                      <input type="text" placeholder="N° chèque" value={r.reference_cheque}
                        onChange={e => updateReglement(idx, 'reference_cheque', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none mt-2" />
                    )}
                  </div>
                ))}
              </div>

              <button onClick={addReglement}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mb-4">
                <Plus size={14} /> Ajouter un mode de paiement
              </button>

              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total réglé</span>
                  <span className="font-bold text-gray-800">{fmt(totalReglement)}</span>
                </div>
                {totalReglement < (facture.montant_total - facture.montant_regle) && totalReglement > 0 && (
                  <p className="text-xs text-amber-600 mt-1">Paiement partiel — validation DG requise.</p>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setShowRegler(false); setTypeReglement('') }} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Annuler</button>
                <button onClick={handleRegler} disabled={saving}
                  className="flex-1 py-2.5 text-sm bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50">
                  {saving ? 'Enregistrement...' : 'Valider le règlement'}
                </button>
              </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
