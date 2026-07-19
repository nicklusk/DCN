'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CABLE_TYPES = ['All', 'USB-C', 'USB-A', 'Lightning', 'HDMI', 'DisplayPort', 'DVI', 'VGA', 'Audio', 'Coaxial', 'Ethernet', 'Other']

export default function Browse() {
  const [cables, setCables] = useState([])
  const [filter, setFilter] = useState('All')
  const [zip, setZip] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else setUser(data.user)
    })
    fetchCables()
  }, [])

  const fetchCables = async (type = 'All', zipCode = '') => {
    setLoading(true)
    let query = supabase
      .from('cables')
      .select('*, profiles(full_name)')
      .eq('status', 'available')
      .order('created_at', { ascending: false })

    if (type !== 'All') {
      query = query.ilike('cable_type', `%${type}%`)
    }
    if (zipCode.length === 5) {
      query = query.eq('zip', zipCode)
    }

    const { data, error } = await query
    if (!error) setCables(data || [])
    setLoading(false)
  }

  const handleFilter = (type) => {
    setFilter(type)
    fetchCables(type, zip)
  }

  const handleZip = (e) => {
    const val = e.target.value
    setZip(val)
    fetchCables(filter, val)
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
          <button style={styles.ghostBtn} onClick={() => router.push('/post')}>+ Post a cable</button>
          <button style={styles.ghostBtn} onClick={handleLogout}>Log out</button>
        </div>
      </div>

      <div style={styles.searchRow}>
        <input style={styles.zipInput} placeholder="Filter by ZIP code"
          value={zip} onChange={handleZip} maxLength={5} />
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
              <div style={styles.cardImg}>🔌</div>
              <div style={styles.cardBody}>
                <div style={styles.cardTitle}>{cable.cable_type}</div>
                <div style={styles.cardMeta}>{cable.length} · {cable.condition}</div>
                <div style={styles.cardMeta}>📍 {cable.zip || 'Location not set'}</div>
                <div style={styles.cardGiver}>
                  {cable.profiles?.full_name || 'Anonymous'}
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

const styles = {
  page: { maxWidth: 680, margin: '0 auto', padding: '0 16px 40px', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #eee' },
  logo: { fontSize: 18, fontWeight: 600 },
  green: { color: '#2a7c4f' },
  headerRight: { display: 'flex', gap: 8 },
  ghostBtn: { background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  searchRow: { padding: '16px 0 8px' },
  zipInput: { padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e5e5', fontSize: 14, fontFamily: 'inherit', width: '100%', outline: 'none' },
  filterRow: { display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 0 16px' },
  chip: { padding: '5px 14px', borderRadius: 20, border: '1px solid #e5e5e5', background: '#fff', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  chipActive: { padding: '5px 14px', borderRadius: 20, border: '1px solid #2a7c4f', background: '#2a7c4f', color: '#fff', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  grid: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: { background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 14, display: 'flex', gap: 12, cursor: 'pointer', alignItems: 'center' },
  cardImg: { width: 52, height: 52, borderRadius: 10, background: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: 500, marginBottom: 3 },
  cardMeta: { fontSize: 13, color: '#888', marginBottom: 2 },
  cardGiver: { fontSize: 13, color: '#2a7c4f', marginTop: 4 },
  badge: { background: '#e8f5ee', color: '#1a5c36', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500 },
  empty: { textAlign: 'center', color: '#888', padding: '60px 0', fontSize: 15 }
}