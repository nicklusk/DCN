'use client'
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const confirmedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const newPinIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

export default function ChargingMapView({ center, stations, onMapClick, newStation, onBoundsChange }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersLayerRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)

  // Refs that always hold the LATEST callback — this is what fixes the
  // stale closure problem, since the map's event listener reads from
  // these refs instead of capturing the function at mount time
  const onMapClickRef = useRef(onMapClick)
  const onBoundsChangeRef = useRef(onBoundsChange)

  // Keep the refs updated on every render
  useEffect(() => {
    onMapClickRef.current = onMapClick
  }, [onMapClick])

  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange
  }, [onBoundsChange])

  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return

    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom: 14,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    markersLayerRef.current = L.layerGroup().addTo(map)

    // Always call through the ref, so this always uses the CURRENT
    // addMode/handler, not whatever it was when the map first mounted
    map.on('click', (e) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng)
      }
    })

    map.on('moveend', () => {
      const c = map.getCenter()
      if (onBoundsChangeRef.current) onBoundsChangeRef.current(c.lat, c.lng)
    })

    mapInstanceRef.current = map
    setMapReady(true)

    setTimeout(() => map.invalidateSize(), 100)

    return () => {
      map.remove()
      mapInstanceRef.current = null
      setMapReady(false)
    }
  }, [])

  useEffect(() => {
    if (mapInstanceRef.current && mapReady && center.forceRecenter) {
      mapInstanceRef.current.setView([center.lat, center.lng], 14)
      setTimeout(() => mapInstanceRef.current.invalidateSize(), 100)
    }
  }, [center, mapReady])

  useEffect(() => {
    if (!markersLayerRef.current || !mapReady) return
    markersLayerRef.current.clearLayers()

    stations.forEach(station => {
      const marker = L.marker([station.lat, station.lng], { icon: confirmedIcon })

      const popupHtml = `
        <div style="font-family:system-ui,sans-serif;min-width:180px">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">${escapeHtml(station.name)}</div>
          ${station.description ? `<div style="font-size:12px;color:#666;margin-bottom:6px">${escapeHtml(station.description)}</div>` : ''}
          <span style="background:#e8f5ee;color:#1a5c36;font-size:11px;padding:2px 8px;border-radius:10px">👥 Community confirmed</span>
        </div>
      `
      marker.bindPopup(popupHtml)
      marker.addTo(markersLayerRef.current)
    })

    if (newStation) {
      L.marker([newStation.lat, newStation.lng], { icon: newPinIcon })
        .bindPopup('New spot — fill out the form to save it')
        .addTo(markersLayerRef.current)
        .openPopup()
    }
  }, [stations, newStation, mapReady])

  return <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: 400 }} />
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}