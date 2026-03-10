// fix-imports.mjs
// Lance avec : node fix-imports.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

// ─── Toutes les corrections à appliquer ──────────────────────────────────────
const REPLACEMENTS = [
  // supabase — tous les niveaux de profondeur
  [/from ['"]\.\.\/\.\.\/lib\/supabase['"]/g,          `from '@/lib/supabase'`],
  [/from ['"]\.\.\/\.\.\/\.\.\/lib\/supabase['"]/g,    `from '@/lib/supabase'`],

  // AuthContext — tous les niveaux
  [/from ['"]\.\.\/\.\.\/contexts\/AuthContext['"]/g,       `from '@/contexts/AuthContext'`],
  [/from ['"]\.\.\/\.\.\/\.\.\/contexts\/AuthContext['"]/g, `from '@/contexts/AuthContext'`],

  // components/besoins — tous les niveaux + typo .../../
  [/from ['"]\.\.\/\.\.\/components\/besoins\//g,          `from '@/components/besoins/`],
  [/from ['"]\.\.\/\.\.\/\.\.\/components\/besoins\//g,    `from '@/components/besoins/`],
  [/from ['"]\.\.?\/\.\.\/\.\.\/components\/besoins\//g,   `from '@/components/besoins/`],

  // components/ProtectedRoute (depuis pages/)
  [/from ['"]\.\.\/components\/ProtectedRoute['"]/g,   `from '@/components/ProtectedRoute'`],
  [/from ['"]\.\.\/\.\.\/components\/ProtectedRoute['"]/g, `from '@/components/ProtectedRoute'`],

  // Correction du typo .../../  (un point de trop)
  [/from ['"]\.\.?\/\.\.\//g, (match) => match], // catch-all pour debug
]

// ─── Parcourt récursivement tous les .jsx/.js dans src/ ──────────────────────
function walkDir(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...walkDir(full))
    } else if (['.jsx', '.js'].includes(extname(entry))) {
      files.push(full)
    }
  }
  return files
}

const files = walkDir('./src')
let totalFixed = 0

for (const file of files) {
  let content = readFileSync(file, 'utf8')
  let changed = false

  // supabase
  let next = content
    .replace(/from ['"]\.\.\/\.\.\/lib\/supabase['"]/g,       `from '@/lib/supabase'`)
    .replace(/from ['"]\.\.\/\.\.\/\.\.\/lib\/supabase['"]/g, `from '@/lib/supabase'`)
    // AuthContext
    .replace(/from ['"]\.\.\/\.\.\/contexts\/AuthContext['"]/g,       `from '@/contexts/AuthContext'`)
    .replace(/from ['"]\.\.\/\.\.\/\.\.\/contexts\/AuthContext['"]/g, `from '@/contexts/AuthContext'`)
    // components/besoins — 2 niveaux
    .replace(/from '\.\.\/\.\.\/components\/besoins\//g,  `from '@/components/besoins/`)
    .replace(/from "\.\.\/\.\.\/components\/besoins\//g,  `from '@/components/besoins/`)
    // components/besoins — 3 niveaux
    .replace(/from '\.\.\/\.\.\/\.\.\/components\/besoins\//g,  `from '@/components/besoins/`)
    .replace(/from "\.\.\/\.\.\/\.\.\/components\/besoins\//g,  `from '@/components/besoins/`)
    // typo .../../components/besoins/
    .replace(/from '\.\.?\/\.\.\/components\/besoins\//g,  `from '@/components/besoins/`)
    .replace(/from "\.\.?\/\.\.\/components\/besoins\//g,  `from '@/components/besoins/`)
    // ProtectedRoute
    .replace(/from ['"]\.\.\/components\/ProtectedRoute['"]/g,       `from '@/components/ProtectedRoute'`)
    .replace(/from ['"]\.\.\/\.\.\/components\/ProtectedRoute['"]/g, `from '@/components/ProtectedRoute'`)

  if (next !== content) {
    writeFileSync(file, next, 'utf8')
    console.log(`✅ Corrigé : ${file}`)
    totalFixed++
  }
}

console.log(`\n🎉 ${totalFixed} fichier(s) corrigé(s).`)
console.log(`\nN'oublie pas d'ajouter l'alias @ dans vite.config.js !`)
