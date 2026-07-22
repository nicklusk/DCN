'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Confirmed() {
  const [cable, setCable] = useState(null)
  const [giver, setGiver] = useState(null)
  const [claim, setClaim] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { id } = useParams()

    useEffect(() => {
    let pollInterval = null

    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setUser(user)

        const { data: cable } = await supabase
        .from('cables')
        .select('*, profiles(full_name)')
        .eq('id', id)
        .single()

        // Cable already deleted — transaction completed by giver
        if (!cable) {
        router.push('/browse?completed=true')
        return
        }

        setCable(cable)
        setGiver(cable.profiles)

        const { data: claim } = await supabase
        .from('claims')
        .select('*')
        .eq('cable_id', id)
        .eq('claimer_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

        // Claim already gone — completed or expired
        if (!claim) {
        router.push('/browse?completed=true')
        return
        }

        setClaim(claim)
        setLoading(false)

        // Poll every 5 seconds to detect when giver confirms
        pollInterval = setInterval(async () => {
        // Check if cable still exists
        const { data: cableCheck } = await supabase
            .from('cables')
            .select('id')
            .eq('id', id)
            .single()

        if (!cableCheck) {
            // Cable deleted — giver confirmed and transaction completed
            clearInterval(pollInterval)
            router.push('/browse?completed=true')
            return
        }

        // Check if giver has confirmed yet
        const { data: updatedClaim } = await supabase
            .from('claims')
            .select('*')
            .eq('cable_id', id)
            .eq('claimer_id', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (updatedClaim) setClaim(updatedClaim)
        }, 5000)
    }

    init()

    // Clean up interval on unmount
    return () => {
        if (pollInterval) clearInterval(pollInterval)
    }
    }, [id])

const handleConfirm = async () => {
  if (!claim) return

  // Update claimer confirmation
  const { error } = await supabase
    .from('claims')
    .update({ claimer_confirmed: true })
    .eq('id', claim.id)

  if (error) {
    alert('Something went wrong. Try again.')
    return
  }

  // Re-fetch the claim to get the latest state from the server
  const { data: updated } = await supabase
    .from('claims')
    .select('*')
    .eq('id', claim.id)
    .single()

  setClaim(updated)

  if (updated.giver_confirmed && updated.claimer_confirmed) {
    // Both confirmed — trigger capture
    const res = await fetch('/api/capture-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimId: claim.id })
    })
    const data = await res.json()
    if (data.error) {
      alert('Payment capture failed: ' + data.error)
      return
    }
    router.push('/browse?completed=true')
  }
  // If giver hasn't confirmed yet, the UI updates to show waiting state
}

  if (loading) return (
    <div style={styles.centered}>
      <p style={styles.loadingText}>Loading your claim...</p>
    </div>
  )

  const expiresAt = claim ? new Date(claim.expires_at) : null
  const hoursLeft = expiresAt
    ? Math.max(0, Math.round((expiresAt - Date.now()) / 1000 / 60 / 60))
    : 72

  const bothConfirmed = claim?.giver_confirmed && claim?.claimer_confirmed
  const claimerConfirmed = claim?.claimer_confirmed
  const giverConfirmed = claim?.giver_confirmed

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.logo}>Dollar Cable <span style={styles.green}>Neighbor</span></span>
      </div>

      <div style={styles.body}>

        {/* Status icon */}
        <div style={styles.iconWrap}>
          <span style={styles.icon}>{bothConfirmed ? '🎉' : '✅'}</span>
        </div>

        {/* Title */}
        <h1 style={styles.title}>
          {bothConfirmed ? 'Transaction complete!' : 'Cable reserved!'}
        </h1>

        {/* Subtitle */}
        <p style={styles.subtitle}>
          {bothConfirmed
            ? 'Your $1 has been processed. Enjoy your cable!'
            : `Your $1 is being held securely. Arrange pickup with ${giver?.full_name || 'the giver'}, then both of you confirm the handoff below.`
          }
        </p>

        {/* Timer */}
        {!bothConfirmed && (
          <div style={styles.timerPill}>
            ⏱ Auto-releases in {hoursLeft} hours
          </div>
        )}

        {/* Cable summary */}
        <div style={styles.cableCard}>
          <span style={styles.cableIcon}>🔌</span>
          <div>
            <div style={styles.cableType}>{cable?.cable_type}</div>
            <div style={styles.cableMeta}>{cable?.length} · {cable?.condition}</div>
            <div style={styles.cableGiver}>From {giver?.full_name || 'Anonymous'}</div>
          </div>
        </div>

        {/* Steps */}
        {!bothConfirmed && (
          <div style={styles.steps}>
            <div style={styles.step}>
              <div style={styles.stepNum}>1</div>
              <div style={styles.stepText}>
                Message {giver?.full_name || 'the giver'} to arrange a pickup time and place
              </div>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNum}>2</div>
              <div style={styles.stepText}>Pick up the cable in person</div>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNum}>3</div>
              <div style={styles.stepText}>
                Both of you tap "Confirm handoff" — your $1 processes and the listing closes
              </div>
            </div>
          </div>
        )}

        {/* Confirmation status */}
        {!bothConfirmed && (
          <div style={styles.confirmStatus}>
            <div style={styles.confirmRow}>
              <span>{claimerConfirmed ? '✅' : '⬜'} You</span>
              <span style={styles.confirmLabel}>
                {claimerConfirmed ? 'Confirmed' : 'Not yet confirmed'}
              </span>
            </div>
            <div style={styles.confirmRow}>
              <span>{giverConfirmed ? '✅' : '⬜'} {giver?.full_name || 'Giver'}</span>
              <span style={styles.confirmLabel}>
                {giverConfirmed ? 'Confirmed' : 'Not yet confirmed'}
              </span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!bothConfirmed && !claimerConfirmed && (
          <button style={styles.confirmBtn} onClick={handleConfirm}>
            Confirm I received the cable ✓
          </button>
        )}

        {claimerConfirmed && !bothConfirmed && (
          <div style={styles.waitingNote}>
            You've confirmed! Waiting on {giver?.full_name || 'the giver'} to confirm their side.
          </div>
        )}

        {bothConfirmed && (
          <button style={styles.confirmBtn} onClick={() => router.push('/browse')}>
            Back to browse →
          </button>
        )}

        <button style={styles.ghostBtn} onClick={() => router.push('/browse')}>
          Back to browse
        </button>

        <p style={styles.disputeLink} onClick={() => alert('Dispute flow coming in a future update.')}>
          Report a problem
        </p>

      </div>
    </div>
  )
}

