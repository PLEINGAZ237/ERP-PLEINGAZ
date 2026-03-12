import AdminLayout from '@/components/admin/AdminLayout'
import CrudTable   from '@/components/admin/CrudTable'

const COLUMNS = [
  { key: 'nom',       label: 'Nom',    required: true },
  { key: 'banque_id', label: 'Banque', required: true, type: 'select' },
]
const RELATIONS = { banque_id: { table: 'banques', labelKey: 'nom', filterActive: false } }

export default function Virements() {
  return (
    <AdminLayout>
      <CrudTable table="virements" title="Virements" columns={COLUMNS} relations={RELATIONS} />
    </AdminLayout>
  )
}
