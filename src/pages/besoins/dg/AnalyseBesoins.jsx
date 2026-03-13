import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import DGLayout from '@/components/besoins/dg/DGLayout'
import { Loader2, ShieldBan, ShieldCheck, Trash2, Plus, AlertTriangle } from 'lucide-react'

const TOUS_STATUTS = [
  { value: 'EN_ATTENTE_DFC', label: 'En attente DFC' },
  { value: 'REJETE_DFC',     label: 'Rejeté DFC' },
  { value: 'EN_ATTENTE_DG',  label: 'En attente DG' },
  { value: 'VALIDE_DG',      label: 'Validé DG' },
  { value: 'REJETE_DG',      label: 'Rejeté DG' },
  { value: 'DECAISSE',       label: 'Décaissé' },
  { value: 'EN_ATTENTE_RETOUR_CAISSE', label: 'Retour caisse' },
  { value: 'BOUCLE',         label: 'Bouclé' },
]

const STATUT_STYLE = {
  EN_ATTENTE_DFC: 'bg-amber-100 text-amber-700',
  EN_ATTENTE_DG:  'bg-blue-100 text-blue-700',
  VALIDE_DG:      'bg-emerald-100 text-emerald-700',
  REJETE_DFC:     'bg-red-100 text-red-700',
  REJETE_DG:      'bg-red-200 text-red-900',
  DECAISSE:       'bg-purple-100 text-purple-700',
  EN_ATTENTE_RETOUR_CAISSE: 'bg-amber-100 text-amber-700',
  BOUCLE:         'bg-gray-100 text-gray-500',
}

const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' FCFA'
const PERIODES = [
  { value: 'jour', label: 'Journalier' },
  { value: 'semaine', label: 'Hebdomadaire' },
  { value: 'mois', label: 'Mensuel' },
]

