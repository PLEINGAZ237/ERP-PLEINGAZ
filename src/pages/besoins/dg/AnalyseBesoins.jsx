import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import DGLayout from '@/components/besoins/dg/DGLayout'

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

export default function AnalyseBesoins() {
  const navigate = useNavigate()
  const [besoins, setBesoins]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [onglet, setOnglet]     = useState('liste') // 'liste' | 'stats'

  // Filtres
  const [recherche, setRecherche]         = useState('')
  const [statutFiltre, setStatutFiltre]   = useState('')
  const [departementFiltre, setDepartementFiltre] = useState('')
  const [employeFiltre, setEmployeFiltre] = useState('')
  const [dateDebut, setDateDebut]         = useState('')
  const [dateFin, setDateFin]             = useState('')
  const [montantMin, setMontantMin]       = useState('')
  const [montantMax, setMontantMax]       = useState('')
  const [tri, setTri]                     = useState('date_desc')

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

  // Extraire départements et employés uniques pour les filtres
  const departements = useMemo(() => {
    const map = new Map()
    besoins.forEach(b => {
      const dep = b.profiles?.departements
      if (dep?.id) map.set(dep.id, dep.nom)
    })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [besoins])

  const employes = useMemo(() => {
    const map = new Map()
    besoins.forEach(b => {
      const p = b.profiles
      if (p?.id) map.set(p.id, `${p.prenom} ${p.nom}`)
    })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [besoins])

  // Filtrage
  const besoinsFiltres = useMemo(() => {
    let result = [...besoins]

    if (recherche.trim()) {
      const q = recherche.toLowerCase()
      result = result.filter(b =>
        b.numero?.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q) ||
        `${b.profiles?.prenom} ${b.profiles?.nom}`.toLowerCase().includes(q)
      )
    }
    if (statutFiltre) {
      result = result.filter(b => b.statut === statutFiltre)
    }
    if (departementFiltre) {
      result = result.filter(b => b.profiles?.departements?.id === departementFiltre)
    }
    if (employeFiltre) {
      result = result.filter(b => b.profiles?.id === employeFiltre)
    }
    if (dateDebut) {
      result = result.filter(b => b.created_at >= dateDebut)
    }
    if (dateFin) {
      result = result.filter(b => b.created_at <= dateFin + 'T23:59:59')
    }
    if (montantMin) {
      result = result.filter(b => Number(b.montant_demande) >= Number(montantMin))
    }
    if (montantMax) {
      result = result.filter(b => Number(b.montant_demande) <= Number(montantMax))
    }

    // Tri
    result.sort((a, b) => {
      if (tri === 'date_desc') return new Date(b.created_at) - new Date(a.created_at)
      if (tri === 'date_asc') return new Date(a.created_at) - new Date(b.created_at)
      if (tri === 'montant_desc') return Number(b.montant_demande) - Number(a.montant_demande)
      if (tri === 'montant_asc') return Number(a.montant_demande) - Number(b.montant_demande)
      return 0
    })

    return result
  }, [besoins, recherche, statutFiltre, departementFiltre, employeFiltre, dateDebut, dateFin, montantMin, montantMax, tri])

  // Stats calculées
  const stats = useMemo(() => {
    const total = besoinsFiltres.length
    const montantTotal = besoinsFiltres.reduce((s, b) => s + Number(b.montant_demande), 0)
    const montantMoyen = total > 0 ? montantTotal / total : 0

    // Par statut
    const parStatut = {}
    besoinsFiltres.forEach(b => {
      if (!parStatut[b.statut]) parStatut[b.statut] = { count: 0, montant: 0 }
      parStatut[b.statut].count++
      parStatut[b.statut].montant += Number(b.montant_demande)
    })

    // Par département
    const parDept = {}
    besoinsFiltres.forEach(b => {
      const nom = b.profiles?.departements?.nom ?? 'Non assigné'
      if (!parDept[nom]) parDept[nom] = { count: 0, montant: 0 }
      parDept[nom].count++
      parDept[nom].montant += Number(b.montant_demande)
    })

    // Par employé (top 10)
    const parEmploye = {}
    besoinsFiltres.forEach(b => {
      const nom = b.profiles ? `${b.profiles.prenom} ${b.profiles.nom}` : 'Inconnu'
      if (!parEmploye[nom]) parEmploye[nom] = { count: 0, montant: 0 }
      parEmploye[nom].count++
      parEmploye[nom].montant += Number(b.montant_demande)
    })

    // Par mois
    const parMois = {}
    besoinsFiltres.forEach(b => {
      const d = new Date(b.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!parMois[key]) parMois[key] = { count: 0, montant: 0 }
      parMois[key].count++
      parMois[key].montant += Number(b.montant_demande)
    })

    // Taux de validation
    const valides = besoinsFiltres.filter(b => ['VALIDE_DG', 'DECAISSE', 'EN_ATTENTE_RETOUR_CAISSE', 'BOUCLE'].includes(b.statut)).length
    const rejetes = besoinsFiltres.filter(b => ['REJETE_DFC', 'REJETE_DG'].includes(b.statut)).length
    const enCours = besoinsFiltres.filter(b => ['EN_ATTENTE_DFC', 'EN_ATTENTE_DG'].includes(b.statut)).length

    return {
      total, montantTotal, montantMoyen,
      parStatut, parDept, parEmploye, parMois,
      valides, rejetes, enCours,
    }
  }, [besoinsFiltres])

  const resetFiltres = () => {
    setRecherche('')
    setStatutFiltre('')
    setDepartementFiltre('')
    setEmployeFiltre('')
    setDateDebut('')
    setDateFin('')
    setMontantMin('')
    setMontantMax('')
    setTri('date_desc')
  }

  const sortedDepts = Object.entries(stats.parDept).sort((a, b) => b[1].count - a[1].count)
  const sortedEmployes = Object.entries(stats.parEmploye).sort((a, b) => b[1].count - a[1].count).slice(0, 10)
  const sortedMois = Object.entries(stats.parMois).sort((a, b) => a[0].localeCompare(b[0]))
  const maxDeptCount = sortedDepts.length > 0 ? sortedDepts[0][1].count : 1
  const maxEmpCount = sortedEmployes.length > 0 ? sortedEmployes[0][1].count : 1
  const maxMoisMontant = sortedMois.length > 0 ? Math.max(...sortedMois.map(m => m[1].montant)) : 1

  const formatMois = (key) => {
    const [y, m] = key.split('-')
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    return `${mois[parseInt(m) - 1]} ${y}`
  }

  return (
    <DGLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Analyse des besoins</h1>

        {/* Onglets */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setOnglet('liste')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              onglet === 'liste' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Liste & Recherche
          </button>
          <button
            onClick={() => setOnglet('stats')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              onglet === 'stats' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Statistiques
          </button>
        </div>

        {/* Bloc filtres (commun aux deux onglets) */}
        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Filtres</h2>
            <button onClick={resetFiltres} className="text-xs text-emerald-600 hover:underline">
              Réinitialiser
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Recherche libre */}
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Recherche</label>
              <input
                type="text"
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                placeholder="Numéro, description, employé..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Statut */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Statut</label>
              <select
                value={statutFiltre}
                onChange={e => setStatutFiltre(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Tous</option>
                {TOUS_STATUTS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Département */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Département</label>
              <select
                value={departementFiltre}
                onChange={e => setDepartementFiltre(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Tous</option>
                {departements.map(([id, nom]) => (
                  <option key={id} value={id}>{nom}</option>
                ))}
              </select>
            </div>

            {/* Employé */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Employé</label>
              <select
                value={employeFiltre}
                onChange={e => setEmployeFiltre(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Tous</option>
                {employes.map(([id, nom]) => (
                  <option key={id} value={id}>{nom}</option>
                ))}
              </select>
            </div>

            {/* Période */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Du</label>
              <input
                type="date"
                value={dateDebut}
                onChange={e => setDateDebut(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Au</label>
              <input
                type="date"
                value={dateFin}
                onChange={e => setDateFin(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Montant min / max */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Montant min (FCFA)</label>
              <input
                type="number"
                value={montantMin}
                onChange={e => setMontantMin(e.target.value)}
                placeholder="0"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Montant max (FCFA)</label>
              <input
                type="number"
                value={montantMax}
                onChange={e => setMontantMax(e.target.value)}
                placeholder="Illimité"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Résumé filtres actifs */}
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium">{besoinsFiltres.length} besoin{besoinsFiltres.length !== 1 ? 's' : ''}</span>
            <span>—</span>
            <span>{Number(stats.montantTotal).toLocaleString('fr-FR')} FCFA au total</span>
          </div>
        </div>

        {loading ? (
          <p className="text-center py-10 text-gray-400 italic text-sm">Chargement des données...</p>
        ) : onglet === 'liste' ? (
          /* ============ ONGLET LISTE ============ */
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-700">
                Tous les besoins ({besoinsFiltres.length})
              </h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Trier par :</label>
                <select
                  value={tri}
                  onChange={e => setTri(e.target.value)}
                  className="border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="date_desc">Date (récent)</option>
                  <option value="date_asc">Date (ancien)</option>
                  <option value="montant_desc">Montant (haut)</option>
                  <option value="montant_asc">Montant (bas)</option>
                </select>
              </div>
            </div>

            {besoinsFiltres.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Aucun besoin ne correspond aux filtres</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Numéro', 'Employé', 'Département', 'Description', 'Montant', 'Date', 'Statut'].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {besoinsFiltres.map(b => (
                      <tr
                        key={b.id}
                        className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/besoins/dg/besoin/${b.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.numero}</td>
                        <td className="px-4 py-3 font-medium text-gray-700">
                          {b.profiles?.prenom} {b.profiles?.nom}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {b.profiles?.departements?.nom ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{b.description}</td>
                        <td className="px-4 py-3 text-gray-700 font-bold whitespace-nowrap">
                          {Number(b.montant_demande).toLocaleString('fr-FR')}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {new Date(b.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUT_STYLE[b.statut] ?? ''}`}>
                            {TOUS_STATUTS.find(s => s.value === b.statut)?.label ?? b.statut}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* ============ ONGLET STATISTIQUES ============ */
          <div className="space-y-6">
            {/* KPIs principaux */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-[10px] font-bold uppercase text-gray-400">Total besoins</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-[10px] font-bold uppercase text-gray-400">Montant total</p>
                <p className="text-lg font-bold text-gray-800">{Number(stats.montantTotal).toLocaleString('fr-FR')}</p>
                <p className="text-[10px] text-gray-400">FCFA</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-[10px] font-bold uppercase text-gray-400">Montant moyen</p>
                <p className="text-lg font-bold text-gray-800">{Math.round(stats.montantMoyen).toLocaleString('fr-FR')}</p>
                <p className="text-[10px] text-gray-400">FCFA</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-[10px] font-bold uppercase text-emerald-600">Validés</p>
                <p className="text-2xl font-bold text-emerald-700">{stats.valides}</p>
                <p className="text-[10px] text-gray-400">
                  {stats.total > 0 ? Math.round(stats.valides / stats.total * 100) : 0}% du total
                </p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-[10px] font-bold uppercase text-red-600">Rejetés</p>
                <p className="text-2xl font-bold text-red-700">{stats.rejetes}</p>
                <p className="text-[10px] text-gray-400">
                  {stats.total > 0 ? Math.round(stats.rejetes / stats.total * 100) : 0}% du total
                </p>
              </div>
            </div>

            {/* Répartition par statut */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4">
                Répartition par statut
              </h2>
              <div className="space-y-2">
                {Object.entries(stats.parStatut).sort((a, b) => b[1].count - a[1].count).map(([statut, data]) => (
                  <div key={statut} className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap min-w-[140px] text-center ${STATUT_STYLE[statut] ?? 'bg-gray-100'}`}>
                      {TOUS_STATUTS.find(s => s.value === statut)?.label ?? statut}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                      <div
                        className="h-full bg-emerald-200 rounded-full transition-all"
                        style={{ width: `${stats.total > 0 ? (data.count / stats.total * 100) : 0}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-gray-600">
                        {data.count} — {Number(data.montant).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top départements */}
              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4">
                  Besoins par département
                </h2>
                {sortedDepts.length === 0 ? (
                  <p className="text-gray-400 text-sm">Aucune donnée</p>
                ) : (
                  <div className="space-y-3">
                    {sortedDepts.map(([nom, data]) => (
                      <div key={nom}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 truncate">{nom}</span>
                          <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                            {data.count} besoin{data.count > 1 ? 's' : ''} — {Number(data.montant).toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full transition-all"
                            style={{ width: `${(data.count / maxDeptCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top employés */}
              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4">
                  Top 10 employés (par nombre)
                </h2>
                {sortedEmployes.length === 0 ? (
                  <p className="text-gray-400 text-sm">Aucune donnée</p>
                ) : (
                  <div className="space-y-3">
                    {sortedEmployes.map(([nom, data], i) => (
                      <div key={nom}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 truncate">
                            <span className="text-xs text-gray-400 mr-1">#{i + 1}</span>
                            {nom}
                          </span>
                          <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                            {data.count} besoin{data.count > 1 ? 's' : ''} — {Number(data.montant).toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full bg-blue-400 rounded-full transition-all"
                            style={{ width: `${(data.count / maxEmpCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Évolution mensuelle */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4">
                Évolution mensuelle
              </h2>
              {sortedMois.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucune donnée</p>
              ) : (
                <div className="space-y-2">
                  {sortedMois.map(([key, data]) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 font-mono w-20 shrink-0">{formatMois(key)}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                        <div
                          className="h-full bg-purple-200 rounded-full transition-all"
                          style={{ width: `${(data.montant / maxMoisMontant) * 100}%` }}
                        />
                        <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-gray-600">
                          {data.count} besoin{data.count > 1 ? 's' : ''} — {Number(data.montant).toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DGLayout>
  )
}