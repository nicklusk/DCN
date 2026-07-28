'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function NotificationListener() {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let userId = null
    let channel = null

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      userId = user.id

      channel = supabase
        .channel(`claims-notify-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'claims',
          },
          async (payload) => {
            const { data: cable } = await supabase
              .from('cables')
              .select('cable_type, user_id')
              .eq('id', payload.new.cable_id)
              .single()

            if (cable?.user_id === userId) {
              setToast(`Someone reserved your ${cable.cable_type}! Go to My Cables to confirm.`)
              setTimeout(() => setToast(null), 8000)
            }
          }
        )
        .subscribe()
    })

    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  if (!toast) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#2a7c4f',
      color: '#fff',
      padding: '14px 20px',
      borderRadius: 12,
      fontSize: 14,
      fontFamily: 'system-ui, sans-serif',
      maxWidth: 360,
      textAlign: 'center',
      lineHeight: 1.5,
      zIndex: 9999,
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      cursor: 'pointer',
    }}
      onClick={() => window.location.href = '/my-cables'}
    >
      🔔 {toast}
    </div>
  )
}