export default function AnalyseBesoins() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [besoins, setBesoins]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [onglet, setOnglet]     = useState('liste')

  // Filtres
  const [recherche, setRecherche]                   = useState('')
  const [statutFiltre, setStatutFiltre]             = useState('')
  const [departementFiltre, setDepartementFiltre]   = useState('')
  const [employeFiltre, setEmployeFiltre]           = useState('')
  const [dateDebut, setDateDebut]                   = useState('')
  const [dateFin, setDateFin]                       = useState('')
  const [montantMin, setMontantMin]                 = useState('')
  const [montantMax, setMontantMax]                 = useState('')
  const [tri, setTri]                               = useState('date_desc')

  // Contrôles
  const [blocages, setBlocages]     = useState([])
  const [limites, setLimites]       = useState([])
  const [allUsers, setAllUsers]     = useState([])
  const [loadingCtrl, setLoadingCtrl] = useState(false)
  const [savingCtrl, setSavingCtrl]   = useState(false)
  const [ctrlError, setCtrlError]     = useState('')
  const [ctrlSuccess, setCtrlSuccess] = useState('')

  // Formulaires contrôles
  const [blocageForm, setBlocageForm]   = useState({ utilisateur_id: '', motif: '' })
  const [limiteForm, setLimiteForm]     = useState({ periode: 'jour', montant_max: '' })

  // ── Chargement besoins ──
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('besoins')
        .select(`
          id, numero, montant_demande, description, statut, created_at,
          profiles!employe_id(id, nom, prenom, departements(id, nom)),
          validations_dfc(montant_valide),
          validations_dg(montant_valide),
          decaissements(montant_decaisse)
        `)
        .order('created_at', { ascending: false })
      if (data) setBesoins(data)
      setLoading(false)
    }
    load()
  }, [])

  // ── Chargement contrôles ──
  const loadControles = async () => {
    setLoadingCtrl(true)
    const [{ data: b }, { data: l }, { data: u }] = await Promise.all([
      supabase.from('blocages_besoins').select('*, profiles!utilisateur_id(nom, prenom, email)').eq('actif', true).order('created_at', { ascending: false }),
      supabase.from('limites_besoins').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, nom, prenom, email').eq('statut', 'actif').order('nom'),
    ])
    setBlocages(b ?? [])
    setLimites(l ?? [])
    setAllUsers(u ?? [])
    setLoadingCtrl(false)
  }

  useEffect(() => {
    if (onglet === 'controles') loadControles()
  }, [onglet])

  // ── Filtrage besoins ──
  const departements = useMemo(() => {
    const map = new Map()
    besoins.forEach(b => { const d = b.profiles?.departements; if (d?.id) map.set(d.id, d.nom) })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [besoins])

  const employes = useMemo(() => {
    const map = new Map()
    besoins.forEach(b => { const p = b.profiles; if (p?.id) map.set(p.id, `${p.prenom} ${p.nom}`) })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [besoins])

  const besoinsFiltres = useMemo(() => {
    let result = [...besoins]
    if (recherche.trim()) {
      const q = recherche.toLowerCase()
      result = result.filter(b => b.numero?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q) || `${b.profiles?.prenom} ${b.profiles?.nom}`.toLowerCase().includes(q))
    }
    if (statutFiltre)       result = result.filter(b => b.statut === statutFiltre)
    if (departementFiltre)  result = result.filter(b => b.profiles?.departements?.id === departementFiltre)
    if (employeFiltre)      result = result.filter(b => b.profiles?.id === employeFiltre)
    if (dateDebut)          result = result.filter(b => b.created_at >= dateDebut)
    if (dateFin)            result = result.filter(b => b.created_at <= dateFin + 'T23:59:59')
    if (montantMin)         result = result.filter(b => Number(b.montant_demande) >= Number(montantMin))
    if (montantMax)         result = result.filter(b => Number(b.montant_demande) <= Number(montantMax))
    result.sort((a, b) => {
      if (tri === 'date_desc')    return new Date(b.created_at) - new Date(a.created_at)
      if (tri === 'date_asc')     return new Date(a.created_at) - new Date(b.created_at)
      if (tri === 'montant_desc') return Number(b.montant_demande) - Number(a.montant_demande)
      if (tri === 'montant_asc')  return Number(a.montant_demande) - Number(b.montant_demande)
      return 0
    })
    return result
  }, [besoins, recherche, statutFiltre, departementFiltre, employeFiltre, dateDebut, dateFin, montantMin, montantMax, tri])

  // ── Stats ──
  const stats = useMemo(() => {
    const total = besoinsFiltres.length
    const montantTotal = besoinsFiltres.reduce((s, b) => s + Number(b.montant_demande), 0)
    const montantMoyen = total > 0 ? montantTotal / total : 0
    const valides = besoinsFiltres.filter(b => ['VALIDE_DG', 'DECAISSE', 'EN_ATTENTE_RETOUR_CAISSE', 'BOUCLE'].includes(b.statut)).length
    const rejetes = besoinsFiltres.filter(b => ['REJETE_DFC', 'REJETE_DG'].includes(b.statut)).length

    const parStatut = {}, parDept = {}, parEmploye = {}, parMois = {}
    besoinsFiltres.forEach(b => {
      if (!parStatut[b.statut]) parStatut[b.statut] = { count: 0, montant: 0 }
      parStatut[b.statut].count++; parStatut[b.statut].montant += Number(b.montant_demande)
      const dnom = b.profiles?.departements?.nom ?? 'Non assigné'
      if (!parDept[dnom]) parDept[dnom] = { count: 0, montant: 0 }
      parDept[dnom].count++; parDept[dnom].montant += Number(b.montant_demande)
      const enom = b.profiles ? `${b.profiles.prenom} ${b.profiles.nom}` : 'Inconnu'
      if (!parEmploye[enom]) parEmploye[enom] = { count: 0, montant: 0 }
      parEmploye[enom].count++; parEmploye[enom].montant += Number(b.montant_demande)
      const d = new Date(b.created_at); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!parMois[key]) parMois[key] = { count: 0, montant: 0 }
      parMois[key].count++; parMois[key].montant += Number(b.montant_demande)
    })
    return { total, montantTotal, montantMoyen, valides, rejetes, parStatut, parDept, parEmploye, parMois }
  }, [besoinsFiltres])

  const resetFiltres = () => { setRecherche(''); setStatutFiltre(''); setDepartementFiltre(''); setEmployeFiltre(''); setDateDebut(''); setDateFin(''); setMontantMin(''); setMontantMax(''); setTri('date_desc') }

  const sortedDepts = Object.entries(stats.parDept).sort((a, b) => b[1].count - a[1].count)
  const sortedEmployes = Object.entries(stats.parEmploye).sort((a, b) => b[1].count - a[1].count).slice(0, 10)
  const sortedMois = Object.entries(stats.parMois).sort((a, b) => a[0].localeCompare(b[0]))
  const maxDeptCount = sortedDepts[0]?.[1]?.count || 1
  const maxEmpCount = sortedEmployes[0]?.[1]?.count || 1
  const maxMoisMontant = sortedMois.length > 0 ? Math.max(...sortedMois.map(m => m[1].montant)) : 1

  const formatMois = (key) => {
    const [y, m] = key.split('-')
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    return `${mois[parseInt(m) - 1]} ${y}`
  }

  // ── Actions contrôles ──
  const handleBlocage = async (e) => {
    e.preventDefault()
    if (!blocageForm.utilisateur_id) { setCtrlError('Sélectionnez un utilisateur.'); return }
    setSavingCtrl(true); setCtrlError('')
    const { error } = await supabase.from('blocages_besoins').insert({
      utilisateur_id: blocageForm.utilisateur_id,
      motif: blocageForm.motif || null,
      bloque_par: user.id,
    })
    setSavingCtrl(false)
    if (error) { setCtrlError(error.message); return }
    setBlocageForm({ utilisateur_id: '', motif: '' })
    setCtrlSuccess('Utilisateur bloqué.')
    setTimeout(() => setCtrlSuccess(''), 3000)
    loadControles()
  }

  const handleDeblocage = async (blocageId) => {
    await supabase.from('blocages_besoins').update({ actif: false }).eq('id', blocageId)
    loadControles()
  }

  const handleLimite = async (e) => {
    e.preventDefault()
    if (!limiteForm.montant_max || Number(limiteForm.montant_max) <= 0) { setCtrlError('Montant invalide.'); return }
    setSavingCtrl(true); setCtrlError('')
    // Récupérer l'entreprise du DG
    const { data: profil } = await supabase.from('profiles').select('entreprise_id').eq('id', user.id).single()
    if (!profil?.entreprise_id) { setCtrlError("Entreprise non trouvée."); setSavingCtrl(false); return }

    // Upsert : si une limite existe déjà pour cette période, la mettre à jour
    const existing = limites.find(l => l.periode === limiteForm.periode && l.entreprise_id === profil.entreprise_id)
    let result
    if (existing) {
      result = await supabase.from('limites_besoins').update({
        montant_max: Number(limiteForm.montant_max),
        actif: true,
        cree_par: user.id,
      }).eq('id', existing.id)
    } else {
      result = await supabase.from('limites_besoins').insert({
        entreprise_id: profil.entreprise_id,
        periode: limiteForm.periode,
        montant_max: Number(limiteForm.montant_max),
        cree_par: user.id,
      })
    }
    setSavingCtrl(false)
    if (result.error) { setCtrlError(result.error.message); return }
    setLimiteForm({ periode: 'jour', montant_max: '' })
    setCtrlSuccess('Limite enregistrée.')
    setTimeout(() => setCtrlSuccess(''), 3000)
    loadControles()
  }

  const toggleLimite = async (limite) => {
    await supabase.from('limites_besoins').update({ actif: !limite.actif }).eq('id', limite.id)
    loadControles()
  }

  const deleteLimite = async (limiteId) => {
    if (!confirm('Supprimer cette limite ?')) return
    await supabase.from('limites_besoins').delete().eq('id', limiteId)
    loadControles()
  }

  // Utilisateurs non encore bloqués pour le select
  const usersNonBloques = allUsers.filter(u => !blocages.some(b => b.utilisateur_id === u.id))

  return (
    <DGLayout>
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Analyse & Contrôles</h1>
      <p className="text-sm text-gray-400 mb-6">Vue d'ensemble, statistiques et paramètres de contrôle des besoins.</p>

      {/* Onglets */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-full sm:w-fit overflow-x-auto">
        {[
          { key: 'liste', label: 'Liste & Recherche' },
          { key: 'stats', label: 'Statistiques' },
          { key: 'controles', label: 'Contrôles' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setOnglet(t.key)}
            className={`px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              onglet === t.key ? 'bg-white shadow text-red-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Filtres (Liste + Stats) ── */}
      {(onglet === 'liste' || onglet === 'stats') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Filtres</h2>
            <button onClick={resetFiltres} className="text-xs text-red-600 hover:underline">Réinitialiser</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Recherche</label>
              <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Numéro, description, employé..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Statut</label>
              <select value={statutFiltre} onChange={e => setStatutFiltre(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
                <option value="">Tous</option>
                {TOUS_STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Département</label>
              <select value={departementFiltre} onChange={e => setDepartementFiltre(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
                <option value="">Tous</option>
                {departements.map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Employé</label>
              <select value={employeFiltre} onChange={e => setEmployeFiltre(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
                <option value="">Tous</option>
                {employes.map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Du</label>
              <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Au</label>
              <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Montant min</label>
              <input type="number" value={montantMin} onChange={e => setMontantMin(e.target.value)} placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            <span className="font-medium">{besoinsFiltres.length} besoin{besoinsFiltres.length !== 1 ? 's' : ''}</span> — {Number(stats.montantTotal).toLocaleString('fr-FR')} FCFA
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <Loader2 className="animate-spin mb-2" /><p className="text-sm">Chargement...</p>
        </div>
      ) : onglet === 'liste' ? (
        /* ════════ LISTE ════════ */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b">
            <h2 className="font-semibold text-gray-700 text-sm">Tous les besoins ({besoinsFiltres.length})</h2>
            <select value={tri} onChange={e => setTri(e.target.value)} className="border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20">
              <option value="date_desc">Date (récent)</option>
              <option value="date_asc">Date (ancien)</option>
              <option value="montant_desc">Montant ↓</option>
              <option value="montant_asc">Montant ↑</option>
            </select>
          </div>
          {besoinsFiltres.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">Aucun besoin</p>
          ) : (
            <>
              {/* Mobile */}
              <div className="md:hidden divide-y divide-gray-50">
                {besoinsFiltres.map(b => (
                  <div key={b.id} onClick={() => navigate(`/besoins/dg/besoin/${b.id}`)} className="p-4 active:bg-gray-50 cursor-pointer">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-mono text-xs text-red-600 font-medium">{b.numero}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUT_STYLE[b.statut] ?? ''}`}>
                        {TOUS_STATUTS.find(s => s.value === b.statut)?.label ?? b.statut}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{b.profiles?.prenom} {b.profiles?.nom}</p>
                    <p className="text-xs text-gray-500 truncate">{b.description}</p>
                    <div className="flex justify-between mt-2">
                      <p className="text-sm font-bold">{Number(b.montant_demande).toLocaleString('fr-FR')}</p>
                      <p className="text-[10px] text-gray-400">{new Date(b.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>{['Numéro','Employé','Département','Description','Montant','Date','Statut'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {besoinsFiltres.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50/50 cursor-pointer transition-colors" onClick={() => navigate(`/besoins/dg/besoin/${b.id}`)}>
                        <td className="px-4 py-3 font-mono text-xs text-red-600">{b.numero}</td>
                        <td className="px-4 py-3 font-medium text-gray-700">{b.profiles?.prenom} {b.profiles?.nom}</td>
                        <td className="px-4 py-3 text-gray-500">{b.profiles?.departements?.nom ?? '-'}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{b.description}</td>
                        <td className="px-4 py-3 font-bold whitespace-nowrap">{Number(b.montant_demande).toLocaleString('fr-FR')}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(b.created_at).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUT_STYLE[b.statut] ?? ''}`}>{TOUS_STATUTS.find(s => s.value === b.statut)?.label ?? b.statut}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

      ) : onglet === 'stats' ? (
        /* ════════ STATS ════════ */
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            {[
              { label: 'Total', value: stats.total, color: 'gray' },
              { label: 'Montant total', value: Number(stats.montantTotal).toLocaleString('fr-FR'), sub: 'FCFA', color: 'gray' },
              { label: 'Montant moyen', value: Math.round(stats.montantMoyen).toLocaleString('fr-FR'), sub: 'FCFA', color: 'gray' },
              { label: 'Validés', value: stats.valides, sub: stats.total > 0 ? Math.round(stats.valides / stats.total * 100) + '%' : '0%', color: 'emerald' },
              { label: 'Rejetés', value: stats.rejetes, sub: stats.total > 0 ? Math.round(stats.rejetes / stats.total * 100) + '%' : '0%', color: 'red' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <p className={`text-[10px] font-bold uppercase text-${k.color}-500`}>{k.label}</p>
                <p className="text-lg md:text-2xl font-bold text-gray-800 mt-1">{k.value}</p>
                {k.sub && <p className="text-[10px] text-gray-400">{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* Par statut */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
            <h2 className="font-semibold text-gray-700 text-sm uppercase mb-4">Par statut</h2>
            <div className="space-y-2">
              {Object.entries(stats.parStatut).sort((a, b) => b[1].count - a[1].count).map(([statut, data]) => (
                <div key={statut} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap sm:min-w-[140px] text-center ${STATUT_STYLE[statut] ?? 'bg-gray-100'}`}>
                    {TOUS_STATUTS.find(s => s.value === statut)?.label ?? statut}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                    <div className="h-full bg-red-200 rounded-full transition-all" style={{ width: `${stats.total > 0 ? (data.count / stats.total * 100) : 0}%` }} />
                    <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-gray-600">{data.count} — {Number(data.montant).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Par département */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
              <h2 className="font-semibold text-gray-700 text-sm uppercase mb-4">Par département</h2>
              <div className="space-y-3">
                {sortedDepts.map(([nom, data]) => (
                  <div key={nom}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 truncate">{nom}</span>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{data.count} — {Number(data.montant).toLocaleString('fr-FR')}</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${(data.count / maxDeptCount) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Top employés */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
              <h2 className="font-semibold text-gray-700 text-sm uppercase mb-4">Top 10 employés</h2>
              <div className="space-y-3">
                {sortedEmployes.map(([nom, data], i) => (
                  <div key={nom}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 truncate"><span className="text-xs text-gray-400 mr-1">#{i+1}</span>{nom}</span>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{data.count} — {Number(data.montant).toLocaleString('fr-FR')}</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${(data.count / maxEmpCount) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Évolution mensuelle */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
            <h2 className="font-semibold text-gray-700 text-sm uppercase mb-4">Évolution mensuelle</h2>
            <div className="space-y-2">
              {sortedMois.map(([key, data]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 font-mono w-16 md:w-20 shrink-0">{formatMois(key)}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                    <div className="h-full bg-purple-200 rounded-full transition-all" style={{ width: `${(data.montant / maxMoisMontant) * 100}%` }} />
                    <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-gray-600">{data.count} — {Number(data.montant).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      ) : (
        /* ════════ CONTRÔLES ════════ */
        <div className="space-y-6">
          {loadingCtrl ? (
            <div className="flex flex-col items-center py-20 text-gray-400">
              <Loader2 className="animate-spin mb-2" /><p className="text-sm">Chargement des contrôles...</p>
            </div>
          ) : (
            <>
              {/* Messages */}
              {ctrlError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{ctrlError}</p>
                </div>
              )}
              {ctrlSuccess && <p className="p-3 text-sm rounded-xl bg-green-50 text-green-700 border border-green-100">{ctrlSuccess}</p>}

              {/* ── Blocages ── */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
                <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
                  <ShieldBan size={18} className="text-red-500" /> Blocage d'émetteurs
                </h2>
                <p className="text-xs text-gray-400 mb-5">Empêcher un utilisateur d'émettre des besoins.</p>

                {/* Formulaire blocage */}
                <form onSubmit={handleBlocage} className="flex flex-col sm:flex-row gap-3 mb-5 p-3 md:p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Utilisateur</label>
                    <select value={blocageForm.utilisateur_id} onChange={e => setBlocageForm({ ...blocageForm, utilisateur_id: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
                      <option value="">Sélectionner...</option>
                      {usersNonBloques.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom} ({u.email})</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Motif (optionnel)</label>
                    <input type="text" value={blocageForm.motif} onChange={e => setBlocageForm({ ...blocageForm, motif: e.target.value })}
                      placeholder="Raison du blocage..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" disabled={savingCtrl} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 whitespace-nowrap">
                      <ShieldBan size={14} className="inline mr-1" /> Bloquer
                    </button>
                  </div>
                </form>

                {/* Liste des blocages actifs */}
                {blocages.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Aucun utilisateur bloqué.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {blocages.map(b => (
                      <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{b.profiles?.prenom} {b.profiles?.nom}</p>
                          <p className="text-xs text-gray-400">{b.profiles?.email}</p>
                          {b.motif && <p className="text-xs text-red-500 mt-0.5">Motif : {b.motif}</p>}
                        </div>
                        <button onClick={() => handleDeblocage(b.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 w-fit">
                          <ShieldCheck size={14} /> Débloquer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Limites de montant ── */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
                <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-500" /> Plafonds de dépenses
                </h2>
                <p className="text-xs text-gray-400 mb-5">Fixer un montant maximum par période. Quand le plafond est atteint, plus aucun besoin ne peut être émis.</p>

                {/* Formulaire limite */}
                <form onSubmit={handleLimite} className="flex flex-col sm:flex-row gap-3 mb-5 p-3 md:p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="sm:w-40">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Période</label>
                    <select value={limiteForm.periode} onChange={e => setLimiteForm({ ...limiteForm, periode: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20">
                      {PERIODES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Montant maximum (FCFA)</label>
                    <input type="number" value={limiteForm.montant_max} onChange={e => setLimiteForm({ ...limiteForm, montant_max: e.target.value })}
                      min="1" placeholder="Ex: 5000000" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" disabled={savingCtrl} className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap">
                      <Plus size={14} className="inline mr-1" /> Enregistrer
                    </button>
                  </div>
                </form>

                {/* Liste des limites */}
                {limites.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Aucun plafond configuré.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {limites.map(l => (
                      <div key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${l.actif ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>
                              {PERIODES.find(p => p.value === l.periode)?.label}
                            </span>
                            <span className={`text-sm font-bold ${l.actif ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                              {Number(l.montant_max).toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleLimite(l)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                              l.actif ? 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100' : 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100'
                            }`}>
                            {l.actif ? 'Désactiver' : 'Activer'}
                          </button>
                          <button onClick={() => deleteLimite(l.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </DGLayout>
  )
}