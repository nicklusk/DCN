import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { name, description, lat, lng, location_type } = await req.json()

    if (!name || !lat || !lng) {
      return NextResponse.json({ error: 'Name and location are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('charging_stations')
      .insert({
        submitted_by: user.id,
        name,
        description,
        lat,
        lng,
        location_type: location_type || 'other',
      })
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: 'Failed to add station' }, { status: 500 })
    }

    return NextResponse.json({ station: data })

  } catch (err) {
    console.error('Add station error:', err)
    return NextResponse.json({ error: 'Failed to add station' }, { status: 500 })
  }
}