'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/auth';
import Navbar from '@/components/ui/Navbar';
import { useToast } from '@/components/ui/Toast';
import { useSSE } from '@/hooks/useSSE';
import api from '@/lib/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Trash2, CheckCircle, Clock, AlertTriangle, FileText, Wifi } from 'lucide-react';

interface DashboardStats {
  today: { total: number; collected: number; remaining: number; progressPercent: number };
  openRemarks: number;
  recentCollections: { id: string; binAddress: string; agentName: string; collectedAt: string }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (!user || user.role !== 'chef') { router.replace('/login'); return; }
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/collections/stats/dashboard');
      setStats(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  // Temps réel SSE
  useSSE({
    collection: (data) => {
      toast('success', 'Collecte enregistrée', `${data.binAddress} — ${data.agentName || 'Agent'}`);
      setConnected(true);
      fetchStats();
    },
    remark: (data) => {
      toast('warning', 'Nouvelle remarque', `Poubelle signalée : ${data.type}`);
      fetchStats();
    },
  }, true);

  async function downloadReport() {
    setReportLoading(true);
    try {
      const now = new Date();
      const res = await api.post('/reports/monthly', {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      }, { responseType: 'blob' });

      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LaRonde-rapport-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast('success', 'Rapport téléchargé', 'Le PDF a été généré et envoyé par email');
    } catch {
      toast('error', 'Erreur', 'Impossible de générer le rapport');
    } finally {
      setReportLoading(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Chargement...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
            <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              <Wifi size={12} />
              {connected ? 'Temps réel actif' : 'Connexion...'}
            </div>
            <button
              onClick={downloadReport}
              disabled={reportLoading}
              className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              <FileText size={15} />
              {reportLoading ? 'Génération...' : 'Rapport PDF'}
            </button>
          </div>
        </div>

        {/* Compteurs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Trash2 className="text-blue-500" size={22} />} label="Total poubelles" value={stats?.today.total ?? 0} bg="bg-blue-50" />
          <StatCard icon={<CheckCircle className="text-green-500" size={22} />} label="Collectées" value={stats?.today.collected ?? 0} bg="bg-green-50" />
          <StatCard icon={<Clock className="text-orange-500" size={22} />} label="Restantes" value={stats?.today.remaining ?? 0} bg="bg-orange-50" />
          <StatCard icon={<AlertTriangle className="text-red-500" size={22} />} label="Remarques ouvertes" value={stats?.openRemarks ?? 0} bg="bg-red-50" />
        </div>

        {/* Barre de progression */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-700">Progression du jour</span>
            <span className="text-lg font-bold text-green-600">{stats?.today.progressPercent ?? 0}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4">
            <div
              className="bg-green-500 h-4 rounded-full transition-all duration-700"
              style={{ width: `${stats?.today.progressPercent ?? 0}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {stats?.today.collected} / {stats?.today.total} poubelles collectées
          </p>
        </div>

        {/* Dernières collectes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Dernières collectes</h2>
          {!stats?.recentCollections?.length ? (
            <p className="text-gray-400 text-sm">Aucune collecte aujourd'hui</p>
          ) : (
            <div className="space-y-0">
              {stats.recentCollections.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.binAddress}</p>
                    <p className="text-xs text-gray-400">par {c.agentName}</p>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">
                    {format(new Date(c.collectedAt), 'HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
      <div>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