const styles = {
  page: { maxWidth: 480, margin: '0 auto', padding: '0 16px 60px', fontFamily: 'system-ui, sans-serif' },
  centered: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'system-ui, sans-serif' },
  loadingText: { color: '#888', fontSize: 15 },
  header: { padding: '16px 0', borderBottom: '1px solid #eee', marginBottom: 24 },
  logo: { fontSize: 18, fontWeight: 600 },
  green: { color: '#2a7c4f' },
  body: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' },
  iconWrap: { width: 72, height: 72, borderRadius: '50%', background: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  icon: { fontSize: 36 },
  title: { fontSize: 22, fontWeight: 500, color: '#111' },
  subtitle: { fontSize: 15, color: '#555', lineHeight: 1.6, maxWidth: 360 },
  timerPill: { background: '#fef3e2', color: '#7c4f0f', borderRadius: 20, padding: '6px 16px', fontSize: 13 },
  cableCard: { display: 'flex', gap: 12, alignItems: 'center', background: '#f9f9f9', borderRadius: 12, padding: '14px 16px', width: '100%', textAlign: 'left' },
  cableIcon: { fontSize: 32, width: 48, height: 48, background: '#e8f5ee', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cableType: { fontSize: 15, fontWeight: 500 },
  cableMeta: { fontSize: 13, color: '#888', marginTop: 2 },
  cableGiver: { fontSize: 13, color: '#2a7c4f', marginTop: 4 },
  steps: { background: '#f9f9f9', borderRadius: 12, padding: '14px 16px', width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 },
  step: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  stepNum: { width: 22, height: 22, borderRadius: '50%', background: '#2a7c4f', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  stepText: { fontSize: 13, color: '#555', lineHeight: 1.5 },
  confirmStatus: { background: '#f9f9f9', borderRadius: 12, padding: '14px 16px', width: '100%', display: 'flex', flexDirection: 'column', gap: 10 },
  confirmRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 },
  confirmLabel: { fontSize: 13, color: '#888' },
  confirmBtn: { background: '#2a7c4f', color: '#fff', border: 'none', borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', width: '100%' },
  waitingNote: { background: '#e8f5ee', color: '#1a5c36', borderRadius: 10, padding: '12px 16px', fontSize: 14, lineHeight: 1.5, width: '100%' },
  ghostBtn: { background: 'none', border: '1px solid #ddd', borderRadius: 10, padding: '10px 20px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', color: '#555' },
  disputeLink: { fontSize: 13, color: '#999', cursor: 'pointer', textDecoration: 'underline' },
}