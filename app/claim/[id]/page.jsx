'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { stripePromise } from '@/lib/stripe'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'

function ClaimForm({ cable, user, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  const handlePay = async () => {
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    // Submit the Elements form first
    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message)
      setLoading(false)
      return
    }

    // Confirm the payment
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (stripeError) {
      setError(stripeError.message)
      setLoading(false)
      return
    }

    if (paymentIntent && (paymentIntent.status === 'requires_capture' || paymentIntent.status === 'succeeded')) {
      // Save claim to Supabase
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

      const { error: claimError } = await supabase.from('claims').insert({
        cable_id: cable.id,
        claimer_id: user.id,
        stripe_payment_intent: paymentIntent.id,
        status: 'pending',
        expires_at: expiresAt,
      })

      if (claimError) {
        setError('Payment went through but claim failed to save. Please contact support with payment ID: ' + paymentIntent.id)
        setLoading(false)
        return
      }

      // Mark cable as reserved
      await supabase.from('cables')
        .update({ status: 'reserved' })
        .eq('id', cable.id)

      router.push(`/claim/${cable.id}/confirmed`)
    } else {
      setError('Payment did not complete. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={styles.formWrap}>
      <div style={styles.summary}>
        <p style={styles.summaryTitle}>Order summary</p>
        <div style={styles.summaryRow}>
          <span>{cable.cable_type}</span>
          <span>Free</span>
        </div>
        <div style={styles.summaryRow}>
          <span>Platform fee</span>
          <span>$1.00</span>
        </div>
        <div style={{ ...styles.summaryRow, ...styles.summaryTotal }}>
          <span>Total today</span>
          <span>$1.00</span>
        </div>
      </div>

      <PaymentElement />

      <div style={styles.trustNote}>
        🔒 Your $1 is held securely and only charged once both parties confirm the handoff. Auto-released in 72 hours if no response.
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <button
        style={loading ? styles.btnDisabled : styles.btn}
        onClick={handlePay}
        disabled={loading || !stripe}
      >
        {loading ? 'Processing...' : 'Pay $1 and reserve →'}
      </button>

      <p style={styles.footerNote}>
        By claiming, you agree to arrange pickup within 48 hours. Repeated no-shows may result in account suspension.
      </p>
    </div>
  )
}

export default function ClaimPage() {
  const [cable, setCable] = useState(null)
  const [user, setUser] = useState(null)
  const [clientSecret, setClientSecret] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { id } = useParams()
  // Track if we already created a PaymentIntent to avoid duplicates
  const intentCreated = useRef(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: cable, error: cableError } = await supabase
        .from('cables')
        .select('*, profiles(full_name)')
        .eq('id', id)
        .single()

      if (cableError || !cable) { router.push('/browse'); return }

      if (cable.status !== 'available') {
        setError('This cable has already been claimed by someone else.')
        setLoading(false)
        return
      }

      if (cable.user_id === user.id) {
        setError("You can't claim your own cable.")
        setLoading(false)
        return
      }

      setCable(cable)

      // Guard against double-creating PaymentIntents
      if (intentCreated.current) return
      intentCreated.current = true

      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cableId: id, userId: user.id })
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setLoading(false)
        return
      }

      setClientSecret(data.clientSecret)
      setLoading(false)
    }

    init()
  }, [id])

  if (loading) return (
    <div style={styles.centered}>
      <p style={styles.loadingText}>Setting up payment...</p>
    </div>
  )

  if (error) return (
    <div style={styles.centered}>
      <p style={styles.errorBox}>{error}</p>
      <button style={styles.btn} onClick={() => router.push('/browse')}>
        Back to browse
      </button>
    </div>
  )

  // Only render Elements once clientSecret is set and stable
  if (!clientSecret) return (
    <div style={styles.centered}>
      <p style={styles.loadingText}>Preparing payment form...</p>
    </div>
  )

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.back()}>← Back</button>
        <span style={styles.title}>Claim cable</span>
        <span />
      </div>

      <div style={styles.cablePreview}>
        <div style={styles.cableIcon}>🔌</div>
        <div>
          <div style={styles.cableType}>{cable.cable_type}</div>
          <div style={styles.cableMeta}>{cable.length} · {cable.condition}</div>
          <div style={styles.cableGiver}>
            From {cable.profiles?.full_name || 'Anonymous'}
          </div>
        </div>
      </div>

      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: { theme: 'stripe' }
        }}
      >
        <ClaimForm cable={cable} user={user} />
      </Elements>
    </div>
  )
}

const styles = {
  page: { maxWidth: 480, margin: '0 auto', padding: '0 16px 60px', fontFamily: 'system-ui, sans-serif' },
  centered: { maxWidth: 480, margin: '80px auto', padding: '0 16px', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #eee', marginBottom: 20 },
  backBtn: { background: 'none', border: 'none', fontSize: 15, color: '#2a7c4f', cursor: 'pointer', fontFamily: 'inherit' },
  title: { fontSize: 17, fontWeight: 500 },
  cablePreview: { display: 'flex', gap: 14, alignItems: 'center', background: '#f9f9f9', borderRadius: 12, padding: 14, marginBottom: 20 },
  cableIcon: { fontSize: 36, width: 56, height: 56, background: '#e8f5ee', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cableType: { fontSize: 16, fontWeight: 500 },
  cableMeta: { fontSize: 13, color: '#888', marginTop: 2 },
  cableGiver: { fontSize: 13, color: '#2a7c4f', marginTop: 4 },
  formWrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  summary: { background: '#f9f9f9', borderRadius: 12, padding: '14px 16px' },
  summaryTitle: { fontSize: 12, color: '#999', fontWeight: 500, marginBottom: 10 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#555', padding: '3px 0' },
  summaryTotal: { fontWeight: 500, color: '#111', borderTop: '1px solid #eee', marginTop: 8, paddingTop: 10 },
  trustNote: { background: '#e8f5ee', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#1a5c36', lineHeight: 1.6 },
  btn: { background: '#2a7c4f', color: '#fff', border: 'none', borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  btnDisabled: { background: '#a8d5bc', color: '#fff', border: 'none', borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 500, cursor: 'not-allowed', fontFamily: 'inherit' },
  error: { color: '#c0392b', fontSize: 13, background: '#fdf0f0', padding: '10px 12px', borderRadius: 8 },
  errorBox: { color: '#c0392b', fontSize: 14, background: '#fdf0f0', padding: '14px 16px', borderRadius: 10, textAlign: 'center' },
  loadingText: { color: '#888', fontSize: 15 },
  footerNote: { textAlign: 'center', fontSize: 12, color: '#999', lineHeight: 1.5 },
}