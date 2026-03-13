import AdminLayout from '@/components/admin/AdminLayout'
import CrudTable from '@/components/admin/CrudTable'

const COLUMNS = [
  { key: 'nom', label: 'Nom', required: true },
  { key: 'code', label: 'Code', required: true },
]

export default function Modules() {
  return (
    <AdminLayout>
      <CrudTable
        table="modules"
        title="Modules"
        columns={COLUMNS}
      />
    </AdminLayout>
  )
}