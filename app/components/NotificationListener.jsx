'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NotificationListener() {
  const [toast, setToast] = useState(null)
  const router = useRouter()

  useEffect(() => {
    let channel = null

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get all cables owned by this user so we can check incoming claims
      const { data: myCables } = await supabase
        .from('cables')
        .select('id, cable_type')
        .eq('user_id', user.id)

      if (!myCables || myCables.length === 0) return

      const myCableMap = {}
      myCables.forEach(c => { myCableMap[c.id] = c.cable_type })

      channel = supabase
        .channel(`notify-claims-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'claims',
          },
          (payload) => {
            const cableType = myCableMap[payload.new.cable_id]
            if (cableType) {
              setToast(`Someone reserved your ${cableType}! Tap to confirm.`)
            }
          }
        )
        .subscribe()
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