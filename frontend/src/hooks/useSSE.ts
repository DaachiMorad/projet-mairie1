'use client';
import { useEffect, useRef } from 'react';
import { getStoredToken } from '@/lib/auth';

type EventHandler = (data: any) => void;

export function useSSE(handlers: Record<string, EventHandler>, enabled = true) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const token = getStoredToken();
    if (!token) return;

    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/events?token=${token}`;
    // Note: EventSource doesn't support headers — pass token as query param
    const es = new EventSource(url);
    esRef.current = es;

    for (const [event, handler] of Object.entries(handlers)) {
      es.addEventListener(event, (e: MessageEvent) => {
        try { handler(JSON.parse(e.data)); } catch {}
      });
    }

    es.onerror = () => {
      // Auto-reconnect is native to EventSource
    };

    return () => { es.close(); esRef.current = null; };
  }, [enabled]);
}

