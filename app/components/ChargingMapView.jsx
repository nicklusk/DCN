'use client'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Green = confirmed (community-added or verified OSM charging tag)
const confirmedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

// Gray = likely, unconfirmed (cafe/library/coworking inferred from OSM tags)
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

export default function ChargingMapView({ center, stations, onMapClick, newStation }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersLayerRef = useRef(null)

  useEffect(() => {
    if (mapInstanceRef.current) return

    const map = L.map(mapRef.current).setView([center.lat, center.lng], 14)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    markersLayerRef.current = L.layerGroup().addTo(map)

    map.on('click', (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    })

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([center.lat, center.lng], 14)
    }
  }, [center])

  useEffect(() => {
    if (!markersLayerRef.current) return
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
  }, [stations, newStation])

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}