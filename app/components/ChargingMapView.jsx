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

const likelyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
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

    map.on('click', (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    })

    // Fire when the user finishes panning or zooming (not on every frame)
    map.on('moveend', () => {
      const c = map.getCenter()
      if (onBoundsChange) onBoundsChange(c.lat, c.lng)
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

  // Only recenter programmatically (e.g. "Recenter on me" button) —
  // NOT on every render, or it would fight the user's own panning
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
      const icon = station.confidence === 'confirmed' ? confirmedIcon : likelyIcon
      const marker = L.marker([station.lat, station.lng], { icon })

      const badge = station.confidence === 'confirmed'
        ? station.source === 'user'
          ? '<span style="background:#e8f5ee;color:#1a5c36;font-size:11px;padding:2px 8px;border-radius:10px">👥 Community confirmed</span>'
          : '<span style="background:#e8f5ee;color:#1a5c36;font-size:11px;padding:2px 8px;border-radius:10px">✓ Confirmed charging spot</span>'
        : '<span style="background:#f5f5f5;color:#666;font-size:11px;padding:2px 8px;border-radius:10px">Likely — unconfirmed</span>'

      const popupHtml = `
        <div style="font-family:system-ui,sans-serif;min-width:180px">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">${escapeHtml(station.name)}</div>
          ${station.description ? `<div style="font-size:12px;color:#666;margin-bottom:6px">${escapeHtml(station.description)}</div>` : ''}
          ${badge}
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