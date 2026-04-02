import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import CaisseLayout from '@/components/commercial/CaisseLayout'
import UploadJustificatif from '@/components/UploadJustificatif'
import { Loader2, Plus, ArrowDownToLine, ArrowUpFromLine, Landmark, ArrowRightLeft, Lock, Unlock } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'
const TYPE_LABELS = {
  encaissement: 'Encaissement', decaissement: 'Décaissement',
  versement_banque: 'Versement banque', transfert_in: 'Transfert entrant', transfert_out: 'Transfert sortant',
}
const TYPE_COLORS = {
  encaissement: 'text-green-600', decaissement: 'text-red-600',
  versement_banque: 'text-blue-600', transfert_in: 'text-teal-600', transfert_out: 'text-orange-600',
}

export default function GestionCaisse() {
  const { user, profile } = useAuth()
  const [caisses, setCaisses] = useState([])
  const [selectedCaisse, setSelectedCaisse] = useState('')
  const [journee, setJournee] = useState(null)
  const [mouvements, setMouvements] = useState([])
  const [banques, setBanques] = useState([])
  const [allCaisses, setAllCaisses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showMvt, setShowMvt] = useState(false)
  const [mvtForm, setMvtForm] = useState({ type: 'encaissement', montant: '', description: '', reference: '', banque_id: '', caisse_destination_id: '' })
  const [showCloture, setShowCloture] = useState(false)
  const [soldePhysique, setSoldePhysique] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: cs }, { data: bq }] = await Promise.all([
        supabase.from('caisses').select('id, nom').eq('statut', 'actif').order('nom'),
        supabase.from('banques').select('id, nom').eq('statut', 'actif').order('nom'),
      ])
      setCaisses(cs ?? [])
      setAllCaisses(cs ?? [])
      setBanques(bq ?? [])
      if (cs?.length > 0) setSelectedCaisse(cs[0].id)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (selectedCaisse) loadJournee()
  }, [selectedCaisse])

  const loadJournee = async () => {
    const { data: jc } = await supabase
      .from('journees_caisse')
      .select('*')
      .eq('caisse_id', selectedCaisse)
      .eq('date_journee', new Date().toISOString().slice(0, 10))
      .maybeSingle()
    setJournee(jc)

    if (jc) {
      const { data: mvts } = await supabase
        .from('mouvements_caisse')
        .select('*, profiles!effectue_par(nom, prenom), banques(nom)')
        .eq('journee_caisse_id', jc.id)
        .order('created_at', { ascending: false })
      setMouvements(mvts ?? [])
    } else {
      setMouvements([])
    }
  }

  const handleOuvrir = async () => {
    setError(''); setSaving(true)
    const { data, error: err } = await supabase.rpc('ouvrir_journee_caisse', { p_caisse_id: selectedCaisse })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess(`Caisse ouverte — solde initial : ${fmt(data.solde_ouverture)}`)
    loadJournee()
  }

  const handleMouvement = async () => {
    setError('')
    if (!mvtForm.montant || Number(mvtForm.montant) <= 0) { setError('Montant invalide.'); return }
    setSaving(true)

    const { data, error: err } = await supabase.rpc('enregistrer_mouvement_caisse', {
      p_journee_caisse_id: journee.id,
      p_type: mvtForm.type,
      p_montant: Number(mvtForm.montant),
      p_description: mvtForm.description || null,
      p_reference: mvtForm.reference || null,
      p_mode: 'cash',
      p_banque_id: mvtForm.banque_id || null,
      p_caisse_destination_id: mvtForm.caisse_destination_id || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess(`${TYPE_LABELS[mvtForm.type]} de ${fmt(Number(mvtForm.montant))} enregistré.`)
    setShowMvt(false)
    setMvtForm({ type: 'encaissement', montant: '', description: '', reference: '', banque_id: '', caisse_destination_id: '' })
    loadJournee()
  }

  const handleCloturer = async () => {
    setError(''); setSaving(true)
    const { data, error: err } = await supabase.rpc('cloturer_journee_caisse', {
      p_journee_caisse_id: journee.id,
      p_solde_physique: soldePhysique ? Number(soldePhysique) : null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess(`Caisse clôturée. Théorique: ${fmt(data.solde_theorique)} — Physique: ${fmt(data.solde_physique)} — Écart: ${fmt(data.ecart)}`)
    setShowCloture(false)
    loadJournee()
  }

  const soldeActuel = journee ? (journee.solde_ouverture + journee.total_encaissements - journee.total_decaissements - journee.total_versements + journee.total_transferts_in - journee.total_transferts_out) : 0

  if (loading) return <CaisseLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-amber-500" size={28} /></div></CaisseLayout>

  return (
    <CaisseLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Gestion de caisse</h1>
          <p className="text-sm text-gray-400">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <select value={selectedCaisse} onChange={e => setSelectedCaisse(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/20">
          {caisses.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}

      {!journee ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Unlock size={32} className="mx-auto text-amber-500 mb-4" />
          <h2 className="font-bold text-gray-800 text-lg mb-2">Caisse non ouverte</h2>
          <p className="text-sm text-gray-400 mb-6">Ouvrez la caisse pour commencer les opérations du jour.</p>
          <button onClick={handleOuvrir} disabled={saving}
            className="px-6 py-3 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 disabled:opacity-50">
            {saving ? 'Ouverture...' : 'Ouvrir la caisse'}
          </button>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-[10px] font-bold uppercase text-gray-400">Solde ouverture</p>
              <p className="text-lg font-bold text-gray-800">{fmt(journee.solde_ouverture)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-[10px] font-bold uppercase text-green-600">Encaissements</p>
              <p className="text-lg font-bold text-green-700">+{fmt(journee.total_encaissements)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-[10px] font-bold uppercase text-red-600">Décaissements</p>
              <p className="text-lg font-bold text-red-700">-{fmt(journee.total_decaissements)}</p>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <p className="text-[10px] font-bold uppercase text-amber-600">Solde actuel</p>
              <p className="text-xl font-black text-amber-800">{fmt(soldeActuel)}</p>
            </div>
          </div>

          {/* Actions */}
          {journee.statut === 'OUVERTE' && (
            <div className="flex flex-wrap gap-3 mb-6">
              <button onClick={() => { setMvtForm({ ...mvtForm, type: 'encaissement' }); setShowMvt(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700">
                <ArrowDownToLine size={16} /> Encaissement
              </button>
              <button onClick={() => { setMvtForm({ ...mvtForm, type: 'versement_banque' }); setShowMvt(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">
                <Landmark size={16} /> Versement banque
              </button>
              <button onClick={() => { setMvtForm({ ...mvtForm, type: 'transfert_out' }); setShowMvt(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700">
                <ArrowRightLeft size={16} /> Transfert
              </button>
              <button onClick={() => setShowCloture(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-xl text-sm font-bold hover:bg-gray-900 ml-auto">
                <Lock size={16} /> Clôturer
              </button>
            </div>
          )}

          {journee.statut === 'CLOTUREE' && (
            <div className="bg-gray-100 rounded-xl p-4 mb-6 flex items-center gap-3">
              <Lock size={18} className="text-gray-500" />
              <div>
                <p className="font-bold text-gray-700 text-sm">Caisse clôturée</p>
                <p className="text-xs text-gray-500">Solde final : {fmt(journee.solde_cloture)} — Écart : {fmt(journee.ecart)}</p>
              </div>
            </div>
          )}

          {/* Liste mouvements */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b">
              <h2 className="font-semibold text-gray-700 text-sm">Mouvements du jour</h2>
            </div>
            {mouvements.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-12">Aucun mouvement enregistré.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {mouvements.map(m => (
                  <div key={m.id} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{TYPE_LABELS[m.type]}</p>
                        <p className="text-xs text-gray-400">{m.description ?? '—'} · {m.profiles?.prenom} {m.profiles?.nom} · {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <p className={`font-bold ${['encaissement', 'transfert_in'].includes(m.type) ? 'text-green-600' : 'text-red-600'}`}>
                        {['encaissement', 'transfert_in'].includes(m.type) ? '+' : '-'}{fmt(m.montant)}
                      </p>
                    </div>
                    {m.type === 'versement_banque' && (
                      <UploadJustificatif tableRef="mouvements_caisse" enregistrementId={m.id} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Mouvement */}
      {showMvt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{TYPE_LABELS[mvtForm.type]}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Montant *</label>
                <input type="number" min="0" value={mvtForm.montant} onChange={e => setMvtForm({ ...mvtForm, montant: e.target.value })}
                  placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/20" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description</label>
                <input type="text" value={mvtForm.description} onChange={e => setMvtForm({ ...mvtForm, description: e.target.value })}
                  placeholder="Motif..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none" />
              </div>
              {mvtForm.type === 'versement_banque' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Banque</label>
                  <select value={mvtForm.banque_id} onChange={e => setMvtForm({ ...mvtForm, banque_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none">
                    <option value="">Sélectionner...</option>
                    {banques.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                  </select>
                </div>
              )}
              {mvtForm.type === 'transfert_out' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Caisse destination</label>
                  <select value={mvtForm.caisse_destination_id} onChange={e => setMvtForm({ ...mvtForm, caisse_destination_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none">
                    <option value="">Sélectionner...</option>
                    {allCaisses.filter(c => c.id !== selectedCaisse).map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Référence</label>
                <input type="text" value={mvtForm.reference} onChange={e => setMvtForm({ ...mvtForm, reference: e.target.value })}
                  placeholder="N° reçu..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowMvt(false)} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Annuler</button>
              <button onClick={handleMouvement} disabled={saving}
                className="flex-1 py-2.5 text-sm bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 disabled:opacity-50">
                {saving ? 'Enregistrement...' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Clôture */}
      {showCloture && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Clôturer la caisse</h3>
            <p className="text-sm text-gray-500 mb-4">Solde théorique : <span className="font-bold text-gray-800">{fmt(soldeActuel)}</span></p>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Solde physique (comptage réel)</label>
              <input type="number" min="0" value={soldePhysique} onChange={e => setSoldePhysique(e.target.value)}
                placeholder={soldeActuel.toString()} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/20" autoFocus />
              <p className="text-xs text-gray-400 mt-1">Laissez vide pour utiliser le solde théorique.</p>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCloture(false)} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Annuler</button>
              <button onClick={handleCloturer} disabled={saving}
                className="flex-1 py-2.5 text-sm bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 disabled:opacity-50">
                {saving ? 'Clôture...' : 'Clôturer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </CaisseLayout>
  )
}
