import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, Image, Upload, X, ExternalLink, Loader2 } from 'lucide-react'

const TYPES_AUTORISES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024

function getIcon(nom) {
  if (!nom) return <FileText size={14} className="text-gray-400" />
  const ext = nom.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return <FileText size={14} className="text-red-500" />
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return <Image size={14} className="text-blue-500" />
  return <FileText size={14} className="text-gray-400" />
}

/**
 * Affiche les documents associés à un besoin (table besoin_documents).
 * 
 * Props:
 *  - besoinId: uuid du besoin (requis)
 *  - editable: bool — si true, permet d'ajouter/supprimer des fichiers (défaut: false)
 *  - onCountChange: callback(count) — notifie le parent du nombre de documents
 */
export default function DocumentsBesoin({ besoinId, editable = false, onCountChange }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const loadDocs = async () => {
    if (!besoinId) return
    setLoading(true)
    const { data } = await supabase
      .from('besoin_documents')
      .select('id, url, nom_fichier, created_at')
      .eq('besoin_id', besoinId)
      .order('created_at', { ascending: true })
    const result = data ?? []
    setDocs(result)
    onCountChange?.(result.length)
    setLoading(false)
  }

  useEffect(() => { loadDocs() }, [besoinId])

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setError('')

    for (const file of files) {
      if (!TYPES_AUTORISES.includes(file.type)) {
        setError(`${file.name} : format non autorisé.`)
        continue
      }
      if (file.size > MAX_SIZE) {
        setError(`${file.name} : dépasse 10 Mo.`)
        continue
      }

      setUploading(true)
      const ext = file.name.split('.').pop()
      const nom = `${besoinId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`
      const chemin = `besoins/${nom}`

      const { error: errUp } = await supabase.storage.from('justificatifs').upload(chemin, file)
      if (errUp) {
        setError(`Upload de ${file.name} échoué : ${errUp.message}`)
        setUploading(false)
        continue
      }

      const { data: urlData } = supabase.storage.from('justificatifs').getPublicUrl(chemin)
      const { data: session } = await supabase.auth.getSession()
      const userId = session?.session?.user?.id

      await supabase.from('besoin_documents').insert({
        besoin_id: besoinId,
        uploaded_by: userId,
        url: urlData?.publicUrl ?? chemin,
        nom_fichier: file.name,
      })
      setUploading(false)
    }

    if (fileRef.current) fileRef.current.value = ''
    loadDocs()
  }

  const handleDelete = async (doc) => {
    // Extraire le chemin du fichier depuis l'URL
    const urlParts = doc.url?.split('/storage/v1/object/public/justificatifs/')
    if (urlParts?.[1]) {
      await supabase.storage.from('justificatifs').remove([urlParts[1]])
    }
    await supabase.from('besoin_documents').delete().eq('id', doc.id)
    loadDocs()
  }

  if (loading) return (
    <div className="text-xs text-gray-400 flex items-center gap-1 py-2">
      <Loader2 size={12} className="animate-spin" /> Chargement des documents...
    </div>
  )

  if (docs.length === 0 && !editable) return null

  return (
    <div>
      {docs.length > 0 && (
        <div className="space-y-1.5">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              {getIcon(doc.nom_fichier)}
              <a href={doc.url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate flex-1">
                {doc.nom_fichier || 'Document'}
              </a>
              <a href={doc.url} target="_blank" rel="noopener noreferrer"
                className="p-1 text-gray-400 hover:text-blue-600 shrink-0">
                <ExternalLink size={12} />
              </a>
              {editable && (
                <button type="button" onClick={() => handleDelete(doc)}
                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded shrink-0">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          <p className="text-[10px] text-gray-400">{docs.length} document{docs.length > 1 ? 's' : ''}</p>
        </div>
      )}

      {editable && (
        <div className="mt-2">
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-blue-200 rounded-lg p-3 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
            {uploading
              ? <Loader2 size={18} className="mx-auto text-blue-400 animate-spin" />
              : <Upload size={18} className="mx-auto text-blue-400" />
            }
            <p className="text-xs text-gray-500 mt-1">{uploading ? 'Upload en cours...' : 'Ajouter des fichiers'}</p>
            <p className="text-[10px] text-gray-400">PDF, JPG, PNG, WebP — Max 10 Mo</p>
          </div>
          <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleUpload} className="hidden" />
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {docs.length === 0 && editable && (
        <p className="text-[10px] text-gray-400 mt-1">Aucun document joint pour le moment.</p>
      )}
    </div>
  )
}