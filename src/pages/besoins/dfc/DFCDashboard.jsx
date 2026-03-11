import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import DFCLayout from '@/components/besoins/dfc/DFCLayout'

const STATUT_STYLE = {
  EN_ATTENTE_DFC: 'bg-amber-100 text-amber-700',
  EN_ATTENTE_DG:  'bg-blue-100 text-blue-700',
  REJETE_DFC:     'bg-red-100 text-red-700',
  VALIDE_DG:      'bg-green-100 text-green-700',
  REJETE_DG:      'bg-red-200 text-red-900 border border-red-300',
}

const STATUT_LABEL = {
  EN_ATTENTE_DFC: 'En attente DFC',
  EN_ATTENTE_DG:  'Validé — En attente DG',
  REJETE_DFC:     'Rejeté DFC',
  VALIDE_DG:      'Validé DG — En attente décaissement',
  REJETE_DG:      'Rejeté par DG',
}

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '—'

export default function DFCDashboard() {
  const navigate = useNavigate()
  const [besoins, setBesoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('TOUT')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('besoins')
        .select(`
          id, numero, montant_demande, description, statut, created_at,
          profiles!employe_id(nom, prenom, departements(nom)),
          validations_dfc(montant_valide),
          validations_dg(montant_valide)
        `)
        .order('created_at', { ascending: false })

      if (data) setBesoins(data)
      setLoading(false)
    }
    load()
  }, [])

  const stats = {
    total:     besoins.length,
    enAttente: besoins.filter(b => b.statut === 'EN_ATTENTE_DFC').length,
    valide:    besoins.filter(b => ['EN_ATTENTE_DG', 'VALIDE_DG'].includes(b.statut)).length,
    rejete:    besoins.filter(b => ['REJETE_DFC', 'REJETE_DG'].includes(b.statut)).length,
  }

  // ── Tableau "À traiter" ── montant demandé
  const TableATraiter = ({ data }) => (
    <div className="bg-white rounded-xl shadow mb-6 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h2 className="font-semibold text-gray-700">À traiter</h2>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">{data.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Numéro</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Employé</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Département</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Description</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Montant demandé</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Date</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500">Statut</th>
            </tr>
          </thead>
          <tbody>
            {data.map(b => (
              <tr key={b.id} className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/besoins/dfc/besoin/${b.id}`)}>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.numero}</td>
                <td className="px-4 py-3 font-medium text-gray-700">{b.profiles?.prenom} {b.profiles?.nom}</td>
                <td className="px-4 py-3 text-gray-500">{b.profiles?.departements?.nom ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{b.description}</td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmt(b.montant_demande)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {new Date(b.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUT_STYLE[b.statut]}`}>
                    {STATUT_LABEL[b.statut]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  // ── Tableau "Suivi des validés" ── montant validé (DG si VALIDE_DG, sinon DFC)
  const TableValides = ({ data }) => (
    <div className="bg-white rounded-xl shadow mb-6 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h2 className="font-semibold text-gray-700">Suivi des validés</h2>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{data.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Numéro</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Employé</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Département</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Description</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Montant validé</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Date</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500">Statut</th>
            </tr>
          </thead>
          <tbody>
            {data.map(b => {
              // Si VALIDE_DG → montant DG, sinon (EN_ATTENTE_DG) → montant DFC
              const montantValide = b.statut === 'VALIDE_DG'
                ? b.validations_dg?.[b.validations_dg.length - 1]?.montant_valide
                : b.validations_dfc?.[b.validations_dfc.length - 1]?.montant_valide
              return (
                <tr key={b.id} className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/besoins/dfc/besoin/${b.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.numero}</td>
                  <td className="px-4 py-3 font-medium text-gray-700">{b.profiles?.prenom} {b.profiles?.nom}</td>
                  <td className="px-4 py-3 text-gray-500">{b.profiles?.departements?.nom ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{b.description}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmt(montantValide)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(b.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUT_STYLE[b.statut]}`}>
                      {STATUT_LABEL[b.statut]}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  // ── Tableau "Rejetés" ── montant rejeté = montant validé par DFC
  const TableRejetes = ({ data }) => (
    <div className="bg-white rounded-xl shadow mb-6 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h2 className="font-semibold text-gray-700">Rejetés</h2>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{data.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Numéro</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Employé</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Département</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Description</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Montant rejeté</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Date</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500">Statut</th>
            </tr>
          </thead>
          <tbody>
            {data.map(b => {
              const montantRejete = b.montant_demande
              return (
                <tr key={b.id} className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/besoins/dfc/besoin/${b.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.numero}</td>
                  <td className="px-4 py-3 font-medium text-gray-700">{b.profiles?.prenom} {b.profiles?.nom}</td>
                  <td className="px-4 py-3 text-gray-500">{b.profiles?.departements?.nom ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{b.description}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmt(montantRejete)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(b.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUT_STYLE[b.statut]}`}>
                      {STATUT_LABEL[b.statut]}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <DFCLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Tableau de bord DFC</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div onClick={() => setFiltre('TOUT')} className={`p-4 rounded-xl shadow bg-white border-2 cursor-pointer transition-all ${filtre === 'TOUT' ? 'border-indigo-600' : 'border-transparent'}`}>
            <p className="text-gray-500 text-xs font-bold uppercase">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div onClick={() => setFiltre('EN_ATTENTE_DFC')} className={`p-4 rounded-xl shadow bg-white border-2 cursor-pointer transition-all ${filtre === 'EN_ATTENTE_DFC' ? 'border-amber-600' : 'border-transparent'}`}>
            <p className="text-amber-600 text-xs font-bold uppercase">À traiter</p>
            <p className="text-2xl font-bold">{stats.enAttente}</p>
          </div>
          <div onClick={() => setFiltre('VALIDES')} className={`p-4 rounded-xl shadow bg-white border-2 cursor-pointer transition-all ${filtre === 'VALIDES' ? 'border-blue-600' : 'border-transparent'}`}>
            <p className="text-blue-600 text-xs font-bold uppercase">Validés / Suivi</p>
            <p className="text-2xl font-bold">{stats.valide}</p>
          </div>
          <div onClick={() => setFiltre('REJETES')} className={`p-4 rounded-xl shadow bg-white border-2 cursor-pointer transition-all ${filtre === 'REJETES' ? 'border-red-600' : 'border-transparent'}`}>
            <p className="text-red-600 text-xs font-bold uppercase">Rejetés</p>
            <p className="text-2xl font-bold">{stats.rejete}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-10 italic">Chargement...</p>
        ) : (
          <div className="space-y-2">
            {(filtre === 'TOUT' || filtre === 'EN_ATTENTE_DFC') && (
              <TableATraiter data={besoins.filter(b => b.statut === 'EN_ATTENTE_DFC')} />
            )}
            {(filtre === 'TOUT' || filtre === 'VALIDES') && (
              <TableValides data={besoins.filter(b => ['EN_ATTENTE_DG', 'VALIDE_DG'].includes(b.statut))} />
            )}
            {(filtre === 'TOUT' || filtre === 'REJETES') && (
              <TableRejetes data={besoins.filter(b => ['REJETE_DFC', 'REJETE_DG'].includes(b.statut))} />
            )}
          </div>
        )}
      </div>
    </DFCLayout>
  )
}