import AdminLayout from '@/components/admin/AdminLayout'
import CrudTable   from '@/components/admin/CrudTable'

const COLUMNS = [
  { key: 'nom',  label: 'Nom',  required: true },
  { key: 'code', label: 'Code', required: true },
]

export default function Entreprises() {
  return (
    <AdminLayout>
      <CrudTable table="entreprises" title="Entreprises" columns={COLUMNS} />
    </AdminLayout>
  )
}
