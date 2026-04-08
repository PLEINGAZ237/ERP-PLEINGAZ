import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import RespAgenceLayout from '@/components/commercial/RespAgenceLayout'
import { Loader2, Plus, Search } from 'lucide-react'

const STATUT_STYLE = {
  EN_COURS: 'bg-amber-100 text-amber-700', CHARGEMENT: 'bg-blue-100 text-blue-700',
  EN_VENTE: 'bg-purple-100 text-purple-700', RETOUR: 'bg-orange-100 text-orange-700',
  BOUCLEE: 'bg-green-100 text-green-700', ANNULEE: 'bg-gray-200 text-gray-500',
}

export default function ListeSorties() {
  const navigate = useNavigate()
  const [sorties, setSorties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase.from('sorties_vehicules')
        .select('*, vehicules(immatriculation, nom), itineraires(nom), magasins(nom)')
        .order('created_at', { ascending: false })
      setSorties(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filtre ? sorties.filter(s => s.statut === filtre) : sorties

  return (
    <RespAgenceLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Sorties véhicules</h1>
        <Link to="/commercial/agence/sorties/creer"
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 text-sm font-medium">
          <Plus size={18} /> Nouvelle sortie
        </Link>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {[{ v: '', l: 'Toutes' }, { v: 'EN_COURS', l: 'En cours' }, { v: 'EN_VENTE', l: 'En vente' }, { v: 'BOUCLEE', l: 'Bouclées' }].map(f => (
          <button key={f.v} onClick={() => setFiltre(f.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filtre === f.v ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {f.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20 text-gray-400"><Loader2 className="animate-spin mb-2" /><p className="text-sm">Chargement...</p></div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">Aucune sortie trouvée.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Numéro', 'Véhicule', 'Vendeur', 'Itinéraire', 'Magasin', 'Date', 'Statut'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => navigate(`/commercial/agence/sorties/${s.id}`)}>
                    <td className="px-5 py-3 font-mono text-xs text-teal-600">{s.numero}</td>
                    <td className="px-5 py-3 font-medium text-gray-700">{s.vehicules?.immatriculation}</td>
                    <td className="px-5 py-3 text-gray-600">—</td>
                    <td className="px-5 py-3 text-gray-500">{s.itineraires?.nom ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-500">{s.magasins?.nom}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{new Date(s.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${STATUT_STYLE[s.statut] ?? ''}`}>{s.statut.replace(/_/g, ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-gray-50">
            {filtered.map(s => (
              <div key={s.id} onClick={() => navigate(`/commercial/agence/sorties/${s.id}`)} className="p-4 active:bg-gray-50 cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-mono text-xs text-teal-600 font-medium">{s.numero}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUT_STYLE[s.statut] ?? ''}`}>{s.statut.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-sm font-medium text-gray-800">{s.vehicules?.immatriculation} — —</p>
                <p className="text-xs text-gray-400 mt-1">{s.itineraires?.nom ?? '—'} · {new Date(s.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </RespAgenceLayout>
  )
}
