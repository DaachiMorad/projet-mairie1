'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/auth';
import Navbar from '@/components/ui/Navbar';
import api from '@/lib/api';
import dynamic from 'next/dynamic';
import type { MapBin } from '@/components/map/BinMap';

const BinMap = dynamic(() => import('@/components/map/BinMap'), { ssr: false });

export default function CartePage() {
  const router = useRouter();
  const [bins, setBins] = useState<MapBin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'collected' | 'remaining'>('all');

  useEffect(() => {
    const user = getStoredUser();
    if (!user || user.role !== 'chef') { router.replace('/login'); return; }
    fetchMapData();
    const interval = setInterval(fetchMapData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchMapData() {
    try {
      const { data } = await api.get('/collections/stats/map');
      setBins(data);
    } finally {
      setLoading(false);
    }
  }

  const filtered = bins.filter((b) => {
    if (filter === 'collected') return b.collectedToday;
    if (filter === 'remaining') return !b.collectedToday;
    return true;
  });

  const collected = bins.filter((b) => b.collectedToday).length;
  const remaining = bins.length - collected;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 py-4 gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-gray-900">Carte des poubelles</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-1 bg-red-100 text-red-700 rounded-full">
              {remaining} restantes
            </span>
            <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">
              {collected} collectées
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {(['all', 'remaining', 'collected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === f ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'Tout' : f === 'remaining' ? 'Restantes' : 'Collectées'}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-[500px] bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-gray-400">Chargement de la carte...</div>
          ) : (
            <BinMap bins={filtered} />
          )}
        </div>
      </main>
    </div>
  );
}

