import AdminLayout from '@/components/admin/AdminLayout'
import CrudTable   from '@/components/admin/CrudTable'

const COLUMNS = [
  { key: 'nom',        label: 'Nom',       required: true },
  { key: 'categorie',  label: 'Catégorie', required: true, type: 'select',
    options: [
      { value: 'GPL',        label: 'GPL' },
      { value: 'CONSIGNE',   label: 'Consigne' },
      { value: 'ACCESSOIRE', label: 'Accessoire' },
    ]
  },
  { key: 'poids_tonne', label: 'Poids (TM)', type: 'number' },
]

export default function Articles() {
  return (
    <AdminLayout>
      <CrudTable table="articles" title="Articles / Produits finis" columns={COLUMNS} />
    </AdminLayout>
  )
}
