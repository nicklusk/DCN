import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyGiver } from '@/lib/notify'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Missing Stripe key' }, { status: 500 })
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Missing service role key' }, { status: 500 })
    }

    const { cableId, userId } = await req.json()

    const { data: cable, error } = await supabase
      .from('cables')
      .select('id, cable_type, status, user_id')
      .eq('id', cableId)
      .single()

    if (error || !cable) {
      return NextResponse.json({ error: 'Cable not found' }, { status: 404 })
    }
    if (cable.status !== 'available') {
      return NextResponse.json({ error: 'Cable is no longer available' }, { status: 400 })
    }
    if (cable.user_id === userId) {
      return NextResponse.json({ error: 'You cannot claim your own cable' }, { status: 400 })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100,
      currency: 'usd',
      capture_method: 'manual',
      metadata: {
        cable_id: cableId,
        claimer_id: userId,
        cable_type: cable.cable_type,
      }
    })

    // Fetch giver and claimer profiles for notification
    const [{ data: giver }, { data: claimer }] = await Promise.all([
      supabase.from('profiles')
        .select('full_name, email, phone, notify_email, notify_sms')
        .eq('id', cable.user_id)
        .single(),
      supabase.from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single(),
    ])

    // Fire notification — don't await so it doesn't slow down the payment response
    if (giver && claimer) {
      notifyGiver({ giver, cable, claimer }).catch(err =>
        console.error('Notification error:', err)
      )
    }

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })

  } catch (err) {
    console.error('Stripe error:', err)
    return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 })
  }
}