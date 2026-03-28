import AdminLayout from '@/components/admin/AdminLayout'
import CrudTable   from '@/components/admin/CrudTable'

const COLUMNS = [
  { key: 'nom',       label: 'Nom',    required: true },
  { key: 'zone',      label: 'Zone' },
  { key: 'ville',     label: 'Ville' },
  { key: 'agence_id', label: 'Agence', type: 'select' },
]
const RELATIONS = { agence_id: { table: 'agences', labelKey: 'nom' } }

export default function Itineraires() {
  return (
    <AdminLayout>
      <CrudTable table="itineraires" title="Itinéraires" columns={COLUMNS} relations={RELATIONS} />
    </AdminLayout>
  )
}
