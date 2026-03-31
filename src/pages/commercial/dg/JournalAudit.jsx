import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DGCommLayout from '@/components/commercial/DGCommLayout'
import { Loader2, Search, ChevronDown, ChevronUp, User, Clock, Database, Activity } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : null

const LABELS = {
  montant: 'Montant', statut: 'Statut', numero: 'Numéro', type: 'Type',
  action: 'Action', montant_total: 'Montant total', ecart: 'Écart',
  solde_theorique: 'Solde théorique', solde_physique: 'Solde physique',
  client_id: 'Client', caisse_id: 'Caisse', magasin_id: 'Magasin',
  vehicule_id: 'Véhicule', vendeur_id: 'Vendeur', article_id: 'Article',
  quantite: 'Quantité', motif: 'Motif', justification: 'Justification',
}

const ACTION_ICONS = {
  green: '🟢', blue: '🔵', red: '🔴', purple: '🟣', orange: '🟠', gray: '⚪',
}

function getActionStyle(action) {
  const a = (action ?? '').toLowerCase()
  if (a.includes('créé') || a.includes('ouvert') || a.includes('creat') || a.includes('ajout')) return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', dot: ACTION_ICONS.green }
  if (a.includes('factur')) return { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700', dot: ACTION_ICONS.blue }
  if (a.includes('règlement') || a.includes('encaiss') || a.includes('mouvement')) return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', dot: ACTION_ICONS.orange }
  if (a.includes('clôtur') || a.includes('clotur')) return { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700', dot: ACTION_ICONS.purple }
  if (a.includes('valid') || a.includes('appro') || a.includes('confirm')) return { bg: 'bg-green-50 border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700', dot: ACTION_ICONS.green }
  if (a.includes('rejet') || a.includes('refus') || a.includes('annul')) return { bg: 'bg-red-50 border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700', dot: ACTION_ICONS.red }
  if (a.includes('livr') || a.includes('sortie') || a.includes('retour') || a.includes('transfert')) return { bg: 'bg-sky-50 border-sky-200', text: 'text-sky-700', badge: 'bg-sky-100 text-sky-700', dot: ACTION_ICONS.blue }
  return { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-600', dot: ACTION_ICONS.gray }
}

function formatDetailValue(key, value) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (key.includes('montant') || key.includes('solde') || key === 'ecart') {
    const n = Number(value)
    return isNaN(n) ? String(value) : n.toLocaleString('fr-FR') + ' F'
  }
  return String(value)
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-medium text-gray-700">{value}</span>
    </div>
  )
}

export default function JournalAudit({ Layout = DGCommLayout }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 30

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase.from('journal_audit')
        .select('*, profiles!effectue_par(nom, prenom, email)')
        .order('created_at', { ascending: false })
        .limit(500)
      setLogs(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = logs.filter(l => {
    if (moduleFilter && l.module !== moduleFilter) return false
    if (dateFilter) {
      const d = new Date(l.created_at).toISOString().slice(0, 10)
      if (d !== dateFilter) return false
    }
    if (search) {
      const q = search.toLowerCase()
      const inAction = l.action?.toLowerCase().includes(q)
      const inTable = l.table_cible?.toLowerCase().includes(q)
      const inNom = l.profiles?.nom?.toLowerCase().includes(q)
      const inPrenom = l.profiles?.prenom?.toLowerCase().includes(q)
      const inEmail = l.profiles?.email?.toLowerCase().includes(q)
      const inDetails = l.details ? JSON.stringify(l.details).toLowerCase().includes(q) : false
      if (!inAction && !inTable && !inNom && !inPrenom && !inEmail && !inDetails) return false
    }
    return true
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const modules = [...new Set(logs.map(l => l.module).filter(Boolean))].sort()
  const dates = [...new Set(logs.map(l => new Date(l.created_at).toISOString().slice(0, 10)))].sort().reverse()

  // Stats rapides
  const today = new Date().toISOString().slice(0, 10)
  const todayCount = logs.filter(l => new Date(l.created_at).toISOString().slice(0, 10) === today).length
  const usersToday = new Set(logs.filter(l => new Date(l.created_at).toISOString().slice(0, 10) === today).map(l => l.effectue_par)).size

  if (loading) return <Layout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-gray-400" size={28} /></div></Layout>

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Journal d'audit</h1>
        <p className="text-sm text-gray-400">Traçabilité complète de toutes les actions du système.</p>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <div className="flex items-center gap-2 mb-1"><Activity size={12} className="text-blue-500" /><p className="text-[10px] font-bold uppercase text-blue-600">Total actions</p></div>
          <p className="text-lg font-bold text-gray-800">{logs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <div className="flex items-center gap-2 mb-1"><Clock size={12} className="text-green-500" /><p className="text-[10px] font-bold uppercase text-green-600">Aujourd'hui</p></div>
          <p className="text-lg font-bold text-gray-800">{todayCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <div className="flex items-center gap-2 mb-1"><User size={12} className="text-purple-500" /><p className="text-[10px] font-bold uppercase text-purple-600">Utilisateurs actifs</p></div>
          <p className="text-lg font-bold text-gray-800">{usersToday}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <div className="flex items-center gap-2 mb-1"><Database size={12} className="text-amber-500" /><p className="text-[10px] font-bold uppercase text-amber-600">Résultats filtrés</p></div>
          <p className="text-lg font-bold text-gray-800">{filtered.length}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Rechercher par action, utilisateur, table..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400 transition-colors" />
        </div>
        <select value={moduleFilter} onChange={e => { setModuleFilter(e.target.value); setPage(0) }}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none min-w-[140px]">
          <option value="">Tous les modules</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(0) }}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none min-w-[160px]">
          <option value="">Toutes les dates</option>
          {dates.slice(0, 30).map(d => (
            <option key={d} value={d}>{new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</option>
          ))}
        </select>
      </div>

      {/* Liste */}
      {paginated.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">Aucune entrée trouvée.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map(l => {
            const style = getActionStyle(l.action)
            const isOpen = expanded === l.id
            const details = l.details ? Object.entries(l.details) : []
            const time = new Date(l.created_at)

            return (
              <div key={l.id} className={`rounded-xl border overflow-hidden transition-all ${isOpen ? style.bg : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                <div className="px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(isOpen ? null : l.id)}>
                  {/* Heure */}
                  <div className="hidden sm:flex flex-col items-center w-14 shrink-0">
                    <p className="text-xs font-bold text-gray-700">{time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-[10px] text-gray-400">{time.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</p>
                  </div>

                  {/* Contenu principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${style.badge}`}>{l.action}</span>
                      {l.table_cible && <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{l.table_cible}</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {l.profiles?.prenom} {l.profiles?.nom}
                      {details.length > 0 && (
                        <span className="text-gray-300"> · </span>
                      )}
                      {details.length > 0 && details.slice(0, 2).map(([k, v]) => {
                        const label = LABELS[k] || k
                        const val = formatDetailValue(k, v)
                        return <span key={k} className="text-gray-400">{label}: <span className="text-gray-600 font-medium">{val}</span> </span>
                      })}
                    </p>
                  </div>

                  {/* Module + chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    {l.module && <span className="hidden sm:inline text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{l.module}</span>}
                    {details.length > 0 && (isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />)}
                  </div>
                </div>

                {/* Détails expandés */}
                {isOpen && details.length > 0 && (
                  <div className="px-4 pb-3 sm:pl-[76px]">
                    <div className="bg-white rounded-lg border border-gray-100 p-3 divide-y divide-gray-50">
                      <DetailRow label="Utilisateur" value={`${l.profiles?.prenom ?? ''} ${l.profiles?.nom ?? ''} (${l.profiles?.email ?? ''})`} />
                      <DetailRow label="Date et heure" value={time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' à ' + time.toLocaleTimeString('fr-FR')} />
                      {l.module && <DetailRow label="Module" value={l.module} />}
                      {l.table_cible && <DetailRow label="Table" value={l.table_cible} />}
                      {details.map(([k, v]) => (
                        <DetailRow key={k} label={LABELS[k] || k} value={formatDetailValue(k, v)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-gray-400">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} sur {filtered.length}
          </p>
          <div className="flex gap-1">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">← Précédent</button>
            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
              const p = page < 3 ? i : page - 2 + i
              if (p >= totalPages) return null
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 text-xs font-medium rounded-lg ${p === page ? 'bg-gray-800 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}>
                  {p + 1}
                </button>
              )
            })}
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">Suivant →</button>
          </div>
        </div>
      )}
    </Layout>
  )
}
