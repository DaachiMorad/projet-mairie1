'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/auth';
import Navbar from '@/components/ui/Navbar';
import { useSSE } from '@/hooks/useSSE';
import api from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle2, Clock, MapPin, ChevronDown, ChevronUp, Wifi } from 'lucide-react';

interface AgentBin {
  id: string;
  address: string;
  neighborhood: string | null;
  type: string;
  collectedToday: boolean;
}

interface AgentData {
  id: string;
  firstName: string;
  lastName: string;
  sector: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  lastActivityAddress: string | null;
  total: number;
  collected: number;
  remaining: number;
  progressPercent: number;
  bins: AgentBin[];
}

export default function VueAgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    const user = getStoredUser();
    if (!user || user.role !== 'chef') { router.replace('/login'); return; }
    fetchAgents();
    const interval = setInterval(fetchAgents, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      const { data } = await api.get('/collections/stats/agents');
      setAgents(data);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  // Rafraîchir sur chaque collecte SSE
  useSSE({ collection: () => fetchAgents() }, true);

  function toggle(id: string) {
    setExpanded(e => e === id ? null : id);
  }

  const totalCollected = agents.reduce((s, a) => s + a.collected, 0);
  const totalBins = agents.reduce((s, a) => s + a.total, 0);
  const globalPct = totalBins > 0 ? Math.round((totalCollected / totalBins) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vue agents</h1>
            <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
              <Wifi size={11} />
              Mis à jour {formatDistanceToNow(lastRefresh, { addSuffix: true, locale: fr })}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-center">
            <p className="text-2xl font-bold text-green-600">{globalPct}%</p>
            <p className="text-xs text-gray-400">{totalCollected}/{totalBins} collectées</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Chargement...</div>
        ) : agents.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
            Aucun agent créé
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => {
              const isExpanded = expanded === agent.id;
              const statusColor = agent.progressPercent === 100
                ? 'bg-green-500'
                : agent.progressPercent > 0
                ? 'bg-blue-500'
                : 'bg-gray-300';

              return (
                <div key={agent.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* En-tête agent */}
                  <button
                    onClick={() => toggle(agent.id)}
                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Avatar initiales */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                      agent.progressPercent === 100 ? 'bg-green-500' : 'bg-blue-500'
                    }`}>
                      {agent.firstName[0]}{agent.lastName[0]}
                    </div>

                    {/* Nom + infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{agent.firstName} {agent.lastName}</span>
                        {agent.sector && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{agent.sector}</span>
                        )}
                        {!agent.isActive && (
                          <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full">Inactif</span>
                        )}
                      </div>
                      {agent.lastActivityAt ? (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <MapPin size={10} />
                          Dernière collecte {formatDistanceToNow(new Date(agent.lastActivityAt), { addSuffix: true, locale: fr })}
                          {agent.lastActivityAddress && ` · ${agent.lastActivityAddress}`}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-300 mt-0.5">Aucune collecte aujourd'hui</p>
                      )}
                    </div>

                    {/* Stats compactes */}
                    <div className="shrink-0 text-right mr-2 hidden sm:block">
                      <p className="text-lg font-bold text-gray-900">{agent.progressPercent}%</p>
                      <p className="text-xs text-gray-400">{agent.collected}/{agent.total}</p>
                    </div>

                    {/* Barre de progression */}
                    <div className="w-24 shrink-0 hidden md:block">
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div
                          className={`h-2 rounded-full transition-all ${statusColor}`}
                          style={{ width: `${agent.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Chevron */}
                    <div className="text-gray-300 shrink-0">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {/* Barre mobile */}
                  <div className="px-5 pb-3 md:hidden">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">{agent.collected}/{agent.total} collectées</span>
                      <span className="text-xs font-bold text-gray-700">{agent.progressPercent}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className={`h-2 rounded-full ${statusColor}`} style={{ width: `${agent.progressPercent}%` }} />
                    </div>
                  </div>

                  {/* Détail — liste des poubelles */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      <div className="px-5 py-3 bg-gray-50 flex gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-green-500" /> {agent.collected} collectées
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-orange-400" /> {agent.remaining} restantes
                        </span>
                        {agent.lastLoginAt && (
                          <span>
                            Dernière connexion {format(new Date(agent.lastLoginAt), 'dd/MM à HH:mm', { locale: fr })}
                          </span>
                        )}
                      </div>

                      <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                        {agent.bins.length === 0 ? (
                          <p className="px-5 py-4 text-sm text-gray-400">Aucune poubelle assignée</p>
                        ) : agent.bins.map((bin) => (
                          <div key={bin.id} className="flex items-center gap-3 px-5 py-2.5">
                            {bin.collectedToday ? (
                              <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                            ) : (
                              <Clock size={15} className="text-gray-300 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm truncate ${bin.collectedToday ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>
                                {bin.address}
                              </p>
                              {bin.neighborhood && (
                                <p className="text-xs text-gray-400">{bin.neighborhood}</p>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">{bin.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

