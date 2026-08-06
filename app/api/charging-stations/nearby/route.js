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

    // Query places likely to have outlets: cafes, libraries, coworking spaces
    // with wifi — a much larger, real-world dataset than the sparse
    // device_charging_station tag. These are UNVERIFIED — just a strong signal.
    const overpassQuery = `
      [out:json][timeout:20];
      (
        node["amenity"="cafe"]["internet_access"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"="library"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"="coworking_space"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["shop"="coffee"]["internet_access"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"="device_charging_station"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      );
      out body 100;
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
        osmStations = (osmData.elements || [])
          .filter(el => el.tags?.name) // skip unnamed nodes, not useful to show
          .map(el => {
            const isConfirmedCharging = el.tags?.amenity === 'device_charging_station'
            return {
              id: `osm-${el.id}`,
              source: 'osm',
              confidence: isConfirmedCharging ? 'confirmed' : 'likely',
              name: el.tags.name,
              description: describeAmenity(el.tags),
              lat: el.lat,
              lng: el.lon,
              location_type: mapOsmType(el.tags),
              verified: isConfirmedCharging,
              upvotes: null,
            }
          })
      }
    } catch (osmErr) {
      console.error('OSM Overpass fetch failed:', osmErr)
    }

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
    })

  } catch (err) {
    console.error('Charging stations fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch charging stations' }, { status: 500 })
  }
}

function mapOsmType(tags) {
  if (tags.amenity === 'device_charging_station') return 'charging'
  if (tags.amenity === 'cafe' || tags.shop === 'coffee') return 'cafe'
  if (tags.amenity === 'library') return 'library'
  if (tags.amenity === 'coworking_space') return 'coworking'
  return 'other'
}

function describeAmenity(tags) {
  if (tags.amenity === 'device_charging_station') return 'Dedicated device charging station'
  if (tags.amenity === 'cafe' || tags.shop === 'coffee') return 'Cafe with WiFi — outlets not confirmed'
  if (tags.amenity === 'library') return 'Public library — outlets common but not confirmed'
  if (tags.amenity === 'coworking_space') return 'Coworking space — outlets likely'
  return null
}