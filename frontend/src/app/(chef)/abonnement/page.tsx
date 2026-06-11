'use client';
import { useState } from 'react';
import Navbar from '@/components/ui/Navbar';
import api from '@/lib/api';
import { CreditCard, CheckCircle2, ArrowRight } from 'lucide-react';

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: '200 €/mois',
    description: 'Jusqu\'à 500 poubelles, 5 agents',
    features: ['Carte interactive', 'PWA agents', 'Dashboard temps réel', 'Rapports PDF mensuels', 'Support email'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '500 €/mois',
    description: 'Poubelles illimitées, agents illimités',
    features: ['Tout Starter', 'Rapports avancés', 'Multi-secteurs', 'API accès', 'Support prioritaire', 'Onboarding dédié'],
    recommended: true,
  },
];

export default function AbonnementPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  async function subscribe(plan: string) {
    setLoading(plan);
    try {
      const { data } = await api.post('/stripe/checkout', { plan });
      window.location.href = data.url;
    } catch {
      setLoading(null);
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    try {
      const { data } = await api.post('/stripe/portal');
      window.location.href = data.url;
    } catch {
      setPortalLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Choisissez votre abonnement</h1>
          <p className="text-gray-500 mt-2">Résiliez à tout moment. Aucun engagement.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`bg-white rounded-2xl border p-6 flex flex-col ${plan.recommended ? 'border-green-500 shadow-lg shadow-green-50' : 'border-gray-200'}`}
            >
              {plan.recommended && (
                <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full self-start mb-3">
                  Recommandé
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
              <p className="text-3xl font-bold text-gray-900 mt-2">{plan.price}</p>
              <p className="text-gray-500 text-sm mt-1">{plan.description}</p>

              <ul className="mt-5 space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => subscribe(plan.key)}
                disabled={!!loading}
                className={`mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 ${
                  plan.recommended
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                }`}
              >
                {loading === plan.key ? 'Redirection...' : <>S'abonner <ArrowRight size={16} /></>}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="flex items-center gap-2 mx-auto text-sm text-gray-500 hover:text-gray-700 underline disabled:opacity-50"
          >
            <CreditCard size={15} />
            {portalLoading ? 'Chargement...' : 'Gérer mon abonnement existant'}
          </button>
        </div>
      </main>
    </div>
  );
}

