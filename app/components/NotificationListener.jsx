'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NotificationListener() {
  const [toast, setToast] = useState(null)
  const router = useRouter()

  useEffect(() => {
    let channel = null
    let currentUserId = null

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      currentUserId = user.id

      channel = supabase
        .channel(`notify-${user.id}-${Math.random()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'claims',
          },
          async (payload) => {
            // On each new claim, check if it's for one of our cables
            const { data: cable } = await supabase
              .from('cables')
              .select('cable_type, user_id')
              .eq('id', payload.new.cable_id)
              .single()

            if (cable?.user_id === currentUserId) {
              setToast(`Someone reserved your ${cable.cable_type}! Tap to confirm.`)
            }
          }
        )
        .subscribe((status) => {
          console.log('Notification subscription status:', status)
        })
    }

    setup()

    return () => {
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