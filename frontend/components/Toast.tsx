'use client';

import { FC, useEffect, useState } from 'react';
import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Toast Provider - Manages toast notifications
 */
export const ToastProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType, duration = 4000) => {
    const id = `toast-${Date.now()}`;
    const toast: Toast = { id, message, type, duration };

    setToasts((prev) => [...prev, toast]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

/**
 * useToast Hook - Use in components to show toasts
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

/**
 * Toast Container - Renders all toasts
 */
interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer: FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
};

/**
 * Individual Toast Item
 */
interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
}

const ToastItem: FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onRemove, 300); // Match animation duration
  };

  const bgColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div
      className={`
        ${bgColors[toast.type]} text-white px-4 py-3 rounded shadow-lg
        flex items-start gap-3 animate-in fade-in slide-in-from-right-4
        ${isExiting ? 'animate-out fade-out slide-out-to-right-4' : ''}
        transition-all duration-300
      `}
    >
      <span className="text-lg font-bold flex-shrink-0">{icons[toast.type]}</span>
      <p className="flex-1 text-sm">{toast.message}</p>
      <button
        onClick={handleClose}
        className="text-white hover:opacity-75 transition flex-shrink-0"
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
};

export default { ToastProvider, useToast };
