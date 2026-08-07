import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function boundingBox(lat, lng, radiusMiles) {
  const latDelta = radiusMiles / 69
  const lngDelta = radiusMiles / (69 * Math.cos(lat * Math.PI / 180))
  return {
    south: lat - latDelta,
    north: lat + latDelta,
    west: lng - lngDelta,
    east: lng + lngDelta,
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const lat = parseFloat(searchParams.get('lat'))
    const lng = parseFloat(searchParams.get('lng'))
    const radius = parseFloat(searchParams.get('radius')) || 3

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
    }

    const bbox = boundingBox(lat, lng, radius)

    const { data: userStations, error } = await supabase
      .from('charging_stations')
      .select('*')
      .gte('lat', bbox.south)
      .lte('lat', bbox.north)
      .gte('lng', bbox.west)
      .lte('lng', bbox.east)

    if (error) {
      console.error('Supabase fetch error:', error)
      return NextResponse.json({ stations: [] })
    }

    const formatted = (userStations || []).map(s => ({
      id: s.id,
      source: 'user',
      confidence: 'confirmed',
      name: s.name,
      description: s.description,
      lat: s.lat,
      lng: s.lng,
      location_type: s.location_type,
      verified: s.verified,
      upvotes: s.upvotes,
    }))

    return NextResponse.json({ stations: formatted })

  } catch (err) {
    console.error('Stations fetch error:', err)
    return NextResponse.json({ stations: [] })
  }
}