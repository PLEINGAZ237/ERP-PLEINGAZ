import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DGCommLayout from '@/components/commercial/DGCommLayout'
import { Loader2, Search } from 'lucide-react'

export default function JournalAudit({ Layout = DGCommLayout }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase.from('journal_audit')
        .select('*, profiles!effectue_par(nom, prenom, email)')
        .order('created_at', { ascending: false })
        .limit(100)
      setLogs(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = logs.filter(l => {
    if (moduleFilter && l.module !== moduleFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!l.action.toLowerCase().includes(q) && !l.table_cible?.toLowerCase().includes(q) && !l.profiles?.nom?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const modules = [...new Set(logs.map(l => l.module).filter(Boolean))]

  const ACTION_COLORS = {
    creation: 'bg-green-100 text-green-700',
    modification: 'bg-blue-100 text-blue-700',
    suppression: 'bg-red-100 text-red-700',
    validation: 'bg-purple-100 text-purple-700',
    rejet: 'bg-orange-100 text-orange-700',
  }

  const getActionColor = (action) => {
    const a = action.toLowerCase()
    if (a.includes('creat') || a.includes('ajout') || a.includes('ouvert')) return ACTION_COLORS.creation
    if (a.includes('modif') || a.includes('mise à jour') || a.includes('update')) return ACTION_COLORS.modification
    if (a.includes('supprim') || a.includes('annul')) return ACTION_COLORS.suppression
    if (a.includes('valid') || a.includes('appro')) return ACTION_COLORS.validation
    if (a.includes('rejet') || a.includes('refus')) return ACTION_COLORS.rejet
    return 'bg-gray-100 text-gray-700'
  }

  if (loading) return <Layout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" size={28} /></div></Layout>

  return (
    <Layout>
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Journal d'audit</h1>
      <p className="text-sm text-gray-400 mb-6">Traçabilité complète de toutes les actions du système.</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une action..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none" />
        </div>
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none">
          <option value="">Tous les modules</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">Aucune entrée dans le journal.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.map(l => (
              <div key={l.id} className="px-5 py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getActionColor(l.action)}`}>{l.action}</span>
                      {l.module && <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{l.module}</span>}
                      {l.table_cible && <span className="text-[10px] text-gray-400">{l.table_cible}</span>}
                    </div>
                    <p className="text-xs text-gray-500">
                      {l.profiles?.prenom} {l.profiles?.nom} ({l.profiles?.email})
                    </p>
                    {l.details && (
                      <pre className="text-[10px] text-gray-400 mt-1 bg-gray-50 p-2 rounded overflow-x-auto">{JSON.stringify(l.details, null, 2)}</pre>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 whitespace-nowrap ml-3">
                    {new Date(l.created_at).toLocaleDateString('fr-FR')} {new Date(l.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  )
}
