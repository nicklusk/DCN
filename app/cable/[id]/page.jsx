'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'

export default function CableDetail() {
  const [cable, setCable] = useState(null)
  const [giver, setGiver] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const { id } = useParams()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else setUser(data.user)
    })
    fetchCable()
  }, [id])

  const fetchCable = async () => {
    const { data, error } = await supabase
      .from('cables')
      .select('*, profiles(full_name, zip)')
      .eq('id', id)
      .single()

    if (error || !data) {
      router.push('/browse')
      return
    }

    setCable(data)
    setGiver(data.profiles)
    setLoading(false)
  }

  useEffect(() => {
    if (user && cable) setIsOwner(user.id === cable.user_id)
  }, [user, cable])

  const handleDelete = async () => {
    if (!confirm('Remove this listing? This cannot be undone.')) return
    setDeleting(true)
    await supabase.from('cables').delete().eq('id', cable.id)
    router.push('/browse')
  }

  const conditionColor = (c) => {
    if (c === 'Like new') return { bg: '#e8f5ee', text: '#1a5c36' }
    if (c === 'Good') return { bg: '#e8f0fe', text: '#1a3c7c' }
    return { bg: '#fef3e2', text: '#7c4f0f' }
  }

  if (loading) return (
    <div style={styles.loadingPage}>
      <p style={styles.loadingText}>Loading cable...</p>
    </div>
  )

  const cc = conditionColor(cable.condition)

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.push('/browse')}>← Browse</button>
        {isOwner && (
          <button style={styles.deleteBtn} onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Removing...' : 'Remove listing'}
          </button>
        )}
      </div>

      {/* Photo or placeholder */}
        {cable.photo_url ? (
        <div style={styles.photoWrap}>
            <Image
            src={cable.photo_url}
            alt={cable.cable_type}
            fill
            style={{ objectFit: 'cover' }}
            priority
            />
        </div>
        ) : (
        <div style={styles.photoPlaceholder}>
            <span style={styles.photoIcon}>🔌</span>
        </div>
        )}

      <div style={styles.body}>
        {/* Title + badges */}
        <div>
          <h1 style={styles.title}>{cable.cable_type}</h1>
          <div style={styles.badgeRow}>
            <span style={{ ...styles.badge, background: '#e8f5ee', color: '#1a5c36' }}>
              {cable.status === 'available' ? 'Available' : 'Reserved'}
            </span>
            <span style={{ ...styles.badge, background: cc.bg, color: cc.text }}>
              {cable.condition}
            </span>
            {cable.length && (
              <span style={{ ...styles.badge, background: '#f5f5f5', color: '#555' }}>
                {cable.length}
              </span>
            )}
          </div>
        </div>

        {/* Meta */}
        <div style={styles.metaBlock}>
          <div style={styles.metaRow}>
            <span style={styles.metaIcon}>📍</span>
            <span>ZIP code {cable.zip || 'not specified'}</span>
          </div>
          <div style={styles.metaRow}>
            <span style={styles.metaIcon}>🗓</span>
            <span>Listed {new Date(cable.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Notes */}
        {cable.notes && (
          <div style={styles.notesBox}>
            <p style={styles.notesLabel}>From the giver</p>
            <p style={styles.notesText}>{cable.notes}</p>
          </div>
        )}

        {/* Giver card */}
        <div style={styles.giverCard}>
          <div style={styles.avatar}>
            {(giver?.full_name || 'A')[0].toUpperCase()}
          </div>
          <div>
            <div style={styles.giverName}>{giver?.full_name || 'Anonymous'}</div>
            <div style={styles.giverSub}>Cable giver</div>
          </div>
        </div>

        {/* Trust note */}
        <div style={styles.trustBox}>
          <span>🔒</span>
          <p>Your $1 is held securely and only released once both parties confirm the handoff. Auto-released in 72 hours if no response.</p>
        </div>

        {/* CTA */}
        {!isOwner && cable.status === 'available' && (
          <button style={styles.claimBtn}
            onClick={() => router.push(`/claim/${cable.id}`)}>
            Claim this cable for $1 →
          </button>
        )}

        {isOwner && (
          <div style={styles.ownerNote}>
            This is your listing. Share the link to let people know it's available!
          </div>
        )}

        {cable.status !== 'available' && !isOwner && (
          <div style={styles.reservedNote}>
            This cable has already been reserved. Check back or browse others!
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { maxWidth: 560, margin: '0 auto', fontFamily: 'system-ui, sans-serif', paddingBottom: 60 },
  loadingPage: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' },
  loadingText: { color: '#888', fontSize: 15 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #eee' },
  backBtn: { background: 'none', border: 'none', fontSize: 15, color: '#2a7c4f', cursor: 'pointer', fontFamily: 'inherit' },
  deleteBtn: { background: 'none', border: '1px solid #e5e5e5', borderRadius: 8, padding: '6px 12px', fontSize: 13, color: '#c0392b', cursor: 'pointer', fontFamily: 'inherit' },
  photoWrap: { width: '100%', height: 220, overflow: 'hidden', position: 'relative' },  photo: { width: '100%', height: '100%', objectFit: 'cover' },
  photoPlaceholder: { width: '100%', height: 180, background: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  photoIcon: { fontSize: 64 },
  body: { padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 18 },
  title: { fontSize: 22, fontWeight: 500, marginBottom: 10 },
  badgeRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  badge: { fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 500 },
  metaBlock: { display: 'flex', flexDirection: 'column', gap: 8 },
  metaRow: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: '#555' },
  metaIcon: { fontSize: 16 },
  notesBox: { background: '#f9f9f9', borderRadius: 10, padding: '12px 14px' },
  notesLabel: { fontSize: 12, color: '#999', marginBottom: 4, fontWeight: 500 },
  notesText: { fontSize: 14, color: '#444', lineHeight: 1.6 },
  giverCard: { display: 'flex', gap: 12, alignItems: 'center', background: '#f9f9f9', borderRadius: 12, padding: '12px 14px' },
  avatar: { width: 42, height: 42, borderRadius: '50%', background: '#cde9d9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 500, color: '#1a5c36', flexShrink: 0 },
  giverName: { fontSize: 15, fontWeight: 500 },
  giverSub: { fontSize: 13, color: '#888' },
  trustBox: { display: 'flex', gap: 10, background: '#e8f5ee', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#1a5c36', lineHeight: 1.5, alignItems: 'flex-start' },
  claimBtn: { background: '#2a7c4f', color: '#fff', border: 'none', borderRadius: 10, padding: 16, fontSize: 16, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' },
  ownerNote: { background: '#f0f0f0', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 1.5 },
  reservedNote: { background: '#fef3e2', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#7c4f0f', textAlign: 'center', lineHeight: 1.5 },
}