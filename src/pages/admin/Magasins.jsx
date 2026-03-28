import AdminLayout from '@/components/admin/AdminLayout'
import CrudTable   from '@/components/admin/CrudTable'

const COLUMNS = [
  { key: 'nom',           label: 'Nom',        required: true },
  { key: 'entreprise_id', label: 'Entreprise', required: true, type: 'select' },
  { key: 'agence_id',     label: 'Agence',      type: 'select' },
  { key: 'est_centre_enfuteur', label: 'Centre enfûteur', type: 'select',
    options: [
      { value: 'false', label: 'Non' },
      { value: 'true',  label: 'Oui' },
    ]
  },
]
const RELATIONS = {
  entreprise_id: { table: 'entreprises', labelKey: 'nom', filterActive: false },
  agence_id:     { table: 'agences',     labelKey: 'nom' },
}

export default function Magasins() {
  return (
    <AdminLayout>
      <CrudTable table="magasins" title="Magasins / Dépôts" columns={COLUMNS} relations={RELATIONS} />
    </AdminLayout>
  )
}
