console.log('=== FICHIER VALIDERBESOINDG CHARGE ===')

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import DGLayout from '@/components/besoins/dg/DGLayout'
import ChaineValidation from '@/components/besoins/ChaineValidation'
import { ArrowLeft, Loader2, Plus, Trash2, AlertTriangle } from 'lucide-react'

const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' FCFA'

export default function ValiderBesoinDG() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [besoin, setBesoin]       = useState(null)
  const [caisses, setCaisses]     = useState([])
  const [virements, setVirements] = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const [confirmAction, setConfirmAction] = useState(null)

  const [derniereVdfc, setDerniereVdfc] = useState(null)
  const [derniereVdg,  setDerniereVdg]  = useState(null)
  const [repartitionsExistantes, setRepartitionsExistantes] = useState([])

  // ── Mode : 'total' ou 'repartie' ──
  const [modeValidation, setModeValidation] = useState('total')

  // ── Formulaire validation totale ──
  const [form, setForm] = useState({
    montant_valide:    '',
    mode_decaissement: 'caisse',
    caisse_id:         '',
    virement_id:       '',
    commentaire:       '',
  })

  // ── Formulaire validation répartie ──
  const [repartitions, setRepartitions] = useState([
    { montant: '', mode: 'caisse', caisse_id: '', virement_id: '' },
    { montant: '', mode: 'virement', caisse_id: '', virement_id: '' },
  ])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: b }, { data: c }, { data: v }] = await Promise.all([
        supabase
          .from('besoins')
          .select(`
            *,
            profiles!employe_id(nom, prenom, email, entreprises(nom, code), departements(nom)),
            validations_dfc(montant_valide, commentaire, statut, created_at, profiles!dfc_id(nom, prenom)),
            validations_dg(id, montant_valide, mode_decaissement, caisse_id, virement_id, commentaire, action, created_at,
              caisses(nom), virements(nom), profiles!dg_id(nom, prenom),
              validations_dg_repartitions(id, montant, mode, caisse_id, virement_id, caisses(nom), virements(nom))
            )
          `)
          .eq('id', id)
          .single(),
        supabase.from('caisses').select('id, nom').eq('statut', 'actif').order('nom'),
        supabase.from('virements').select('id, nom').eq('statut', 'actif').order('nom'),
      ])

      if (b) {
        setBesoin(b)
        const vdfcList = b.validations_dfc?.filter(v => v.statut === 'valide') ?? []
        const lastVdfc = vdfcList[vdfcList.length - 1] ?? null
        setDerniereVdfc(lastVdfc)

        const vdgList = b.validations_dg ?? []
        const lastVdg = vdgList[vdgList.length - 1] ?? null
        setDerniereVdg(lastVdg)
        console.log('[DEBUG DG]', 'vdgList:', vdgList, 'lastVdg:', lastVdg)

        // Charger les répartitions existantes
        const existingRepartitions = lastVdg?.validations_dg_repartitions ?? []
        setRepartitionsExistantes(existingRepartitions)

        // Déterminer le mode
        if (lastVdg?.mode_decaissement === 'repartie') {
          setModeValidation('repartie')
          if (existingRepartitions.length > 0) {
            setRepartitions(existingRepartitions.map(r => ({
              montant: r.montant, mode: r.mode, caisse_id: r.caisse_id ?? '', virement_id: r.virement_id ?? '',
            })))
          }
        } else {
          setModeValidation('total')
        }

        setForm({
          montant_valide:    lastVdg?.montant_valide ?? lastVdfc?.montant_valide ?? b.montant_demande,
          mode_decaissement: lastVdg?.mode_decaissement === 'repartie' ? 'caisse' : (lastVdg?.mode_decaissement ?? 'caisse'),
          caisse_id:         lastVdg?.caisse_id ?? '',
          virement_id:       lastVdg?.virement_id ?? '',
          commentaire:       lastVdg?.commentaire ?? '',
        })
      }
      setCaisses(c || [])
      setVirements(v || [])
      setLoading(false)
    }
    load()
  }, [id])

  const peutAgir    = besoin?.statut === 'EN_ATTENTE_DG' || besoin?.statut === 'VALIDE_DG'
  const peutStatuer = besoin?.statut === 'EN_ATTENTE_DG'

  // ── Helpers répartition ──
  const addRepartition = () => {
    setRepartitions([...repartitions, { montant: '', mode: 'caisse', caisse_id: '', virement_id: '' }])
  }
  const removeRepartition = (idx) => {
    if (repartitions.length <= 2) return
    setRepartitions(repartitions.filter((_, i) => i !== idx))
  }
  const updateRepartition = (idx, key, value) => {
    const updated = [...repartitions]
    if (key === 'mode') {
      updated[idx] = { ...updated[idx], mode: value, caisse_id: '', virement_id: '' }
    } else {
      updated[idx] = { ...updated[idx], [key]: value }
    }
    setRepartitions(updated)
  }

  const totalRepartition = repartitions.reduce((s, r) => s + (Number(r.montant) || 0), 0)
  const montantValideFinal = modeValidation === 'repartie' ? totalRepartition : Number(form.montant_valide) || 0

  // ── Validation formulaire ──
  const validateForm = () => {
    if (modeValidation === 'total') {
      if (!form.montant_valide || Number(form.montant_valide) <= 0) return 'Veuillez saisir le montant à valider.'
      if (form.mode_decaissement === 'caisse' && !form.caisse_id) return 'Veuillez sélectionner une caisse.'
      if (form.mode_decaissement === 'virement' && !form.virement_id) return 'Veuillez sélectionner un virement.'
    } else {
      for (let i = 0; i < repartitions.length; i++) {
        const r = repartitions[i]
        if (!r.montant || Number(r.montant) <= 0) return `Ligne ${i + 1} : montant invalide.`
        if (r.mode === 'caisse' && !r.caisse_id) return `Ligne ${i + 1} : sélectionnez une caisse.`
        if (r.mode === 'virement' && !r.virement_id) return `Ligne ${i + 1} : sélectionnez un virement.`
      }
      if (totalRepartition <= 0) return 'Le total des répartitions doit être supérieur à 0.'
    }
    return null
  }

  // ── Construire les params RPC ──
  const buildParams = (action) => ({
    p_besoin_id:         id,
    p_action:            action,
    p_montant_valide:    action !== 'rejete' ? montantValideFinal : null,
    p_mode_decaissement: action !== 'rejete' ? (modeValidation === 'repartie' ? 'repartie' : form.mode_decaissement) : null,
    p_caisse_id:         action !== 'rejete' && modeValidation === 'total' && form.mode_decaissement === 'caisse' ? (form.caisse_id || null) : null,
    p_virement_id:       action !== 'rejete' && modeValidation === 'total' && form.mode_decaissement === 'virement' ? (form.virement_id || null) : null,
    p_commentaire:       form.commentaire || null,
  })

  // ── Insérer les répartitions après validation ──
  const insertRepartitions = async (validationDgId) => {
    if (modeValidation !== 'repartie') return
    const rows = repartitions.map(r => ({
      validation_dg_id: validationDgId,
      montant:          Number(r.montant),
      mode:             r.mode,
      caisse_id:        r.mode === 'caisse' ? r.caisse_id : null,
      virement_id:      r.mode === 'virement' ? r.virement_id : null,
    }))
    const { error } = await supabase.from('validations_dg_repartitions').insert(rows)
    if (error) console.error('Erreur insertion répartitions:', error)
  }

  // ── Actions ──
  const handleAction = async (action) => {
    setError('')

    // Commentaire obligatoire en cas de rejet
    if (action === 'rejete' && !form.commentaire.trim()) {
      setError('Le commentaire est obligatoire en cas de rejet.')
      setConfirmAction(null)
      return
    }

    if (action === 'valide') {
      const err = validateForm()
      if (err) { setError(err); setConfirmAction(null); return }
    }

    setSaving(true)
    const { data: rpcData, error: rpcErr } = await supabase.rpc('valider_besoin_dg', buildParams(action))
    if (rpcErr) { setSaving(false); setConfirmAction(null); setError(rpcErr.message); return }

    // Si répartie et validation réussie, insérer les répartitions
    if (action === 'valide' && modeValidation === 'repartie') {
      // Récupérer l'id de la validation_dg qu'on vient de créer
      const { data: lastVdg } = await supabase
        .from('validations_dg')
        .select('id')
        .eq('besoin_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (lastVdg) await insertRepartitions(lastVdg.id)
    }

    setSaving(false)
    setConfirmAction(null)
    setSuccess(action === 'valide' ? 'Besoin validé.' : 'Besoin rejeté.')
    setTimeout(() => navigate('/besoins/dg'), 1800)
  }

  const handleSaveOnly = async () => {
    const err = validateForm()
    if (err) { setError(err); return }
    setError('')
    setSaving(true)
    const { error: rpcErr } = await supabase.rpc('valider_besoin_dg', buildParams('modifier'))

    // Mettre à jour les répartitions si nécessaire
    if (!rpcErr && modeValidation === 'repartie' && derniereVdg) {
      await supabase.from('validations_dg_repartitions').delete().eq('validation_dg_id', derniereVdg.id)
      await insertRepartitions(derniereVdg.id)
    }

    setSaving(false)
    if (rpcErr) { setError(rpcErr.message); return }
    setSuccess('Modifications enregistrées.')
    setTimeout(() => setSuccess(''), 3000)
  }

  if (loading) return <DGLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-emerald-500" size={28} /></div></DGLayout>
  if (!besoin) return <DGLayout><p className="text-center py-20 text-red-500">Besoin introuvable.</p></DGLayout>

  const employe = besoin.profiles

  return (
    <DGLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <button onClick={() => navigate('/besoins/dg')} className="flex items-center gap-1 text-emerald-600 hover:underline text-sm font-medium w-fit">
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg md:text-xl font-bold text-gray-800 font-mono">{besoin.numero}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            besoin.statut === 'EN_ATTENTE_DG' ? 'bg-blue-100 text-blue-700' :
            besoin.statut === 'VALIDE_DG'     ? 'bg-emerald-100 text-emerald-700' :
            'bg-red-100 text-red-700'
          }`}>
            {besoin.statut.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

        {/* ── Colonne gauche : infos ── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase mb-3">Demandeur</h2>
            <p className="font-medium text-gray-800">{employe?.prenom} {employe?.nom}</p>
            <p className="text-sm text-gray-500">{employe?.email}</p>
            <p className="text-sm text-gray-500 mt-1">{employe?.entreprises?.nom} — {employe?.departements?.nom}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase mb-3">Montants</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400">Demandé</p>
                <p className="text-lg font-bold text-gray-600">{fmt(besoin.montant_demande)}</p>
              </div>
              {derniereVdfc && (
                <div>
                  <p className="text-xs text-gray-400">Validé DFC</p>
                  <p className="text-lg font-bold text-indigo-700">{fmt(derniereVdfc.montant_valide)}</p>
                  {derniereVdfc.commentaire && <p className="text-xs text-gray-400 mt-1 italic">{derniereVdfc.commentaire}</p>}
                </div>
              )}
              {derniereVdg && derniereVdg.montant_valide && (
                <div>
                  <p className="text-xs text-gray-400">Validé DG</p>
                  <p className="text-lg font-bold text-emerald-700">{fmt(derniereVdg.montant_valide)}</p>
                </div>
              )}
            </div>
          </div>

          {besoin.justification && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Détail du besoin</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{besoin.justification}</p>
            </div>
          )}

          {/* Résumé validation existante (mode répartie) */}
          {derniereVdg && repartitionsExistantes.length > 0 && (
            <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 md:p-5">
              <h2 className="text-[10px] font-bold text-emerald-600 uppercase mb-3">Répartition actuelle</h2>
              <div className="space-y-2">
                {repartitionsExistantes.map((r, i) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-emerald-700">
                      {r.mode === 'caisse' ? `Caisse — ${r.caisses?.nom}` : `Virement — ${r.virements?.nom}`}
                    </span>
                    <span className="font-bold text-emerald-800">{fmt(r.montant)}</span>
                  </div>
                ))}
                <div className="border-t border-emerald-200 pt-2 flex justify-between font-bold text-emerald-800">
                  <span>Total</span>
                  <span>{fmt(repartitionsExistantes.reduce((s, r) => s + Number(r.montant), 0))}</span>
                </div>
              </div>
            </div>
          )}

          {derniereVdg && derniereVdg.mode_decaissement !== 'repartie' && (
            <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 md:p-5">
              <h2 className="text-[10px] font-bold text-emerald-600 uppercase mb-2">Ma décision</h2>
              <p className="text-sm text-emerald-700">Montant : <strong>{fmt(derniereVdg.montant_valide)}</strong></p>
              <p className="text-sm text-emerald-700">Via : <strong>{derniereVdg.mode_decaissement === 'caisse' ? `Caisse — ${derniereVdg.caisses?.nom}` : `Virement — ${derniereVdg.virements?.nom}`}</strong></p>
              {derniereVdg.commentaire && <p className="text-sm text-emerald-600 mt-1 italic">{derniereVdg.commentaire}</p>}
            </div>
          )}
        </div>

        {/* ── Colonne droite : formulaire ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Description</h2>
            <p className="text-sm text-gray-600">{besoin.description}</p>
          </div>

          {/* Formulaire de décision */}
          {peutAgir && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
              <h2 className="font-semibold text-gray-700 mb-5 text-sm uppercase tracking-wide">
                Décision du Directeur Général
              </h2>

              {/* Toggle mode de validation */}
              <div className="mb-6">
                <label className="block text-xs font-medium text-gray-700 mb-2">Type de validation</label>
                <div className="flex rounded-lg bg-gray-100 p-1">
                  {[
                    { key: 'total', label: 'Totale (un seul mode)' },
                    { key: 'repartie', label: 'Répartie (multi-modes)' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setModeValidation(key)}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        modeValidation === key ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ══ VALIDATION TOTALE ══ */}
              {modeValidation === 'total' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Montant décidé (FCFA) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={form.montant_valide}
                      onChange={e => setForm({ ...form, montant_valide: e.target.value })}
                      min="1"
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                    {form.montant_valide && derniereVdfc?.montant_valide &&
                      Number(form.montant_valide) !== Number(derniereVdfc.montant_valide) && (
                      <p className="text-xs text-amber-600 mt-1">Différent du montant DFC ({fmt(derniereVdfc.montant_valide)})</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Mode de décaissement <span className="text-red-500">*</span></label>
                    <div className="flex gap-4 mb-3">
                      {['caisse', 'virement'].map(mode => (
                        <label key={mode} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" name="mode_total" value={mode} checked={form.mode_decaissement === mode}
                            onChange={() => setForm({ ...form, mode_decaissement: mode, caisse_id: '', virement_id: '' })} />
                          <span className="font-medium">{mode === 'caisse' ? 'Caisse' : 'Virement bancaire'}</span>
                        </label>
                      ))}
                    </div>
                    {form.mode_decaissement === 'caisse' && (
                      <select value={form.caisse_id} onChange={e => setForm({ ...form, caisse_id: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none">
                        <option value="">— Sélectionner une caisse —</option>
                        {caisses.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                    )}
                    {form.mode_decaissement === 'virement' && (
                      <select value={form.virement_id} onChange={e => setForm({ ...form, virement_id: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none">
                        <option value="">— Sélectionner un virement —</option>
                        {virements.map(v => <option key={v.id} value={v.id}>{v.nom}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {/* ══ VALIDATION RÉPARTIE ══ */}
              {modeValidation === 'repartie' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Répartition des montants <span className="text-red-500">*</span></label>
                    <button type="button" onClick={addRepartition} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-semibold">
                      <Plus size={14} /> Ajouter une ligne
                    </button>
                  </div>

                  <div className="space-y-3">
                    {repartitions.map((r, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-3 md:p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Ligne {idx + 1}</span>
                          {repartitions.length > 2 && (
                            <button onClick={() => removeRepartition(idx)} className="text-red-400 hover:text-red-600 p-1">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Montant */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Montant (FCFA)</label>
                            <input
                              type="number"
                              value={r.montant}
                              onChange={e => updateRepartition(idx, 'montant', e.target.value)}
                              min="1"
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                              placeholder="0"
                            />
                          </div>

                          {/* Mode */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Mode</label>
                            <select
                              value={r.mode}
                              onChange={e => updateRepartition(idx, 'mode', e.target.value)}
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                            >
                              <option value="caisse">Caisse</option>
                              <option value="virement">Virement</option>
                            </select>
                          </div>

                          {/* Caisse ou Virement */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                              {r.mode === 'caisse' ? 'Caisse' : 'Virement'}
                            </label>
                            {r.mode === 'caisse' ? (
                              <select value={r.caisse_id} onChange={e => updateRepartition(idx, 'caisse_id', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none">
                                <option value="">Sélectionner...</option>
                                {caisses.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                              </select>
                            ) : (
                              <select value={r.virement_id} onChange={e => updateRepartition(idx, 'virement_id', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none">
                                <option value="">Sélectionner...</option>
                                {virements.map(v => <option key={v.id} value={v.id}>{v.nom}</option>)}
                              </select>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total répartition */}
                  <div className={`rounded-xl p-4 border ${
                    totalRepartition > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Total réparti</span>
                      <span className={`text-lg font-bold ${totalRepartition > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                        {fmt(totalRepartition)}
                      </span>
                    </div>
                    {derniereVdfc?.montant_valide && totalRepartition !== Number(derniereVdfc.montant_valide) && totalRepartition > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        Montant DFC : {fmt(derniereVdfc.montant_valide)} — Différence : {fmt(Math.abs(totalRepartition - Number(derniereVdfc.montant_valide)))}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Commentaire */}
              <div className="mt-5">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Commentaire DG {confirmAction === 'rejete' && <span className="text-red-500">* (obligatoire en cas de rejet)</span>}
                </label>
                <textarea
                  value={form.commentaire}
                  onChange={e => setForm({ ...form, commentaire: e.target.value })}
                  rows={2}
                  placeholder="Observations, instructions particulières..."
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              {/* Messages */}
              {error && (
                <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              {success && <p className="mt-4 p-3 text-sm rounded-xl bg-green-50 text-green-700 border border-green-100">{success}</p>}

              {/* Boutons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-gray-100">
                {besoin.statut === 'VALIDE_DG' && (
                  <button onClick={handleSaveOnly} disabled={saving}
                    className="px-4 py-2.5 text-sm border border-emerald-300 text-emerald-700 rounded-xl hover:bg-emerald-50 disabled:opacity-50 font-medium">
                    {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                  </button>
                )}
                {peutStatuer && (
                  <>
                    <button onClick={() => setConfirmAction('valide')} disabled={saving}
                      className="flex-1 sm:flex-none px-5 py-2.5 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-medium">
                      ✓ Valider
                    </button>
                    <button onClick={() => {
                      if (!form.commentaire.trim()) {
                        setError('Le commentaire est obligatoire en cas de rejet.')
                        return
                      }
                      setConfirmAction('rejete')
                    }} disabled={saving}
                      className="flex-1 sm:flex-none px-5 py-2.5 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 font-medium">
                      ✗ Rejeter
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Lecture seule si REJETE_DG */}
          {besoin.statut === 'REJETE_DG' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
              <h2 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">Décision (rejeté)</h2>
              {derniereVdg?.commentaire && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-red-400 uppercase mb-1">Motif du rejet</p>
                  <p className="text-sm text-red-700">{derniereVdg.commentaire}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Circuit de validation complet */}
      <ChaineValidation besoinId={id} />

      {/* Modal confirmation */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 max-w-md w-full mx-auto shadow-2xl">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
            <h3 className="text-lg font-bold mb-2">
              {confirmAction === 'valide' ? 'Confirmer la validation' : 'Confirmer le rejet'}
            </h3>
            <p className="text-sm text-gray-600 mb-1">Besoin : <strong>{besoin.numero}</strong></p>

            {confirmAction === 'valide' && (
              <div className="space-y-1 mb-4">
                {modeValidation === 'total' ? (
                  <>
                    <p className="text-sm text-gray-600">Montant : <strong>{fmt(Number(form.montant_valide))}</strong></p>
                    <p className="text-sm text-gray-600">Via : <strong>
                      {form.mode_decaissement === 'caisse'
                        ? `Caisse — ${caisses.find(c => c.id === form.caisse_id)?.nom ?? ''}`
                        : `Virement — ${virements.find(v => v.id === form.virement_id)?.nom ?? ''}`}
                    </strong></p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 font-medium">Validation répartie :</p>
                    {repartitions.map((r, i) => (
                      <p key={i} className="text-sm text-gray-600 pl-3">
                        • {fmt(Number(r.montant))} via {r.mode === 'caisse'
                          ? `Caisse — ${caisses.find(c => c.id === r.caisse_id)?.nom ?? ''}`
                          : `Virement — ${virements.find(v => v.id === r.virement_id)?.nom ?? ''}`}
                      </p>
                    ))}
                    <p className="text-sm text-gray-800 font-bold pt-1">Total : {fmt(totalRepartition)}</p>
                  </>
                )}
              </div>
            )}

            {confirmAction === 'rejete' && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Motif du rejet :</p>
                <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2 italic">{form.commentaire}</p>
              </div>
            )}

            <div className="flex gap-3 pb-4 sm:pb-0">
              <button onClick={() => setConfirmAction(null)} className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">
                Annuler
              </button>
              <button onClick={() => handleAction(confirmAction)} disabled={saving}
                className={`flex-1 px-4 py-2.5 text-sm text-white rounded-xl disabled:opacity-50 font-medium ${
                  confirmAction === 'valide' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}>
                {saving ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DGLayout>
  )
}