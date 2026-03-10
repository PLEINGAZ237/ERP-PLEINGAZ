import AdminLayout from '@/components/besoins/admin/AdminLayout'
import CrudTable   from '@/components/besoins/admin/CrudTable'

const COLUMNS = [
  { key: 'nom',           label: 'Nom',        required: true },
  { key: 'entreprise_id', label: 'Entreprise', required: true, type: 'select' },
]
const RELATIONS = { entreprise_id: { table: 'entreprises', labelKey: 'nom', filterActive: false } }

export default function Agences() {
  return (
    <AdminLayout>
      <CrudTable table="agences" title="Agences" columns={COLUMNS} relations={RELATIONS} />
    </AdminLayout>
  )
}
