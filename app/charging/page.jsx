'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'

const MapView = dynamic(() => import('@/app/components/ChargingMapView'), {
  ssr: false,
  loading: () => <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading map...</div>
})

export default function ChargingStationsPage() {
  const [center, setCenter] = useState(null)
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addMode, setAddMode] = useState(false)
  const [newStation, setNewStation] = useState(null)
  const [stationName, setStationName] = useState('')
  const [stationDesc, setStationDesc] = useState('')
  const [stationType, setStationType] = useState('cafe')
  const [submitting, setSubmitting] = useState(false)
  const [searchAreaLabel, setSearchAreaLabel] = useState(null)
  const router = useRouter()
  const fetchTimeoutRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
    })

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude, forceRecenter: true })
        },
        () => {
          setError('Could not detect your location. Pan the map to explore, or your default view is the center of the US.')
          setCenter({ lat: 39.8283, lng: -98.5795, forceRecenter: true })
        }
      )
    } else {
      setCenter({ lat: 39.8283, lng: -98.5795, forceRecenter: true })
    }
  }, [])

  useEffect(() => {
    if (center) fetchStations(center.lat, center.lng)
  }, [center])

  const fetchStations = async (lat, lng) => {
    setLoading(true)
    console.log('Fetching stations for:', lat, lng)

    const radius = 3
    const latDelta = radius / 69
    const lngDelta = radius / (69 * Math.cos(lat * Math.PI / 180))
    const bbox = {
      south: lat - latDelta,
      north: lat + latDelta,
      west: lng - lngDelta,
      east: lng + lngDelta,
    }

    let osmStations = []
    try {
      const overpassQuery = `
        [out:json][timeout:20];
        (
          node["amenity"="cafe"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
          node["amenity"="library"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
          node["amenity"="coworking_space"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
          node["amenity"="device_charging_station"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        );
        out body 100;
      `

      const osmRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
        headers: { 'Content-Type': 'text/plain' },
      })

      if (osmRes.ok) {
        const osmData = await osmRes.json()
        osmStations = (osmData.elements || [])
          .filter(el => el.tags?.name)
          .map(el => {
            const isConfirmedCharging = el.tags?.amenity === 'device_charging_station'
            return {
              id: `osm-${el.id}`,
              source: 'osm',
              confidence: isConfirmedCharging ? 'confirmed' : 'likely',
              name: el.tags.name,
              description: isConfirmedCharging
                ? 'Dedicated device charging station'
                : el.tags.amenity === 'cafe'
                ? 'Cafe — outlets not confirmed'
                : el.tags.amenity === 'library'
                ? 'Public library — outlets common but not confirmed'
                : 'Coworking space — outlets likely',
              lat: el.lat,
              lng: el.lon,
              location_type: el.tags.amenity === 'device_charging_station' ? 'charging'
                : el.tags.amenity === 'cafe' ? 'cafe'
                : el.tags.amenity === 'library' ? 'library'
                : 'coworking',
              verified: isConfirmedCharging,
              upvotes: null,
            }
          })
      } else {
        console.error('Overpass returned status', osmRes.status)
      }
    } catch (osmErr) {
      console.error('OSM fetch failed (client-side):', osmErr)
    }

    // Fetch user-submitted stations from our own API (this part stays server-side, Supabase is fine)
    let userStations = []
    try {
      const res = await fetch(`/api/charging-stations/user-nearby?lat=${lat}&lng=${lng}&radius=${radius}`)
      const data = await res.json()
      userStations = data.stations || []
    } catch (err) {
      console.error('User stations fetch failed:', err)
    }

    console.log('OSM stations:', osmStations.length, 'User stations:', userStations.length)
    setStations([...osmStations, ...userStations])
    setLoading(false)
  }

  // Called when the user finishes panning or zooming the map
  const handleBoundsChange = (lat, lng) => {
    setSearchAreaLabel('Searching this area...')

    // Debounce so rapid panning doesn't fire dozens of API calls
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
    fetchTimeoutRef.current = setTimeout(() => {
      // Update center WITHOUT forceRecenter, so the map doesn't jump —
      // this only updates our data-fetch reference point
      setCenter({ lat, lng, forceRecenter: false })
      setSearchAreaLabel(null)
    }, 600)
  }

  const handleMapClick = (lat, lng) => {
    if (!addMode) return
    setNewStation({ lat, lng })
  }

  const handleSubmitStation = async () => {
    if (!stationName.trim() || !newStation) return
    setSubmitting(true)

    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch('/api/charging-stations/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: stationName,
        description: stationDesc,
        lat: newStation.lat,
        lng: newStation.lng,
        location_type: stationType,
      }),
    })

    const data = await res.json()

    if (data.error) {
      alert('Could not add station: ' + data.error)
    } else {
      setStations(prev => [...prev, { ...data.station, source: 'user', confidence: 'confirmed' }])
      setNewStation(null)
      setStationName('')
      setStationDesc('')
      setAddMode(false)
    }
    setSubmitting(false)
  }

  const handleRecenter = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude, forceRecenter: true })
      })
    }
  }

  if (!center) return (
    <div style={s.centered}><p style={s.muted}>Getting your location...</p></div>
  )

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.push('/browse')}>← Browse</button>
        <span style={s.title}>Charging spots near you</span>
        <span />
      </div>

      {error && <div style={s.errorBanner}>{error}</div>}

      <p style={s.intro}>
        Find public places to charge your devices. Pan or zoom the map to
        explore any area — tap the map to add a spot you know about.
      </p>

      <div style={s.legend}>
        <div style={s.legendItem}>
          <span style={{ ...s.legendDot, background: '#2ecc71' }} />
          <span>Confirmed — community added or verified charging spot</span>
        </div>
        <div style={s.legendItem}>
          <span style={{ ...s.legendDot, background: '#999' }} />
          <span>Likely — cafe, library, or coworking space (outlets not confirmed)</span>
        </div>
      </div>

      <div style={s.controls}>
        <button
          style={addMode ? s.addBtnActive : s.addBtn}
          onClick={() => { setAddMode(!addMode); setNewStation(null) }}
        >
          {addMode ? '✕ Cancel adding' : '+ Add a charging spot'}
        </button>
        <button style={s.ghostBtn} onClick={handleRecenter}>
          📍 Recenter on me
        </button>
      </div>

      {addMode && (
        <div style={s.addHint}>
          Tap anywhere on the map to drop a pin at that location.
        </div>
      )}

      <div style={s.mapWrap}>
        <MapView
          center={center}
          stations={stations}
          onMapClick={handleMapClick}
          newStation={newStation}
          onBoundsChange={handleBoundsChange}
        />
      </div>

      {(loading || searchAreaLabel) && <p style={s.muted}>{searchAreaLabel || 'Loading stations...'}</p>}

      {!loading && !searchAreaLabel && (
        <p style={s.count}>
          {stations.length} charging {stations.length === 1 ? 'spot' : 'spots'} found in this area
        </p>
      )}

      {newStation && (
        <div style={s.formOverlay}>
          <div style={s.formCard}>
            <p style={s.formTitle}>Add this charging spot</p>

            <input
              style={s.input}
              placeholder="Name — e.g. 'Starbucks on Main St'"
              value={stationName}
              onChange={e => setStationName(e.target.value)}
            />

            <select
              style={s.select}
              value={stationType}
              onChange={e => setStationType(e.target.value)}
            >
              <option value="cafe">Cafe / Coffee shop</option>
              <option value="airport">Airport</option>
              <option value="library">Library</option>
              <option value="mall">Mall / Retail</option>
              <option value="restaurant">Restaurant</option>
              <option value="coworking">Coworking space</option>
              <option value="public">Public building</option>
              <option value="other">Other</option>
            </select>

            <textarea
              style={s.textarea}
              placeholder="Notes — e.g. 'Outlets near the window seats, ask staff for the code'"
              value={stationDesc}
              onChange={e => setStationDesc(e.target.value)}
            />

            <div style={s.formActions}>
              <button style={s.cancelBtn} onClick={() => setNewStation(null)}>
                Cancel
              </button>
              <button
                style={submitting || !stationName.trim() ? s.submitBtnDisabled : s.submitBtn}
                onClick={handleSubmitStation}
                disabled={submitting || !stationName.trim()}
              >
                {submitting ? 'Adding...' : 'Add spot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { maxWidth: 700, margin: '0 auto', padding: '0 16px 60px', fontFamily: 'system-ui, sans-serif' },
  centered: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: 16 },
  backBtn: { background: 'none', border: 'none', fontSize: 15, color: '#2a7c4f', cursor: 'pointer', fontFamily: 'inherit' },
  title: { fontSize: 17, fontWeight: 500, color: 'var(--text-primary)' },
  errorBanner: { background: '#fef3e2', color: '#7c4f0f', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 12 },
  intro: { fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 },
  legend: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' },
  legendDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  controls: { display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  addBtn: { background: '#2a7c4f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  addBtnActive: { background: '#c0392b', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  ghostBtn: { background: 'var(--surface-1)', border: '1px solid var(--border-strong)', borderRadius: 10, padding: '10px 16px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)' },
  addHint: { background: '#e8f5ee', color: '#1a5c36', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 10 },
  mapWrap: { borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', height: 420, marginBottom: 12 },
  muted: { color: 'var(--text-secondary)', fontSize: 14 },
  count: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 },
  formOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  formCard: { background: 'var(--surface-2)', borderRadius: 16, padding: 20, maxWidth: 380, width: '100%', display: 'flex', flexDirection: 'column', gap: 12 },
  formTitle: { fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' },
  input: { padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-strong)', fontSize: 14, fontFamily: 'inherit', background: 'var(--surface-2)', color: 'var(--text-primary)', outline: 'none' },
  select: { padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-strong)', fontSize: 14, fontFamily: 'inherit', background: 'var(--surface-2)', color: 'var(--text-primary)' },
  textarea: { padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-strong)', fontSize: 14, fontFamily: 'inherit', background: 'var(--surface-2)', color: 'var(--text-primary)', outline: 'none', height: 70, resize: 'none' },
  formActions: { display: 'flex', gap: 8 },
  cancelBtn: { flex: 1, background: 'none', border: '1px solid var(--border-strong)', borderRadius: 10, padding: 12, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)' },
  submitBtn: { flex: 1, background: '#2a7c4f', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  submitBtnDisabled: { flex: 1, background: '#a8d5bc', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, cursor: 'not-allowed', fontFamily: 'inherit' },
}