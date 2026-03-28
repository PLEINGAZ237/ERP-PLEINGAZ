import AdminLayout from '@/components/admin/AdminLayout'
import CrudTable   from '@/components/admin/CrudTable'

const COLUMNS = [
  { key: 'nom',           label: 'Nom',        required: true },
  { key: 'entreprise_id', label: 'Entreprise', required: true, type: 'select' },
  { key: 'agence_id',     label: 'Agence',      type: 'select' },
]
const RELATIONS = {
  entreprise_id: { table: 'entreprises', labelKey: 'nom', filterActive: false },
  agence_id:     { table: 'agences',     labelKey: 'nom' },
}

export default function Caisses() {
  return (
    <AdminLayout>
      <CrudTable table="caisses" title="Caisses" columns={COLUMNS} relations={RELATIONS} />
    </AdminLayout>
  )
}
