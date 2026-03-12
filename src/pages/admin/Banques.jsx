import AdminLayout from '@/components/admin/AdminLayout'
import CrudTable   from '@/components/admin/CrudTable'

const COLUMNS = [
  { key: 'nom',           label: 'Nom',        required: true },
  { key: 'entreprise_id', label: 'Entreprise', required: true, type: 'select' },
]
const RELATIONS = { entreprise_id: { table: 'entreprises', labelKey: 'nom', filterActive: false } }

export default function Banques() {
  return (
    <AdminLayout>
      <CrudTable table="banques" title="Banques" columns={COLUMNS} relations={RELATIONS} />
    </AdminLayout>
  )
}
