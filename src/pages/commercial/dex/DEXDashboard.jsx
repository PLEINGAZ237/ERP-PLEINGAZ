import { Link } from 'react-router-dom'
import DEXLayout from '@/components/commercial/DEXLayout'
import { BarChart3, Wallet, Package, History } from 'lucide-react'

export default function DEXDashboard() {
  return (
    <DEXLayout>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">DFC / Direction d'Exploitation</h1>
        <p className="text-sm text-gray-400">Analyses, rapports et contrôles.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/commercial/dex/analyses" className="bg-indigo-600 text-white rounded-xl p-5 hover:bg-indigo-700 transition-colors">
          <BarChart3 size={24} className="mb-2" /><p className="font-bold">Analyses ventes</p><p className="text-sm text-indigo-200">CA, tonnage, dettes par client, agence, article</p>
        </Link>
        <Link to="/commercial/dex/rapports-caisse" className="bg-amber-600 text-white rounded-xl p-5 hover:bg-amber-700 transition-colors">
          <Wallet size={24} className="mb-2" /><p className="font-bold">Rapports caisse</p><p className="text-sm text-amber-200">Toutes les journées de caisse</p>
        </Link>
        <Link to="/commercial/dex/rapports-stock" className="bg-green-600 text-white rounded-xl p-5 hover:bg-green-700 transition-colors">
          <Package size={24} className="mb-2" /><p className="font-bold">Rapports stock</p><p className="text-sm text-green-200">Toutes les journées de stock</p>
        </Link>
        <Link to="/commercial/dex/audit" className="bg-gray-700 text-white rounded-xl p-5 hover:bg-gray-800 transition-colors">
          <History size={24} className="mb-2" /><p className="font-bold">Journal d'audit</p><p className="text-sm text-gray-300">Traçabilité complète</p>
        </Link>
      </div>
    </DEXLayout>
  )
}
