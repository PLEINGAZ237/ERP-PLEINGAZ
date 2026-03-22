import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/admin/AdminLayout'
import { Search, Link as LinkIcon, Wallet } from 'lucide-react'

const EXCEPTIONS_EMAIL = ['blkenfack@hotmail.com']

const isEmailAutorise = (email) => {
  if (EXCEPTIONS_EMAIL.includes(email.toLowerCase())) return true
  return email.toLowerCase().endsWith('@monpleingaz.com')
}

export default function Utilisateurs() {
  const [users, setUsers]               = useState([])
  const [entreprises, setEntreprises]   = useState([])
  const [departements, setDepartements] = useState([])
  const [services, setServices]         = useState([])
  const [caisses, setCaisses]           = useState([])
  const [serviceRolesMap, setServiceRolesMap] = useState({})
  const [adminRoleId, setAdminRoleId]   = useState(null)
  const [loading, setLoading]           = useState(true)
  const [showCreate, setShowCreate]     = useState(false)
  const [showEdit, setShowEdit]         = useState(false)
  const [selected, setSelected]         = useState(null)
  const [error, setError]               = useState('')
  const [saving, setSaving]             = useState(false)
  const [search, setSearch]             = useState('')

  const [createForm, setCreateForm] = useState({ email: '', password: '' })

  // Reset password
  const [showResetPwd, setShowResetPwd] = useState(false)
  const [resetTarget, setResetTarget]   = useState(null)
  const [newPassword, setNewPassword]   = useState('')
  const [resetSuccess, setResetSuccess] = useState('')

  const [editForm, setEditForm] = useState({
    nom: '', prenom: '', entreprise_id: '', departement_id: '', service_id: '', isAdmin: false, caisse_id: '',
  })

  const load = async () => {
    setLoading(true)
    const [
      { data: profiles },
      { data: ents },
      { data: depts },
      { data: svcs },
      { data: srmData },
      { data: roles },
      { data: caissesData },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('*, entreprises(nom), departements(nom), services(nom), caisses(nom), utilisateur_roles(role_id, roles(nom))')
        .order('created_at', { ascending: false }),
      supabase.from('entreprises').select('id, nom'),
      supabase.from('departements').select('id, nom'),
      supabase.from('services').select('id, nom, departement_id').eq('statut', 'actif'),
      supabase
        .from('service_role_module')
        .select('service_id, roles(nom), modules(nom, code)'),
      supabase.from('roles').select('id, nom'),
      supabase.from('caisses').select('id, nom').eq('statut', 'actif').order('nom'),
    ])

    const map = {}
    ;(srmData ?? []).forEach((row) => {
      const sid = row.service_id
      if (!map[sid]) map[sid] = []
      map[sid].push({
        role_nom: row.roles?.nom ?? '?',
        module_nom: row.modules?.nom ?? '?',
        module_code: row.modules?.code ?? '?',
      })
    })
    setServiceRolesMap(map)

    const adminRole = (roles ?? []).find((r) => r.nom === 'Admin')
    setAdminRoleId(adminRole?.id ?? null)

    setUsers(profiles ?? [])
    setEntreprises(ents ?? [])
    setDepartements(depts ?? [])
    setServices(svcs ?? [])
    setCaisses(caissesData ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  /* ── Recherche filtrée ──────────────────────────────────── */
  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase().trim()
    return users.filter((u) => {
      const email   = u.email?.toLowerCase() ?? ''
      const nom     = u.nom?.toLowerCase() ?? ''
      const prenom  = u.prenom?.toLowerCase() ?? ''
      const ent     = u.entreprises?.nom?.toLowerCase() ?? ''
      const dept    = u.departements?.nom?.toLowerCase() ?? ''
      const svc     = u.services?.nom?.toLowerCase() ?? ''
      const caisse  = u.caisses?.nom?.toLowerCase() ?? ''
      const directRoles = (u.utilisateur_roles ?? []).map((ur) => ur.roles?.nom ?? '').join(' ').toLowerCase()
      const svcRoles = (serviceRolesMap[u.service_id] ?? []).map((r) => r.role_nom).join(' ').toLowerCase()
      return (
        email.includes(q) || nom.includes(q) || prenom.includes(q) ||
        ent.includes(q) || dept.includes(q) || svc.includes(q) ||
        caisse.includes(q) || directRoles.includes(q) || svcRoles.includes(q)
      )
    })
  }, [users, search, serviceRolesMap])

  /* ── Services filtrés par département ───────────────────── */
  const filteredServices = editForm.departement_id
    ? services.filter((s) => s.departement_id === editForm.departement_id)
    : []

  /* ── Rôles hérités du service sélectionné dans le formulaire ─ */
  const previewServiceRoles = serviceRolesMap[editForm.service_id] ?? []

  /* ── Le service sélectionné donne-t-il le rôle "decaissement" ? ── */
  const serviceHasDecaissement = previewServiceRoles.some(
    (r) => r.role_nom === 'decaissement' && r.module_code === 'besoins'
  )

  /* ── Helpers pour afficher les rôles d'un user ──────────── */
  const getUserDirectRoles = (user) =>
    (user.utilisateur_roles ?? []).map((ur) => ur.roles?.nom).filter(Boolean)

  const getUserServiceRoles = (user) =>
    serviceRolesMap[user.service_id] ?? []

  const isUserAdmin = (user) =>
    getUserDirectRoles(user).includes('Admin')

  /* ── Un user a-t-il le rôle decaissement ? ──────────────── */
  const userHasDecaissement = (user) =>
    (serviceRolesMap[user.service_id] ?? []).some(
      (r) => r.role_nom === 'decaissement' && r.module_code === 'besoins'
    )

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
      body: { email: createForm.email, password: createForm.password },
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
      service_id:     user.service_id ?? '',
      isAdmin:        isUserAdmin(user),
      caisse_id:      user.caisse_id ?? '',
    })
    setError('')
    setShowEdit(true)
  }

  // --- SAUVEGARDER ÉDITION ---
  const handleEdit = async (e) => {
    e.preventDefault()
    setError('')

    // Vérification : si decaissement → caisse obligatoire
    const futureServiceRoles = serviceRolesMap[editForm.service_id] ?? []
    const willBeDecaissement = futureServiceRoles.some(
      (r) => r.role_nom === 'decaissement' && r.module_code === 'besoins'
    )
    if (willBeDecaissement && !editForm.caisse_id) {
      setError('Ce service inclut le rôle "decaissement" : vous devez sélectionner une caisse.')
      return
    }

    setSaving(true)

    // 1. Mettre à jour le profil (caisse_id inclus)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        nom:            editForm.nom || null,
        prenom:         editForm.prenom || null,
        entreprise_id:  editForm.entreprise_id || null,
        departement_id: editForm.departement_id || null,
        service_id:     editForm.service_id || null,
        caisse_id:      willBeDecaissement ? editForm.caisse_id : null,
      })
      .eq('id', selected.id)

    if (profileError) { setError(profileError.message); setSaving(false); return }

    // 2. Gérer le rôle Admin (direct via utilisateur_roles)
    await supabase.from('utilisateur_roles').delete().eq('user_id', selected.id)
    if (editForm.isAdmin && adminRoleId) {
      await supabase.from('utilisateur_roles').insert({
        user_id: selected.id,
        role_id: adminRoleId,
      })
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

  // --- RÉINITIALISER MOT DE PASSE ---
  const openResetPwd = (user) => {
    setResetTarget(user)
    setNewPassword('')
    setResetSuccess('')
    setError('')
    setShowResetPwd(true)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setResetSuccess('')
    if (!newPassword || newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setSaving(true)
    const { data, error: fnError } = await supabase.functions.invoke('reset-password', {
      body: { user_id: resetTarget.id, new_password: newPassword },
    })
    setSaving(false)
    if (fnError) {
      // Edge Function peut retourner l'erreur dans le body
      try {
        const body = JSON.parse(fnError.message)
        setError(body.error || fnError.message)
      } catch {
        setError(fnError.message)
      }
      return
    }
    if (data?.error) { setError(data.error); return }
    setResetSuccess(`Mot de passe de ${resetTarget.email} réinitialisé avec succès.`)
    setNewPassword('')
    setTimeout(() => { setShowResetPwd(false); setResetSuccess('') }, 2500)
  }

  // --- Changement de département → réinitialise le service et la caisse ---
  const handleDepartementChange = (value) => {
    setEditForm((f) => ({ ...f, departement_id: value, service_id: '', caisse_id: '' }))
  }

  // --- Changement de service → réinitialise la caisse si plus decaissement ---
  const handleServiceChange = (value) => {
    const newServiceRoles = serviceRolesMap[value] ?? []
    const hasDecaiss = newServiceRoles.some(
      (r) => r.role_nom === 'decaissement' && r.module_code === 'besoins'
    )
    setEditForm((f) => ({
      ...f,
      service_id: value,
      caisse_id: hasDecaiss ? f.caisse_id : '',
    }))
  }

  return (
    <AdminLayout>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Utilisateurs</h2>
        <button
          onClick={() => { setShowCreate(true); setError('') }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full sm:w-auto justify-center transition-colors text-sm font-medium"
        >
          + Nouvel utilisateur
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par email, nom, service, rôle, caisse..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
        />
      </div>

      {/* Tableau */}
      {loading ? (
        <p className="text-gray-400 text-center py-10">Chargement...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Email','Nom','Prénom','Entreprise','Département','Service','Rôles','Statut','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-400 italic">
                    {search.trim() ? 'Aucun résultat' : 'Aucun utilisateur'}
                  </td>
                </tr>
              ) : filtered.map(user => {
                const directRoles = getUserDirectRoles(user)
                const svcRoles = getUserServiceRoles(user)

                return (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{user.email}</td>
                    <td className="px-4 py-3">{user.nom ?? '-'}</td>
                    <td className="px-4 py-3">{user.prenom ?? '-'}</td>
                    <td className="px-4 py-3">{user.entreprises?.nom ?? '-'}</td>
                    <td className="px-4 py-3">{user.departements?.nom ?? '-'}</td>
                    <td className="px-4 py-3">{user.services?.nom ?? '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {directRoles.map((r) => (
                          <span key={`d-${r}`} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                            {r}
                          </span>
                        ))}
                        {svcRoles.map((r, i) => (
                          <span key={`s-${i}`} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <LinkIcon size={8} />
                            {r.role_nom} → {r.module_nom}
                          </span>
                        ))}
                        {/* Badge caisse si decaissement */}
                        {userHasDecaissement(user) && user.caisses?.nom && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Wallet size={8} />
                            {user.caisses.nom}
                          </span>
                        )}
                        {directRoles.length === 0 && svcRoles.length === 0 && (
                          <span className="text-gray-300 text-xs italic">Aucun rôle</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(user)} className="text-blue-600 hover:underline text-xs">Modifier</button>
                        <button onClick={() => openResetPwd(user)} className="text-amber-600 hover:underline text-xs">Réinit. MDP</button>
                        <button
                          onClick={() => toggleStatut(user)}
                          className={`text-xs hover:underline ${user.statut === 'actif' ? 'text-red-500' : 'text-green-600'}`}
                        >
                          {user.statut === 'actif' ? 'Bloquer' : 'Débloquer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
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
                <label className="block text-sm font-medium mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="prenom.nom@monpleingaz.com" required />
                <p className="text-xs text-gray-400 mt-1">
                  Domaine obligatoire : <span className="font-medium">@monpleingaz.com</span>
                  <span className="ml-1 text-amber-600">(exception : blkenfack@hotmail.com)</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mot de passe temporaire <span className="text-red-500">*</span></label>
                <input type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimum 6 caractères" minLength={6} required />
              </div>
              {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                Après création, utilisez "Modifier" pour affecter l'entreprise, le département et le service.
                <strong className="block mt-1 text-gray-500">Les rôles sont automatiquement hérités du service.</strong>
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setError('') }}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Création...' : "Créer l'utilisateur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL : MODIFIER ===== */}
      {showEdit && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-1">Modifier l'utilisateur</h3>
            <p className="text-sm text-gray-500 mb-4">{selected.email}</p>

            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom</label>
                  <input type="text" value={editForm.nom} onChange={e => setEditForm({ ...editForm, nom: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prénom</label>
                  <input type="text" value={editForm.prenom} onChange={e => setEditForm({ ...editForm, prenom: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Entreprise</label>
                <select value={editForm.entreprise_id} onChange={e => setEditForm({ ...editForm, entreprise_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Aucune --</option>
                  {entreprises.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Département</label>
                <select value={editForm.departement_id} onChange={e => handleDepartementChange(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Aucun --</option>
                  {departements.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                </select>
              </div>

              {/* Service */}
              <div>
                <label className="block text-sm font-medium mb-1">Service</label>
                <select
                  value={editForm.service_id}
                  onChange={e => handleServiceChange(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !editForm.departement_id ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={!editForm.departement_id}
                >
                  <option value="">
                    {!editForm.departement_id
                      ? "Choisir d'abord un département"
                      : filteredServices.length === 0
                        ? 'Aucun service pour ce département'
                        : '-- Aucun service --'}
                  </option>
                  {filteredServices.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </div>

              {/* Aperçu des rôles hérités du service */}
              {editForm.service_id && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center gap-1">
                    <LinkIcon size={12} />
                    Rôles hérités du service
                  </p>
                  {previewServiceRoles.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {previewServiceRoles.map((r, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white text-blue-700 border border-blue-200">
                          {r.role_nom} → {r.module_nom}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-blue-500 italic">Aucune association rôle/module pour ce service</p>
                  )}
                  <p className="text-[10px] text-blue-400 mt-2">
                    Ces rôles sont automatiquement attribués. L'utilisateur aura accès aux modules correspondants.
                  </p>
                </div>
              )}

              {/* ── Caisse — visible uniquement si decaissement ── */}
              {serviceHasDecaissement && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase mb-2">
                    <Wallet size={14} />
                    Caisse associée <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editForm.caisse_id}
                    onChange={e => setEditForm({ ...editForm, caisse_id: e.target.value })}
                    className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
                    required
                  >
                    <option value="">Sélectionner une caisse...</option>
                    {caisses.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                  <p className="text-[10px] text-amber-600 mt-1.5">
                    Ce service inclut le rôle « decaissement ». Vous devez associer une caisse à cet utilisateur.
                  </p>
                </div>
              )}

              {!editForm.service_id && editForm.departement_id && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-700">
                    <strong>Sans service</strong>, l'utilisateur n'aura accès à aucun module (sauf s'il est Administrateur).
                  </p>
                </div>
              )}

              {/* Toggle Admin */}
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Administrateur</p>
                  <p className="text-[11px] text-gray-400">Accès complet à l'administration de la plateforme</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm(f => ({ ...f, isAdmin: !f.isAdmin }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    editForm.isAdmin ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    editForm.isAdmin ? 'translate-x-5' : ''
                  }`} />
                </button>
              </div>

              {error && (
                <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowEdit(false); setError('') }}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ===== MODAL : RÉINITIALISER MOT DE PASSE ===== */}
      {showResetPwd && resetTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-1">Réinitialiser le mot de passe</h3>
            <p className="text-sm text-gray-500 mb-4">
              Utilisateur : <strong>{resetTarget.prenom ?? ''} {resetTarget.nom ?? ''}</strong>
              <br />
              <span className="text-xs text-gray-400">{resetTarget.email}</span>
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nouveau mot de passe <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Minimum 6 caractères"
                  minLength={6}
                  required
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700">
                  <strong>Attention :</strong> l'utilisateur devra se connecter avec ce nouveau mot de passe.
                  Il sera ensuite invité à le changer à sa prochaine connexion.
                </p>
              </div>

              {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              {resetSuccess && <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">{resetSuccess}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowResetPwd(false); setError('') }}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium">
                  {saving ? 'En cours...' : 'Réinitialiser'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}