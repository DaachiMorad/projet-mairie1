'use client';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'warning' | 'info' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  function remove(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 size={18} className="text-green-500" />,
    warning: <AlertTriangle size={18} className="text-orange-500" />,
    error: <AlertTriangle size={18} className="text-red-500" />,
    info: <Info size={18} className="text-blue-500" />,
  };

  const borders: Record<ToastType, string> = {
    success: 'border-l-green-500',
    warning: 'border-l-orange-500',
    error: 'border-l-red-500',
    info: 'border-l-blue-500',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`bg-white rounded-xl shadow-lg border border-gray-100 border-l-4 ${borders[t.type]} px-4 py-3 flex items-start gap-3 min-w-[280px] max-w-sm pointer-events-auto animate-in slide-in-from-right-2`}
          >
            <div className="mt-0.5 shrink-0">{icons[t.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-800">{t.title}</p>
              {t.message && <p className="text-xs text-gray-500 mt-0.5">{t.message}</p>}
            </div>
            <button onClick={() => remove(t.id)} className="text-gray-300 hover:text-gray-500 shrink-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

