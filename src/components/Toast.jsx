import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import './Toast.css';

let toastId = 0;
let setToastsFunction = null;

export const toast = {
  success: (message, options = {}) => showToast(message, 'success', options),
  error: (message, options = {}) => showToast(message, 'error', options),
  info: (message, options = {}) => showToast(message, 'info', options),
  warning: (message, options = {}) => showToast(message, 'warning', options),
};

const showToast = (message, type = 'info', options = {}) => {
  if (!setToastsFunction) return;

  const id = toastId++;
  const duration = options.duration || (type === 'error' ? 6000 : 4000);

  const newToast = {
    id,
    message,
    type,
    duration,
    timestamp: Date.now(),
  };

  setToastsFunction(prev => [...prev, newToast]);

  // Auto remove after duration
  setTimeout(() => {
    removeToast(id);
  }, duration);

  return id;
};

const removeToast = (id) => {
  if (!setToastsFunction) return;
  setToastsFunction(prev => prev.filter(toast => toast.id !== id));
};

export const Toaster = ({ position = 'top-center' }) => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    setToastsFunction = setToasts;
    return () => {
      setToastsFunction = null;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div class={`toast-container toast-container--${position}`}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          class={`toast toast--${toast.type}`}
          onClick={() => removeToast(toast.id)}
        >
          <div class="toast__content">
            {toast.type === 'success' && <span class="toast__icon">✅</span>}
            {toast.type === 'error' && <span class="toast__icon">❌</span>}
            {toast.type === 'warning' && <span class="toast__icon">⚠️</span>}
            {toast.type === 'info' && <span class="toast__icon">ℹ️</span>}
            <span class="toast__message">{toast.message}</span>
          </div>
          <button 
            class="toast__close" 
            onClick={(e) => {
              e.stopPropagation();
              removeToast(toast.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default toast; 