'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

const CABLE_TYPES = ['All', 'USB-C', 'USB-A', 'Lightning', 'HDMI', 'DisplayPort', 'DVI', 'VGA', 'Audio', 'Coaxial', 'Ethernet', 'Other']

function Browse() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Seed state directly from URL params on first render —
  // no need to set these inside an effect
  const [cables, setCables] = useState([])
  const [filter, setFilter] = useState(searchParams.get('type') || 'All')
  const [zip, setZip] = useState(searchParams.get('zip') || '')
  const [searchText, setSearchText] = useState(searchParams.get('q') || '')
  const [loading, setLoading] = useState(true)
  const [toastMsg, setToastMsg] = useState(null)

  const fetchCables = async (type = 'All', zipCode = '', text = '') => {
    setLoading(true)
    let query = supabase
      .from('cables')
      .select('*, profiles(full_name)')
      .eq('status', 'available')
      .order('created_at', { ascending: false })

    if (type && type !== 'All') {
      query = query.ilike('cable_type', `%${type}%`)
    }
    if (zipCode.length === 5) {
      query = query.eq('zip', zipCode)
    }
    if (text) {
      query = query.ilike('cable_type', `%${text}%`)
    }

    const { data, error } = await query
    if (!error) setCables(data || [])
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
    })

    const q = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'All'
    const zipParam = searchParams.get('zip') || ''

    // Defer to next microtask so setLoading inside fetchCables
    // isn't called synchronously within the effect body
    queueMicrotask(() => {
      fetchCables(type, zipParam, q)
    })

    if (searchParams.get('posted') === 'true') {
      setToastMsg("Cable posted! It's now visible to people near you.")
      setTimeout(() => setToastMsg(null), 4000)
    }
    if (searchParams.get('completed') === 'true') {
      setToastMsg("Transaction complete! Enjoy your cable. 🎉")
      setTimeout(() => setToastMsg(null), 5000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilter = (type) => {
    setFilter(type)
    fetchCables(type, zip, searchText)
  }

  const handleZip = (e) => {
    const val = e.target.value
    setZip(val)
    fetchCables(filter, val, searchText)
  }

  const handleSearchText = (e) => {
    const val = e.target.value
    setSearchText(val)
    fetchCables(filter, zip, val)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.logo}>Dollar Cable <span style={styles.green}>Neighbor</span></span>
        <div style={styles.headerRight}>
          <button style={styles.ghostBtn} onClick={() => router.push('/my-cables')}>My cables</button>
          <button style={styles.ghostBtn} onClick={() => router.push('/messages')}>Messages</button>
          <button style={styles.ghostBtn} onClick={() => router.push('/cables')}>Cable guide</button>
          <button style={styles.ghostBtn} onClick={() => router.push('/post')}>+ Post</button>
          <button style={styles.ghostBtn} onClick={handleLogout}>Log out</button>
        </div>
      </div>

      {toastMsg && (
        <div style={styles.toast}>
          ✓ {toastMsg}
        </div>
      )}

      <div style={styles.searchRow}>
        <input
          style={styles.zipInput}
          placeholder="Search cable type or device..."
          value={searchText}
          onChange={handleSearchText}
        />
        <input
          style={{ ...styles.zipInput, marginTop: 8 }}
          placeholder="Filter by ZIP code"
          value={zip}
          onChange={handleZip}
          maxLength={5}
        />
      </div>

      <div style={styles.filterRow}>
        {CABLE_TYPES.map(type => (
          <button key={type} style={filter === type ? styles.chipActive : styles.chip}
            onClick={() => handleFilter(type)}>{type}</button>
        ))}
      </div>

      {loading ? (
        <p style={styles.empty}>Loading cables near you...</p>
      ) : cables.length === 0 ? (
        <p style={styles.empty}>No cables found. Be the first to post one!</p>
      ) : (
        <div style={styles.grid}>
          {cables.map(cable => (
            <div key={cable.id} style={styles.card}
              onClick={() => router.push(`/cable/${cable.id}`)}>
              {cable.thumb_url || cable.photo_url ? (
                <Image
                  src={cable.thumb_url || cable.photo_url}
                  alt={cable.cable_type}
                  width={52}
                  height={52}
                  style={{ borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={styles.cardImg}>🔌</div>
              )}
              <div style={styles.cardBody}>
                <div style={styles.cardTitle}>{cable.cable_type}</div>
                <div style={styles.cardMeta}>{cable.length} · {cable.condition}</div>
                <div style={styles.cardMeta}>📍 {cable.zip || 'Location not set'}</div>
                <div style={styles.cardGiver}
                  onClick={e => { e.stopPropagation(); router.push(`/profile/${cable.user_id}`) }}>
                  {cable.profiles?.full_name || 'Anonymous'} →
                </div>
              </div>
              <span style={styles.badge}>Available</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui', color: '#888' }}>Loading...</div>}>
      <Browse />
    </Suspense>
  )
}

const styles = {
  page: { maxWidth: 680, margin: '0 auto', padding: '0 16px 40px', fontFamily: 'system-ui, sans-serif', color: 'var(--text-primary)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 },
  logo: { fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' },
  green: { color: '#2a7c4f' },
  headerRight: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  ghostBtn: { background: 'var(--surface-1)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)' },
  toast: { background: '#e8f5ee', color: '#1a5c36', padding: '12px 16px', borderRadius: 10, fontSize: 14, margin: '12px 0' },
  searchRow: { padding: '16px 0 8px' },
  zipInput: { padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-strong)', fontSize: 14, fontFamily: 'inherit', width: '100%', outline: 'none', background: 'var(--surface-2)', color: 'var(--text-primary)' },
  filterRow: { display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 0 16px' },
  chip: { padding: '5px 14px', borderRadius: 20, border: '1px solid var(--border-strong)', background: 'var(--surface-2)', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', color: 'var(--text-primary)' },
  chipActive: { padding: '5px 14px', borderRadius: 20, border: '1px solid #2a7c4f', background: '#2a7c4f', color: '#fff', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  grid: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, display: 'flex', gap: 12, cursor: 'pointer', alignItems: 'center' },
  cardImg: { width: 52, height: 52, borderRadius: 10, background: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: 500, marginBottom: 3, color: 'var(--text-primary)' },
  cardMeta: { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 },
  cardGiver: { fontSize: 13, color: '#2a7c4f', marginTop: 4 },
  badge: { background: '#e8f5ee', color: '#1a5c36', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500 },
  empty: { textAlign: 'center', color: 'var(--text-secondary)', padding: '60px 0', fontSize: 15 }
}