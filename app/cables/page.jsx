'use client'
import { useRouter } from 'next/navigation'

const cables = [
  {
    id:'usb-a-c', name:'USB-A to USB-C', cat:'USB',
    badge:'Very common', badgeColor:'#e8f5ee', badgeText:'#1a5c36',
    sub:'Charges most modern Android phones, tablets, and accessories',
    devices:'Android phones, Nintendo Switch, headphones, keyboards, mice, most modern accessories',
    howToID:'USB-A end is a flat rectangular plug. USB-C end is small, oval-shaped, and reversible — fits either way up.',
    tip:'If your phone charger has a flat rectangular plug on one end and a small oval on the other, this is it.',
    years:'2014–present', speeds:'Up to 10 Gbps (USB 3.2)'
  },
  {
    id:'usb-c-c', name:'USB-C to USB-C', cat:'USB',
    badge:'Very common', badgeColor:'#e8f5ee', badgeText:'#1a5c36',
    sub:'Charges laptops, newer phones, and carries video on some devices',
    devices:'MacBooks, iPads, Chromebooks, newer Android phones, Steam Deck',
    howToID:'Both ends are identical — small, oval-shaped, and reversible. Neither end has a wrong way.',
    tip:'If both plugs look the same and are small enough to fit either way, you have a USB-C to USB-C cable.',
    years:'2015–present', speeds:'Up to 40 Gbps (USB4)'
  },
  {
    id:'usb-a-micro', name:'USB-A to Micro-USB', cat:'USB',
    badge:'Common', badgeColor:'#e8f5ee', badgeText:'#1a5c36',
    sub:'Older Android charger, still used in some accessories and controllers',
    devices:'Older Android phones, PS4 controllers, Kindle e-readers, Bluetooth speakers, dash cams',
    howToID:'Micro-USB end is very small and trapezoidal — wider at top than bottom. Only fits one way.',
    tip:'If the small end has a slight trapezoid shape and only goes in one way, it\'s Micro-USB.',
    years:'2007–2019', speeds:'Up to 480 Mbps'
  },
  {
    id:'usb-a-mini', name:'USB-A to Mini-USB', cat:'USB',
    badge:'Older', badgeColor:'#fef3e2', badgeText:'#7c4f0f',
    sub:'Older cameras, GPS units, and early MP3 players',
    devices:'Digital cameras, GPS units, older external hard drives, early MP3 players, PS3 controllers',
    howToID:'Mini-USB is slightly larger than Micro-USB with a more rectangular but tapered shape. Often on older digital cameras.',
    tip:'Bigger than Micro-USB but smaller than USB-A. Commonly found on point-and-shoot cameras from the 2000s.',
    years:'2000–2012', speeds:'Up to 480 Mbps'
  },
  {
    id:'lightning', name:'Lightning to USB-A', cat:'Apple',
    badge:'Apple only', badgeColor:'#e8f0fe', badgeText:'#1a3c7c',
    sub:'Charges iPhones up to iPhone 14 and older iPads',
    devices:'iPhone (5 through 14), AirPods, older iPad, iPad mini, Apple Pencil 1st gen',
    howToID:'Lightning is a small, flat, symmetrical connector — slightly narrower than USB-C but looks similar. Reversible.',
    tip:'If it\'s a thin, flat connector smaller than USB-C and only works with Apple devices, it\'s Lightning.',
    years:'2012–2023', speeds:'Up to 480 Mbps'
  },
  {
    id:'lightning-c', name:'Lightning to USB-C', cat:'Apple',
    badge:'Apple only', badgeColor:'#e8f0fe', badgeText:'#1a3c7c',
    sub:'Charges older iPhones from a USB-C power adapter or MacBook',
    devices:'iPhone 5–14 when using a USB-C charger or MacBook',
    howToID:'One end has Lightning (Apple devices), the other has the small oval USB-C plug.',
    tip:'This cable bridges old iPhones to new chargers. Bundled with iPhones 11–14.',
    years:'2015–2023', speeds:'Up to 480 Mbps'
  },
  {
    id:'hdmi', name:'HDMI (full size)', cat:'Video',
    badge:'Very common', badgeColor:'#e8f5ee', badgeText:'#1a5c36',
    sub:'Connects TVs, monitors, gaming consoles, and streaming devices',
    devices:'TVs, monitors, projectors, PS4/PS5, Xbox, Roku, Fire Stick, Blu-ray players',
    howToID:'Trapezoidal shape, wider at top than bottom, with two small notched corners at the bottom. About 14mm wide.',
    tip:'The most common video cable in homes. Squished trapezoid shape with notched bottom corners.',
    years:'2002–present', speeds:'Up to 48 Gbps (HDMI 2.1)'
  },
  {
    id:'mini-hdmi', name:'Mini HDMI', cat:'Video',
    badge:'Less common', badgeColor:'#f5f5f5', badgeText:'#555',
    sub:'Connects cameras and tablets to TVs and monitors',
    devices:'DSLR cameras, some tablets, camcorders, Raspberry Pi',
    howToID:'Looks like a shrunken HDMI — same trapezoidal shape but about half the width (~10mm).',
    tip:'If you have a camera with a tiny HDMI-shaped port, this is the cable.',
    years:'2006–present', speeds:'Up to 10.2 Gbps'
  },
  {
    id:'displayport', name:'DisplayPort', cat:'Video',
    badge:'Common on PCs', badgeColor:'#e8f0fe', badgeText:'#1a3c7c',
    sub:'High-performance monitor cable for desktop PCs and gaming monitors',
    devices:'PC gaming monitors, workstation displays, AMD and Nvidia GPU outputs',
    howToID:'Similar to HDMI but with one angled corner instead of two notched corners. Has a locking click.',
    tip:'One corner cut at 45 degrees (not notched), and it clicks in — that\'s DisplayPort.',
    years:'2008–present', speeds:'Up to 77.4 Gbps (DP 2.1)'
  },
  {
    id:'dvi', name:'DVI-D', cat:'Video',
    badge:'Legacy', badgeColor:'#fdf0f0', badgeText:'#7c1a1a',
    sub:'Older digital monitor connection, pre-HDMI era',
    devices:'Older PC monitors, projectors, some older graphics cards',
    howToID:'Large rectangular connector with a grid of many small pins and a flat blade on one side. White housing is common.',
    tip:'White, large, lots of small pins arranged in rows plus a flat bar — that\'s DVI.',
    years:'1999–2015', speeds:'Up to 9.9 Gbps'
  },
  {
    id:'vga', name:'VGA', cat:'Video',
    badge:'Legacy', badgeColor:'#fdf0f0', badgeText:'#7c1a1a',
    sub:'Analog video only — found on older monitors and projectors',
    devices:'Older monitors, projectors, older laptops, conference room equipment',
    howToID:'Blue trapezoidal connector with 15 pins in 3 rows of 5. Has screws on both sides. Analog only — no audio.',
    tip:'Blue, two screws on the sides, D-shaped housing with 15 pins — that\'s VGA.',
    years:'1987–2015', speeds:'Analog only'
  },
  {
    id:'audio-35', name:'3.5mm audio', cat:'Audio',
    badge:'Universal', badgeColor:'#e8f5ee', badgeText:'#1a5c36',
    sub:'Headphones, speakers, and aux connections',
    devices:'Headphones, earbuds, car aux, speakers, guitar pedals, some microphones',
    howToID:'Round cylindrical plug, 3.5mm in diameter. Two black rings = stereo. Three rings = headset with mic.',
    tip:'Count the black rings: two = stereo audio, three = audio + microphone.',
    years:'1964–present', speeds:'Analog audio'
  },
  {
    id:'optical', name:'Optical (TOSLINK)', cat:'Audio',
    badge:'Hi-fi audio', badgeColor:'#fff8e1', badgeText:'#7c5c1a',
    sub:'Digital audio for soundbars, receivers, and game consoles',
    devices:'Soundbars, AV receivers, PS4/PS5, Xbox, TVs, Blu-ray players',
    howToID:'Square plug with a rounded bottom. Glows red when connected. Plastic cap often covers the port.',
    tip:'If the end glows red and has a plastic cap, it\'s optical audio.',
    years:'1983–present', speeds:'Up to 125 Mbps'
  },
  {
    id:'rca', name:'RCA / Composite', cat:'Audio',
    badge:'Legacy', badgeColor:'#fdf0f0', badgeText:'#7c1a1a',
    sub:'Classic red/white/yellow cable for older TVs and audio equipment',
    devices:'Older TVs, VCRs, DVD players, older game consoles (NES, SNES, N64, PS1/PS2), AV receivers',
    howToID:'Round plugs with a central pin surrounded by a metal ring. Usually red + white (audio) + yellow (video).',
    tip:'Three plugs colored red, white, and yellow. Red and white = audio, yellow = video.',
    years:'1940s–present', speeds:'Analog only'
  },
  {
    id:'coax', name:'Coaxial / Speaker wire', cat:'Audio',
    badge:'Home audio', badgeColor:'#fff8e1', badgeText:'#7c5c1a',
    sub:'Speaker connections and cable TV/antenna signal',
    devices:'Home theater speakers, subwoofers, cable TV, antenna, satellite',
    howToID:'Coaxial: thick round cable with screw-on metal end. Speaker wire: two bare copper wires that clip or screw in.',
    tip:'Screw-on metal collar = coaxial. Bare copper wire going into a clip = speaker wire.',
    years:'1950s–present', speeds:'Analog / RF signal'
  },
  {
    id:'ethernet', name:'Ethernet (RJ-45)', cat:'Network',
    badge:'Networking', badgeColor:'#e8f0fe', badgeText:'#1a3c7c',
    sub:'Wired internet — faster and more reliable than Wi-Fi',
    devices:'Routers, switches, desktop PCs, smart TVs, gaming consoles, NAS drives',
    howToID:'Looks like a wide phone plug with 8 pins visible through clear plastic. Has a locking tab that clicks in.',
    tip:'Chunky phone-jack shape with 8 pins and a locking tab. Cat rating (Cat5e, Cat6) is printed on the cable body.',
    years:'1990s–present', speeds:'Up to 10 Gbps (Cat6A)'
  },
]

