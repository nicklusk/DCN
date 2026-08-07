import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Multiple independent mirrors — different hosting providers, so if one
// is blocking cloud/datacenter IPs, the others likely aren't
const OVERPASS_MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
]

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

async function queryOverpassWithFallback(query) {
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const res = await fetch(mirror, {
        method: 'POST',
        body: query,
        headers: { 'Content-Type': 'text/plain' },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        console.log(`Overpass succeeded via ${mirror}`)
        return { data, mirror, error: null }
      }
      console.error(`Mirror ${mirror} returned status ${res.status}`)
    } catch (err) {
      console.error(`Mirror ${mirror} failed:`, err.message)
    }
  }
  return { data: null, mirror: null, error: 'All Overpass mirrors failed' }
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

    const overpassQuery = `
      [out:json][timeout:15];
      (
        node["amenity"="cafe"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"="library"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"="coworking_space"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"="device_charging_station"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      );
      out body 100;
    `

    const { data: osmData, mirror, error: osmError } = await queryOverpassWithFallback(overpassQuery)

    let osmStations = []
    if (osmData) {
      osmStations = (osmData.elements || [])
        .filter(el => el.tags?.name)
        .map(el => {
          const isConfirmedCharging = el.tags?.amenity === 'device_charging_station'
          return {
            id: `osm-${el.id}`,
            source: 'osm',
            confidence: isConfirmedCharging ? 'confirmed' : 'likely',
            name: el.tags.name,
            description: isConfirmedCharging
              ? 'Dedicated device charging station'
              : el.tags.amenity === 'cafe'
              ? 'Cafe — outlets not confirmed'
              : el.tags.amenity === 'library'
              ? 'Public library — outlets common but not confirmed'
              : 'Coworking space — outlets likely',
            lat: el.lat,
            lng: el.lon,
            location_type: el.tags.amenity === 'device_charging_station' ? 'charging'
              : el.tags.amenity === 'cafe' ? 'cafe'
              : el.tags.amenity === 'library' ? 'library'
              : 'coworking',
            verified: isConfirmedCharging,
            upvotes: null,
          }
        })
    }

    const { data: userStations, error: dbError } = await supabase
      .from('charging_stations')
      .select('*')
      .gte('lat', bbox.south)
      .lte('lat', bbox.north)
      .gte('lng', bbox.west)
      .lte('lng', bbox.east)

    if (dbError) console.error('Supabase fetch error:', dbError)

    const formattedUserStations = (userStations || []).map(s => ({
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

    return NextResponse.json({
      stations: [...osmStations, ...formattedUserStations],
      debug: {
        osmCount: osmStations.length,
        userCount: formattedUserStations.length,
        mirrorUsed: mirror,
        osmError,
      }
    })

  } catch (err) {
    console.error('Charging stations fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch charging stations' }, { status: 500 })
  }
}