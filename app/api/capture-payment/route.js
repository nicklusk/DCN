import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  try {
    // Verify env vars are present
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Missing Stripe key' }, { status: 500 })
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Missing Supabase service role key' }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    // Create service role client inside the handler
    // so it always picks up the latest env vars
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { claimId } = await req.json()
    console.log('Capturing payment for claim:', claimId)

    // Get the claim
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('*, cables(*)')
      .eq('id', claimId)
      .single()

    if (claimError || !claim) {
      console.error('Claim fetch error:', claimError)
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
    }

    console.log('Found claim:', claim.id, 'cable:', claim.cable_id)

    // Capture the held Stripe payment
    const captured = await stripe.paymentIntents.capture(
      claim.stripe_payment_intent
    )
    console.log('Stripe capture status:', captured.status)

    // Mark claim as completed
    const { error: claimUpdateError } = await supabase
      .from('claims')
      .update({ status: 'completed' })
      .eq('id', claimId)

    if (claimUpdateError) {
      console.error('Claim update error:', claimUpdateError)
      return NextResponse.json({ error: 'Failed to update claim' }, { status: 500 })
    }

    // Delete the cable listing
    const { error: deleteError } = await supabase
      .from('cables')
      .delete()
      .eq('id', claim.cable_id)

    if (deleteError) {
      console.error('Cable delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete cable' }, { status: 500 })
    }

    console.log('Transaction complete — cable deleted')
    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Capture payment error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}