'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, getStoredToken } from '@/lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    const token = getStoredToken();
    if (user && token) {
      router.replace(user.role === 'chef' ? '/dashboard' : '/tournee');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return null;
}

