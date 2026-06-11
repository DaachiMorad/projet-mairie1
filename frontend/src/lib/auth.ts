export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'chef' | 'technicien';
  sector: string | null;
  municipalityId: string;
  municipalityName: string;
  municipalitySlug: string;
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('LaRonde_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('LaRonde_token');
}

export function setAuth(token: string, user: User) {
  localStorage.setItem('LaRonde_token', token);
  localStorage.setItem('LaRonde_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('LaRonde_token');
  localStorage.removeItem('LaRonde_user');
}

