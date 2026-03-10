import AdminLayout from '@/components/besoins/admin/AdminLayout'
import CrudTable   from '@/components/besoins/admin/CrudTable'

const COLUMNS = [
  { key: 'nom', label: 'Nom du rôle', required: true },
]

export default function Roles() {
  return (
    <AdminLayout>
      <CrudTable
        table="roles"
        title="Rôles"
        columns={COLUMNS}
        hasStatut={false}
        allowDelete={true}
        canEdit={(record) => record.nom !== 'Employe'}
        canDelete={(record) => record.nom !== 'Employe'}
      />
    </AdminLayout>
  )
}
