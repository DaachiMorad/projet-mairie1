'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/auth';
import Navbar from '@/components/ui/Navbar';
import api from '@/lib/api';
import { PlusCircle, Trash2, Archive } from 'lucide-react';

interface Bin {
  id: string;
  address: string;
  neighborhood: string | null;
  type: string;
  frequency: string;
  sector: string | null;
  assignedAgentName: string | null;
  status: string;
}

const BIN_TYPES = ['ordures', 'recyclable', 'verre', 'encombrants', 'autre'];
const FREQUENCIES = ['quotidienne', 'bihebdomadaire', 'hebdomadaire'];

export default function PoubellesPage() {
  const router = useRouter();
  const [bins, setBins] = useState<Bin[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    address: '', neighborhood: '', latitude: '', longitude: '',
    type: 'ordures', frequency: 'hebdomadaire', sector: '', assignedUserId: '', notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (!user || user.role !== 'chef') { router.replace('/login'); return; }
    Promise.all([fetchBins(), fetchAgents()]);
  }, []);

  async function fetchBins() {
    try {
      const { data } = await api.get('/bins');
      setBins(data);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAgents() {
    try {
      const { data } = await api.get('/auth/agents');
      setAgents(data.filter((a: any) => a.isActive));
    } catch {}
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/bins', {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        assignedUserId: form.assignedUserId || undefined,
      });
      setForm({ address: '', neighborhood: '', latitude: '', longitude: '', type: 'ordures', frequency: 'hebdomadaire', sector: '', assignedUserId: '', notes: '' });
      setShowForm(false);
      fetchBins();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function archiveBin(id: string) {
    if (!confirm('Archiver cette poubelle ?')) return;
    await api.delete(`/bins/${id}`);
    fetchBins();
  }

  const typeColor: Record<string, string> = {
    ordures: 'bg-gray-100 text-gray-700',
    recyclable: 'bg-blue-100 text-blue-700',
    verre: 'bg-green-100 text-green-700',
    encombrants: 'bg-orange-100 text-orange-700',
    autre: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Poubelles ({bins.length})</h1>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <PlusCircle size={16} />
            Ajouter
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h2 className="font-semibold mb-4">Ajouter une poubelle</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input required placeholder="Adresse complète" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input md:col-span-2" />
              <input placeholder="Quartier" value={form.neighborhood} onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))} className="input" />
              <input placeholder="Secteur" value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} className="input" />
              <input required placeholder="Latitude (ex: 48.8566)" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} className="input" />
              <input required placeholder="Longitude (ex: 2.3522)" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} className="input" />
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input">
                {BIN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} className="input">
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select value={form.assignedUserId} onChange={e => setForm(f => ({ ...f, assignedUserId: e.target.value }))} className="input">
                <option value="">-- Assigner un agent --</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
              </select>
              <textarea placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input" rows={2} />
              {error && <p className="col-span-2 text-red-600 text-sm">{error}</p>}
              <div className="col-span-2 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg disabled:opacity-50">
                  {saving ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p className="text-gray-400">Chargement...</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {bins.length === 0 ? (
              <div className="p-10 text-center">
                <Trash2 size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Aucune poubelle</p>
              </div>
            ) : bins.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-5 py-3 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{b.address}</p>
                  <p className="text-sm text-gray-400">
                    {b.neighborhood ? `${b.neighborhood} · ` : ''}{b.assignedAgentName || 'Non assigné'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[b.type] || 'bg-gray-100 text-gray-700'}`}>
                    {b.type}
                  </span>
                  <button onClick={() => archiveBin(b.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <Archive size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style jsx global>{`
        .input { border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; width: 100%; outline: none; }
        .input:focus { border-color: #16a34a; box-shadow: 0 0 0 2px rgba(22,163,74,0.2); }
      `}</style>
    </div>
  );
}

