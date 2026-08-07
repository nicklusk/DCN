const fetchStations = async (lat, lng) => {
  setLoading(true)
  console.log('Fetching stations for:', lat, lng)

  const radius = 3
  const latDelta = radius / 69
  const lngDelta = radius / (69 * Math.cos(lat * Math.PI / 180))
  const bbox = {
    south: lat - latDelta,
    north: lat + latDelta,
    west: lng - lngDelta,
    east: lng + lngDelta,
  }

  let osmStations = []
  try {
    const overpassQuery = `
      [out:json][timeout:20];
      (
        node["amenity"="cafe"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"="library"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"="coworking_space"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"="device_charging_station"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      );
      out body 100;
    `

    const osmRes = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
      headers: { 'Content-Type': 'text/plain' },
    })

    if (osmRes.ok) {
      const osmData = await osmRes.json()
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
    } else {
      console.error('Overpass returned status', osmRes.status)
    }
  } catch (osmErr) {
    console.error('OSM fetch failed (client-side):', osmErr)
  }

  // Fetch user-submitted stations from our own API (this part stays server-side, Supabase is fine)
  let userStations = []
  try {
    const res = await fetch(`/api/charging-stations/user-nearby?lat=${lat}&lng=${lng}&radius=${radius}`)
    const data = await res.json()
    userStations = data.stations || []
  } catch (err) {
    console.error('User stations fetch failed:', err)
  }

  console.log('OSM stations:', osmStations.length, 'User stations:', userStations.length)
  setStations([...osmStations, ...userStations])
  setLoading(false)
}