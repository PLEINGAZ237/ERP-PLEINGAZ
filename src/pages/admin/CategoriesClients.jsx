import AdminLayout from '@/components/admin/AdminLayout'
import CrudTable   from '@/components/admin/CrudTable'

const COLUMNS = [
  { key: 'nom', label: 'Nom de la catégorie', required: true },
]

export default function CategoriesClients() {
  return (
    <AdminLayout>
      <CrudTable table="categories_clients" title="Catégories de clients" columns={COLUMNS} />
    </AdminLayout>
  )
}
