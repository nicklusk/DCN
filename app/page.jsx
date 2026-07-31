'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Landing() {
  const router = useRouter()

  useEffect(() => {
    // If already logged in, skip landing and go to profile
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.push(`/profile/${data.user.id}`)
    })
  }, [router])

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.logo}>
          Dollar Cable <span style={s.green}>Neighbor</span>
        </div>
        <div style={s.navLinks}>
          <button style={s.ghostBtn} onClick={() => router.push('/login')}>
            Log in
          </button>
          <button style={s.greenBtn} onClick={() => router.push('/signup')}>
            Sign up free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={s.hero}>
        <div style={s.eyebrow}>Free to list · $1 to claim</div>
        <h1 style={s.h1}>
          The cable you need is probably in someone&apos;s drawer right now
        </h1>
        <p style={s.heroSub}>
          Dollar Cable Neighbor connects people who have cables they&apos;ll never
          use with neighbors who need exactly that cable — today.
        </p>
        <div style={s.heroBtns}>
          <button style={s.primaryBtn} onClick={() => router.push('/signup')}>
            Find a cable near me →
          </button>
          <button style={s.secondaryBtn} onClick={() => router.push('/signup')}>
            List a cable for free
          </button>
        </div>
      </div>

      {/* Pitch */}
      <div style={s.pitch}>
        <div style={s.sectionLabel}>The problem we solve</div>
        <p style={s.pitchText}>
          The average household has <span style={s.strong}>over a dozen unused cables</span> in
          a drawer somewhere. Meanwhile, people drive to a store and spend $15 on
          the same cable sitting three blocks away. Dollar Cable Neighbor is a
          neighborhood exchange — list what you have, someone claims it for $1,
          you hand it off. The cable finds a home. The drawer gets lighter.
          Nobody makes a trip to the store.
        </p>
      </div>

      {/* How it works */}
      <div style={s.sectionLabel}>How it works</div>
      <div style={s.steps}>
        {[
          {
            n: 1,
            title: 'List a cable — free, takes 60 seconds',
            desc: 'Choose the cable type, snap a photo, enter your ZIP code, and post. Your listing is immediately visible to people in your area.',
          },
          {
            n: 2,
            title: 'Someone nearby claims it for $1',
            desc: 'The $1 platform fee is paid by the person getting the cable — never you. It\'s held securely and not charged until both of you confirm the handoff.',
          },
          {
            n: 3,
            title: 'Meet up and hand it over',
            desc: 'Message each other to arrange a pickup. Porch drop-offs, parking lots, wherever works. No strangers showing up unannounced.',
          },
          {
            n: 4,
            title: 'Both confirm — done',
            desc: 'Once you both tap confirm, the $1 processes, the listing closes, and the cable has a new home. No response within 72 hours? The hold releases automatically.',
          },
        ].map(step => (
          <div key={step.n} style={s.step}>
            <div style={s.stepNum}>{step.n}</div>
            <div>
              <div style={s.stepTitle}>{step.title}</div>
              <div style={s.stepDesc}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Values */}
      <div style={s.values}>
        {[
          {
            icon: '📍',
            title: 'Truly local',
            desc: 'Search by your location or ZIP code. Most cables are within a few miles.',
          },
          {
            icon: '🔒',
            title: 'Payment held securely',
            desc: 'The $1 is held by Stripe and only released when both parties confirm. No risk to either side.',
          },
          {
            icon: '🌱',
            title: 'Less waste',
            desc: 'Cables that would sit unused for years find a purpose instead of a landfill.',
          },
          {
            icon: '⭐',
            title: 'Community trust',
            desc: 'Ratings, transaction history, and public profiles help you know who you\'re dealing with.',
          },
        ].map(v => (
          <div key={v.title} style={s.valCard}>
            <div style={s.valIcon}>{v.icon}</div>
            <div style={s.valTitle}>{v.title}</div>
            <div style={s.valDesc}>{v.desc}</div>
          </div>
        ))}
      </div>

      {/* Trust */}
      <div style={s.trustBox}>
        <div style={s.trustTitle}>🔐 Your money is protected</div>
        <p style={s.trustDesc}>
          The $1 platform fee is processed by Stripe — the same payment
          infrastructure used by Amazon, Shopify, and millions of other
          businesses. The charge is held, not captured, until both the giver
          and claimer confirm the handoff. If something goes wrong, the hold
          is released and you&apos;re not charged. Repeated no-shows result in
          account suspension.
        </p>
      </div>

      {/* Cable types */}
      <div style={s.sectionLabel}>We support all cable types</div>
      <div style={s.tags}>
        {[
          'USB-A to USB-C', 'USB-C to USB-C', 'Lightning', 'Micro-USB',
          'HDMI', 'DisplayPort', 'DVI-D', 'VGA', '3.5mm audio', 'XLR',
          'MIDI', 'Instrument / guitar', 'Optical (TOSLINK)', 'RCA / composite',
          'Coaxial', 'Speaker wire', 'Ethernet', 'DB9 serial', 'USB-B',
          'USB 3.0', 'Adapters', '+ more',
        ].map(t => (
          <span key={t} style={s.tag}>{t}</span>
        ))}
      </div>
      <button style={{ ...s.ghostBtn, marginBottom: '2.5rem', fontSize: 13 }}
        onClick={() => router.push('/cables')}>
        View the full cable guide →
      </button>

      {/* Final CTA */}
      <div style={s.ctaBlock}>
        <div style={s.ctaTitle}>Someone near you has the cable you need</div>
        <p style={s.ctaSub}>
          Sign up free and browse cables in your area. Listing is always
          free — the $1 fee is only ever paid by the person claiming a cable.
        </p>
        <button style={s.primaryBtn} onClick={() => router.push('/signup')}>
          Create a free account →
        </button>
      </div>

      <div style={s.footer}>
        Dollar Cable Neighbor ·{' '}
        <span style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
          onClick={() => router.push('/cables')}>
          Cable guide
        </span>
      </div>
    </div>
  )
}

