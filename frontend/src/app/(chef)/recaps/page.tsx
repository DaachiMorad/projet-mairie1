'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/auth';
import Navbar from '@/components/ui/Navbar';
import api from '@/lib/api';
import { BarChart2, TrendingUp, Users, Trash2, AlertTriangle } from 'lucide-react';

type Period = 'week' | 'month' | 'quarter';

interface RecapData {
  period: Period;
  totalCollections: number;
  totalBins: number;
  collectionRate: number;
  dailyChart: { day: string; count: number }[];
  byAgent: { id: string; firstName: string; lastName: string; sector: string | null; count: number }[];
  byType: { type: string; count: number }[];
  remarks: { type: string; status: string; count: number }[];
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: '7 derniers jours' },
  { key: 'month', label: '30 derniers jours' },
  { key: 'quarter', label: '3 derniers mois' },
];

const TYPE_COLORS: Record<string, string> = {
  ordures: '#6b7280',
  recyclable: '#3b82f6',
  verre: '#22c55e',
  encombrants: '#f97316',
  autre: '#a855f7',
};

export default function RecapsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('week');
  const [data, setData] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getStoredUser();
    if (!user || user.role !== 'chef') { router.replace('/login'); return; }
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get(`/reports/recap?period=${period}`)
      .then(({ data: d }) => setData(d))
      .finally(() => setLoading(false));
  }, [period]);

  const maxDay = data ? Math.max(...data.dailyChart.map(d => d.count), 1) : 1;
  const maxAgent = data ? Math.max(...data.byAgent.map(a => a.count), 1) : 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Récapitulatifs</h1>
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
                  period === p.key ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Chargement...</div>
        ) : !data ? null : (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard icon={<TrendingUp size={20} className="text-green-500" />} label="Collectes totales" value={data.totalCollections} />
              <KpiCard icon={<Trash2 size={20} className="text-blue-500" />} label="Poubelles actives" value={data.totalBins} />
              <KpiCard icon={<BarChart2 size={20} className="text-purple-500" />} label="Taux de collecte" value={`${data.collectionRate}%`} />
              <KpiCard icon={<AlertTriangle size={20} className="text-orange-500" />} label="Remarques" value={data.remarks.reduce((s, r) => s + r.count, 0)} />
            </div>

            {/* Graphique journalier */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <BarChart2 size={18} /> Collectes par jour
              </h2>
              <div className="flex items-end gap-1 h-40">
                {data.dailyChart.map((d) => {
                  const h = Math.max(4, Math.round((d.count / maxDay) * 140));
                  return (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group">
                      <div
                        className="w-full bg-green-400 hover:bg-green-500 rounded-t transition-all cursor-default relative"
                        style={{ height: h }}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                          {d.count}
                        </div>
                      </div>
                      <span className="text-[9px] text-gray-400 rotate-45 origin-left translate-y-1">
                        {new Date(d.day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top agents */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Users size={18} /> Performance par agent
                </h2>
                {data.byAgent.length === 0 ? (
                  <p className="text-gray-400 text-sm">Aucune donnée</p>
                ) : (
                  <div className="space-y-3">
                    {data.byAgent.map((a) => (
                      <div key={a.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{a.firstName} {a.lastName}</span>
                          <span className="text-sm font-bold text-gray-900">{a.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full">
                          <div
                            className="h-2 bg-green-500 rounded-full transition-all"
                            style={{ width: `${Math.round((a.count / maxAgent) * 100)}%` }}
                          />
                        </div>
                        {a.sector && <p className="text-xs text-gray-400 mt-0.5">{a.sector}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Répartition par type */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Trash2 size={18} /> Par type de poubelle
                </h2>
                {data.byType.length === 0 ? (
                  <p className="text-gray-400 text-sm">Aucune donnée</p>
                ) : (
                  <div className="space-y-3">
                    {data.byType.map((t) => {
                      const total = data.byType.reduce((s, x) => s + x.count, 0);
                      const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
                      const color = TYPE_COLORS[t.type] || '#6b7280';
                      return (
                        <div key={t.type}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700 capitalize">{t.type}</span>
                            <span className="text-sm text-gray-500">{t.count} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full">
                            <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Remarques */}
            {data.remarks.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <AlertTriangle size={18} /> Remarques & incidents
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {data.remarks.map((r, i) => (
                    <div key={i} className="bg-orange-50 rounded-lg p-3">
                      <p className="font-semibold text-orange-800 capitalize">{r.type}</p>
                      <p className="text-xs text-orange-600">{r.status} · {r.count}x</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-gray-500">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

