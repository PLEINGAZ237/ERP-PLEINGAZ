import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import EmployeLayout from '@/components/besoins/employe/EmployeLayout'
import { Building2, AlertTriangle } from 'lucide-react'

export default function CreerBesoin() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [entreprises, setEntreprises]         = useState([])
  const [entrepriseId, setEntrepriseId]       = useState('')
  const [entrepriseConfirmee, setEntrepriseConfirmee] = useState(false)

  const [form, setForm] = useState({ description: '', montant: '', justification: '' })
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // Vérification blocage / limites
  const [blocage, setBlocage] = useState(null) // { autorise, raison }
  const [checkingDroit, setCheckingDroit] = useState(true)

  // Charger la liste des entreprises actives
  useEffect(() => {
    supabase
      .from('entreprises')
      .select('id, nom, code')
      .eq('statut', 'actif')
      .order('nom')
      .then(({ data }) => {
        setEntreprises(data ?? [])
      })
  }, [])

  // Vérifier le droit d'émettre au chargement
  useEffect(() => {
    const check = async () => {
      setCheckingDroit(true)
      const { data, error } = await supabase.rpc('verifier_droit_besoin')
      if (!error && data) setBlocage(data)
      setCheckingDroit(false)
    }
    check()
  }, [])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Re-vérifier avant soumission
    const { data: check } = await supabase.rpc('verifier_droit_besoin')
    if (check && !check.autorise) {
      setError(check.raison)
      return
    }

    if (!form.description.trim()) { setError('Le titre est obligatoire.'); return }
    if (!form.montant || Number(form.montant) <= 0) { setError('Le montant doit être supérieur à 0.'); return }
    if (!form.justification.trim()) { setError('Les détails sont obligatoires.'); return }

    setLoading(true)
    const { data, error: rpcError } = await supabase.rpc('creer_besoin', {
      p_description:     form.description.trim(),
      p_montant_demande: parseFloat(form.montant),
      p_justification:   form.justification.trim(),
      p_entreprise_id:   entrepriseId,
    })
    setLoading(false)

    if (rpcError) { setError(rpcError.message); return }

    setSuccess(`Besoin créé avec succès ! Numéro : ${data.numero}`)
    setForm({ description: '', montant: '', justification: '' })
    setTimeout(() => navigate('/besoins/employe/mes-besoins'), 2000)
  }

  const entrepriseSelectionnee = entreprises.find(e => e.id === entrepriseId)
  const isBlocked = blocage && !blocage.autorise

  return (
    <EmployeLayout>
      <div className='max-w-2xl mx-auto px-1'>
        <h1 className='text-xl md:text-2xl font-bold text-gray-800 mb-2'>Nouveau besoin</h1>
        <p className='text-gray-500 text-xs md:text-sm mb-6'>
          Votre besoin sera transmis au DFC pour validation.
        </p>

        {/* Alerte blocage / plafond */}
        {!checkingDroit && isBlocked && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-5 mb-6">
            <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-700 text-sm">Émission de besoins bloquée</p>
              <p className="text-sm text-red-600 mt-1">{blocage.raison}</p>
            </div>
          </div>
        )}

        {/* Wrapper grisé si bloqué */}
        <div className={isBlocked ? 'opacity-50 pointer-events-none' : ''}>

          {/* ── ÉTAPE 1 : Choix de l'entreprise ─────────────────────────────── */}
          <div className={`bg-white rounded-2xl shadow-sm border p-4 md:p-6 mb-5 transition-all ${
            entrepriseConfirmee ? 'border-green-200 bg-green-50/30' : 'border-gray-100'
          }`}>
            <div className='flex items-center justify-between mb-4'>
              <div className='flex items-center gap-2'>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black
                  ${entrepriseConfirmee ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}>
                  {entrepriseConfirmee ? '✓' : '1'}
                </div>
                <h2 className='text-sm font-bold text-gray-700 uppercase tracking-wider'>
                  Pour quelle entreprise ?
                </h2>
              </div>
              {entrepriseConfirmee && (
                <button
                  onClick={() => { setEntrepriseConfirmee(false); setEntrepriseId('') }}
                  className='text-xs text-gray-400 hover:text-gray-600 underline'
                >
                  Modifier
                </button>
              )}
            </div>

            {entrepriseConfirmee ? (
              <div className='flex items-center gap-3 px-4 py-3 bg-green-100 rounded-xl'>
                <Building2 size={18} className='text-green-600 shrink-0' />
                <div>
                  <p className='text-sm font-bold text-green-800'>{entrepriseSelectionnee?.nom}</p>
                  <p className='text-[10px] text-green-600 font-mono uppercase'>{entrepriseSelectionnee?.code}</p>
                </div>
              </div>
            ) : (
              <div className='space-y-3'>
                {entreprises.length === 0 ? (
                  <p className='text-gray-400 text-xs'>Chargement des entreprises...</p>
                ) : (
                  <>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      {entreprises.map(ent => (
                        <label
                          key={ent.id}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none
                            ${entrepriseId === ent.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                        >
                          <input
                            type='radio'
                            name='entreprise'
                            value={ent.id}
                            checked={entrepriseId === ent.id}
                            onChange={() => setEntrepriseId(ent.id)}
                            className='w-4 h-4 accent-blue-600'
                          />
                          <div>
                            <p className={`text-sm font-bold ${entrepriseId === ent.id ? 'text-blue-800' : 'text-gray-700'}`}>
                              {ent.nom}
                            </p>
                            <p className='text-[10px] font-mono text-gray-400 uppercase'>{ent.code}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    <button
                      type='button'
                      disabled={!entrepriseId}
                      onClick={() => setEntrepriseConfirmee(true)}
                      className='w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold
                        disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-all mt-1'
                    >
                      Confirmer →
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── ÉTAPE 2 : Formulaire besoin ── */}
          <div className={`transition-all duration-300 ${entrepriseConfirmee ? 'opacity-100' : 'opacity-30 pointer-events-none select-none'}`}>
            <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-8'>
              <div className='flex items-center gap-2 mb-6'>
                <div className='w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black'>2</div>
                <h2 className='text-sm font-bold text-gray-700 uppercase tracking-wider'>Détails du besoin</h2>
              </div>

              <form onSubmit={handleSubmit} className='space-y-6'>
                <div>
                  <label className='block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2'>
                    Titre <span className='text-red-500'>*</span>
                  </label>
                  <textarea
                    name='description'
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder='Ex: Achat de fournitures de bureau...'
                    className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none'
                    required
                  />
                </div>

                <div>
                  <label className='block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2'>
                    Montant demandée <span className='text-red-500'>*</span>
                  </label>
                  <div className='relative'>
                    <input
                      type='number'
                      name='montant'
                      value={form.montant}
                      onChange={handleChange}
                      placeholder='0'
                      className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold pr-16'
                      required
                    />
                    <span className='absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400'>FCFA</span>
                  </div>
                </div>

                <div>
                  <label className='block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2'>
                    Détails <span className='text-red-500'>*</span>
                  </label>
                  <textarea
                    name='justification'
                    value={form.justification}
                    onChange={handleChange}
                    rows={4}
                    placeholder='Expliquez pourquoi ce besoin est nécessaire...'
                    className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none'
                    required
                  />
                </div>

                {error && (
                  <div className='bg-red-50 text-red-600 text-xs font-bold p-4 rounded-xl border border-red-100'>{error}</div>
                )}
                {success && (
                  <div className='bg-green-50 text-green-700 text-xs font-bold p-4 rounded-xl border border-green-100'>{success}</div>
                )}

                <div className='flex flex-col sm:flex-row gap-3 pt-2'>
                  <button
                    type='submit'
                    disabled={loading || !entrepriseConfirmee || isBlocked}
                    className='sm:order-2 w-full sm:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-bold text-sm shadow-lg shadow-blue-500/20 transition-all'
                  >
                    {loading ? 'Envoi...' : 'Soumettre le besoin'}
                  </button>
                  <button
                    type='button'
                    onClick={() => navigate('/besoins/employe')}
                    className='sm:order-1 w-full sm:w-auto px-6 py-3 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 font-bold'
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </EmployeLayout>
  )
}