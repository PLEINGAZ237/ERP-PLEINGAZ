import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Edit2, Trash2, ShieldAlert, Plus, Loader2 } from 'lucide-react'

export default function CrudTable({
  table,
  title,
  columns,
  relations,
  hasStatut = true,
  allowDelete = false,
  canEdit = () => true,
  canDelete = () => true,
}) {
  const [records, setRecords] = useState([])
  const [relOpts, setRelOpts] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const buildSelect = useCallback(() => {
    if (!relations) return '*'
    const joins = Object.values(relations)
      .map((rel) => `${rel.table}(${rel.labelKey})`)
      .join(', ')
    return `*, ${joins}`
  }, [relations])

  const loadRecords = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from(table)
      .select(buildSelect())
      .order('created_at', { ascending: false })
    setRecords(data ?? [])
    setLoading(false)
  }, [table, buildSelect])

  const loadRelations = useCallback(async () => {
    if (!relations) return
    const opts = {}
    for (const [key, rel] of Object.entries(relations)) {
      const query = supabase.from(rel.table).select(`id, ${rel.labelKey}`)
      if (rel.filterActive !== false) query.eq('statut', 'actif')
      const { data } = await query
      opts[key] = (data ?? []).map((r) => ({
        value: r.id,
        label: r[rel.labelKey],
      }))
    }
    setRelOpts(opts)
  }, [relations])

  useEffect(() => {
    loadRecords()
    loadRelations()
  }, [loadRecords, loadRelations])

  const openCreate = () => {
    const initial = {}
    columns.forEach((c) => {
      initial[c.key] = ''
    })
    setEditing(null)
    setForm(initial)
    setError('')
    setShowModal(true)
  }

  const openEdit = (record) => {
    const initial = {}
    columns.forEach((c) => {
      initial[c.key] = record[c.key] ?? ''
    })
    setEditing(record)
    setForm(initial)
    setError('')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form }
    const { error: err } = editing
      ? await supabase.from(table).update(payload).eq('id', editing.id)
      : await supabase.from(table).insert(payload)

    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setShowModal(false)
    loadRecords()
  }

  const toggleStatut = async (record) => {
    const newStatut = record.statut === 'actif' ? 'bloque' : 'actif'
    await supabase.from(table).update({ statut: newStatut }).eq('id', record.id)
    loadRecords()
  }

  const handleDelete = async (record) => {
    if (!confirm('Supprimer cet enregistrement ?')) return
    await supabase.from(table).delete().eq('id', record.id)
    loadRecords()
  }

  const displayValue = (col, record) => {
    if (relations?.[col.key]) {
      const rel = relations[col.key]
      return record[rel.table]?.[rel.labelKey] ?? '-'
    }
    return record[col.key] ?? '-'
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <h2 className='text-xl md:text-2xl font-bold text-gray-800'>{title}</h2>
        <button
          onClick={openCreate}
          className='flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full sm:w-auto justify-center transition-colors text-sm font-medium'
        >
          <Plus size={18} /> Ajouter
        </button>
      </div>

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
                  {columns.map((col) => (
                    <th key={col.key} className='px-6 py-4 font-bold'>
                      {col.label}
                    </th>
                  ))}
                  {hasStatut && <th className='px-6 py-4 font-bold'>Statut</th>}
                  <th className='px-6 py-4 font-bold text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {records.length === 0 ? (
                  <tr>
                    <td
                      colSpan='100%'
                      className='text-center py-12 text-gray-400 italic'
                    >
                      Aucun enregistrement trouvé
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr
                      key={record.id}
                      className='hover:bg-gray-50/50 transition-colors'
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className='px-6 py-4 text-gray-700 whitespace-nowrap'
                        >
                          {displayValue(col, record)}
                        </td>
                      ))}
                      {hasStatut && (
                        <td className='px-6 py-4'>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              record.statut === 'actif'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {record.statut}
                          </span>
                        </td>
                      )}
                      <td className='px-6 py-4 text-right'>
                        <div className='flex justify-end gap-2'>
                          {canEdit(record) && (
                            <button
                              onClick={() => openEdit(record)}
                              className='p-1.5 text-blue-600 hover:bg-blue-50 rounded'
                              title='Modifier'
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {hasStatut && (
                            <button
                              onClick={() => toggleStatut(record)}
                              className={`p-1.5 rounded ${record.statut === 'actif' ? 'text-orange-500 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                              title='Changer statut'
                            >
                              <ShieldAlert size={16} />
                            </button>
                          )}
                          {allowDelete && canDelete(record) && (
                            <button
                              onClick={() => handleDelete(record)}
                              className='p-1.5 text-red-500 hover:bg-red-50 rounded'
                              title='Supprimer'
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
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

      {/* Modal - Adapté mobile */}
      {showModal && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4'>
          <div className='bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200'>
            <h3 className='text-xl font-bold text-gray-800 mb-6'>
              {editing ? 'Modifier' : 'Nouvel élément'}
            </h3>
            <form onSubmit={handleSave} className='space-y-4'>
              {columns.map((col) => (
                <div key={col.key}>
                  <label className='block text-xs font-bold text-gray-500 uppercase mb-1'>
                    {col.label}
                  </label>
                  {col.type === 'select' ? (
                    <select
                      value={form[col.key]}
                      onChange={(e) =>
                        setForm({ ...form, [col.key]: e.target.value })
                      }
                      className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none'
                    >
                      <option value=''>Sélectionner...</option>
                      {(relations?.[col.key]
                        ? (relOpts[col.key] ?? [])
                        : (col.options ?? [])
                      ).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={col.type === 'number' ? 'number' : 'text'}
                      value={form[col.key]}
                      onChange={(e) =>
                        setForm({ ...form, [col.key]: e.target.value })
                      }
                      className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none'
                      required={col.required}
                    />
                  )}
                </div>
              ))}
              {error && (
                <div className='p-3 bg-red-50 text-red-600 text-xs rounded-lg'>
                  {error}
                </div>
              )}
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
                  {saving ? 'Action...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
