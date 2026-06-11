'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, type User } from '@/lib/auth';
import api from '@/lib/api';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, ChevronRight, X, Loader } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type Tab = 'todo' | 'done' | 'progress' | 'remark';

interface Bin {
  id: string;
  address: string;
  neighborhood: string | null;
  type: string;
  collectedToday: boolean;
  collectedAt: string | null;
  collectedBy: string | null;
}

interface Remark {
  binId: string;
  type: string;
  description: string;
}

const REMARK_TYPES = [
  { value: 'dechire', label: 'Déchirée' },
  { value: 'degrade', label: 'Dégradée' },
  { value: 'debordant', label: 'Débordante' },
  { value: 'manquant', label: 'Manquante' },
  { value: 'autre', label: 'Autre' },
];

export default function TourneePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [bins, setBins] = useState<Bin[]>([]);
  const [tab, setTab] = useState<Tab>('todo');
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState<string | null>(null);
  const [confirmBin, setConfirmBin] = useState<Bin | null>(null);
  const [remarkBin, setRemarkBin] = useState<Bin | null>(null);
  const [remark, setRemark] = useState<Remark>({ binId: '', type: 'dechire', description: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    const u = getStoredUser();
    if (!u) { router.replace('/login'); return; }
    setUser(u);
    fetchBins();
    const interval = setInterval(fetchBins, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchBins() {
    try {
      const { data } = await api.get('/collections/stats/map');
      setBins(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleCollect(bin: Bin) {
    setCollecting(bin.id);
    setError('');
    try {
      const pos = await getGPS();
      await api.post('/collections', {
        binId: bin.id,
        gpsLatitude: pos.coords.latitude,
        gpsLongitude: pos.coords.longitude,
        gpsAccuracy: pos.coords.accuracy,
      });
      setConfirmBin(null);
      await fetchBins();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la collecte');
    } finally {
      setCollecting(null);
    }
  }

  async function handleRemark(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/remarks', remark);
      setRemarkBin(null);
      setRemark({ binId: '', type: 'dechire', description: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur');
    }
  }

  function getGPS(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS non disponible'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  }

  const myBins = bins; // Already filtered server-side for technicien
  const todo = myBins.filter((b) => !b.collectedToday);
  const done = myBins.filter((b) => b.collectedToday);
  const progressPercent = myBins.length > 0 ? Math.round((done.length / myBins.length) * 100) : 0;

  const tabConfig: { key: Tab; label: string; count?: number }[] = [
    { key: 'todo', label: 'À faire', count: todo.length },
    { key: 'done', label: 'Déjà fait', count: done.length },
    { key: 'progress', label: 'Progression' },
    { key: 'remark', label: 'Remarque' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="animate-spin text-green-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-green-700 text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">LaRonde</h1>
            <p className="text-green-200 text-sm">{user?.firstName} {user?.lastName}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-2xl">{progressPercent}%</p>
            <p className="text-green-200 text-xs">{done.length}/{myBins.length} collectées</p>
          </div>
        </div>
        <div className="mt-3 bg-green-600 rounded-full h-2">
          <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-200">
        {tabConfig.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              tab === key ? 'text-green-700 border-b-2 border-green-600' : 'text-gray-500'
            }`}
          >
            {label}
            {count !== undefined && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${tab === key ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError('')}><X size={14} /></button>
          </div>
        )}

        {tab === 'todo' && (
          <div className="space-y-3">
            {todo.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 size={48} className="mx-auto text-green-400 mb-3" />
                <p className="text-gray-500 font-medium">Tournée terminée !</p>
              </div>
            ) : todo.map((bin) => (
              <div key={bin.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{bin.address}</p>
                    {bin.neighborhood && <p className="text-xs text-gray-400 mt-0.5">{bin.neighborhood}</p>}
                    <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{bin.type}</span>
                  </div>
                  <button
                    onClick={() => setConfirmBin(bin)}
                    className="shrink-0 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1"
                  >
                    Collecter <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'done' && (
          <div className="space-y-2">
            {done.length === 0 ? (
              <p className="text-center text-gray-400 py-12">Aucune collecte pour l'instant</p>
            ) : done.map((bin) => (
              <div key={bin.id} className="bg-white rounded-xl border border-green-100 p-4 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{bin.address}</p>
                  <p className="text-xs text-gray-400">
                    {bin.collectedAt ? format(new Date(bin.collectedAt), 'HH:mm', { locale: fr }) : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'progress' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Progression totale</p>
              <p className="text-4xl font-bold text-green-600">{progressPercent}%</p>
              <div className="mt-3 bg-gray-100 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="text-sm text-gray-500 mt-2">{done.length} / {myBins.length} poubelles</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <Clock size={24} className="mx-auto text-orange-400 mb-2" />
                <p className="text-2xl font-bold text-gray-800">{todo.length}</p>
                <p className="text-xs text-gray-400">Restantes</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <TrendingUp size={24} className="mx-auto text-green-400 mb-2" />
                <p className="text-2xl font-bold text-gray-800">{done.length}</p>
                <p className="text-xs text-gray-400">Collectées</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'remark' && (
          <div>
            <p className="text-sm text-gray-500 mb-3">Signaler un problème sur une poubelle</p>
            <form onSubmit={handleRemark} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Poubelle</label>
                <select
                  required
                  value={remark.binId}
                  onChange={e => setRemark(r => ({ ...r, binId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">-- Choisir une poubelle --</option>
                  {myBins.map(b => (
                    <option key={b.id} value={b.id}>{b.address}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Type de problème</label>
                <select
                  value={remark.type}
                  onChange={e => setRemark(r => ({ ...r, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {REMARK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Description (optionnel)</label>
                <textarea
                  value={remark.description}
                  onChange={e => setRemark(r => ({ ...r, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Décrivez le problème..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2"
              >
                <AlertTriangle size={16} />
                Signaler
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {confirmBin && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-6">
            <h2 className="font-bold text-lg mb-2">Confirmer la collecte</h2>
            <p className="text-gray-600 text-sm mb-1">{confirmBin.address}</p>
            {confirmBin.neighborhood && <p className="text-gray-400 text-sm mb-4">{confirmBin.neighborhood}</p>}
            <p className="text-sm text-gray-500 mb-5">Votre position GPS sera vérifiée.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmBin(null)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={() => handleCollect(confirmBin)}
                disabled={!!collecting}
                className="flex-1 bg-green-600 text-white rounded-xl py-3 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {collecting === confirmBin.id ? (
                  <><Loader size={16} className="animate-spin" /> GPS...</>
                ) : (
                  <><CheckCircle2 size={16} /> Marquer vidée</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

