'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/auth';
import Navbar from '@/components/ui/Navbar';
import api from '@/lib/api';
import { UserPlus, User } from 'lucide-react';

interface Agent {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  sector: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
}

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '', sector: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (!user || user.role !== 'chef') { router.replace('/login'); return; }
    fetchAgents();
  }, []);

  async function fetchAgents() {
    try {
      const { data } = await api.get('/auth/agents');
      setAgents(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/auth/agents', form);
      setForm({ email: '', password: '', firstName: '', lastName: '', phone: '', sector: '' });
      setShowForm(false);
      fetchAgents();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(agent: Agent) {
    await api.put(`/auth/agents/${agent.id}`, { isActive: !agent.isActive });
    fetchAgents();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <UserPlus size={16} />
            Nouvel agent
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h2 className="font-semibold mb-4">Créer un agent</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input required placeholder="Prénom" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="input" />
              <input required placeholder="Nom" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="input" />
              <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" />
              <input required type="password" placeholder="Mot de passe (min 6)" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input" />
              <input placeholder="Téléphone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input" />
              <input placeholder="Secteur" value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} className="input" />
              {error && <p className="col-span-2 text-red-600 text-sm">{error}</p>}
              <div className="col-span-2 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {saving ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p className="text-gray-400">Chargement...</p>
        ) : agents.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <User size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Aucun agent créé</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {agents.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-gray-800">{a.firstName} {a.lastName}</p>
                  <p className="text-sm text-gray-400">{a.email}{a.sector ? ` · ${a.sector}` : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {a.isActive ? 'Actif' : 'Inactif'}
                  </span>
                  <button
                    onClick={() => toggleActive(a)}
                    className="text-xs text-gray-400 hover:text-gray-700 underline"
                  >
                    {a.isActive ? 'Désactiver' : 'Activer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style jsx global>{`
        .input {
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          width: 100%;
          outline: none;
        }
        .input:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2);
        }
      `}</style>
    </div>
  );
}

