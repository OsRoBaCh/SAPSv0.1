'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Next.js
const fixLeafletIcon = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
};

interface MapComponentProps {
  center: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    title: string;
    description?: string;
    onClick?: () => void;
  }>;
  onLocationSelect?: (lat: number, lon: number) => void;
  interactive?: boolean;
}

function LocationMarker({ onLocationSelect }: { onLocationSelect?: (lat: number, lon: number) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMapEvents({
    click(e) {
      if (onLocationSelect) {
        setPosition(e.latlng);
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return position === null ? null : (
    <Marker position={position}>
      <Popup>Local selecionado</Popup>
    </Marker>
  );
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function MapComponent({ 
  center, 
  zoom = 13, 
  markers = [], 
  onLocationSelect,
  interactive = true 
}: MapComponentProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    fixLeafletIcon();
    // Use a microtask to avoid synchronous setState in effect warning
    Promise.resolve().then(() => setIsMounted(true));
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center rounded-3xl">
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">A carregar mapa...</p>
      </div>
    );
  }

  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      scrollWheelZoom={interactive}
      className="w-full h-full rounded-3xl overflow-hidden z-10"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <ChangeView center={center} zoom={zoom} />

      {markers.map((marker, idx) => (
        <Marker 
          key={idx} 
          position={marker.position}
          eventHandlers={{
            click: () => marker.onClick?.(),
          }}
        >
          <Popup>
            <div className="p-1">
              <h3 className="font-bold text-slate-900">{marker.title}</h3>
              {marker.description && <p className="text-xs text-slate-500 mt-1">{marker.description}</p>}
            </div>
          </Popup>
        </Marker>
      ))}

      {onLocationSelect && <LocationMarker onLocationSelect={onLocationSelect} />}
    </MapContainer>
  );
}
