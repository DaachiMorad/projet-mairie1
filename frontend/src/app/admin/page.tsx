'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Building2, Users, Trash2, TrendingUp, PlusCircle, X } from 'lucide-react';

interface GlobalStats {
  totalMunicipalities: number;
  totalUsers: number;
  totalBins: number;
  collectionsToday: number;
  collectionsMonth: number;
  byPlan: { plan: string; count: number }[];
  topMunicipalities: { name: string; plan: string; collections_month: number }[];
}

interface Municipality {
  id: string;
  name: string;
  slug: string;
  contact_email: string;
  plan: string;
  is_active: boolean;
  agent_count: number;
  bin_count: number;
  collected_today: number;
  created_at: string;
}

const PLAN_COLORS: Record<string, string> = {
  pilot: 'bg-gray-100 text-gray-600',
  starter: 'bg-blue-100 text-blue-700',
  pro: 'bg-green-100 text-green-700',
};

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', slug: '', contactEmail: '', contactPhone: '',
    chefEmail: '', chefPassword: '', chefFirstName: '', chefLastName: '',
    plan: 'pilot',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function authenticate() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/stats', {
        headers: { 'X-Admin-Secret': secret },
      });
      setStats(data);
      setAuthenticated(true);
      fetchMunicipalities();
    } catch {
      setError('Secret invalide');
    } finally {
      setLoading(false);
    }
  }

  async function fetchMunicipalities() {
    const { data } = await api.get('/admin/municipalities', {
      headers: { 'X-Admin-Secret': secret },
    });
    setMunicipalities(data);
  }

  async function createMunicipality(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/admin/municipalities', form, {
        headers: { 'X-Admin-Secret': secret },
      });
      setShowForm(false);
      setForm({ name: '', slug: '', contactEmail: '', contactPhone: '', chefEmail: '', chefPassword: '', chefFirstName: '', chefLastName: '', plan: 'pilot' });
      fetchMunicipalities();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await api.patch(`/admin/municipalities/${id}`, { isActive: !current }, {
      headers: { 'X-Admin-Secret': secret },
    });
    fetchMunicipalities();
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
          <h1 className="text-xl font-bold mb-6 text-gray-900">Admin LaRonde</h1>
          <input
            type="password"
            placeholder="Secret admin"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
            onKeyDown={e => e.key === 'Enter' && authenticate()}
          />
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <button
            onClick={authenticate}
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Vérification...' : 'Accéder'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Admin LaRonde</h1>
            <p className="text-gray-400 text-sm mt-1">Vue propriétaire — tous les clients</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <PlusCircle size={16} />
            Nouvelle mairie
          </button>
        </div>

        {/* KPIs */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <AdminKpi icon={<Building2 size={18} />} label="Mairies actives" value={stats.totalMunicipalities} />
            <AdminKpi icon={<Users size={18} />} label="Utilisateurs" value={stats.totalUsers} />
            <AdminKpi icon={<Trash2 size={18} />} label="Poubelles" value={stats.totalBins} />
            <AdminKpi icon={<TrendingUp size={18} />} label="Collectes aujourd'hui" value={stats.collectionsToday} />
            <AdminKpi icon={<TrendingUp size={18} />} label="Collectes ce mois" value={stats.collectionsMonth} />
          </div>
        )}

        {/* Plans */}
        {stats && (
          <div className="flex gap-3 mb-6">
            {stats.byPlan.map((p) => (
              <div key={p.plan} className="bg-gray-800 rounded-lg px-4 py-2 text-sm">
                <span className={`font-semibold capitalize ${PLAN_COLORS[p.plan]?.replace('bg-', 'text-').split(' ')[0] || ''}`}>
                  {p.plan}
                </span>
                <span className="text-gray-300 ml-2">{p.count} mairie{p.count > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        )}

        {/* Formulaire nouvelle mairie */}
        {showForm && (
          <div className="bg-gray-800 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Créer une mairie</h2>
              <button onClick={() => setShowForm(false)}><X size={16} className="text-gray-400" /></button>
            </div>
            <form onSubmit={createMunicipality} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input required placeholder="Nom de la mairie" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="admin-input" />
              <input required placeholder="Slug (ex: mairie-lyon)" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} className="admin-input" />
              <input placeholder="Email contact" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} className="admin-input" />
              <input placeholder="Téléphone" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} className="admin-input" />
              <input required placeholder="Prénom chef" value={form.chefFirstName} onChange={e => setForm(f => ({ ...f, chefFirstName: e.target.value }))} className="admin-input" />
              <input required placeholder="Nom chef" value={form.chefLastName} onChange={e => setForm(f => ({ ...f, chefLastName: e.target.value }))} className="admin-input" />
              <input required type="email" placeholder="Email chef" value={form.chefEmail} onChange={e => setForm(f => ({ ...f, chefEmail: e.target.value }))} className="admin-input" />
              <input required type="password" placeholder="Mot de passe chef" value={form.chefPassword} onChange={e => setForm(f => ({ ...f, chefPassword: e.target.value }))} className="admin-input" />
              <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} className="admin-input">
                <option value="pilot">Pilot (gratuit)</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
              </select>
              {error && <p className="col-span-2 text-red-400 text-sm">{error}</p>}
              <div className="col-span-2 flex justify-end">
                <button type="submit" disabled={saving} className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table mairies */}
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-700 text-gray-300 text-xs uppercase">
                <th className="text-left px-4 py-3">Mairie</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-center px-4 py-3">Agents</th>
                <th className="text-center px-4 py-3">Poubelles</th>
                <th className="text-center px-4 py-3">Aujourd'hui</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-center px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {municipalities.map((m) => (
                <tr key={m.id} className="hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[m.plan] || 'bg-gray-700 text-gray-300'}`}>
                      {m.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">{m.agent_count}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{m.bin_count}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold ${m.collected_today > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                      {m.collected_today}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{m.contact_email || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(m.id, m.is_active)}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${m.is_active ? 'bg-green-900 text-green-300 hover:bg-red-900 hover:text-red-300' : 'bg-gray-700 text-gray-400 hover:bg-green-900 hover:text-green-300'} transition-colors`}
                    >
                      {m.is_active ? 'Actif' : 'Suspendu'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx global>{`
        .admin-input {
          background: #374151;
          border: 1px solid #4b5563;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          width: 100%;
          color: white;
          outline: none;
        }
        .admin-input:focus { border-color: #16a34a; }
        .admin-input::placeholder { color: #9ca3af; }
        .admin-input option { background: #374151; }
      `}</style>
    </div>
  );
}

function AdminKpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 text-gray-400 mb-1">{icon}<span className="text-xs">{label}</span></div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