const s = {
  page: { maxWidth: 640, margin: '0 auto', padding: '2rem 1rem 4rem', fontFamily: 'system-ui, sans-serif' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.5rem', borderBottom: '0.5px solid var(--border)', marginBottom: '3rem' },
  logo: { fontSize: 17, fontWeight: 500, color: 'var(--text-primary)' },
  green: { color: '#2a7c4f' },
  navLinks: { display: 'flex', gap: 8 },
  ghostBtn: { fontFamily: 'system-ui, sans-serif', fontSize: 13, padding: '7px 16px', borderRadius: 8, border: '0.5px solid var(--border-strong)', background: 'var(--surface-2)', color: 'var(--text-primary)', cursor: 'pointer' },
  greenBtn: { fontFamily: 'system-ui, sans-serif', fontSize: 13, padding: '7px 16px', borderRadius: 8, border: 'none', background: '#2a7c4f', color: '#fff', cursor: 'pointer' },
  hero: { textAlign: 'center', marginBottom: '3rem' },
  eyebrow: { fontSize: 12, fontWeight: 500, color: '#2a7c4f', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 },
  h1: { fontSize: 34, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: 16 },
  heroSub: { fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 28px' },
  heroBtns: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  primaryBtn: { fontFamily: 'system-ui, sans-serif', fontSize: 15, fontWeight: 500, padding: '13px 28px', borderRadius: 10, border: 'none', background: '#2a7c4f', color: '#fff', cursor: 'pointer' },
  secondaryBtn: { fontFamily: 'system-ui, sans-serif', fontSize: 15, padding: '13px 28px', borderRadius: 10, border: '0.5px solid var(--border-strong)', background: 'var(--surface-2)', color: 'var(--text-primary)', cursor: 'pointer' },
  pitch: { background: 'var(--surface-1)', borderRadius: 16, padding: '1.5rem', marginBottom: '2.5rem', border: '0.5px solid var(--border)' },
  sectionLabel: { fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 },
  pitchText: { fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 },
  strong: { color: 'var(--text-primary)', fontWeight: 500 },
  steps: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '2.5rem' },
  step: { display: 'flex', gap: 14, alignItems: 'flex-start', background: 'var(--surface-2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 16 },
  stepNum: { width: 28, height: 28, borderRadius: '50%', background: '#2a7c4f', color: '#fff', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  stepTitle: { fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 },
  stepDesc: { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 },
  values: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: '2.5rem' },
  valCard: { background: 'var(--surface-2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 16 },
  valIcon: { fontSize: 22, marginBottom: 10 },
  valTitle: { fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 },
  valDesc: { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 },
  trustBox: { background: '#e8f5ee', borderRadius: 12, padding: 20, marginBottom: '2.5rem' },
  trustTitle: { fontSize: 15, fontWeight: 500, color: '#1a5c36', marginBottom: 8 },
  trustDesc: { fontSize: 13, color: '#1a5c36', lineHeight: 1.6 },
  tags: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: { fontSize: 12, padding: '4px 12px', borderRadius: 20, border: '0.5px solid var(--border-strong)', color: 'var(--text-secondary)', background: 'var(--surface-2)' },
  ctaBlock: { textAlign: 'center', borderTop: '0.5px solid var(--border)', paddingTop: '2.5rem', marginBottom: '1.5rem' },
  ctaTitle: { fontSize: 22, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 10 },
  ctaSub: { fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6, maxWidth: 440, margin: '0 auto 24px' },
  footer: { textAlign: 'center', paddingTop: '1.5rem', borderTop: '0.5px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' },
}