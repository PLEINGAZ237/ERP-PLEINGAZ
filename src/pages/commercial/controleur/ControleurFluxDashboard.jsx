import { Link } from 'react-router-dom'
import ControleurFluxLayout from '@/components/commercial/ControleurFluxLayout'
import { ArrowDownToLine, ArrowUpFromLine, Package } from 'lucide-react'

export default function ControleurFluxDashboard() {
  return (
    <ControleurFluxLayout>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Contrôleur de flux</h1>
        <p className="text-sm text-gray-400">Comptage et validation des entrées et sorties au centre enfûteur.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/commercial/controleur/entrees" className="bg-green-600 text-white rounded-xl p-5 hover:bg-green-700"><ArrowDownToLine size={24} className="mb-2" /><p className="font-bold">Entrées à valider</p><p className="text-sm text-green-200">Compter avant le magasinier</p></Link>
        <Link to="/commercial/controleur/sorties" className="bg-red-600 text-white rounded-xl p-5 hover:bg-red-700"><ArrowUpFromLine size={24} className="mb-2" /><p className="font-bold">Sorties à valider</p><p className="text-sm text-red-200">Compter après le magasinier</p></Link>
        <Link to="/commercial/controleur/stock" className="bg-gray-700 text-white rounded-xl p-5 hover:bg-gray-800"><Package size={24} className="mb-2" /><p className="font-bold">Stock magasin</p></Link>
      </div>
    </ControleurFluxLayout>
  )
}
