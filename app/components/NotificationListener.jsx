'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NotificationListener() {
  const [toast, setToast] = useState(null)
  const router = useRouter()

  useEffect(() => {
    console.log('NotificationListener mounted')
    let channel = null
    let currentUserId = null

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('NotificationListener — user:', user?.id)
      if (!user) return
      currentUserId = user.id

      channel = supabase
        .channel(`notify-${user.id}-${Math.random()}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'claims' },
          async (payload) => {
            console.log('NotificationListener — new claim detected:', payload.new)

            // Check ownership fresh, not from a stale mount-time map
            const { data: cable } = await supabase
              .from('cables')
              .select('cable_type, user_id')
              .eq('id', payload.new.cable_id)
              .maybeSingle()

            console.log('NotificationListener — cable lookup:', cable)

            if (cable && cable.user_id === currentUserId) {
              setToast(`Someone reserved your ${cable.cable_type}! Tap to confirm.`)
            }
          }
        )
        .subscribe((status) => {
          console.log('NotificationListener subscription status:', status)
        })
    }

    setup()

    return () => {
      console.log('NotificationListener unmounting')
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  if (!toast) return null

  return (
    <div
      style={{
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
        width: 'calc(100% - 32px)',
        textAlign: 'center',
        lineHeight: 1.5,
        zIndex: 9999,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        justifyContent: 'center',
      }}
      onClick={() => {
        setToast(null)
        router.push('/my-cables')
      }}
    >
      <span style={{ fontSize: 20 }}>🔔</span>
      <span>{toast}</span>
      <span
        style={{ marginLeft: 'auto', opacity: 0.7, fontSize: 18, cursor: 'pointer' }}
        onClick={e => { e.stopPropagation(); setToast(null) }}
      >
        ×
      </span>
    </div>
  )
}