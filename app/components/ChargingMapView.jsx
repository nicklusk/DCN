'use client'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet's default marker icons, which break under Next.js bundling
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const osmIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const userIcon = new L.Icon({
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

export default function ChargingMapView({ center, stations, onMapClick, newStation }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersLayerRef = useRef(null)

  useEffect(() => {
    if (mapInstanceRef.current) return // already initialized

    const map = L.map(mapRef.current).setView([center.lat, center.lng], 13)

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

  // Recenter map when center prop changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([center.lat, center.lng], 13)
    }
  }, [center])

  // Redraw markers when stations change
  useEffect(() => {
    if (!markersLayerRef.current) return
    markersLayerRef.current.clearLayers()

    stations.forEach(station => {
      const icon = station.source === 'osm' ? osmIcon : userIcon
      const marker = L.marker([station.lat, station.lng], { icon })

      const popupHtml = `
        <div style="font-family:system-ui,sans-serif;min-width:160px">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">${escapeHtml(station.name)}</div>
          ${station.description ? `<div style="font-size:12px;color:#666;margin-bottom:6px">${escapeHtml(station.description)}</div>` : ''}
          <div style="font-size:11px;color:${station.source === 'osm' ? '#1a3c7c' : '#1a5c36'}">
            ${station.source === 'osm' ? '📍 OpenStreetMap' : '👥 Community added'}
          </div>
        </div>
      `
      marker.bindPopup(popupHtml)
      marker.addTo(markersLayerRef.current)
    })

    // Show a pin for the new station being added, if any
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