const CATS = ['All', 'USB', 'Apple', 'Video', 'Audio', 'Network']

export default function CableGuide() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('All')
  const [open, setOpen] = useState(null)

  const filtered = cables.filter(c => {
    const matchCat = cat === 'All' || c.cat === cat
    const q = search.toLowerCase()
    const matchQ = !q || c.name.toLowerCase().includes(q) ||
      c.devices.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q)
    return matchCat && matchQ
  })

  const byCat = {}
  filtered.forEach(c => {
    if (!byCat[c.cat]) byCat[c.cat] = []
    byCat[c.cat].push(c)
  })

  const toggle = (id) => setOpen(open === id ? null : id)

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.back} onClick={() => router.push('/browse')}>← Browse</button>
        <span style={s.title}>Cable guide</span>
        <span />
      </div>

      <p style={s.intro}>
        Not sure what cable you need? Use this guide to identify connectors by shape, color, and the devices they work with.
      </p>

      <input style={s.search} placeholder="Search by name or device..."
        value={search} onChange={e => setSearch(e.target.value)} />

      <div style={s.chips}>
        {CATS.map(c => (
          <button key={c} style={cat === c ? s.chipOn : s.chip} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      {Object.keys(byCat).length === 0 && (
        <p style={s.empty}>No cables match your search.</p>
      )}

      {Object.entries(byCat).map(([category, items]) => (
        <div key={category}>
          <p style={s.catLabel}>{category}</p>
          <div style={s.list}>
            {items.map(cable => (
              <div key={cable.id} style={open === cable.id ? { ...s.card, ...s.cardOpen } : s.card}
                onClick={() => toggle(cable.id)}>
                <div style={s.cardTop}>
                  <div style={s.cardInfo}>
                    <div style={s.cardName}>{cable.name}</div>
                    <div style={s.cardSub}>{cable.sub}</div>
                    <span style={{ ...s.badge, background: cable.badgeColor, color: cable.badgeText }}>
                      {cable.badge}
                    </span>
                  </div>
                  <span style={{ fontSize: 18, color: '#999', transform: open === cable.id ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</span>
                </div>

                {open === cable.id && (
                  <div style={s.expand}>
                    <div style={s.detailRow}>
                      <span style={s.detailLabel}>Common devices</span>
                      <span style={s.detailVal}>{cable.devices}</span>
                    </div>
                    <div style={s.detailRow}>
                      <span style={s.detailLabel}>How to identify</span>
                      <span style={s.detailVal}>{cable.howToID}</span>
                    </div>
                    <div style={s.tip}>
                      💡 {cable.tip}
                    </div>
                    <div style={s.detailRow}>
                      <span style={s.detailLabel}>Era & speed</span>
                      <span style={s.detailVal}>{cable.years} · {cable.speeds}</span>
                    </div>
                    <button style={s.searchBtn}
                      onClick={e => { e.stopPropagation(); router.push(`/browse?q=${encodeURIComponent(cable.name)}`) }}>
                      Find this cable near me →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

import { useState } from 'react'

const s = {
  page: { maxWidth: 600, margin: '0 auto', padding: '0 16px 60px', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #eee', marginBottom: 16 },
  back: { background: 'none', border: 'none', fontSize: 15, color: '#2a7c4f', cursor: 'pointer', fontFamily: 'inherit' },
  title: { fontSize: 17, fontWeight: 500 },
  intro: { fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 16 },
  search: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e5e5', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 12 },
  chips: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 },
  chip: { fontSize: 12, padding: '5px 14px', borderRadius: 20, border: '1px solid #e5e5e5', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)' },
  chipOn: { fontSize: 12, padding: '5px 14px', borderRadius: 20, border: '1px solid #2a7c4f', background: '#2a7c4f', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' },
  catLabel: { fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '20px 0 10px' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  card: { background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 14, cursor: 'pointer' },
  cardOpen: { border: '1px solid #ccc' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: 500, marginBottom: 3, color: 'var(--text-primary)' },  cardSub: { fontSize: 13, color: '#666', marginBottom: 8, lineHeight: 1.4 },
  badge: { fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500 },
  expand: { marginTop: 14, paddingTop: 14, borderTop: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 12 },
  detailRow: { display: 'flex', flexDirection: 'column', gap: 3 },
  detailLabel: { fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' },
  detailVal: { fontSize: 14, color: '#444', lineHeight: 1.5 },
  tip: { background: '#e8f5ee', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#1a5c36', lineHeight: 1.5 },
  searchBtn: { background: '#2a7c4f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' },
  empty: { textAlign: 'center', color: '#888', padding: '40px 0', fontSize: 15 },
}