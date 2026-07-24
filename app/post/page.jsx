'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { resizeImage } from '@/lib/imageUtils'

const CABLE_TYPES = [
  'USB-A to USB-C',
  'USB-A to Micro-USB',
  'USB-A to Mini-USB',
  'USB-C to USB-C',
  'Lightning to USB-A',
  'Lightning to USB-C',
  'HDMI (standard)',
  'Mini HDMI',
  'Micro HDMI',
  'DisplayPort',
  'Mini DisplayPort',
  'DVI-D',
  'VGA',
  '3.5mm Audio',
  'Optical (TOSLINK)',
  'RCA / Composite',
  'Coaxial / Speaker Wire',
  'Ethernet / Cat5e',
  'Ethernet / Cat6',
  'Other (describe in notes)',
]

const LENGTHS = ['Under 3ft', '3ft', '6ft', '10ft', 'Over 10ft', "Don't know"]
const CONDITIONS = ['Like new', 'Good', 'Fair — works fine, shows wear']

export default function PostCable() {
  const [user, setUser] = useState(null)
  const [cableType, setCableType] = useState(CABLE_TYPES[0])
  const [length, setLength] = useState(LENGTHS[2])
  const [condition, setCondition] = useState(CONDITIONS[0])
  const [notes, setNotes] = useState('')
  const [zip, setZip] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else {
        setUser(data.user)
        // Pre-fill ZIP from their profile
        supabase.from('profiles').select('zip').eq('id', data.user.id).single()
          .then(({ data: profile }) => { if (profile?.zip) setZip(profile.zip) })
      }
    })
  }, [])

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

const handleSubmit = async () => {
  if (!zip || zip.length !== 5) {
    setError('Please enter a valid 5-digit ZIP code.')
    return
  }
  setLoading(true)
  setError(null)

  let photoUrl = null
  let thumbUrl = null

  if (photo) {
    const ext = 'jpg'
    const baseName = `${user.id}-${Date.now()}`

    // Upload full-size image
    const fullName = `${baseName}-full.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('cable-photos')
      .upload(fullName, photo)

    if (uploadError) {
      setError('Photo upload failed. Try again or skip the photo.')
      setLoading(false)
      return
    }

    const { data: fullUrlData } = supabase.storage
      .from('cable-photos')
      .getPublicUrl(fullName)
    photoUrl = fullUrlData.publicUrl

    // Generate and upload thumbnail (200x200 max, 80% quality)
    const thumbBlob = await resizeImage(photo, 200, 200, 0.8)
    const thumbName = `${baseName}-thumb.jpg`
    const { error: thumbError } = await supabase.storage
      .from('cable-photos')
      .upload(thumbName, thumbBlob, { contentType: 'image/jpeg' })

    if (!thumbError) {
      const { data: thumbUrlData } = supabase.storage
        .from('cable-photos')
        .getPublicUrl(thumbName)
      thumbUrl = thumbUrlData.publicUrl
    }
  }

  // Save listing with both URLs
  const { error: insertError } = await supabase.from('cables').insert({
    user_id: user.id,
    cable_type: cableType,
    length,
    condition,
    notes,
    zip,
    photo_url: photoUrl,
    thumb_url: thumbUrl,
    status: 'available',
  })

  if (insertError) {
    setError('Something went wrong saving your listing. Try again.')
    setLoading(false)
    return
  }

  await supabase.from('profiles').update({ zip }).eq('id', user.id)
  router.push('/browse?posted=true')
}

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.back()}>← Back</button>
        <span style={styles.title}>Post a cable</span>
        <span />
      </div>

      <div style={styles.form}>

        <div style={styles.group}>
          <label style={styles.label}>Cable type</label>
          <select style={styles.select} value={cableType}
            onChange={e => setCableType(e.target.value)}>
            {CABLE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div style={styles.row}>
          <div style={{ ...styles.group, flex: 1 }}>
            <label style={styles.label}>Length</label>
            <select style={styles.select} value={length}
              onChange={e => setLength(e.target.value)}>
              {LENGTHS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div style={{ ...styles.group, flex: 1 }}>
            <label style={styles.label}>Condition</label>
            <select style={styles.select} value={condition}
              onChange={e => setCondition(e.target.value)}>
              {CONDITIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Your ZIP code</label>
          <input style={styles.input} placeholder="e.g. 29150" value={zip}
            onChange={e => setZip(e.target.value)} maxLength={5} />
          <span style={styles.hint}>Used to show your listing to nearby people. Never shown exactly.</span>
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Notes <span style={styles.optional}>(optional)</span></label>
          <textarea style={styles.textarea}
            placeholder="e.g. Black braided, porch pickup OK, tested and working"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Photo <span style={styles.optional}>(optional but helps)</span></label>
          {photoPreview ? (
            <div style={styles.previewWrap}>
              <img src={photoPreview} alt="Cable preview" style={styles.preview} />
              <button style={styles.removePhoto}
                onClick={() => { setPhoto(null); setPhotoPreview(null) }}>
                Remove photo
              </button>
            </div>
          ) : (
            <div style={styles.uploadBox} onClick={() => fileRef.current.click()}>
              <span style={styles.uploadIcon}>📷</span>
              <span style={styles.uploadText}>Tap to add a photo</span>
              <span style={styles.hint}>JPG or PNG, max 5MB</span>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*"
            style={{ display: 'none' }} onChange={handlePhoto} />
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button style={loading ? styles.btnDisabled : styles.btn}
          onClick={handleSubmit} disabled={loading}>
          {loading ? 'Posting...' : 'Post cable for free →'}
        </button>

        <p style={styles.footerNote}>
          Posting is always free. The $1 platform fee is only paid by the person claiming your cable.
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: { maxWidth: 560, margin: '0 auto', padding: '0 16px 60px', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #eee', marginBottom: 24 },
  backBtn: { background: 'none', border: 'none', fontSize: 15, color: '#2a7c4f', cursor: 'pointer', fontFamily: 'inherit' },
  title: { fontSize: 17, fontWeight: 500 },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  group: { display: 'flex', flexDirection: 'column', gap: 6 },
  row: { display: 'flex', gap: 12 },
  label: { fontSize: 13, fontWeight: 500, color: '#444' },
  optional: { fontWeight: 400, color: '#999' },
  hint: { fontSize: 12, color: '#999', marginTop: 2 },
  select: { padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e5e5', fontSize: 14, fontFamily: 'inherit', background: '#fff', outline: 'none' },
  input: { padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e5e5', fontSize: 14, fontFamily: 'inherit', outline: 'none' },
  textarea: { padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e5e5', fontSize: 14, fontFamily: 'inherit', outline: 'none', height: 80, resize: 'none' },
  uploadBox: { border: '1.5px dashed #ccc', borderRadius: 12, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' },
  uploadIcon: { fontSize: 28 },
  uploadText: { fontSize: 14, color: '#555' },
  previewWrap: { display: 'flex', flexDirection: 'column', gap: 8 },
  preview: { width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10 },
  removePhoto: { background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer', color: '#888', fontFamily: 'inherit', alignSelf: 'flex-start' },
  btn: { background: '#2a7c4f', color: '#fff', border: 'none', borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  btnDisabled: { background: '#a8d5bc', color: '#fff', border: 'none', borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 500, cursor: 'not-allowed', fontFamily: 'inherit' },
  error: { color: '#c0392b', fontSize: 13, background: '#fdf0f0', padding: '10px 12px', borderRadius: 8 },
  footerNote: { textAlign: 'center', fontSize: 13, color: '#999', lineHeight: 1.5 },
}