import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import AuditLayout from '@/components/commercial/AuditLayout'
import { Loader2, AlertTriangle, ClipboardList, Wallet, Package } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function AuditDashboard() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [ecartsCaisse, setEcartsCaisse] = useState([])
  const [ecartsStock, setEcartsStock] = useState([])
  const [inventaires, setInventaires] = useState([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: jc }, { data: js }, { data: inv }] = await Promise.all([
        supabase.from('journees_caisse').select('*, caisses(nom)')
          .eq('ecart_bloque', true).order('date_journee', { ascending: false }),
        supabase.from('journees_stock').select('*, magasins(nom)')
          .eq('ecart_bloque', true).order('date_journee', { ascending: false }),
        supabase.from('inventaires').select('*, magasins(nom), profiles!initie_par(nom, prenom)')
          .in('statut', ['EN_COURS', 'TERMINE']).order('created_at', { ascending: false }),
      ])
      setEcartsCaisse(jc ?? [])
      setEcartsStock(js ?? [])
      setInventaires(inv ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <AuditLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-purple-500" size={28} /></div></AuditLayout>

  return (
    <AuditLayout>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Audit & Contrôle</h1>
        <p className="text-sm text-gray-400">Écarts, inventaires et traçabilité.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-red-500" /><p className="text-[10px] font-bold uppercase text-red-600">Écarts caisse</p></div>
          <p className="text-2xl font-bold text-gray-800">{ecartsCaisse.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-amber-500" /><p className="text-[10px] font-bold uppercase text-amber-600">Écarts stock</p></div>
          <p className="text-2xl font-bold text-gray-800">{ecartsStock.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1"><ClipboardList size={14} className="text-blue-500" /><p className="text-[10px] font-bold uppercase text-blue-600">Inventaires en cours</p></div>
          <p className="text-2xl font-bold text-gray-800">{inventaires.length}</p>
        </div>
        <Link to="/commercial/audit/journal" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:border-purple-300 transition-colors">
          <p className="text-[10px] font-bold uppercase text-purple-600">Journal d'audit</p>
          <p className="text-sm text-gray-500 mt-1">Consulter →</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Écarts caisse bloqués */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b">
            <h2 className="font-semibold text-gray-700 text-sm flex items-center gap-2"><Wallet size={16} className="text-red-500" /> Écarts caisse bloqués</h2>
            <Link to="/commercial/audit/ecarts" className="text-xs text-purple-600 hover:underline">Voir tout →</Link>
          </div>
          {ecartsCaisse.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Aucun écart bloqué.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {ecartsCaisse.slice(0, 5).map(jc => (
                <div key={jc.id} className="px-5 py-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{jc.caisses?.nom}</p>
                      <p className="text-xs text-gray-400">{new Date(jc.date_journee).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <p className="font-bold text-red-600">{fmt(jc.ecart)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Écarts stock bloqués */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b">
            <h2 className="font-semibold text-gray-700 text-sm flex items-center gap-2"><Package size={16} className="text-amber-500" /> Écarts stock bloqués</h2>
            <Link to="/commercial/audit/ecarts" className="text-xs text-purple-600 hover:underline">Voir tout →</Link>
          </div>
          {ecartsStock.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Aucun écart bloqué.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {ecartsStock.slice(0, 5).map(js => (
                <div key={js.id} className="px-5 py-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{js.magasins?.nom}</p>
                      <p className="text-xs text-gray-400">{new Date(js.date_journee).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">Bloqué</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuditLayout>
  )
}
