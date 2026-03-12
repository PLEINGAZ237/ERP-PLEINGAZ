import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/admin/AdminLayout'

const EXCEPTIONS_EMAIL = ['blkenfack@hotmail.com']

const isEmailAutorise = (email) => {
  if (EXCEPTIONS_EMAIL.includes(email.toLowerCase())) return true
  return email.toLowerCase().endsWith('@monpleingaz.com')
}

export default function Utilisateurs() {
  const [users, setUsers]               = useState([])
  const [entreprises, setEntreprises]   = useState([])
  const [departements, setDepartements] = useState([])
  const [allRoles, setAllRoles]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [showCreate, setShowCreate]     = useState(false)
  const [showEdit, setShowEdit]         = useState(false)
  const [selected, setSelected]         = useState(null)
  const [error, setError]               = useState('')
  const [saving, setSaving]             = useState(false)

  const [createForm, setCreateForm] = useState({ email: '', password: '' })

  const [editForm, setEditForm] = useState({
    nom: '', prenom: '', entreprise_id: '', departement_id: '', selectedRoles: []
  })

  const load = async () => {
    setLoading(true)
    const [{ data: profiles }, { data: ents }, { data: depts }, { data: roles }] =
      await Promise.all([
        supabase
          .from('profiles')
          .select(`*, entreprises(nom), departements(nom), utilisateur_roles(role_id, roles(nom))`)
          .order('created_at', { ascending: false }),
        supabase.from('entreprises').select('id, nom'),
        supabase.from('departements').select('id, nom'),
        supabase.from('roles').select('id, nom'),
      ])
    setUsers(profiles ?? [])
    setEntreprises(ents ?? [])
    setDepartements(depts ?? [])
    setAllRoles(roles ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // --- CRÉER UN UTILISATEUR ---
  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')

    if (!isEmailAutorise(createForm.email)) {
      setError('Email invalide : seuls les emails @monpleingaz.com sont autorisés.')
      return
    }

    setSaving(true)
    const { error: fnError } = await supabase.functions.invoke('create-user', {
      body: { email: createForm.email, password: createForm.password }
    })
    setSaving(false)

    if (fnError) { setError(fnError.message); return }
    setShowCreate(false)
    setCreateForm({ email: '', password: '' })
    load()
  }

  // --- OUVRIR ÉDITION ---
  const openEdit = (user) => {
    setSelected(user)
    setEditForm({
      nom:            user.nom ?? '',
      prenom:         user.prenom ?? '',
      entreprise_id:  user.entreprise_id ?? '',
      departement_id: user.departement_id ?? '',
      selectedRoles:  user.utilisateur_roles?.map(ur => ur.role_id) ?? [],
    })
    setError('')
    setShowEdit(true)
  }

  // --- SAUVEGARDER ÉDITION ---
  const handleEdit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        nom:            editForm.nom || null,
        prenom:         editForm.prenom || null,
        entreprise_id:  editForm.entreprise_id || null,
        departement_id: editForm.departement_id || null,
      })
      .eq('id', selected.id)

    if (profileError) { setError(profileError.message); setSaving(false); return }

    await supabase.from('utilisateur_roles').delete().eq('user_id', selected.id)
    if (editForm.selectedRoles.length > 0) {
      await supabase.from('utilisateur_roles').insert(
        editForm.selectedRoles.map(role_id => ({ user_id: selected.id, role_id }))
      )
    }

    setSaving(false)
    setShowEdit(false)
    load()
  }

  // --- BLOQUER / DÉBLOQUER ---
  const toggleStatut = async (user) => {
    const newStatut = user.statut === 'actif' ? 'bloque' : 'actif'
    await supabase.from('profiles').update({ statut: newStatut }).eq('id', user.id)
    load()
  }

  const toggleRole = (roleId) => {
    setEditForm(f => ({
      ...f,
      selectedRoles: f.selectedRoles.includes(roleId)
        ? f.selectedRoles.filter(r => r !== roleId)
        : [...f.selectedRoles, roleId]
    }))
  }

  return (
    <AdminLayout>
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Utilisateurs</h2>
        <button
          onClick={() => { setShowCreate(true); setError('') }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Nouvel utilisateur
        </button>
      </div>

      {/* Tableau */}
      {loading ? (
        <p className="text-gray-400 text-center py-10">Chargement...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Email','Nom','Prénom','Entreprise','Département','Rôles','Statut','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-400">
                    Aucun utilisateur
                  </td>
                </tr>
              ) : users.map(user => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{user.email}</td>
                  <td className="px-4 py-3">{user.nom ?? '-'}</td>
                  <td className="px-4 py-3">{user.prenom ?? '-'}</td>
                  <td className="px-4 py-3">{user.entreprises?.nom ?? '-'}</td>
                  <td className="px-4 py-3">{user.departements?.nom ?? '-'}</td>
                  <td className="px-4 py-3">
                    {user.utilisateur_roles?.map(ur => ur.roles?.nom).filter(Boolean).join(', ') || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.statut === 'actif'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {user.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => openEdit(user)}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => toggleStatut(user)}
                        className={`text-xs hover:underline ${
                          user.statut === 'actif' ? 'text-red-500' : 'text-green-600'
                        }`}
                      >
                        {user.statut === 'actif' ? 'Bloquer' : 'Débloquer'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== MODAL : CRÉER ===== */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Nouvel utilisateur</h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="prenom.nom@monpleingaz.com"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Domaine obligatoire : <span className="font-medium">@monpleingaz.com</span>
                  <span className="ml-1 text-amber-600">(exception : blkenfack@hotmail.com)</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Mot de passe temporaire <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimum 6 caractères"
                  minLength={6}
                  required
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                L'utilisateur recevra le rôle <strong>Employé</strong> par défaut. 
                Utilisez "Modifier" ensuite pour affecter l'entreprise, le département et les rôles supplémentaires.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setError('') }}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Création...' : 'Créer l\'utilisateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL : MODIFIER ===== */}
      {showEdit && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-1">Modifier l'utilisateur</h3>
            <p className="text-sm text-gray-500 mb-4">{selected.email}</p>

            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom</label>
                  <input
                    type="text"
                    value={editForm.nom}
                    onChange={e => setEditForm({ ...editForm, nom: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prénom</label>
                  <input
                    type="text"
                    value={editForm.prenom}
                    onChange={e => setEditForm({ ...editForm, prenom: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Entreprise</label>
                <select
                  value={editForm.entreprise_id}
                  onChange={e => setEditForm({ ...editForm, entreprise_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Aucune --</option>
                  {entreprises.map(e => (
                    <option key={e.id} value={e.id}>{e.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Département</label>
                <select
                  value={editForm.departement_id}
                  onChange={e => setEditForm({ ...editForm, departement_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Aucun --</option>
                  {departements.map(d => (
                    <option key={d.id} value={d.id}>{d.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Rôles</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-3">
                  {allRoles.map(role => (
                    <label key={role.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.selectedRoles.includes(role.id)}
                        onChange={() => toggleRole(role.id)}
                        className="rounded"
                      />
                      {role.nom}
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEdit(false); setError('') }}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
