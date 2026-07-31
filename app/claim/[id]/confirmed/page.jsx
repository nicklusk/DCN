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
  const [error, setError] = useState(null)
  const router = useRouter()
  const { id } = useParams()

useEffect(() => {
  let pollInterval = null  // declared here, not inside init
  let mounted = true

 const init = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !mounted) return
  setUser(user)

  console.log('Confirmed page init — cable id:', id, 'user:', user.id)

  // Retry fetching cable up to 5 times with 1s delay
  // Needed because the RPC status update may not be committed yet
  let cable = null
  for (let attempt = 1; attempt <= 5; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000))

    const { data, error } = await supabase
      .from('cables')
      .select('*, profiles(full_name)')
      .eq('id', id)
      .maybeSingle()

    console.log(`Cable fetch attempt ${attempt}:`, data, error)

    if (data) {
      cable = data
      break
    }

    // If we get an error other than not found, stop retrying
    if (error) {
      console.error('Cable fetch error:', error)
      if (mounted) setError('Could not load cable details.')
      if (mounted) setLoading(false)
      return
    }

    console.log(`Cable not found on attempt ${attempt}, retrying...`)
  }

  // After 5 attempts if still no cable, transaction may have already completed
  if (!cable) {
    console.log('Cable not found after 5 attempts — transaction may be complete')
    if (mounted) router.push('/browse?completed=true')
    return
  }

  if (mounted) {
    setCable(cable)
    setGiver(cable.profiles)
  }

  // Retry claim fetch up to 3 times
  let claim = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('cable_id', id)
      .eq('claimer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    console.log(`Claim fetch attempt ${attempt}:`, data, error)

    if (data) {
      claim = data
      break
    }

    if (error) {
      console.error('Claim fetch error:', error)
      if (mounted) setError('Could not load claim details.')
      if (mounted) setLoading(false)
      return
    }

    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 1000))
  }

  if (!claim) {
    console.log('No claim found after retries')
    if (mounted) setError('No active claim found. Contact support.')
    if (mounted) setLoading(false)
    return
  }

  console.log('Claim found:', claim.id, 'giver_confirmed:', claim.giver_confirmed,
    'claimer_confirmed:', claim.claimer_confirmed)

  if (mounted) {
    setClaim(claim)
    setLoading(false)
  }

  // Poll every 5 seconds for giver confirmation
  pollInterval = setInterval(async () => {
    if (!mounted) return

    const { data: cableCheck } = await supabase
      .from('cables')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    console.log('Poll — cable exists:', !!cableCheck)

    if (!cableCheck) {
      clearInterval(pollInterval)
      if (mounted) router.push('/browse?completed=true')
      return
    }

    const { data: updatedClaim } = await supabase
      .from('claims')
      .select('*')
      .eq('cable_id', id)
      .eq('claimer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (updatedClaim && mounted) {
      console.log('Poll — giver_confirmed:', updatedClaim.giver_confirmed,
        'claimer_confirmed:', updatedClaim.claimer_confirmed)
      setClaim(updatedClaim)
    }
  }, 5000)
}

  init()

  return () => {
    mounted = false
    if (pollInterval) clearInterval(pollInterval)
  }
}, [id])

  const handleConfirm = async () => {
    if (!claim) return

    const { error } = await supabase
      .from('claims')
      .update({ claimer_confirmed: true })
      .eq('id', claim.id)

    if (error) {
      alert('Something went wrong. Try again.')
      return
    }

    const { data: updated } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claim.id)
      .maybeSingle()

    if (!updated) return
    setClaim(updated)

    if (updated.giver_confirmed && updated.claimer_confirmed) {
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
  }

  if (loading) return (
    <div style={styles.centered}>
      <p style={styles.loadingText}>Loading your claim...</p>
    </div>
  )

  if (error) return (
    <div style={styles.centered}>
      <p style={styles.errorBox}>{error}</p>
      <button style={styles.cta} onClick={() => router.push('/browse')}>
        Back to browse
      </button>
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
        <span style={styles.logo}>
          Dollar Cable <span style={styles.green}>Neighbor</span>
        </span>
      </div>

      <div style={styles.body}>
        <div style={styles.iconWrap}>
          <span style={styles.icon}>{bothConfirmed ? '🎉' : '✅'}</span>
        </div>

        <h1 style={styles.title}>
          {bothConfirmed ? 'Transaction complete!' : 'Cable reserved!'}
        </h1>

        <p style={styles.subtitle}>
          {bothConfirmed
            ? 'Your $1 has been processed. Enjoy your cable!'
            : `Your $1 is being held securely. Arrange pickup with ${giver?.full_name || 'the giver'}, then both confirm the handoff below.`
          }
        </p>

        {!bothConfirmed && (
          <div style={styles.timerPill}>
            ⏱ Auto-releases in {hoursLeft} hours
          </div>
        )}

        <div style={styles.cableCard}>
          <span style={styles.cableIcon}>🔌</span>
          <div>
            <div style={styles.cableType}>{cable?.cable_type}</div>
            <div style={styles.cableMeta}>
              {cable?.length} · {cable?.condition}
            </div>
            <div style={styles.cableGiver}>
              From {giver?.full_name || 'Anonymous'}
            </div>
          </div>
        </div>

        {!bothConfirmed && (
          <div style={styles.steps}>
            <div style={styles.step}>
              <div style={styles.stepNum}>1</div>
              <div style={styles.stepText}>
                Message {giver?.full_name || 'the giver'} to arrange pickup
              </div>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNum}>2</div>
              <div style={styles.stepText}>Pick up the cable in person</div>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNum}>3</div>
              <div style={styles.stepText}>
                Both tap confirm — your $1 processes and the listing closes
              </div>
            </div>
          </div>
        )}

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

        {!bothConfirmed && !claimerConfirmed && (
          <button style={styles.cta} onClick={handleConfirm}>
            Confirm I received the cable ✓
          </button>
        )}

        {claimerConfirmed && !bothConfirmed && (
          <div style={styles.waitingNote}>
            You've confirmed! Waiting on {giver?.full_name || 'the giver'} to confirm their side.
          </div>
        )}

        {bothConfirmed && (
          <button style={styles.cta} onClick={() => router.push('/browse')}>
            Back to browse →
          </button>
        )}

        <button
          style={styles.ghostBtn}
          onClick={() => router.push(`/messages?with=${cable?.user_id}`)}>
          Message {giver?.full_name?.split(' ')[0] || 'giver'} about pickup →
        </button>

        <button style={styles.ghostBtn} onClick={() => router.push('/browse')}>
          Back to browse
        </button>

        <p style={styles.disputeLink}
          onClick={() => alert('Dispute flow coming soon.')}>
          Report a problem
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: { maxWidth: 480, margin: '0 auto', padding: '0 16px 60px', fontFamily: 'system-ui, sans-serif' },
  centered: { maxWidth: 480, margin: '80px auto', padding: '0 16px', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' },
  loadingText: { color: '#888', fontSize: 15 },
  header: { padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: 24 },
  logo: { fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' },
  green: { color: '#2a7c4f' },
  body: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' },
  iconWrap: { width: 72, height: 72, borderRadius: '50%', background: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  icon: { fontSize: 36 },
  title: { fontSize: 22, fontWeight: 500, color: 'var(--text-primary)' },
  subtitle: { fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 360 },
  timerPill: { background: '#fef3e2', color: '#7c4f0f', borderRadius: 20, padding: '6px 16px', fontSize: 13 },
  cableCard: { display: 'flex', gap: 12, alignItems: 'center', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', width: '100%', textAlign: 'left' },
  cableIcon: { fontSize: 32, width: 48, height: 48, background: '#e8f5ee', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cableType: { fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' },
  cableMeta: { fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 },
  cableGiver: { fontSize: 13, color: '#2a7c4f', marginTop: 4 },
  steps: { background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 },
  step: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  stepNum: { width: 22, height: 22, borderRadius: '50%', background: '#2a7c4f', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  stepText: { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 },
  confirmStatus: { background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', width: '100%', display: 'flex', flexDirection: 'column', gap: 10 },
  confirmRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: 'var(--text-primary)' },
  confirmLabel: { fontSize: 13, color: 'var(--text-secondary)' },
  cta: { background: '#2a7c4f', color: '#fff', border: 'none', borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', width: '100%' },
  waitingNote: { background: '#e8f5ee', color: '#1a5c36', borderRadius: 10, padding: '12px 16px', fontSize: 14, lineHeight: 1.5, width: '100%' },
  ghostBtn: { background: 'none', border: '1px solid var(--border-strong)', borderRadius: 10, padding: '10px 20px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)', width: '100%' },
  disputeLink: { fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' },
  errorBox: { color: '#c0392b', fontSize: 14, background: '#fdf0f0', padding: '14px 16px', borderRadius: 10, textAlign: 'center', width: '100%' },
}