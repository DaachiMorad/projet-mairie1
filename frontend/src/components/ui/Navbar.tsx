'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, Map, Trash2, Users, LogOut, BarChart2, UserCheck } from 'lucide-react';

const chefLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/carte', label: 'Carte', icon: Map },
  { href: '/vue-agents', label: 'Agents live', icon: UserCheck },
  { href: '/poubelles', label: 'Poubelles', icon: Trash2 },
  { href: '/agents', label: 'Gestion agents', icon: Users },
  { href: '/recaps', label: 'Récaps', icon: BarChart2 },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗑</span>
          <span className="font-bold text-green-700">LaRonde</span>
          <span className="text-xs text-gray-400 ml-2">{user.municipalityName}</span>
        </div>

        {user.role === 'chef' && (
          <div className="flex gap-1">
            {chefLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === href
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user.firstName} {user.lastName}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}

