'use client';
import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';

export interface MapBin {
  id: string;
  address: string;
  neighborhood: string | null;
  latitude: number;
  longitude: number;
  type: string;
  collectedToday: boolean;
  collectedAt: string | null;
  collectedBy: string | null;
  assignedAgent: string | null;
}

interface Props {
  bins: MapBin[];
  center?: [number, number];
}

export default function BinMap({ bins, center = [48.8566, 2.3522] }: Props) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current).setView(center, 14);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      bins.forEach((bin) => {
        const color = bin.collectedToday ? '#16a34a' : '#ef4444';
        const icon = L.divIcon({
          html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
          className: '',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const popup = `
          <div style="min-width:180px;font-family:sans-serif;font-size:13px">
            <p style="font-weight:600;margin-bottom:4px">${bin.address}</p>
            ${bin.neighborhood ? `<p style="color:#6b7280;margin-bottom:4px">${bin.neighborhood}</p>` : ''}
            <p style="margin-bottom:2px">Type : <strong>${bin.type}</strong></p>
            ${bin.assignedAgent ? `<p style="margin-bottom:2px">Agent : ${bin.assignedAgent}</p>` : ''}
            ${bin.collectedToday
              ? `<p style="color:#16a34a;font-weight:600;margin-top:6px">✓ Collectée à ${new Date(bin.collectedAt!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} par ${bin.collectedBy}</p>`
              : `<p style="color:#ef4444;font-weight:600;margin-top:6px">⏳ Non collectée</p>`
            }
          </div>
        `;

        L.marker([bin.latitude, bin.longitude], { icon })
          .bindPopup(popup)
          .addTo(map);
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when bins data changes
  useEffect(() => {
    if (!mapRef.current) return;
    // Markers are static after init for simplicity; full re-render on hard refresh
  }, [bins]);

  return <div ref={containerRef} className="w-full h-full rounded-xl" />;
}

