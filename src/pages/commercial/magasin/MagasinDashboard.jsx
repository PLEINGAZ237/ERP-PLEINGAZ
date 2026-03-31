import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import MagasinLayout from '@/components/commercial/MagasinLayout'
import { Loader2, Package, ArrowUpFromLine, BookOpen, AlertTriangle } from 'lucide-react'

export default function MagasinDashboard() {
  const [blAttente, setBlAttente] = useState(0)
  const [blLivres, setBlLivres] = useState(0)
  const [journeeOuverte, setJourneeOuverte] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [{ count: att }, { count: liv }, { data: js }] = await Promise.all([
        supabase.from('bons_livraison').select('id', { count: 'exact', head: true }).eq('statut', 'A_LIVRER'),
        supabase.from('bons_livraison').select('id', { count: 'exact', head: true }).eq('statut', 'LIVRE'),
        supabase.from('journees_stock').select('id').eq('statut', 'OUVERTE').limit(1),
      ])
      setBlAttente(att ?? 0)
      setBlLivres(liv ?? 0)
      setJourneeOuverte((js ?? []).length > 0)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <MagasinLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-green-500" size={28} /></div></MagasinLayout>

  return (
    <MagasinLayout>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Tableau de bord — Magasin</h1>
        <p className="text-sm text-gray-400">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {!journeeOuverte && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm">Stock non ouvert</p>
            <p className="text-xs text-amber-600 mt-1">Allez dans <Link to="/commercial/magasin/gestion" className="underline font-medium">Gestion stock</Link> pour ouvrir la journée.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2"><ArrowUpFromLine size={16} className="text-amber-500" /><p className="text-[10px] font-bold uppercase text-amber-600">Livraisons en attente</p></div>
          <p className="text-2xl font-bold text-gray-800">{blAttente}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2"><Package size={16} className="text-green-500" /><p className="text-[10px] font-bold uppercase text-green-600">Livraisons effectuées</p></div>
          <p className="text-2xl font-bold text-gray-800">{blLivres}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2"><BookOpen size={16} className="text-blue-500" /><p className="text-[10px] font-bold uppercase text-blue-600">Journée stock</p></div>
          <p className="text-2xl font-bold text-gray-800">{journeeOuverte ? 'Ouverte' : 'Fermée'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/commercial/magasin/gestion" className="bg-green-600 text-white rounded-xl p-5 hover:bg-green-700 transition-colors">
          <BookOpen size={24} className="mb-2" />
          <p className="font-bold">Gestion stock</p>
          <p className="text-sm text-green-200">Ouvrir, mouvements, clôturer</p>
        </Link>
        <Link to="/commercial/magasin/livraisons" className="bg-amber-600 text-white rounded-xl p-5 hover:bg-amber-700 transition-colors">
          <ArrowUpFromLine size={24} className="mb-2" />
          <p className="font-bold">Livraisons</p>
          <p className="text-sm text-amber-200">{blAttente} en attente de confirmation</p>
        </Link>
      </div>
    </MagasinLayout>
  )
}
