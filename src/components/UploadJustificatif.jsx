import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, X, FileText, Loader2 } from 'lucide-react'

/**
 * Composant d'upload de pièces justificatives
 * @param {string} tableRef - nom de la table (ex: 'versements_commerciaux')
 * @param {string} enregistrementId - uuid de l'enregistrement
 * @param {Function} onUpload - callback après upload
 */
export default function UploadJustificatif({ tableRef, enregistrementId, onUpload }) {
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Fichier trop volumineux (max 5 Mo)'); return }

    setError(''); setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${tableRef}/${enregistrementId}/${Date.now()}.${ext}`

    // Upload dans Supabase Storage
    const { data: storageData, error: storageErr } = await supabase.storage
      .from('justificatifs')
      .upload(path, file)

    if (storageErr) {
      setError('Erreur upload: ' + storageErr.message)
      setUploading(false)
      return
    }

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage.from('justificatifs').getPublicUrl(path)

    // Enregistrer dans pieces_jointes
    const { error: dbErr } = await supabase.from('pieces_jointes').insert({
      table_ref: tableRef,
      enregistrement_id: enregistrementId,
      nom_fichier: file.name,
      url: urlData.publicUrl,
      type_mime: file.type,
      taille: file.size,
      uploade_par: (await supabase.auth.getUser()).data.user?.id,
    })

    setUploading(false)
    if (dbErr) { setError('Erreur enregistrement: ' + dbErr.message); return }

    setFiles(prev => [...prev, { nom: file.name, url: urlData.publicUrl }])
    if (onUpload) onUpload()

    // Reset input
    e.target.value = ''
  }

  const loadFiles = async () => {
    if (!enregistrementId) return
    const { data } = await supabase.from('pieces_jointes')
      .select('*').eq('table_ref', tableRef).eq('enregistrement_id', enregistrementId)
      .order('created_at', { ascending: false })
    setFiles((data ?? []).map(f => ({ nom: f.nom_fichier, url: f.url, id: f.id })))
  }

  useState(() => { loadFiles() }, [enregistrementId])

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <FileText size={14} className="text-gray-400" />
        <p className="text-xs font-bold text-gray-400 uppercase">Pièces justificatives</p>
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {/* Fichiers uploadés */}
      {files.length > 0 && (
        <div className="space-y-1 mb-2">
          {files.map((f, i) => (
            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-blue-600 hover:underline bg-blue-50 rounded-lg px-3 py-1.5">
              <FileText size={12} /> {f.nom}
            </a>
          ))}
        </div>
      )}

      {/* Bouton upload */}
      <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors
        ${uploading ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
        {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
        {uploading ? 'Envoi...' : 'Ajouter un justificatif'}
        <input type="file" className="hidden" onChange={handleUpload} disabled={uploading}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
      </label>
    </div>
  )
}
