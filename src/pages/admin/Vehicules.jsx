import AdminLayout from '@/components/admin/AdminLayout'
import CrudTable   from '@/components/admin/CrudTable'

const COLUMNS = [
  { key: 'nom',              label: 'Nom / Description' },
  { key: 'immatriculation',  label: 'Immatriculation', required: true },
  { key: 'agence_id',        label: 'Agence',          required: true, type: 'select' },
]
const RELATIONS = { agence_id: { table: 'agences', labelKey: 'nom' } }

export default function Vehicules() {
  return (
    <AdminLayout>
      <CrudTable table="vehicules" title="Véhicules" columns={COLUMNS} relations={RELATIONS} />
    </AdminLayout>
  )
}
