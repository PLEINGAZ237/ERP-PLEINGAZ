import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/admin/AdminLayout'
import {
  Plus,
  Edit2,
  Trash2,
  ShieldAlert,
  Loader2,
  Link as LinkIcon,
  Search,
} from 'lucide-react'

export default function Services() {
  /* ── State ──────────────────────────────────────────────── */
  const [services, setServices] = useState([])
  const [departements, setDepartements] = useState([])
  const [roles, setRoles] = useState([])
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modal création / édition du service
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nom: '', departement_id: '' })
  const [associations, setAssociations] = useState([
    { role_id: '', module_id: '' },
  ])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  /* ── Chargement ─────────────────────────────────────────── */
  const loadAll = useCallback(async () => {
    setLoading(true)

    const [svcRes, deptRes, roleRes, modRes] = await Promise.all([
      supabase
        .from('services')
        .select(
          '*, departements(nom), service_role_module(id, role_id, module_id, roles(nom), modules(nom))'
        )
        .order('created_at', { ascending: false }),
      supabase.from('departements').select('id, nom').eq('statut', 'actif'),
      supabase.from('roles').select('id, nom, module_id'),
      supabase.from('modules').select('id, nom').eq('statut', 'actif'),
    ])

    setServices(svcRes.data ?? [])
    setDepartements(deptRes.data ?? [])
    setRoles(roleRes.data ?? [])
    setModules(modRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  /* ── Recherche filtrée ──────────────────────────────────── */
  const filtered = useMemo(() => {
    if (!search.trim()) return services
    const q = search.toLowerCase().trim()
    return services.filter((svc) => {
      const nom = svc.nom?.toLowerCase() ?? ''
      const dept = svc.departements?.nom?.toLowerCase() ?? ''
      const assocText = (svc.service_role_module ?? [])
        .map((a) => `${a.roles?.nom ?? ''} ${a.modules?.nom ?? ''}`)
        .join(' ')
        .toLowerCase()
      return nom.includes(q) || dept.includes(q) || assocText.includes(q)
    })
  }, [services, search])

  /* ── Rôles filtrés par module sélectionné ───────────────── */
  const getRolesForModule = (moduleId) => {
    if (!moduleId) return []
    return roles.filter((r) => r.module_id === moduleId)
  }

  /* ── Helpers formulaire ─────────────────────────────────── */
  const resetForm = () => {
    setEditing(null)
    setForm({ nom: '', departement_id: '' })
    setAssociations([{ role_id: '', module_id: '' }])
    setError('')
  }

  const openCreate = () => {
    resetForm()
    setShowModal(true)
  }

  const openEdit = (service) => {
    setEditing(service)
    setForm({
      nom: service.nom,
      departement_id: service.departement_id,
    })
    const existing = (service.service_role_module ?? []).map((a) => ({
      id: a.id,
      role_id: a.role_id,
      module_id: a.module_id,
    }))
    setAssociations(
      existing.length > 0 ? existing : [{ role_id: '', module_id: '' }]
    )
    setError('')
    setShowModal(true)
  }

  const addAssociation = () => {
    setAssociations([...associations, { role_id: '', module_id: '' }])
  }

  const removeAssociation = (idx) => {
    if (associations.length <= 1) return
    setAssociations(associations.filter((_, i) => i !== idx))
  }

  const updateAssociation = (idx, key, value) => {
    const updated = [...associations]
    if (key === 'module_id') {
      updated[idx] = { ...updated[idx], module_id: value, role_id: '' }
    } else {
      updated[idx] = { ...updated[idx], [key]: value }
    }
    setAssociations(updated)
  }

  /* ── Sauvegarde ─────────────────────────────────────────── */
  const handleSave = async (e) => {
    e.preventDefault()

    const validAssocs = associations.filter((a) => a.role_id && a.module_id)
    if (validAssocs.length === 0) {
      setError(
        'Vous devez attribuer au moins un rôle dans un module pour ce service.'
      )
      return
    }

    const moduleIds = validAssocs.map((a) => a.module_id)
    if (new Set(moduleIds).size !== moduleIds.length) {
      setError('Un même module ne peut pas apparaître deux fois.')
      return
    }

    setSaving(true)
    setError('')

    try {
      let serviceId = editing?.id

      if (editing) {
        const { error: updErr } = await supabase
          .from('services')
          .update({ nom: form.nom, departement_id: form.departement_id })
          .eq('id', serviceId)
        if (updErr) throw updErr

        await supabase
          .from('service_role_module')
          .delete()
          .eq('service_id', serviceId)
      } else {
        const { data: newSvc, error: insErr } = await supabase
          .from('services')
          .insert({ nom: form.nom, departement_id: form.departement_id })
          .select('id')
          .single()
        if (insErr) throw insErr
        serviceId = newSvc.id
      }

      const rows = validAssocs.map((a) => ({
        service_id: serviceId,
        role_id: a.role_id,
        module_id: a.module_id,
      }))
      const { error: relErr } = await supabase
        .from('service_role_module')
        .insert(rows)
      if (relErr) throw relErr

      setShowModal(false)
      loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  /* ── Actions statut ─────────────────────────────────────── */
  const toggleStatut = async (service) => {
    const newStatut = service.statut === 'actif' ? 'bloque' : 'actif'
    await supabase
      .from('services')
      .update({ statut: newStatut })
      .eq('id', service.id)
    loadAll()
  }

  /* ── Rendu ──────────────────────────────────────────────── */
  return (
    <AdminLayout>
      <div className='space-y-4'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
          <h2 className='text-xl md:text-2xl font-bold text-gray-800'>
            Services
          </h2>
          <button
            onClick={openCreate}
            className='flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full sm:w-auto justify-center transition-colors text-sm font-medium'
          >
            <Plus size={18} /> Ajouter
          </button>
        </div>

        {/* Barre de recherche */}
        <div className='relative'>
          <Search
            size={18}
            className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none'
          />
          <input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Rechercher par nom, département, rôle ou module...'
            className='w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm'
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className='flex flex-col items-center justify-center py-20 text-gray-400'>
            <Loader2 className='animate-spin mb-2' />
            <p>Chargement des données...</p>
          </div>
        ) : (
          <div className='bg-white rounded-xl shadow border border-gray-200 overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm text-left'>
                <thead className='bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-xs'>
                  <tr>
                    <th className='px-6 py-4 font-bold'>Nom</th>
                    <th className='px-6 py-4 font-bold'>Département</th>
                    <th className='px-6 py-4 font-bold'>Rôle(s) / Module(s)</th>
                    <th className='px-6 py-4 font-bold'>Statut</th>
                    <th className='px-6 py-4 font-bold text-right'>Actions</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan='100%'
                        className='text-center py-12 text-gray-400 italic'
                      >
                        {search.trim()
                          ? 'Aucun résultat pour cette recherche'
                          : 'Aucun service trouvé'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((svc) => (
                      <tr
                        key={svc.id}
                        className='hover:bg-gray-50/50 transition-colors'
                      >
                        <td className='px-6 py-4 text-gray-700 font-medium'>
                          {svc.nom}
                        </td>
                        <td className='px-6 py-4 text-gray-700'>
                          {svc.departements?.nom ?? '-'}
                        </td>
                        <td className='px-6 py-4'>
                          <div className='flex flex-wrap gap-1.5'>
                            {(svc.service_role_module ?? []).map((assoc) => (
                              <span
                                key={assoc.id}
                                className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200'
                              >
                                <LinkIcon size={10} />
                                {assoc.roles?.nom ?? '?'} → {assoc.modules?.nom ?? '?'}
                              </span>
                            ))}
                            {(svc.service_role_module ?? []).length === 0 && (
                              <span className='text-gray-400 text-xs italic'>
                                Aucune association
                              </span>
                            )}
                          </div>
                        </td>
                        <td className='px-6 py-4'>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              svc.statut === 'actif'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {svc.statut}
                          </span>
                        </td>
                        <td className='px-6 py-4 text-right'>
                          <div className='flex justify-end gap-2'>
                            <button
                              onClick={() => openEdit(svc)}
                              className='p-1.5 text-blue-600 hover:bg-blue-50 rounded'
                              title='Modifier'
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => toggleStatut(svc)}
                              className={`p-1.5 rounded ${
                                svc.statut === 'actif'
                                  ? 'text-orange-500 hover:bg-orange-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title='Changer statut'
                            >
                              <ShieldAlert size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal création / édition ───────────────────────── */}
      {showModal && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4'>
          <div className='bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto'>
            <h3 className='text-xl font-bold text-gray-800 mb-6'>
              {editing ? 'Modifier le service' : 'Nouveau service'}
            </h3>

            <form onSubmit={handleSave} className='space-y-5'>
              {/* Nom */}
              <div>
                <label className='block text-xs font-bold text-gray-500 uppercase mb-1'>
                  Nom du service
                </label>
                <input
                  type='text'
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none'
                  required
                />
              </div>

              {/* Département */}
              <div>
                <label className='block text-xs font-bold text-gray-500 uppercase mb-1'>
                  Département
                </label>
                <select
                  value={form.departement_id}
                  onChange={(e) =>
                    setForm({ ...form, departement_id: e.target.value })
                  }
                  className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none'
                  required
                >
                  <option value=''>Sélectionner...</option>
                  {departements.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nom}
                    </option>
                  ))}
                </select>
              </div>

              {/* Associations Module → Rôle */}
              <div>
                <div className='flex items-center justify-between mb-2'>
                  <label className='block text-xs font-bold text-gray-500 uppercase'>
                    Rôle(s) dans un module
                  </label>
                  <button
                    type='button'
                    onClick={addAssociation}
                    className='text-xs text-blue-600 hover:text-blue-800 font-semibold'
                  >
                    + Ajouter une association
                  </button>
                </div>

                <div className='space-y-3'>
                  {associations.map((assoc, idx) => {
                    const filteredRoles = getRolesForModule(assoc.module_id)

                    return (
                      <div
                        key={idx}
                        className='flex gap-2 items-start bg-gray-50 border border-gray-200 rounded-xl p-3'
                      >
                        {/* 1) Module d'abord */}
                        <div className='flex-1'>
                          <label className='block text-[10px] font-bold text-gray-400 uppercase mb-0.5'>
                            Module
                          </label>
                          <select
                            value={assoc.module_id}
                            onChange={(e) =>
                              updateAssociation(idx, 'module_id', e.target.value)
                            }
                            className='w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none'
                            required
                          >
                            <option value=''>Module...</option>
                            {modules.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.nom}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 2) Rôle filtré par module */}
                        <div className='flex-1'>
                          <label className='block text-[10px] font-bold text-gray-400 uppercase mb-0.5'>
                            Rôle
                          </label>
                          <select
                            value={assoc.role_id}
                            onChange={(e) =>
                              updateAssociation(idx, 'role_id', e.target.value)
                            }
                            className={`w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                              !assoc.module_id
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                            }`}
                            required
                            disabled={!assoc.module_id}
                          >
                            <option value=''>
                              {!assoc.module_id
                                ? "Choisir un module d'abord"
                                : filteredRoles.length === 0
                                  ? 'Aucun rôle pour ce module'
                                  : 'Rôle...'}
                            </option>
                            {filteredRoles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.nom}
                              </option>
                            ))}
                          </select>
                        </div>

                        {associations.length > 1 && (
                          <button
                            type='button'
                            onClick={() => removeAssociation(idx)}
                            className='mt-5 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded'
                            title='Retirer'
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Erreur */}
              {error && (
                <div className='p-3 bg-red-50 text-red-600 text-xs rounded-lg'>
                  {error}
                </div>
              )}

              {/* Boutons */}
              <div className='flex gap-3 pt-4'>
                <button
                  type='button'
                  onClick={() => setShowModal(false)}
                  className='flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors'
                >
                  Annuler
                </button>
                <button
                  type='submit'
                  disabled={saving}
                  className='flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors'
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}