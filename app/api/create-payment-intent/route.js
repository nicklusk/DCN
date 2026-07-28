import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyGiver } from '@/lib/notify'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Server-side Supabase client using service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const { cableId, userId } = await req.json()

    // Verify the cable exists and is still available
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

    // Create a PaymentIntent for $1.00, not captured yet
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100, // $1.00 in cents
      currency: 'usd',
      capture_method: 'manual', // holds the charge, captures only on confirmation
      metadata: {
        cable_id: cableId,
        claimer_id: userId,
        cable_type: cable.cable_type,
      }
    })

    // Add this after the PaymentIntent is created, before the return
    const { data: giver } = await supabase
      .from('profiles')
      .select('full_name, email, phone, notify_email, notify_sms')
      .eq('id', cable.user_id)
      .single()

    const { data: claimer } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()

    await notifyGiver({ giver, cable, claimer })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })

  } catch (err) {
    console.error('Stripe error:', err)
    return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 })
  }
}