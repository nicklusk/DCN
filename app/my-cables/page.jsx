'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function MyCables() {
  const [listings, setListings] = useState([])
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const router = useRouter()

  // fetchData MUST come before useEffect
  const fetchData = async (userId) => {
    setLoading(true)

    const { data: cables } = await supabase
      .from('cables')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    setListings(cables || [])

    const { data: claimData } = await supabase
      .from('claims')
      .select('*, cables(cable_type, length, condition), profiles(full_name)')
      .eq('status', 'pending')
      .in('cable_id', (cables || []).map(c => c.id))
      .order('created_at', { ascending: false })

    const enriched = await Promise.all(
      (claimData || []).map(async (claim) => {
        const { data: claimer } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', claim.claimer_id)
          .single()
        return { ...claim, claimer_name: claimer?.full_name || 'Someone' }
      })
    )

    setClaims(enriched)
    setLoading(false)
  }

  // useEffect comes AFTER fetchData
useEffect(() => {
  // Step 1: Auth and initial data load
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) { router.push('/login'); return }
    setUser(user)
    fetchData(user.id)

    // Step 2: Set up real-time subscription synchronously
    // (not inside async, which caused the error)
    const channel = supabase
      .channel('claims-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'claims' },
        () => fetchData(user.id)
      )
      .subscribe()

    // Cleanup on unmount
    return () => supabase.removeChannel(channel)
  })
}, [])



  const handleGiverConfirm = async (claim) => {
    setConfirming(claim.id)

    const { error } = await supabase
      .from('claims')
      .update({ giver_confirmed: true })
      .eq('id', claim.id)

    if (error) {
      alert('Something went wrong. Try again.')
      setConfirming(null)
      return
    }

    // Check if claimer has also confirmed
    const { data: updated } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claim.id)
      .single()

    if (updated.giver_confirmed && updated.claimer_confirmed) {
      // Both confirmed — capture payment
      await fetch('/api/capture-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId: claim.id })
      })
      alert('Transaction complete! The $1 has been processed and the listing removed.')
    } else {
      alert(`Got it! Waiting on ${claim.claimer_name} to confirm their side.`)
    }

    // Refresh data
    await fetchData(user.id)
    setConfirming(null)
  }

  const handleDelete = async (cableId) => {
    if (!confirm('Remove this listing? This cannot be undone.')) return
    await supabase.from('cables').delete().eq('id', cableId)
    await fetchData(user.id)
  }

  const pendingClaims = claims.filter(c => !c.giver_confirmed)
  const awaitingClaimer = claims.filter(c => c.giver_confirmed && !c.claimer_confirmed)

  if (loading) return (
    <div style={styles.centered}>
      <p style={styles.loadingText}>Loading your cables...</p>
    </div>
  )

  return (
    <div style={styles.page}>
        <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.push('/browse')}>← Browse</button>
        <span style={styles.title}>My cables</span>
        <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.refreshBtn} onClick={() => fetchData(user?.id)}>↻ Refresh</button>
            <button style={styles.postBtn} onClick={() => router.push('/post')}>+ Post</button>
        </div>
        </div>

      {/* Pending claims — action required */}
      {pendingClaims.length > 0 && (
        <div style={styles.section}>
          <p style={styles.sectionLabel}>Action required</p>
          {pendingClaims.map(claim => (
            <div key={claim.id} style={styles.claimCard}>
              <div style={styles.claimHeader}>
                <span style={styles.claimBadge}>🔔 Claim pending</span>
                <span style={styles.claimTimer}>
                  ⏱ {hoursLeft(claim.expires_at)}h left
                </span>
              </div>
              <div style={styles.claimCable}>
                🔌 {claim.cables?.cable_type} · {claim.cables?.length}
              </div>
              <div style={styles.claimPerson}>
                {claim.claimer_name} wants this cable
              </div>
              <div style={styles.claimConfirmStatus}>
                <span>{claim.claimer_confirmed ? '✅' : '⬜'} {claim.claimer_name} confirmed</span>
                <span>⬜ You confirmed</span>
              </div>
              <button
                style={confirming === claim.id ? styles.btnDisabled : styles.confirmBtn}
                onClick={() => handleGiverConfirm(claim)}
                disabled={confirming === claim.id}
              >
                {confirming === claim.id ? 'Confirming...' : 'Confirm I gave the cable ✓'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Waiting on claimer */}
      {awaitingClaimer.length > 0 && (
        <div style={styles.section}>
          <p style={styles.sectionLabel}>Waiting on claimer</p>
          {awaitingClaimer.map(claim => (
            <div key={claim.id} style={{ ...styles.claimCard, ...styles.claimCardMuted }}>
              <div style={styles.claimCable}>
                🔌 {claim.cables?.cable_type} · {claim.cables?.length}
              </div>
              <div style={styles.claimPerson}>
                Waiting on {claim.claimer_name} to confirm their side
              </div>
              <div style={styles.claimConfirmStatus}>
                <span>{claim.claimer_confirmed ? '✅' : '⬜'} {claim.claimer_name} confirmed</span>
                <span>✅ You confirmed</span>
              </div>
              <div style={styles.waitingNote}>
                Auto-releases in {hoursLeft(claim.expires_at)} hours if no response
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active listings */}
      <div style={styles.section}>
        <p style={styles.sectionLabel}>
          Your listings ({listings.filter(l => l.status === 'available').length} available)
        </p>
        {listings.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>You haven't posted any cables yet.</p>
            <button style={styles.confirmBtn} onClick={() => router.push('/post')}>
              Post your first cable →
            </button>
          </div>
        ) : (
          listings.map(cable => (
            <div key={cable.id} style={styles.listingCard}
              onClick={() => router.push(`/cable/${cable.id}`)}>
              <div style={styles.listingIcon}>🔌</div>
              <div style={styles.listingInfo}>
                <div style={styles.listingType}>{cable.cable_type}</div>
                <div style={styles.listingMeta}>{cable.length} · {cable.condition}</div>
                <div style={styles.listingMeta}>📍 {cable.zip}</div>
              </div>
              <div style={styles.listingRight}>
                <span style={cable.status === 'available' ? styles.badgeGreen : styles.badgeAmber}>
                  {cable.status === 'available' ? 'Available' : 'Reserved'}
                </span>
                <button
                  style={styles.deleteBtn}
                  onClick={e => { e.stopPropagation(); handleDelete(cable.id) }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function hoursLeft(expiresAt) {
  return Math.max(0, Math.round((new Date(expiresAt) - Date.now()) / 1000 / 60 / 60))
}

const styles = {
  page: { maxWidth: 560, margin: '0 auto', padding: '0 16px 60px', fontFamily: 'system-ui, sans-serif' },
  centered: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'system-ui, sans-serif' },
  loadingText: { color: '#888', fontSize: 15 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #eee', marginBottom: 20 },
  backBtn: { background: 'none', border: 'none', fontSize: 15, color: '#2a7c4f', cursor: 'pointer', fontFamily: 'inherit' },
  title: { fontSize: 17, fontWeight: 500 },
  postBtn: { background: '#2a7c4f', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  section: { marginBottom: 28 },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 },
  claimCard: { background: '#fff', border: '1.5px solid #2a7c4f', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 },
  claimCardMuted: { border: '1px solid #eee' },
  claimHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  claimBadge: { fontSize: 13, fontWeight: 500, color: '#2a7c4f' },
  claimTimer: { fontSize: 12, color: '#7c4f0f', background: '#fef3e2', padding: '3px 10px', borderRadius: 20 },
  claimCable: { fontSize: 15, fontWeight: 500 },
  claimPerson: { fontSize: 14, color: '#555' },
  claimConfirmStatus: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#555', background: '#f9f9f9', borderRadius: 8, padding: '10px 12px' },
  confirmBtn: { background: '#2a7c4f', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  btnDisabled: { background: '#a8d5bc', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, cursor: 'not-allowed', fontFamily: 'inherit' },
  waitingNote: { fontSize: 13, color: '#7c4f0f', background: '#fef3e2', borderRadius: 8, padding: '8px 12px' },
  listingCard: { background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 14, display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8, cursor: 'pointer' },
  listingIcon: { width: 48, height: 48, background: '#e8f5ee', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 },
  listingInfo: { flex: 1 },
  listingType: { fontSize: 15, fontWeight: 500, marginBottom: 3 },
  listingMeta: { fontSize: 13, color: '#888', marginBottom: 2 },
  listingRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 },
  badgeGreen: { background: '#e8f5ee', color: '#1a5c36', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500 },
  badgeAmber: { background: '#fef3e2', color: '#7c4f0f', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500 },
  deleteBtn: { background: 'none', border: 'none', fontSize: 12, color: '#c0392b', cursor: 'pointer', fontFamily: 'inherit' },
  emptyState: { display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', padding: '32px 0' },
  emptyText: { color: '#888', fontSize: 15 },
  refreshBtn: { background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '7px 12px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#555' },
}