import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Bell, X } from 'lucide-react'

export default function NotificationsBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState([])
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)

  const load = async () => {
    if (!user) return
    const { data } = await supabase.from('notifications')
      .select('*').eq('destinataire_id', user.id)
      .order('created_at', { ascending: false }).limit(20)
    setNotifs(data ?? [])
    setCount((data ?? []).filter(n => !n.lu).length)
  }

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [user])

  const markRead = async (n) => {
    if (!n.lu) {
      await supabase.rpc('marquer_notification_lue', { p_notif_id: n.id })
      setCount(c => Math.max(0, c - 1))
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, lu: true } : x))
    }
    if (n.lien) { navigate(n.lien); setOpen(false) }
  }

  const markAllRead = async () => {
    const unread = notifs.filter(n => !n.lu)
    for (const n of unread) await supabase.rpc('marquer_notification_lue', { p_notif_id: n.id })
    setNotifs(prev => prev.map(n => ({ ...n, lu: true })))
    setCount(0)
  }

  const TYPE_COLOR = { info: 'bg-blue-500', action: 'bg-orange-500', alerte: 'bg-red-500', succes: 'bg-green-500' }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <Bell size={20} className="text-gray-500" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <p className="font-bold text-gray-700 text-sm">Notifications</p>
              <div className="flex gap-2">
                {count > 0 && <button onClick={markAllRead} className="text-[10px] text-blue-600 font-medium hover:underline">Tout lire</button>}
                <button onClick={() => setOpen(false)}><X size={16} className="text-gray-400" /></button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {notifs.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Aucune notification.</p>
              ) : notifs.map(n => (
                <div key={n.id} onClick={() => markRead(n)}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.lu ? 'bg-blue-50/50' : ''}`}>
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${TYPE_COLOR[n.type] ?? 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.lu ? 'font-bold text-gray-800' : 'text-gray-600'}`}>{n.titre}</p>
                      {n.message && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>}
                      <p className="text-[10px] text-gray-300 mt-1">{new Date(n.created_at).toLocaleDateString('fr-FR')} {new Date(n.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
