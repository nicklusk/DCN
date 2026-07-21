import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const { claimId } = await req.json()

    // Get the claim
    const { data: claim } = await supabase
      .from('claims')
      .select('*, cables(*)')
      .eq('id', claimId)
      .single()

    if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })

    // Capture the held payment
    await stripe.paymentIntents.capture(claim.stripe_payment_intent)

    // Mark claim as complete
    await supabase.from('claims')
      .update({ status: 'completed' })
      .eq('id', claimId)

    // Delete the cable listing
    await supabase.from('cables')
      .delete()
      .eq('id', claim.cable_id)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Capture error:', err)
    return NextResponse.json({ error: 'Capture failed' }, { status: 500 })
  }
}