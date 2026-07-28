'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

const CABLE_TYPES = [
  'All types',
  'USB-A to USB-C', 'USB-A to Micro-USB', 'USB-A to Mini-USB',
  'USB-A to USB-B', 'USB-C to USB-C', 'USB 3.0 Type-A to Type-A',
  'USB 3.0 Type-A to Type-B', 'Lightning to USB-A', 'Lightning to USB-C',
  'HDMI (standard)', 'Mini HDMI', 'Micro HDMI', 'DisplayPort',
  'Mini DisplayPort', 'DVI-D', 'VGA', '3.5mm Audio', 'Optical (TOSLINK)',
  'RCA / Composite', 'XLR (balanced audio)', 'MIDI (5-pin DIN)',
  'Instrument / Guitar / Patch (6.35mm TS)', 'Coaxial / Speaker Wire',
  'DB9 (RS-232 Serial)', 'Ethernet / Cat5e', 'Ethernet / Cat6',
  'Adapter (describe in notes)', 'Other (describe in notes)',
]

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [listings, setListings] = useState([])
  const [txCount, setTxCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [searchType, setSearchType] = useState('All types')
  const [searchMode, setSearchMode] = useState(null) // null | 'local' | 'zip' | 'global'
  const [zipInput, setZipInput] = useState('')
  const [editingLocation, setEditingLocation] = useState(false)
  const [locationInput, setLocationInput] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarRef = useRef()
  const router = useRouter()
  const { id } = useParams()
  const [zipEdit, setZipEdit] = useState('')
  const [editingZip, setEditingZip] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

    const { data: prof } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

    console.log('Profile loaded:', prof?.full_name, 'Avatar:', prof?.avatar_url)

      if (!prof) { router.push('/browse'); return }
      setProfile(prof)
      setLocationInput(prof.location || '')
      setIsOwner(user?.id === id)
      setZipEdit(prof.zip || '')

      const { data: cables } = await supabase
        .from('cables')
        .select('*')
        .eq('user_id', id)
        .eq('status', 'available')
        .order('created_at', { ascending: false })
      setListings(cables || [])

      const { data: count } = await supabase
        .rpc('get_transaction_count', { user_id_input: id })
      setTxCount(count || 0)

      setLoading(false)
    }
    init()
  }, [id])

    const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingAvatar(true)

    // Resize to portrait thumbnail before upload
    const { resizeImage } = await import('@/lib/imageUtils')
    const resized = await resizeImage(file, 240, 330, 0.85)

    const fileName = `avatar-${currentUser.id}-${Date.now()}.jpg`
    const { error } = await supabase.storage
        .from('cable-photos')
        .upload(fileName, resized, { 
        contentType: 'image/jpeg',
        upsert: true 
        })

    if (!error) {
        const { data } = supabase.storage
        .from('cable-photos')
        .getPublicUrl(fileName)
        await supabase.from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', currentUser.id)
        setProfile(p => ({ ...p, avatar_url: data.publicUrl }))
    } else {
        alert('Upload failed. Try again.')
    }
    setUploadingAvatar(false)
    }

  const handleLocationSave = async () => {
    await supabase.from('profiles')
      .update({ location: locationInput })
      .eq('id', currentUser.id)
    setProfile(p => ({ ...p, location: locationInput }))
    setEditingLocation(false)
  }

  const handleZipSave = async () => {
    if (zipEdit.length !== 5) {
        alert('Please enter a valid 5-digit ZIP code.')
        return
    }
    await supabase.from('profiles')
        .update({ zip: zipEdit })
        .eq('id', currentUser.id)
    setProfile(p => ({ ...p, zip: zipEdit }))
    setEditingZip(false)
    }

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchText) params.set('q', searchText)
    if (searchType !== 'All types') params.set('type', searchType)
    if (searchMode === 'zip' && zipInput) params.set('zip', zipInput)
    if (searchMode === 'global') params.set('global', 'true')
    if (searchMode === 'local') params.set('local', 'true')
    router.push(`/browse?${params.toString()}`)
  }

  const handleDetectLocation = () => {
    setSearchMode('local')
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords
          const params = new URLSearchParams()
          if (searchText) params.set('q', searchText)
          if (searchType !== 'All types') params.set('type', searchType)
          params.set('lat', latitude)
          params.set('lng', longitude)
          router.push(`/browse?${params.toString()}`)
        },
        () => alert('Could not detect location. Try searching by ZIP instead.')
      )
    }
  }

  if (loading) return (
    <div style={s.centered}><p style={s.muted}>Loading profile...</p></div>
  )

  const initials = (profile.full_name || 'U').split(' ')
    .map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.push('/browse')}>← Browse</button>
        {isOwner && (
          <button style={s.ghostBtn} 
            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}>
            Log out
          </button>
        )}
        {!isOwner && (
          <button style={s.ghostBtn}
            onClick={() => router.push(`/messages?with=${id}`)}>
            Message {profile.full_name?.split(' ')[0]} →
          </button>
        )}
      </div>

      {/* Profile card */}
      <div style={s.profileCard}>
        <div style={s.avatarWrap}>
        {profile.avatar_url ? (
            <Image
            src={profile.avatar_url}
            alt={profile.full_name || 'Profile photo'}
            width={80}
            height={110}
            style={{
                objectFit: 'cover',
                borderRadius: 10,
                display: 'block',
                flexShrink: 0,
            }}
            />
        ) : (
            <div style={s.avatarFallback}>{initials}</div>
        )}
        {isOwner && (
            <button
            style={s.avatarEdit}
            onClick={() => avatarRef.current.click()}
            disabled={uploadingAvatar}
            aria-label="Change profile photo">
            {uploadingAvatar ? '...' : '✎'}
            </button>
        )}
        <input ref={avatarRef} type="file" accept="image/*"
            style={{ display: 'none' }} onChange={handleAvatarUpload} />
        </div>

        <div style={s.profileInfo}>
          <div style={s.profileName}>{profile.full_name}</div>

          <div style={s.profileMeta}>
            {editingLocation ? (
              <div style={s.locationEdit}>
                <input style={s.locationInput} value={locationInput}
                  onChange={e => setLocationInput(e.target.value)}
                  placeholder="e.g. Sumter, SC" />
                <button style={s.saveBtn} onClick={handleLocationSave}>Save</button>
                <button style={s.cancelBtn} onClick={() => setEditingLocation(false)}>Cancel</button>
              </div>
            ) : (
              <div style={s.locationRow}>
                <span style={s.muted}>
                  📍 {profile.location || (isOwner ? 'Add your location' : 'Location not set')}
                </span>
                {isOwner && (
                  <button style={s.editBtn} onClick={() => setEditingLocation(true)}>Edit</button>
                )}
              </div>
            )}
          </div>

          <div style={s.statsRow}>
            <div style={s.stat}>
              <span style={s.statNum}>{listings.length}</span>
              <span style={s.statLabel}>Active listings</span>
            </div>
            <div style={s.statDivider} />
            <div style={s.stat}>
              <span style={s.statNum}>{txCount}</span>
              <span style={s.statLabel}>Transactions</span>
            </div>
            {/* ZIP code — owner only */}
            {isOwner && (
            <div style={s.profileMeta}>
                {editingZip ? (
                <div style={s.locationEdit}>
                    <input
                    style={s.locationInput}
                    value={zipEdit}
                    onChange={e => setZipEdit(e.target.value)}
                    placeholder="5-digit ZIP"
                    maxLength={5}
                    />
                    <button style={s.saveBtn} onClick={handleZipSave}>Save</button>
                    <button style={s.cancelBtn} onClick={() => setEditingZip(false)}>Cancel</button>
                </div>
                ) : (
                <div style={s.locationRow}>
                    <span style={s.muted}>
                    📮 ZIP: {profile.zip || 'Not set'}
                    </span>
                    <button style={s.editBtn} onClick={() => setEditingZip(true)}>Edit</button>
                </div>
                )}
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Search — only shown on own profile (landing page mode) */}
      {isOwner && (
        <div style={s.searchCard}>
          <p style={s.searchTitle}>Find a cable</p>

          <input style={s.searchInput}
            placeholder="Search by cable type or device..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()} />

          <select style={s.searchSelect} value={searchType}
            onChange={e => setSearchType(e.target.value)}>
            {CABLE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>

          <p style={s.searchLabel}>Search area</p>
          <div style={s.modeRow}>
            <button
              style={searchMode === 'local' ? s.modeOn : s.mode}
              onClick={handleDetectLocation}>
              📍 Near me
            </button>
            <button
              style={searchMode === 'zip' ? s.modeOn : s.mode}
              onClick={() => setSearchMode('zip')}>
              🔢 By ZIP
            </button>
            <button
              style={searchMode === 'global' ? s.modeOn : s.mode}
              onClick={() => setSearchMode('global')}>
              🌐 Everywhere
            </button>
          </div>

          {searchMode === 'zip' && (
            <input style={s.zipInput}
              placeholder="Enter ZIP code"
              value={zipInput}
              onChange={e => setZipInput(e.target.value)}
              maxLength={5} />
          )}

          <div style={s.searchActions}>
            <button style={s.searchBtn} onClick={handleSearch}>Search →</button>
            <button style={s.browseBtn} onClick={() => router.push('/browse')}>
              Just browse
            </button>
          </div>
        </div>
      )}

      {isOwner && (
        <div style={s.notifySection}>
          <p style={s.sectionLabel}>Notifications</p>
          <div style={s.notifyRow}>
            <span style={s.muted}>Email alerts</span>
            <input type="checkbox"
              checked={profile.notify_email || false}
              onChange={async e => {
                await supabase.from('profiles')
                  .update({ notify_email: e.target.checked })
                  .eq('id', user.id)
                setProfile(p => ({ ...p, notify_email: e.target.checked }))
              }}
            />
          </div>
          <div style={s.notifyRow}>
            <span style={s.muted}>SMS alerts (requires phone number)</span>
            <input type="checkbox"
              checked={profile.notify_sms || false}
              onChange={async e => {
                await supabase.from('profiles')
                  .update({ notify_sms: e.target.checked })
                  .eq('id', user.id)
                setProfile(p => ({ ...p, notify_sms: e.target.checked }))
              }}
            />
          </div>
          {profile.notify_sms && (
            <input style={s.locationInput}
              placeholder="Phone number e.g. +15551234567"
              value={profile.phone || ''}
              onChange={async e => {
                setProfile(p => ({ ...p, phone: e.target.value }))
              }}
              onBlur={async e => {
                await supabase.from('profiles')
                  .update({ phone: e.target.value })
                  .eq('id', user.id)
              }}
            />
          )}
        </div>
      )}

      {/* Active listings */}
      {listings.length > 0 && (
        <div style={s.section}>
          <p style={s.sectionLabel}>
            {isOwner ? 'Your active listings' : `${profile.full_name}'s listings`}
          </p>
          <div style={s.listingGrid}>
            {listings.map(cable => (
              <div key={cable.id} style={s.listingCard}
                onClick={() => router.push(`/cable/${cable.id}`)}>
                {cable.thumb_url || cable.photo_url ? (
                <Image
                    src={cable.thumb_url || cable.photo_url}
                    alt={cable.cable_type}
                    width={56}
                    height={56}
                    style={{ borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                />
                ) : (
                <div style={s.listingIcon}>🔌</div>
                )}
                <div style={s.listingInfo}>
                  <div style={s.listingType}>{cable.cable_type}</div>
                  <div style={s.listingMeta}>{cable.length} · {cable.condition}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {listings.length === 0 && (
        <div style={s.emptyListings}>
          <p style={s.muted}>
            {isOwner ? 'You have no active listings.' : `${profile.full_name} has no active listings.`}
          </p>
          {isOwner && (
            <button style={s.searchBtn} onClick={() => router.push('/post')}>
              Post a cable →
            </button>
          )}
        </div>
      )}

      {isOwner && (
        <div style={s.quickLinks}>
          <button style={s.quickLink} onClick={() => router.push('/post')}>+ Post a cable</button>
          <button style={s.quickLink} onClick={() => router.push('/my-cables')}>My cables & claims</button>
          <button style={s.quickLink} onClick={() => router.push('/cables')}>Cable guide</button>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { maxWidth: 560, margin: '0 auto', padding: '0 16px 60px', fontFamily: 'system-ui, sans-serif' },
  centered: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'system-ui' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #e5e5e5', marginBottom: 20 },
  backBtn: { background: 'none', border: 'none', fontSize: 15, color: '#2a7c4f', cursor: 'pointer', fontFamily: 'inherit' },
  ghostBtn: { background: 'none', border: '1px solid #e5e5e5', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)' },
  profileCard: { display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20, background: 'var(--surface-2)', border: '1px solid #e5e5e5', borderRadius: 16, padding: 20 },
  avatarWrap: { position: 'relative', flexShrink: 0, width: 80, height: 110 },
  avatarFallback: { width: 80, height: 110, borderRadius: 10, background: '#cde9d9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 500, color: '#1a5c36' },
  avatarEdit: { position: 'absolute', bottom: 6, right: 6, width: 26, height: 26, borderRadius: 6, background: '#2a7c4f', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' },  profileInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 8 },
  profileName: { fontSize: 20, fontWeight: 500, color: 'var(--text-primary)' },
  profileMeta: { fontSize: 14 },
  locationRow: { display: 'flex', alignItems: 'center', gap: 8 },
  locationEdit: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  locationInput: { padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 13, fontFamily: 'inherit', background: 'var(--surface-2)', color: 'var(--text-primary)', flex: 1, minWidth: 120 },
  saveBtn: { background: '#2a7c4f', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
  cancelBtn: { background: 'none', border: '1px solid #e5e5e5', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-secondary)' },
  editBtn: { background: 'none', border: 'none', fontSize: 12, color: '#2a7c4f', cursor: 'pointer', fontFamily: 'inherit' },
  statsRow: { display: 'flex', gap: 16, alignItems: 'center', marginTop: 4 },
  stat: { display: 'flex', flexDirection: 'column', gap: 1 },
  statNum: { fontSize: 18, fontWeight: 500, color: 'var(--text-primary)' },
  statLabel: { fontSize: 11, color: 'var(--text-muted)' },
  statDivider: { width: 1, height: 28, background: '#e5e5e5' },
  searchCard: { background: 'var(--surface-2)', border: '1px solid #e5e5e5', borderRadius: 16, padding: 20, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 },
  searchTitle: { fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' },
  searchInput: { padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e5e5', fontSize: 14, fontFamily: 'inherit', background: 'var(--surface-2)', color: 'var(--text-primary)', outline: 'none' },
  searchSelect: { padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e5e5', fontSize: 14, fontFamily: 'inherit', background: 'var(--surface-2)', color: 'var(--text-primary)' },
  searchLabel: { fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 },
  modeRow: { display: 'flex', gap: 8 },
  mode: { flex: 1, padding: '8px 4px', borderRadius: 10, border: '1px solid #e5e5e5', background: 'var(--surface-1)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)' },
  modeOn: { flex: 1, padding: '8px 4px', borderRadius: 10, border: '1px solid #2a7c4f', background: '#e8f5ee', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#1a5c36', fontWeight: 500 },
  zipInput: { padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e5e5', fontSize: 14, fontFamily: 'inherit', background: 'var(--surface-2)', color: 'var(--text-primary)', outline: 'none' },
  searchActions: { display: 'flex', gap: 8 },
  searchBtn: { background: '#2a7c4f', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', flex: 1 },
  browseBtn: { background: 'none', border: '1px solid #e5e5e5', borderRadius: 10, padding: '12px 16px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)' },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 },
  listingGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  listingCard: { display: 'flex', gap: 12, alignItems: 'center', background: 'var(--surface-2)', border: '1px solid #e5e5e5', borderRadius: 12, padding: 12, cursor: 'pointer' },
  listingIcon: { width: 56, height: 56, background: '#e8f5ee', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 },
  listingInfo: { flex: 1 },
  listingType: { fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' },
  listingMeta: { fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 },
  emptyListings: { textAlign: 'center', padding: '32px 0', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' },
  quickLinks: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  quickLink: { background: 'none', border: '1px solid #e5e5e5', borderRadius: 10, padding: '10px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)' },
  muted: { color: 'var(--text-secondary)', fontSize: 14 },
  notifySection: { marginTop: 8 },
  notifyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--border)', fontSize: 14 },
}