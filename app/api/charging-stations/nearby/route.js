import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Rough conversion: 1 degree latitude ≈ 69 miles
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
    const radius = parseFloat(searchParams.get('radius')) || 5

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
    }

    const bbox = boundingBox(lat, lng, radius)

    // Query OpenStreetMap's Overpass API for existing tagged charging stations
    const overpassQuery = `
      [out:json][timeout:15];
      (
        node["amenity"="device_charging_station"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"="charging_station"]["fee"!~"."](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      );
      out body;
    `

    let osmStations = []
    try {
      const osmRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
        headers: { 'Content-Type': 'text/plain' },
      })

      if (osmRes.ok) {
        const osmData = await osmRes.json()
        osmStations = (osmData.elements || []).map(el => ({
          id: `osm-${el.id}`,
          source: 'osm',
          name: el.tags?.name || 'Charging station',
          description: el.tags?.description || null,
          lat: el.lat,
          lng: el.lon,
          location_type: el.tags?.power_supply || 'public',
          verified: true,
          upvotes: null,
        }))
      }
    } catch (osmErr) {
      console.error('OSM Overpass fetch failed:', osmErr)
      // Continue without OSM data rather than failing the whole request
    }

    // Query user-submitted stations from Supabase within the same bounding box
    const { data: userStations, error: dbError } = await supabase
      .from('charging_stations')
      .select('*')
      .gte('lat', bbox.south)
      .lte('lat', bbox.north)
      .gte('lng', bbox.west)
      .lte('lng', bbox.east)

    if (dbError) {
      console.error('Supabase fetch error:', dbError)
    }

    const formattedUserStations = (userStations || []).map(s => ({
      id: s.id,
      source: 'user',
      name: s.name,
      description: s.description,
      lat: s.lat,
      lng: s.lng,
      location_type: s.location_type,
      verified: s.verified,
      upvotes: s.upvotes,
    }))

    return NextResponse.json({
      stations: [...osmStations, ...formattedUserStations],
    })

  } catch (err) {
    console.error('Charging stations fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch charging stations' }, { status: 500 })
  }
}